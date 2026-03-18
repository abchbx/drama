import { Router } from 'express';

import type { AuditLogEntry } from '../types/blackboard.js';

interface AuditLogServiceInterface {
  write(entry: Omit<AuditLogEntry, 'entryContentHash'>, contentHash: string): Promise<void>;
  query(filters: { agentId?: string; layer?: string; since?: string; limit?: number }): Promise<AuditLogEntry[]>;
}

let _auditLog: AuditLogServiceInterface | undefined;

export function setAuditLog(service: AuditLogServiceInterface): void {
  _auditLog = service;
}

export const auditRouter = Router();

// GET /blackboard/audit — query audit log entries
auditRouter.get('/', async (req, res) => {
  if (!_auditLog) {
    return res.status(503).json({ error: 'Service Unavailable', message: 'Audit log not initialized' });
  }

  const agentId = req.query.agentId as string | undefined;
  const layer = req.query.layer as string | undefined;
  const since = req.query.since as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

  try {
    const entries = await _auditLog.query({ agentId, layer, since, limit });
    return res.status(200).json({ entries, count: entries.length });
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error', message: String(err) });
  }
});
