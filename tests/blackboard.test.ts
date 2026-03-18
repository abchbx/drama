import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import jwt from 'jsonwebtoken';

import express = require('express');
import { blackboardRouter, setAuditLog as setBlackboardAuditLog, setSnapshotService, setCapabilityService as setBlackboardCapabilityService } from '../src/routes/blackboard.js';
import { auditRouter, setAuditLog as setAuditRouterAuditLog } from '../src/routes/audit.js';
import { healthRouter } from '../src/routes/health.js';
import { BlackboardService } from '../src/services/blackboard.js';
import { SnapshotService } from '../src/services/snapshot.js';
import { AuditLogService } from '../src/services/auditLog.js';
import { createCapabilityService } from '../src/services/capability.js';

// Load env vars so createCapabilityService works in tests
import 'dotenv/config';

// Helper: create a fully wired app for testing with capability service
function createTestApp(dataDir: string) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const snapshotService = new SnapshotService(dataDir);
  const auditLogService = new AuditLogService(dataDir);
  const blackboardService = new BlackboardService(snapshotService.tryRestore());
  const capabilityService = createCapabilityService();

  setBlackboardAuditLog(auditLogService);
  setAuditRouterAuditLog(auditLogService);
  setSnapshotService(snapshotService);
  setBlackboardCapabilityService(capabilityService);

  app.locals.blackboard = blackboardService;
  app.locals.capabilityService = capabilityService;

  app.use('/blackboard/audit', auditRouter);
  app.use('/blackboard', blackboardRouter);
  app.use('/health', healthRouter);

  return { app, snapshotService, auditLogService, blackboardService, capabilityService };
}

// Issue a test JWT for a given agentId and role
function issueToken(capabilityService: ReturnType<typeof createCapabilityService>, agentId: string, role: string): string {
  return jwt.sign(
    { agentId, role },
    capabilityService.jwtSecret,
    { expiresIn: '1h', algorithm: 'HS256' } as jwt.SignOptions,
  );
}

