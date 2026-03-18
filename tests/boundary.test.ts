// Load env vars so createCapabilityService works in tests
import 'dotenv/config';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import jwt from 'jsonwebtoken';

import express = require('express');
import { blackboardRouter, setAuditLog as setBlackboardAuditLog, setSnapshotService, setCapabilityService as setBlackboardCapabilityService } from '../src/routes/blackboard.js';
import { agentsRouter, setCapabilityService as setAgentsCapabilityService } from '../src/routes/agents.js';
import { auditRouter, setAuditLog as setAuditRouterAuditLog } from '../src/routes/audit.js';
import { healthRouter } from '../src/routes/health.js';
import { BlackboardService } from '../src/services/blackboard.js';
import { SnapshotService } from '../src/services/snapshot.js';
import { AuditLogService } from '../src/services/auditLog.js';
import { createCapabilityService, type AgentRole } from '../src/services/capability.js';
import { BoundaryViolationError } from '../src/types/blackboard.js';

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
  setAgentsCapabilityService(capabilityService);
  setBlackboardCapabilityService(capabilityService);

  app.locals.blackboard = blackboardService;
  app.locals.capabilityService = capabilityService;

  app.use('/blackboard/audit', auditRouter);
  app.use('/blackboard', blackboardRouter);
  app.use('/blackboard/agents', agentsRouter);
  app.use('/health', healthRouter);

  return { app, snapshotService, auditLogService, blackboardService, capabilityService };
}

// Helper: register an agent and return the token
async function getToken(
  base: request.SuperTest<request.Test>,
  agentId: string,
  role: AgentRole,
): Promise<string> {
  const res = await base
    .post('/blackboard/agents/register')
    .send({ agentId, role })
    .expect(200);
  return res.body.token as string;
}

