import { EventEmitter } from 'node:events';
import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer, type Socket } from 'socket.io';
import type pino from 'pino';
import { HeartbeatService } from './heartbeat.js';
import { MessageBuffer } from './messageBuffer.js';
import { TimeoutManager } from './timeoutManager.js';
import type {
  AgentRole,
  ConnectedAgent,
  RouterEventMap,
  RoutingMessage,
} from '../types/routing.js';
import { RoutingMessageSchema } from '../types/routing.js';

export interface RouterServiceOptions {
  port: number;
  heartbeatIntervalMs: number;
  actorTimeoutMs: number;
  actorRetryTimeoutMs: number;
  gracePeriodMs: number;
  sceneTimeoutMs: number;
}

interface DisconnectState {
  sceneId: string;
  retryAttempt: number;
  graceTimer: ReturnType<typeof setTimeout>;
}

export class RouterService {
  private readonly _io: SocketIOServer;
  get io(): SocketIOServer {
    return this._io;
  }
  private readonly logger: pino.Logger;
  private readonly heartbeat: HeartbeatService;
  private readonly timeoutManager: TimeoutManager;
  private readonly messageBuffer = new MessageBuffer();
  private readonly events = new EventEmitter();
  private readonly agents = new Map<string, ConnectedAgent>();
  private readonly socketToAgent = new Map<string, string>();
  private readonly senderSequence = new Map<string, number>();
  private readonly disconnectStates = new Map<string, DisconnectState>();

  constructor(httpServer: HttpServer, logger: pino.Logger, options: RouterServiceOptions) {
    this.logger = logger;
    this._io = new SocketIOServer(httpServer, {
      cors: { origin: '*' },
    });

    this.heartbeat = new HeartbeatService(logger, {
      intervalMs: options.heartbeatIntervalMs,
      missedThreshold: 3,
      onDeadAgent: (agentId) => {
        this.emit('agent:unavailable', { agentId, reason: 'dead' });
      },
    });

    this.timeoutManager = new TimeoutManager(logger, {
      actorTimeoutMs: options.actorTimeoutMs,
      actorRetryTimeoutMs: options.actorRetryTimeoutMs,
      sceneTimeoutMs: options.sceneTimeoutMs,
      onActorTimeout: (actorId, sceneId, retryAttempt) => {
        if (retryAttempt === 0) {
          this.timeoutManager.retryActorTimer(actorId, sceneId);
          return;
        }

        this.emit('actor:skipped', { sceneId, actorId, reason: 'timeout' });
        this.emit('agent:unavailable', { agentId: actorId, reason: 'timeout' });
      },
      onSceneCeiling: () => {
        this.logger.warn('router: scene ceiling reached');
      },
    });

    this.heartbeat.attach(this._io);
    this.heartbeat.start();
    this.registerSocketHandlers();

    // Periodically emit agent_updated to frontend dashboard
    setInterval(() => {
      this.emitAgentUpdated();
    }, options.heartbeatIntervalMs);
  }

  private emitAgentUpdated(): void {
    const agents = Array.from(this.agents.values()).map((agent) => ({
      agentId: agent.agentId,
      role: agent.role,
      socketId: agent.socketId,
      connectedAt: agent.connectedAt,
      lastPong: agent.lastPong,
    }));

    this._io.emit('agent_updated', {
      agents,
      timestamp: Date.now(),
    });
  }

  private registerSocketHandlers(): void {
    this._io.on('connection', (socket) => {
      const agentId = this.readHandshakeValue(socket, 'agentId');
      const roleValue = this.readHandshakeValue(socket, 'role');
      const role: AgentRole = roleValue === 'director' ? 'director' : 'actor';

      if (!agentId) {
        socket.disconnect(true);
        return;
      }

      this.registerConnection(socket, agentId, role);

      socket.on('disconnect', () => {
        this.handleDisconnect(socket.id);
      });

      socket.on('heartbeat:pong', () => {
        this.heartbeat.recordPong(socket.id);
      });

      socket.on('routing:message', (raw: unknown) => {
        const parsed = RoutingMessageSchema.safeParse(raw);
        if (!parsed.success) {
          this.logger.warn({ socketId: socket.id }, 'router: invalid routing message');
          return;
        }

        this.routeMessage(parsed.data);
      });
    });
  }

  private readHandshakeValue(socket: Socket, key: string): string | undefined {
    const value = socket.handshake.auth[key] ?? socket.handshake.query[key];
    return typeof value === 'string' ? value : undefined;
  }

  private registerConnection(socket: Socket, agentId: string, role: AgentRole): void {
    const existingGrace = this.disconnectStates.get(agentId);
    if (existingGrace) {
      clearTimeout(existingGrace.graceTimer);
      this.disconnectStates.delete(agentId);
      this.timeoutManager.resumeActorTimer(agentId, existingGrace.sceneId, existingGrace.retryAttempt);
      this.emit('agent:reconnected', { agentId });
    }

    const agent: ConnectedAgent = {
      socketId: socket.id,
      agentId,
      role,
      connectedAt: Date.now(),
      lastPong: Date.now(),
    };

    this.agents.set(agentId, agent);
    this.socketToAgent.set(socket.id, agentId);

    socket.join(role === 'actor' ? 'actors' : 'directors');
    socket.join(`agent:${agentId}`);

    if (role === 'actor') {
      socket.join(`actor:${agentId}`);
    }

    this.heartbeat.registerAgent(agentId, socket.id);
    this.emit('agent:connected', { agentId, role, socketId: socket.id });

    // Emit to frontend dashboard
    this._io.emit('agent_connected', {
      agentId,
      role,
      socketId: socket.id,
      timestamp: Date.now(),
    });

    this.replayBufferedMessages(agentId);
  }

