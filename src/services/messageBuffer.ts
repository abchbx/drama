import type { RoutingMessage } from '../types/routing.js';

/**
 * MessageBuffer — FIFO per-sender message buffer for reconnect replay.
 *
 * When an agent disconnects, messages addressed to it are buffered in order.
 * On reconnect, the full history is replayed so the agent has full context.
 */
export class MessageBuffer {
  /** agentId → ordered array of messages to replay */
  private readonly buffers = new Map<string, RoutingMessage[]>();

  /** Push a message into the buffer for the given recipient. */
  push(agentId: string, message: RoutingMessage): void {
    if (!this.buffers.has(agentId)) {
      this.buffers.set(agentId, []);
    }
    this.buffers.get(agentId)!.push(message);
  }

  /** Drain and return all buffered messages for the given agent (FIFO order). */
  drain(agentId: string): RoutingMessage[] {
    const messages = this.buffers.get(agentId) ?? [];
    this.buffers.delete(agentId);
    return messages;
  }

  /** Return the count of buffered messages for an agent. */
  size(agentId: string): number {
    return this.buffers.get(agentId)?.length ?? 0;
  }

  /** Clear all buffers. */
  clear(): void {
    this.buffers.clear();
  }
}
