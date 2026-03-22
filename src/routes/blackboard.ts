import { Router } from 'express';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import express from 'express';

import {
  LAYER_NAMES,
  type BlackboardLayer,
  type WriteEntryRequest,
  type AuditLogEntry,
} from '../types/blackboard.js';

import {
  VersionConflictError,
  TokenBudgetExceededError,
  NotFoundError,
  ValidationError,
  BoundaryViolationError,
  type ViolationType,
  type BoundaryOperation,
} from '../types/blackboard.js';

import { BlackboardService } from '../services/blackboard.js';
import { extractBearerToken, verifyAgentToken, type AgentJwtPayload, type CapabilityService } from '../services/capability.js';

export { BlackboardService };

// Audit log service — injected via setAuditLog() at startup
let auditLog: AuditLogServiceInterface | undefined;

export interface AuditLogServiceInterface {
  write(entry: Omit<AuditLogEntry, 'entryContentHash'>, contentHash: string): Promise<void>;
}

export function setAuditLog(service: AuditLogServiceInterface): void {
  auditLog = service;
}

// Snapshot service — injected via setSnapshotService() at startup
let snapshotService: SnapshotServiceInterface | undefined;

export interface SnapshotServiceInterface {
  markDirty(): void;
  saveImmediately(state: unknown): void;
}

export function setSnapshotService(service: SnapshotServiceInterface): void {
  snapshotService = service;
}

// Capability service — injected via setCapabilityService() at startup
export function setCapabilityService(s: CapabilityService): void {
  capabilityService = s;
}

let capabilityService: CapabilityService | undefined;

function requireAuth(req: express.Request, res: express.Response): AgentJwtPayload | null {
  if (!capabilityService) {
    res.status(500).json({ error: 'Internal Server Error', message: 'Capability service not initialized' });
    return null;
  }
  const authHeader = req.headers.authorization;
  const token = extractBearerToken(authHeader);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized', message: 'Missing or invalid Authorization header' });
    return null;
  }
  try {
    return capabilityService.verify(req);
  } catch {
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid or missing token' });
    return null;
  }
}

// Helper: handle a boundary violation — log it and return 403
function handleViolation(
  res: express.Response,
  agent: AgentJwtPayload,
  layer: BlackboardLayer,
  operation: 'read' | 'write',
  violationType: ViolationType,
  allowedLayers: BlackboardLayer[],
): void {
  const err = new BoundaryViolationError(violationType, layer, operation, allowedLayers);
  if (auditLog) {
    auditLog.write({
      timestamp: new Date().toISOString(),
      agentId: agent.agentId,
      role: agent.role,
      layer,
      operation: 'violation',
      violationType,
    }, '');
  }
  const logger = (res.app.locals as { logger?: import('pino').Logger }).logger;
  logger?.warn({ agentId: agent.agentId, role: agent.role, layer, violationType }, 'boundary violation');
  res.status(403).json({
    error: 'Forbidden',
    violationType: err.violationType,
    targetLayer: err.targetLayer,
    operation: err.operation,
    allowedLayers: err.allowedLayers,
    message: err.message,
  });
}

const writeEntrySchema = z.object({
  content: z.string().min(1),
  expectedVersion: z.number().int().nonnegative().optional(),
  messageId: z.string().optional(),
});

export const blackboardRouter = Router({ mergeParams: true });

// GET /blackboard/layers/:layer/entries
blackboardRouter.get('/layers/:layer/entries', (req, res) => {
  const layer = req.params.layer as BlackboardLayer;
  if (!LAYER_NAMES.includes(layer)) {
    return res.status(400).json({ error: 'Bad Request', message: `Invalid layer: ${layer}. Must be one of: ${LAYER_NAMES.join(', ')}` });
  }

  const agent = requireAuth(req, res);
  if (!agent) return;

  const check = capabilityService!.check(agent, layer, 'read');
  if (!check.allowed) {
    return handleViolation(res, agent, layer, 'read', check.violationType!, check.allowedLayers);
  }

  const result = (req.app.locals.blackboard as BlackboardService).readLayer(layer);
  return res.status(200).json(result);
});

// GET /blackboard/layers/:layer/entries/:id
blackboardRouter.get('/layers/:layer/entries/:id', (req, res) => {
  const layer = req.params.layer as BlackboardLayer;
  if (!LAYER_NAMES.includes(layer)) {
    return res.status(400).json({ error: 'Bad Request', message: `Invalid layer: ${layer}` });
  }

  const agent = requireAuth(req, res);
  if (!agent) return;

  const check = capabilityService!.check(agent, layer, 'read');
  if (!check.allowed) {
    return handleViolation(res, agent, layer, 'read', check.violationType!, check.allowedLayers);
  }

  try {
    const result = (req.app.locals.blackboard as BlackboardService).readEntry(layer, req.params.id!);
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(404).json({ error: 'Not Found', message: err.message });
    }
    throw err;
  }
});

