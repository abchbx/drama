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
      const clientType = this.readHandshakeValue(socket, 'clientType') || 'agent';

      // Allow dashboard clients (frontend UI) to connect without agentId
      if (!agentId && clientType !== 'dashboard') {
        this.logger.warn({ socketId: socket.id }, 'router: disconnecting client without agentId');
        socket.disconnect(true);
        return;
      }

      // Dashboard clients just listen, don't register as agents
      if (clientType === 'dashboard' || !agentId) {
        this.logger.info({ socketId: socket.id, clientType }, 'router: dashboard client connected');

        // Dashboard clients join a special room for broadcast messages
        socket.join('dashboard');

        socket.on('disconnect', () => {
          this.logger.info({ socketId: socket.id }, 'router: dashboard client disconnected');
        });

        return;
      }

      // Agent clients (director/actor)
      const role: AgentRole = roleValue === 'director' ? 'director' : 'actor';
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

  /**
   * Register an internal agent (no Socket.IO connection, e.g., backend DramaSession actors)
   */
  registerInternalAgent(agentId: string, role: AgentRole): void {
    const agent: ConnectedAgent = {
      socketId: `internal-${agentId}`,
      agentId,
      role,
      connectedAt: Date.now(),
      lastPong: Date.now(),
    };

    this.agents.set(agentId, agent);

    // Emit to frontend dashboard
    this._io.emit('agent_connected', {
      agentId,
      role,
      socketId: agent.socketId,
      timestamp: Date.now(),
    });

    this.emitAgentUpdated();

    this.logger.info({ agentId, role }, 'router: internal agent registered');
  }

  /**
   * Unregister an internal agent
   */
  unregisterInternalAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    // Only unregister if it's an internal agent
    if (!agent.socketId.startsWith('internal-')) return;

    this.agents.delete(agentId);

    // Emit to frontend dashboard
    this._io.emit('agent_disconnected', {
      agentId,
      role: agent.role,
      socketId: agent.socketId,
      timestamp: Date.now(),
    });

    this.emitAgentUpdated();

    this.logger.info({ agentId }, 'router: internal agent unregistered');
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
    this.logger.info({ messageId: routed.id, type: routed.type, from: routed.from, to: routed.to }, 'router: broadcasting message');
    this._io.to('actors').emit('routing:message', routed);
    this.emit('message:received', routed);
    this._io.emit('message:received', routed); // Socket.IO broadcast to all clients
    this.logger.info({ clientCount: this._io.engine.clientsCount }, 'router: message broadcasted to all clients');
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
    this._io.emit('message:received', routed); // Socket.IO broadcast to all clients
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
    this._io.emit('message:received', routed); // Socket.IO broadcast to all clients
    return routed;
  }

  routeMessage(message: RoutingMessage): void {
    if (message.to.length === 0) {
      this.emit('message:received', message);
      this._io.emit('message:received', message); // Socket.IO broadcast to all clients
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

  startSceneWithDuration(sceneId: string, durationMs: number): void {
    this.timeoutManager.startSceneTimerWithDuration(sceneId, durationMs);
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

  /**
   * Get all currently connected agents
   */
  getAgents(): Array<{ agentId: string; role: string; socketId: string; connectedAt: number; lastPong: number }> {
    return Array.from(this.agents.values()).map((agent) => ({
      agentId: agent.agentId,
      role: agent.role,
      socketId: agent.socketId,
      connectedAt: agent.connectedAt,
      lastPong: agent.lastPong,
    }));
  }
}
