import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import express = require('express');
import { blackboardRouter, setAuditLog as setBlackboardAuditLog } from '../src/routes/blackboard.js';
import { auditRouter, setAuditLog as setAuditRouterAuditLog } from '../src/routes/audit.js';
import { healthRouter } from '../src/routes/health.js';
import { BlackboardService } from '../src/services/blackboard.js';
import { SnapshotService } from '../src/services/snapshot.js';
import { AuditLogService } from '../src/services/auditLog.js';
import { setSnapshotService } from '../src/routes/blackboard.js';

// Helper: create a fully wired app for testing
function createTestApp(dataDir: string) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const snapshotService = new SnapshotService(dataDir);
  const auditLogService = new AuditLogService(dataDir);
  const blackboardService = new BlackboardService(snapshotService.tryRestore());

  setBlackboardAuditLog(auditLogService);
  setAuditRouterAuditLog(auditLogService);
  setSnapshotService(snapshotService);

  // Wire blackboard service into app.locals so routes can access it
  app.locals.blackboard = blackboardService;

  app.use('/blackboard/audit', auditRouter);
  app.use('/blackboard', blackboardRouter);
  app.use('/health', healthRouter);

  return { app, snapshotService, auditLogService, blackboardService };
}

describe('Blackboard REST API — Phase 1 Success Criteria', () => {
  let dataDir: string;
  let base: ReturnType<typeof request.Supertest.prototype>;
  let snapshotService: SnapshotService;
  let auditLogPath: string;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blackboard-test-'));
    const { app, snapshotService: ss } = createTestApp(dataDir);
    base = request(app);
    snapshotService = ss;
    auditLogPath = path.join(dataDir, `audit-${new Date().toISOString().slice(0, 10)}.jsonl`);
  });

  afterEach(() => {
    // Stop timer and clean up
    try { snapshotService.stopTimer(); } catch {}
    try { fs.rmSync(dataDir, { recursive: true }); } catch {}
  });

  // ─── SC1: Write-read roundtrip ────────────────────────────────────────────
  it('SC1: write then read returns the same entry', async () => {
    const payload = { content: 'Hello world from test agent', messageId: 'msg-001' };

    const postRes = await base
      .post('/blackboard/layers/core/entries')
      .set('X-Agent-ID', 'test-agent')
      .send(payload)
      .expect(201);

    expect(postRes.body.entry.content).toBe(payload.content);
    expect(postRes.body.entry.agentId).toBe('test-agent');
    expect(postRes.body.entry.messageId).toBe('msg-001');
    expect(postRes.body.entry.id).toBeDefined();
    expect(postRes.body.layerVersion).toBe(1);

    const getRes = await base
      .get(`/blackboard/layers/core/entries/${postRes.body.entry.id}`)
      .expect(200);

    expect(getRes.body.entry.content).toBe(payload.content);
    expect(getRes.body.currentVersion).toBe(1);
  });

  // ─── SC2: Token budget enforcement ────────────────────────────────────────
  it('SC2: write exceeding layer budget returns 413', async () => {
    // Core layer: 2000 tokens. 'word ' is ~1 token, so 2500 words ≈ 2500 tokens.
    const largeContent = 'word '.repeat(2500);

    const res = await base
      .post('/blackboard/layers/core/entries')
      .set('X-Agent-ID', 'test-agent')
      .send({ content: largeContent })
      .expect(413);

    expect(res.body.error).toBe('Payload Too Large');
    expect(res.body.tokenBudget).toBe(2000);
    expect(res.body.currentTokenCount).toBe(0);
    expect(res.body.attemptedEntryTokens).toBeGreaterThan(2000);
  });

  // ─── SC3: Optimistic locking version conflict ─────────────────────────────
  it('SC3: stale expectedVersion returns 409', async () => {
    // First write succeeds
    await base
      .post('/blackboard/layers/scenario/entries')
      .set('X-Agent-ID', 'agent-a')
      .send({ content: 'First write' })
      .expect(201);

    // Second write with wrong expectedVersion → 409
    const res = await base
      .post('/blackboard/layers/scenario/entries')
      .set('X-Agent-ID', 'agent-b')
      .send({ content: 'Conflicting write', expectedVersion: 0 }) // should be 1
      .expect(409);

    expect(res.body.error).toBe('Conflict');
    expect(res.body.currentVersion).toBe(1);
    expect(res.body.expectedVersion).toBe(0);
  });

  // ─── SC4: Audit log entries ──────────────────────────────────────────────
  it('SC4: successful write appears in audit log', async () => {
    await base
      .post('/blackboard/layers/semantic/entries')
      .set('X-Agent-ID', 'auditor-agent')
      .send({ content: 'Audit test', messageId: 'audit-msg-42' })
      .expect(201);

    // Wait for async write to complete
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
    // Write exceeds budget → rejected
    const largeContent = 'word '.repeat(2500);
    await base
      .post('/blackboard/layers/core/entries')
      .set('X-Agent-ID', 'reject-agent')
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
    // Write an entry
    await base
      .post('/blackboard/layers/core/entries')
      .set('X-Agent-ID', 'persist-agent')
      .send({ content: 'Persistent data' })
      .expect(201);

    // Manually trigger snapshot save
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

    // Create new snapshot service and restore
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
    // Write something first
    await base
      .post('/blackboard/layers/procedural/entries')
      .set('X-Agent-ID', 'audit-test')
      .send({ content: 'Audit endpoint test' })
      .expect(201);

    await new Promise(r => setTimeout(r, 50));

    const res = await base.get('/blackboard/audit?agentId=audit-test').expect(200);
    expect(res.body.entries).toBeDefined();
    expect(Array.isArray(res.body.entries)).toBe(true);
  });

  it('X-Agent-ID required on POST', async () => {
    const res = await base
      .post('/blackboard/layers/core/entries')
      .send({ content: 'test' })
      .expect(400);
    expect(res.body.message).toContain('X-Agent-ID');
  });

  it('invalid layer returns 400', async () => {
    const res = await base
      .post('/blackboard/layers/invalid/entries')
      .set('X-Agent-ID', 'test')
      .send({ content: 'test' })
      .expect(400);
    expect(res.body.error).toBe('Bad Request');
  });
});