// POST /blackboard/layers/:layer/entries
blackboardRouter.post('/layers/:layer/entries', async (req, res) => {
  const layer = req.params.layer as BlackboardLayer;
  if (!LAYER_NAMES.includes(layer)) {
    return res.status(400).json({ error: 'Bad Request', message: `Invalid layer: ${layer}` });
  }

  const agent = requireAuth(req, res);
  if (!agent) return;

  const check = capabilityService!.check(agent, layer, 'write');
  if (!check.allowed) {
    return handleViolation(res, agent, layer, 'write', check.violationType!, check.allowedLayers);
  }

  const parsed = writeEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Bad Request', message: parsed.error.message });
  }

  const writeReq: WriteEntryRequest = parsed.data as WriteEntryRequest;
  const agentId = agent.agentId;

  try {
    const result = (req.app.locals.blackboard as BlackboardService).writeEntry(layer, agentId, writeReq);

    if (auditLog) {
      const contentHash = createHash('sha256').update(req.body.content).digest('hex');
      await auditLog.write({
        timestamp: new Date().toISOString(),
        agentId,
        layer,
        messageId: writeReq.messageId,
        entryId: result.entry.id,
        operation: 'write',
      }, contentHash);
    }

    if (snapshotService) {
      snapshotService.markDirty();
    }

    // Emit memory:updated Socket.IO event
    const routerService = (req.app.locals as { routerService?: import('../services/router.js').RouterService }).routerService;
    if (routerService) {
      routerService.io.emit('memory:updated', {
        dramaId: 'default',
        layer,
        timestamp: Date.now(),
      });
    }

    return res.status(201).json(result);
  } catch (err) {
    if (err instanceof BoundaryViolationError) {
      handleViolation(res, agent, layer, 'write', err.violationType, err.allowedLayers);
      return;
    }
    if (err instanceof VersionConflictError) {
      if (auditLog) {
        await auditLog.write({
          timestamp: new Date().toISOString(),
          agentId,
          layer,
          messageId: writeReq.messageId,
          operation: 'reject',
          rejectionReason: err.message,
        }, '');
      }
      return res.status(409).json({
        error: 'Conflict',
        message: 'Version mismatch',
        currentVersion: err.currentVersion,
        expectedVersion: err.expectedVersion,
      });
    }
    if (err instanceof TokenBudgetExceededError) {
      if (auditLog) {
        await auditLog.write({
          timestamp: new Date().toISOString(),
          agentId,
          layer,
          messageId: writeReq.messageId,
          operation: 'reject',
          rejectionReason: err.message,
        }, '');
      }
      return res.status(413).json({
        error: 'Payload Too Large',
        message: err.message,
        tokenBudget: err.budget,
        currentTokenCount: err.currentCount,
        attemptedEntryTokens: err.attemptedCount,
      });
    }
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: 'Bad Request', message: err.message });
    }
    throw err;
  }
});

// DELETE /blackboard/layers/:layer/entries/:id
blackboardRouter.delete('/layers/:layer/entries/:id', (req, res) => {
  const layer = req.params.layer as BlackboardLayer;
  if (!LAYER_NAMES.includes(layer)) {
    return res.status(400).json({ error: 'Bad Request', message: `Invalid layer: ${layer}` });
  }

  const agent = requireAuth(req, res);
  if (!agent) return;

  const check = capabilityService!.check(agent, layer, 'write');
  if (!check.allowed) {
    return handleViolation(res, agent, layer, 'write', check.violationType!, check.allowedLayers);
  }

  try {
    (req.app.locals.blackboard as BlackboardService).deleteEntry(layer, req.params.id!, agent.agentId);

    if (snapshotService) {
      snapshotService.markDirty();
    }

    // Emit memory:updated Socket.IO event
    const routerService = (req.app.locals as { routerService?: import('../services/router.js').RouterService }).routerService;
    if (routerService) {
      routerService.io.emit('memory:updated', {
        dramaId: 'default',
        layer,
        timestamp: Date.now(),
      });
    }

    return res.status(204).send();
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(404).json({ error: 'Not Found', message: err.message });
    }
    throw err;
  }
});