  private handleDisconnect(socketId: string): void {
    const agentId = this.socketToAgent.get(socketId);
    if (!agentId) return;

    const agent = this.agents.get(agentId);
    this.socketToAgent.delete(socketId);
    this.heartbeat.unregisterAgent(agentId, socketId);
    this.agents.delete(agentId);

    if (!agent) return;

    const paused = this.timeoutManager.pauseActorTimer(agentId);
    const graceTimer = setTimeout(() => {
      this.disconnectStates.delete(agentId);
      this.emit('agent:unavailable', { agentId, reason: 'disconnect' });
    }, 10_000);

    this.disconnectStates.set(agentId, {
      sceneId: 'unknown-scene',
      retryAttempt: paused?.remaining ?? 0,
      graceTimer,
    });

    this.emit('agent:disconnected', {
      agentId,
      role: agent.role,
      socketId,
      graceful: false,
    });

    // Emit to frontend dashboard
    this._io.emit('agent_disconnected', {
      agentId,
      role: agent.role,
      socketId,
      timestamp: Date.now(),
    });
  }

  private replayBufferedMessages(agentId: string): void {
    const buffered = this.messageBuffer.drain(agentId);
    if (buffered.length === 0) return;

    for (const message of buffered) {
      this._io.to(`agent:${agentId}`).emit('routing:message', message);
    }
  }

  private emit<K extends keyof RouterEventMap>(event: K, payload: RouterEventMap[K]): void {
    this.events.emit(event, payload);
  }

  on<K extends keyof RouterEventMap>(event: K, handler: (payload: RouterEventMap[K]) => void): void {
    this.events.on(event, handler);
  }

  off<K extends keyof RouterEventMap>(event: K, handler: (payload: RouterEventMap[K]) => void): void {
    this.events.off(event, handler);
  }

  private nextSequence(from: string): number {
    const next = (this.senderSequence.get(from) ?? 0) + 1;
    this.senderSequence.set(from, next);
    return next;
  }

  sendBroadcast(message: Omit<RoutingMessage, 'sequenceNum'>): RoutingMessage {
    const routed = { ...message, sequenceNum: this.nextSequence(message.from) };
    this._io.to('actors').emit('routing:message', routed);
    this.emit('message:received', routed);
    return routed;
  }

  sendPeerToPeer(message: Omit<RoutingMessage, 'sequenceNum'>, recipientId: string): RoutingMessage {
    const routed = {
      ...message,
      to: [recipientId],
      sequenceNum: this.nextSequence(message.from),
    };

    if (this.agents.has(recipientId)) {
      this._io.to(`actor:${recipientId}`).emit('routing:message', routed);
    } else {
      this.messageBuffer.push(recipientId, routed);
    }

    this.emit('message:received', routed);
    return routed;
  }

  sendMulticast(message: Omit<RoutingMessage, 'sequenceNum'>, recipientIds: string[]): RoutingMessage {
    const routed = {
      ...message,
      to: recipientIds,
      sequenceNum: this.nextSequence(message.from),
    };

    for (const recipientId of recipientIds) {
      if (this.agents.has(recipientId)) {
        this._io.to(`actor:${recipientId}`).emit('routing:message', routed);
      } else {
        this.messageBuffer.push(recipientId, routed);
      }
    }

    this.emit('message:received', routed);
    return routed;
  }

  routeMessage(message: RoutingMessage): void {
    if (message.to.length === 0) {
      this.emit('message:received', message);
      return;
    }

    if (message.to.length === 1) {
      this.sendPeerToPeer(message, message.to[0]!);
      return;
    }

    this.sendMulticast(message, message.to);
  }

  sendYourTurn(actorId: string, sceneId: string, directorId: string, turnNumber: number, timeoutMs: number, instructions?: string): RoutingMessage {
    const message = this.sendPeerToPeer(
      {
        id: crypto.randomUUID(),
        type: 'your_turn',
        from: directorId,
        to: [actorId],
        payload: {
          sceneId,
          turnNumber,
          directorId,
          timeoutMs,
          instructions,
        },
        timestamp: Date.now(),
      },
      actorId,
    );

    this.timeoutManager.startActorTimer(actorId, sceneId);
    return message;
  }

  acknowledgeActorResponse(actorId: string): void {
    this.timeoutManager.cancelActorTimer(actorId);
  }

  startScene(sceneId: string): void {
    this.timeoutManager.startSceneTimer(sceneId);
  }

  endScene(sceneId: string): void {
    this.timeoutManager.cancelSceneTimer(sceneId);
  }

  stop(): void {
    for (const state of this.disconnectStates.values()) {
      clearTimeout(state.graceTimer);
    }
    this.disconnectStates.clear();
    this.timeoutManager.stopAll();
    this.heartbeat.stop();
    this._io.close();
    this.events.removeAllListeners();
  }
}
