import type pino from 'pino';
import { type AgentRole, type RouterEventMap } from '../types/routing.js';

export interface HeartbeatOptions {
  intervalMs: number;
  missedThreshold: number; // consecutive missed pongs before marking dead
  onDeadAgent?: (agentId: string, socketId: string) => void;
}

/**
 * HeartbeatService — server-side ping/pong tracker for agent liveness.
 *
 * Periodically sends ping events to all connected agents via Socket.IO.
 * Tracks the last pong received per agent; if a threshold is exceeded,
 * emits 'agent:unavailable' for that agent.
 */
export class HeartbeatService {
  private readonly logger: pino.Logger;
  private readonly intervalMs: number;
  private readonly missedThreshold: number;
  private readonly onDeadAgent?: (agentId: string, socketId: string) => void;

  /** socketId → last pong epoch (0 if none received yet) */
  private lastPong = new Map<string, number>();
  /** agentId → set of socketIds (one agent can have multiple sockets) */
  private agentSockets = new Map<string, Set<string>>();
  /** agentId → consecutive missed ping count */
  private missedCount = new Map<string, number>();

  private timer: ReturnType<typeof setInterval> | null = null;
  private io: import('socket.io').Server | null = null;

  constructor(
    logger: pino.Logger,
    options: HeartbeatOptions,
  ) {
    this.logger = logger;
    this.intervalMs = options.intervalMs;
    this.missedThreshold = options.missedThreshold;
    this.onDeadAgent = options.onDeadAgent;
  }

  /** Called once the Socket.IO server is available. */
  attach(io: import('socket.io').Server): void {
    this.io = io;
  }

  /** Start the heartbeat interval. */
  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), this.intervalMs);
    this.logger.debug({ intervalMs: this.intervalMs }, 'heartbeat service started');
  }

  /** Stop the heartbeat interval. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Register an agent socket connection. */
  registerAgent(agentId: string, socketId: string): void {
    if (!this.agentSockets.has(agentId)) {
      this.agentSockets.set(agentId, new Set());
    }
    this.agentSockets.get(agentId)!.add(socketId);
    this.lastPong.set(socketId, Date.now());
    this.missedCount.set(agentId, 0);
    this.logger.debug({ agentId, socketId }, 'heartbeat: agent registered');
  }

  /** Unregister an agent socket connection. */
  unregisterAgent(agentId: string, socketId: string): void {
    this.agentSockets.get(agentId)?.delete(socketId);
    if (this.agentSockets.get(agentId)?.size === 0) {
      this.agentSockets.delete(agentId);
      this.missedCount.delete(agentId);
    }
    this.lastPong.delete(socketId);
  }

  /** Called when an agent responds with a pong. */
  recordPong(socketId: string): void {
    this.lastPong.set(socketId, Date.now());
    // Reset missed count for the agent that ponged
    for (const [agentId, sockets] of this.agentSockets) {
      if (sockets.has(socketId)) {
        this.missedCount.set(agentId, 0);
        break;
      }
    }
  }

  /** Send a ping to a specific agent. */
  private pingAgent(agentId: string): void {
    const sockets = this.agentSockets.get(agentId);
    if (!sockets || sockets.size === 0) return;
    const io = this.io;
    if (!io) return;

    for (const socketId of sockets) {
      io.to(socketId).emit('heartbeat:ping', { timestamp: Date.now() });
    }
  }

  /** Send a ping to all registered agents. */
  private pingAll(): void {
    for (const agentId of this.agentSockets.keys()) {
      this.pingAgent(agentId);
    }
  }

  /** Tick: ping all agents and check for dead agents. */
  private tick(): void {
    this.pingAll();
    this.checkDeadAgents();
  }

  /** Check each agent for missed heartbeats. */
  private checkDeadAgents(): void {
    const now = Date.now();
    const timeout = this.intervalMs * 2; // if no pong within 2 intervals, count as missed

    for (const [agentId, sockets] of this.agentSockets) {
      if (sockets.size === 0) continue;

      let anyAlive = false;
      for (const socketId of sockets) {
        const last = this.lastPong.get(socketId) ?? 0;
        if (now - last < timeout) {
          anyAlive = true;
          break;
        }
      }

      if (!anyAlive) {
        const missed = (this.missedCount.get(agentId) ?? 0) + 1;
        this.missedCount.set(agentId, missed);
        this.logger.warn({ agentId, missed, threshold: this.missedThreshold }, 'heartbeat: agent missed ping');

        if (missed >= this.missedThreshold) {
          this.logger.error({ agentId }, 'heartbeat: agent marked dead');
          const firstSocket = [...sockets][0];
          if (firstSocket) {
            this.onDeadAgent?.(agentId, firstSocket);
          }
        }
      } else {
        // Reset missed count on any alive socket
        this.missedCount.set(agentId, 0);
      }
    }
  }
}
