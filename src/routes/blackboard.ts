import { Router } from 'express';
import { z } from 'zod';
import { createHash } from 'node:crypto';

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
} from '../types/blackboard.js';

import { BlackboardService } from '../services/blackboard.js';

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
  // GET requests don't require X-Agent-ID
  const result = (req.app.locals.blackboard as BlackboardService).readLayer(layer);
  return res.status(200).json(result);
});

// GET /blackboard/layers/:layer/entries/:id
blackboardRouter.get('/layers/:layer/entries/:id', (req, res) => {
  const layer = req.params.layer as BlackboardLayer;
  if (!LAYER_NAMES.includes(layer)) {
    return res.status(400).json({ error: 'Bad Request', message: `Invalid layer: ${layer}` });
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

  // X-Agent-ID is required
  const agentId = req.headers['x-agent-id'] as string | undefined;
  if (!agentId) {
    return res.status(400).json({ error: 'Bad Request', message: 'X-Agent-ID header is required' });
  }

  // Validate body
  const parsed = writeEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Bad Request', message: parsed.error.message });
  }

  const writeReq: WriteEntryRequest = parsed.data as WriteEntryRequest;

  try {
    const result = (req.app.locals.blackboard as BlackboardService).writeEntry(layer, agentId, writeReq);

    // Write to audit log
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

    // Mark snapshot dirty for periodic persistence
    if (snapshotService) {
      snapshotService.markDirty();
    }

    return res.status(201).json(result);
  } catch (err) {
    if (err instanceof VersionConflictError) {
      // Log rejection to audit
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
      // Log rejection to audit
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

  const agentId = req.headers['x-agent-id'] as string | undefined;
  if (!agentId) {
    return res.status(400).json({ error: 'Bad Request', message: 'X-Agent-ID header is required' });
  }

  try {
    (req.app.locals.blackboard as BlackboardService).deleteEntry(layer, req.params.id!, agentId);

    // Mark snapshot dirty after delete
    if (snapshotService) {
      snapshotService.markDirty();
    }

    return res.status(204).send();
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(404).json({ error: 'Not Found', message: err.message });
    }
    throw err;
  }
});