describe('Blackboard REST API — Phase 1 Success Criteria', () => {
  let dataDir: string;
  let base: ReturnType<typeof request.Supertest.prototype>;
  let snapshotService: SnapshotService;
  let auditLogPath: string;
  let capabilityService: ReturnType<typeof createCapabilityService>;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blackboard-test-'));
    const result = createTestApp(dataDir);
    base = request(result.app);
    snapshotService = result.snapshotService;
    capabilityService = result.capabilityService;
    auditLogPath = path.join(dataDir, `audit-${new Date().toISOString().slice(0, 10)}.jsonl`);
  });

  afterEach(() => {
    try { snapshotService.stopTimer(); } catch {}
    try { fs.rmSync(dataDir, { recursive: true }); } catch {}
  });

  // ─── SC1: Write-read roundtrip ────────────────────────────────────────────
  it('SC1: write then read returns the same entry', async () => {
    const token = issueToken(capabilityService, 'test-agent', 'Director');
    const payload = { content: 'Hello world from test agent', messageId: 'msg-001' };

    const postRes = await base
      .post('/blackboard/layers/core/entries')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);

    expect(postRes.body.entry.content).toBe(payload.content);
    expect(postRes.body.entry.agentId).toBe('test-agent');
    expect(postRes.body.entry.messageId).toBe('msg-001');
    expect(postRes.body.entry.id).toBeDefined();
    expect(postRes.body.layerVersion).toBe(1);

    const getRes = await base
      .get(`/blackboard/layers/core/entries/${postRes.body.entry.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(getRes.body.entry.content).toBe(payload.content);
    expect(getRes.body.currentVersion).toBe(1);
  });

  // ─── SC2: Token budget enforcement ────────────────────────────────────────
  it('SC2: write exceeding layer budget returns 413', async () => {
    const token = issueToken(capabilityService, 'test-agent', 'Director');
    const largeContent = 'word '.repeat(2500);

    const res = await base
      .post('/blackboard/layers/core/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: largeContent })
      .expect(413);

    expect(res.body.error).toBe('Payload Too Large');
    expect(res.body.tokenBudget).toBe(2000);
    expect(res.body.currentTokenCount).toBe(0);
    expect(res.body.attemptedEntryTokens).toBeGreaterThan(2000);
  });

  // ─── SC3: Optimistic locking version conflict ─────────────────────────────
  it('SC3: stale expectedVersion returns 409', async () => {
    const token = issueToken(capabilityService, 'agent-a', 'Director');

    await base
      .post('/blackboard/layers/scenario/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'First write' })
      .expect(201);

    const tokenB = issueToken(capabilityService, 'agent-b', 'Director');
    const res = await base
      .post('/blackboard/layers/scenario/entries')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ content: 'Conflicting write', expectedVersion: 0 })
      .expect(409);

    expect(res.body.error).toBe('Conflict');
    expect(res.body.currentVersion).toBe(1);
    expect(res.body.expectedVersion).toBe(0);
  });

  // ─── SC4: Audit log entries ──────────────────────────────────────────────
  it('SC4: successful write appears in audit log', async () => {
    const token = issueToken(capabilityService, 'auditor-agent', 'Director');

    await base
      .post('/blackboard/layers/semantic/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Audit test', messageId: 'audit-msg-42' })
      .expect(201);

    await new Promise(r => setTimeout(r, 50));

    const logContent = fs.readFileSync(auditLogPath, 'utf8');
    const lines = logContent.trim().split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThan(0);

    const lastEntry = JSON.parse(lines[lines.length - 1]);
    expect(lastEntry.agentId).toBe('auditor-agent');
    expect(lastEntry.layer).toBe('semantic');
    expect(lastEntry.messageId).toBe('audit-msg-42');
    expect(lastEntry.operation).toBe('write');
    expect(lastEntry.timestamp).toBeDefined();
    expect(lastEntry.entryContentHash).toBeDefined();
  });

  it('SC4b: rejected writes appear in audit log with rejectionReason', async () => {
    const token = issueToken(capabilityService, 'reject-agent', 'Director');
    const largeContent = 'word '.repeat(2500);
    await base
      .post('/blackboard/layers/core/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: largeContent })
      .expect(413);

    await new Promise(r => setTimeout(r, 50));

    const logContent = fs.readFileSync(auditLogPath, 'utf8');
    const lines = logContent.trim().split('\n').filter(Boolean);
    const lastEntry = JSON.parse(lines[lines.length - 1]);

    expect(lastEntry.agentId).toBe('reject-agent');
    expect(lastEntry.layer).toBe('core');
    expect(lastEntry.operation).toBe('reject');
    expect(lastEntry.rejectionReason).toBeDefined();
  });

  // ─── SC5: Snapshot restore ───────────────────────────────────────────────
  it('SC5: state restored from snapshot after restart', async () => {
    const token = issueToken(capabilityService, 'persist-agent', 'Director');

    await base
      .post('/blackboard/layers/core/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Persistent data' })
      .expect(201);

    const snapshotPath = path.join(dataDir, 'blackboard.json');
    const snapshotState = {
      schemaVersion: '1.0',
      timestamp: new Date().toISOString(),
      state: {
        core: {
          entries: [
            {
              id: 'restored-id',
              agentId: 'restorer',
              timestamp: new Date().toISOString(),
              content: 'Restored content',
              tokenCount: 2,
              version: 1,
              messageId: undefined,
            },
          ],
          version: 1,
        },
        scenario: { entries: [], version: 0 },
        semantic: { entries: [], version: 0 },
        procedural: { entries: [], version: 0 },
      },
    };
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshotState));

    const restoredSnapshot = new SnapshotService(dataDir);
    const restoredState = restoredSnapshot.tryRestore();

    expect(restoredState).toBeDefined();
    expect(restoredState!.core.entries).toHaveLength(1);
    expect(restoredState!.core.entries[0]!.id).toBe('restored-id');
    expect(restoredState!.core.entries[0]!.content).toBe('Restored content');
  });

  // ─── Additional coverage ───────────────────────────────────────────────────
  it('health endpoint returns ok', async () => {
    const res = await base.get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  it('audit endpoint returns entries', async () => {
    const token = issueToken(capabilityService, 'audit-test', 'Director');
    await base
      .post('/blackboard/layers/procedural/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Audit endpoint test' })
      .expect(201);

    await new Promise(r => setTimeout(r, 50));

    const res = await base.get('/blackboard/audit?agentId=audit-test').expect(200);
    expect(res.body.entries).toBeDefined();
    expect(Array.isArray(res.body.entries)).toBe(true);
  });

  it('Authorization header required on POST (no X-Agent-ID fallback)', async () => {
    const res = await base
      .post('/blackboard/layers/core/entries')
      .send({ content: 'test' })
      .expect(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('invalid layer returns 400', async () => {
    const token = issueToken(capabilityService, 'test', 'Director');
    const res = await base
      .post('/blackboard/layers/invalid/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'test' })
      .expect(400);
    expect(res.body.error).toBe('Bad Request');
  });
});
