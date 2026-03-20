import type pino from 'pino';
import { pino as createPino } from 'pino';
import { config } from '../config.js';

// Base logger
const baseLogger: pino.Logger = createPino({
  level: config.LOG_LEVEL,
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

/**
 * Create a child logger with agent ID attribution
 * @param agentId Agent ID to attach to all logs
 * @returns Child logger with agentId
 */
export function childLogger(agentId: string): pino.Logger {
  return baseLogger.child({ agentId });
}

/**
 * Create a session logger with drama ID and agent ID attribution
 * @param dramaId Drama session ID
 * @param agentId Agent ID (optional)
 * @returns Child logger with dramaId and optional agentId
 */
export function sessionLogger(dramaId: string, agentId?: string): pino.Logger {
  const bindings: Record<string, string> = { dramaId };
  if (agentId) {
    bindings.agentId = agentId;
  }
  return baseLogger.child(bindings);
}

// Export base logger for global use
export { baseLogger as logger };