describe('Phase 2: Cognitive Boundary Control — Boundary Enforcement Tests', () => {
  let dataDir: string;
  let base: request.SuperTest<request.Test>;
  let snapshotService: SnapshotService;
  let auditLogPath: string;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blackboard-boundary-test-'));
    const { app, snapshotService: ss } = createTestApp(dataDir);
    base = request(app);
    snapshotService = ss;
    auditLogPath = path.join(dataDir, `audit-${new Date().toISOString().slice(0, 10)}.jsonl`);
  });

  afterEach(() => {
    try { snapshotService.stopTimer(); } catch { /* ignore */ }
    try { fs.rmSync(dataDir, { recursive: true }); } catch { /* ignore */ }
  });

  // ─── BOUND-01: Actor write to core → 403 CAPABILITY_CLOSED ──────────────
  it('BOUND-01: Actor POST to core layer is rejected with 403 CAPABILITY_CLOSED', async () => {
    const token = await getToken(base, 'actor-01', 'Actor');

    const res = await base
      .post('/blackboard/layers/core/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Actor tries to write to core' })
      .expect(403);

    expect(res.body.violationType).toBe('CAPABILITY_CLOSED');
    expect(res.body.targetLayer).toBe('core');
    expect(res.body.operation).toBe('write');
    expect(res.body.error).toBe('Forbidden');
    expect(res.body.allowedLayers).toContain('semantic');
    expect(res.body.allowedLayers).toContain('procedural');
    expect(res.body.allowedLayers).not.toContain('core');
  });

  // ─── BOUND-01b: Actor write to scenario → 403 CAPABILITY_CLOSED ──────────
  it('BOUND-01b: Actor POST to scenario layer is rejected with 403 CAPABILITY_CLOSED', async () => {
    const token = await getToken(base, 'actor-02', 'Actor');

    const res = await base
      .post('/blackboard/layers/scenario/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Actor tries to write to scenario' })
      .expect(403);

    expect(res.body.violationType).toBe('CAPABILITY_CLOSED');
    expect(res.body.targetLayer).toBe('scenario');
  });

  // ─── BOUND-01c: Actor write to semantic → 201 allowed ─────────────────────
  it('BOUND-01c: Actor POST to semantic layer succeeds with 201', async () => {
    const token = await getToken(base, 'actor-03', 'Actor');

    const res = await base
      .post('/blackboard/layers/semantic/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Actor writes to semantic layer', messageId: 'actor-semantic-msg' })
      .expect(201);

    expect(res.body.entry.content).toBe('Actor writes to semantic layer');
    expect(res.body.entry.agentId).toBe('actor-03');
  });

  // ─── BOUND-02: Actor read of full blackboard → 403 NAMESPACE_VIOLATION ────
  it('BOUND-02: Actor GET /layers/core/entries returns 403 NAMESPACE_VIOLATION', async () => {
    const token = await getToken(base, 'actor-04', 'Actor');

    const res = await base
      .get('/blackboard/layers/core/entries')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(res.body.violationType).toBe('NAMESPACE_VIOLATION');
    expect(res.body.targetLayer).toBe('core');
    expect(res.body.operation).toBe('read');
  });

  it('BOUND-02b: Actor GET /layers/scenario/entries returns 403 NAMESPACE_VIOLATION', async () => {
    const token = await getToken(base, 'actor-05', 'Actor');

    const res = await base
      .get('/blackboard/layers/scenario/entries')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(res.body.violationType).toBe('NAMESPACE_VIOLATION');
    expect(res.body.targetLayer).toBe('scenario');
  });

  // ─── BOUND-02c: Actor GET /me/scope → 200 with null fields ────────────────
  it('BOUND-02c: GET /me/scope as Actor returns 200 with null fields when no data exists', async () => {
    const token = await getToken(base, 'actor-06', 'Actor');

    const res = await base
      .get('/blackboard/agents/me/scope')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.character_card).toBeNull();
    expect(res.body.current_scene).toBeNull();
    expect(res.body.full_access).toBeUndefined();
  });

  // ─── BOUND-03: Actor can read semantic layer via scoped endpoint ──────────
  // Note: /me/scope reads entry ID 'current_scene' from semantic — Phase 3 will add
  // characterCardFor tagging. For Phase 2, verify Actor can call /me/scope successfully.
  it('BOUND-03: Actor GET /me/scope succeeds with valid token', async () => {
    const token = await getToken(base, 'actor-07', 'Actor');

    const res = await base
      .get('/blackboard/agents/me/scope')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    // Phase 2: /me/scope returns null fields; Phase 3 will add characterCardFor lookup
    expect(res.body.character_card).toBeNull();
    expect(res.body.current_scene).toBeNull();
  });

  // ─── BOUND-04: No Authorization header → 401 ─────────────────────────────
  it('BOUND-04: POST without Authorization header returns 401 Unauthorized', async () => {
    const res = await base
      .post('/blackboard/layers/core/entries')
      .send({ content: 'No auth header' })
      .expect(401);

    expect(res.body.error).toBe('Unauthorized');
    expect(res.body.message).toContain('Missing or invalid Authorization header');
  });

  // ─── BOUND-04b: Director POST to core → 201 (full access) ─────────────────
  it('BOUND-04b: Director POST to core layer succeeds with 201', async () => {
    const token = await getToken(base, 'director-02', 'Director');

    const res = await base
      .post('/blackboard/layers/core/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Director writes to core', messageId: 'director-core-msg' })
      .expect(201);

    expect(res.body.entry.content).toBe('Director writes to core');
    expect(res.body.entry.agentId).toBe('director-02');
  });

  // ─── BOUND-04c: Violation logged to audit log ────────────────────────────
  it('BOUND-04c: Actor attempted core write creates audit log violation entry', async () => {
    const token = await getToken(base, 'actor-violation', 'Actor');

    await base
      .post('/blackboard/layers/core/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Actor violates boundary' })
      .expect(403);

    // Wait for async audit log write
    await new Promise(r => setTimeout(r, 50));

    const logContent = fs.readFileSync(auditLogPath, 'utf8');
    const lines = logContent.trim().split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThan(0);

    const violationEntry = lines
      .map(l => JSON.parse(l))
      .find(e => e.operation === 'violation' && e.violationType === 'CAPABILITY_CLOSED');

    expect(violationEntry).toBeDefined();
    expect(violationEntry!.agentId).toBe('actor-violation');
    expect(violationEntry!.role).toBe('Actor');
    expect(violationEntry!.layer).toBe('core');
    expect(violationEntry!.operation).toBe('violation');
    expect(violationEntry!.violationType).toBe('CAPABILITY_CLOSED');
  });

  // ─── BOUND-04d: Director GET /me/scope → full_access ─────────────────────
  it('BOUND-04d: Director GET /me/scope returns full_access: true', async () => {
    const token = await getToken(base, 'director-03', 'Director');

    const res = await base
      .get('/blackboard/agents/me/scope')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.full_access).toBe(true);
  });

  // ─── Additional: BoundaryViolationError class instantiation ───────────────
  it('BoundaryViolationError class is correctly instantiated', () => {
    const err = new BoundaryViolationError(
      'CAPABILITY_CLOSED',
      'core',
      'write',
      ['semantic', 'procedural'],
    );

    expect(err.name).toBe('BoundaryViolationError');
    expect(err.violationType).toBe('CAPABILITY_CLOSED');
    expect(err.targetLayer).toBe('core');
    expect(err.operation).toBe('write');
    expect(err.allowedLayers).toEqual(['semantic', 'procedural']);
    expect(err.message).toContain('Boundary violation');
    expect(err.message).toContain('write');
    expect(err.message).toContain('core');
    expect(err.message).toContain('CAPABILITY_CLOSED');
  });

  // ─── Additional: JWT token can be decoded ─────────────────────────────────
  it('JWT token can be decoded without verify', async () => {
    const token = await getToken(base, 'jwt-test-agent', 'Actor');

    const decoded = jwt.decode(token) as { agentId: string; role: string; iat: number };
    expect(decoded.agentId).toBe('jwt-test-agent');
    expect(decoded.role).toBe('Actor');
    expect(decoded.iat).toBeDefined();
  });

  // ─── Additional: Admin has full access ───────────────────────────────────
  it('Admin POST to all layers succeeds (full access)', async () => {
    const token = await getToken(base, 'admin-01', 'Admin');

    for (const layer of ['core', 'scenario', 'semantic', 'procedural']) {
      const res = await base
        .post(`/blackboard/layers/${layer}/entries`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: `Admin writes to ${layer}` })
        .expect(201);
      expect(res.body.entry.content).toBe(`Admin writes to ${layer}`);
    }
  });

  // ─── Additional: Actor can write to procedural layer ─────────────────────
  it('Actor POST to procedural layer succeeds', async () => {
    const token = await getToken(base, 'actor-procedural', 'Actor');

    const res = await base
      .post('/blackboard/layers/procedural/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Actor writes to procedural' })
      .expect(201);

    expect(res.body.entry.content).toBe('Actor writes to procedural');
  });

  // ─── Additional: Invalid token → 401 ─────────────────────────────────────
  it('Invalid JWT token returns 401 Unauthorized', async () => {
    const res = await base
      .get('/blackboard/layers/core/entries')
      .set('Authorization', 'Bearer invalid.token.here')
      .expect(401);

    expect(res.body.error).toBe('Unauthorized');
  });
});
