import { describe, it, expect, beforeEach } from 'vitest';
import express = require('express');
import request from 'supertest';

describe('sessions routes', () => {
  let app: express.Application;
  let registry: any;

  beforeEach(async () => {
    // Import dynamically to avoid issues
    const { SessionRegistry } = await import('../../src/services/sessionRegistry.js');
    const { sessionsRouter } = await import('../../src/routes/sessions.js');
    const { BlackboardService } = await import('../../src/services/blackboard.js');
    const { RouterService } = await import('../../src/services/router.js');
    const { createServer } = await import('http');

    registry = new SessionRegistry();
    
    // Create minimal mock services
    const blackboard = new BlackboardService(null);
    const httpServer = createServer();
    const { pino } = await import('pino');
    const logger = pino({ level: 'silent' });
    const router = new RouterService(httpServer, logger, {
      port: 0,
      heartbeatIntervalMs: 5000,
      actorTimeoutMs: 30000,
      actorRetryTimeoutMs: 10000,
      gracePeriodMs: 10000,
      sceneTimeoutMs: 60000,
    });

    app = express();
    app.use(express.json());
    // Mount the router with the registry in app.locals
    (app as any).locals.sessionRegistry = registry;
    (app as any).locals.blackboardService = blackboard;
    (app as any).locals.routerService = router;
    (app as any).locals.config = {
      SCENE_TIMEOUT_MS: 60000,
      ACTOR_TIMEOUT_MS: 30000,
      LOG_LEVEL: 'silent',
    };
    app.use('/sessions', sessionsRouter);
  });

  describe('GET /sessions', () => {
    it('should return list of all sessions', async () => {
      registry.create({ name: 'Session 1', sceneDurationMinutes: 5, agentCount: 2 });
      registry.create({ name: 'Session 2', sceneDurationMinutes: 10, agentCount: 3 });

      const res = await request(app).get('/sessions').expect(200);

      expect(res.body).toHaveProperty('sessions');
      expect(res.body.sessions).toHaveLength(2);
    });

    it('should return empty list when no sessions exist', async () => {
      const res = await request(app).get('/sessions').expect(200);

      expect(res.body.sessions).toEqual([]);
    });
  });

  describe('GET /sessions/:id', () => {
    it('should return session by dramaId', async () => {
      const session = registry.create({
        name: 'Test Session',
        sceneDurationMinutes: 10,
        agentCount: 3,
      });

      const res = await request(app).get(`/sessions/${session.dramaId}`).expect(200);

      expect(res.body.dramaId).toBe(session.dramaId);
      expect(res.body.name).toBe('Test Session');
    });

    it('should return 404 for non-existent session', async () => {
      const res = await request(app).get('/sessions/non-existent').expect(404);
      expect(res.body.error).toBe('Session not found');
    });
  });

  describe('POST /sessions', () => {
    it('should create a new session', async () => {
      const { SessionStatus } = await import('../../src/types/session.js');

      const res = await request(app)
        .post('/sessions')
        .send({
          name: 'New Session',
          sceneDurationMinutes: 15,
          agentCount: 4,
        })
        .expect(201);

      expect(res.body).toHaveProperty('dramaId');
      expect(res.body.name).toBe('New Session');
      expect(res.body.status).toBe(SessionStatus.CREATED);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/sessions')
        .send({ name: 'Incomplete' })
        .expect(400);

      expect(res.body.error).toBeDefined();
    });
  });

  describe('POST /sessions/:id/scene/start', () => {
    it('should start a scene on the session', async () => {
      const { SessionStatus } = await import('../../src/types/session.js');

      const session = registry.create({
        name: 'Test Session',
        sceneDurationMinutes: 10,
        agentCount: 3,
      });

      const res = await request(app)
        .post(`/sessions/${session.dramaId}/scene/start`)
        .expect(200);

      expect(res.body.status).toBe(SessionStatus.RUNNING);
      expect(res.body).toHaveProperty('sceneId');
    });

    it('should return 404 for non-existent session', async () => {
      const res = await request(app)
        .post('/sessions/non-existent/scene/start')
        .expect(404);

      expect(res.body.error).toBe('Session not found');
    });

    it('should return 409 if session is already running', async () => {
      const session = registry.create({
        name: 'Test Session',
        sceneDurationMinutes: 10,
        agentCount: 3,
      });

      await request(app)
        .post(`/sessions/${session.dramaId}/scene/start`)
        .expect(200);

      const res = await request(app)
        .post(`/sessions/${session.dramaId}/scene/start`)
        .expect(409);

      expect(res.body.error).toContain('already running');
    });
  });

  describe('POST /sessions/:id/scene/stop', () => {
    it('should stop a running scene with completed status', async () => {
      const { SessionStatus } = await import('../../src/types/session.js');

      const session = registry.create({
        name: 'Test Session',
        sceneDurationMinutes: 10,
        agentCount: 3,
      });

      // Start a scene first
      await request(app)
        .post(`/sessions/${session.dramaId}/scene/start`)
        .expect(200);

      const res = await request(app)
        .post(`/sessions/${session.dramaId}/scene/stop`)
        .send({ status: 'completed' })
        .expect(200);

      expect(res.body.status).toBe(SessionStatus.COMPLETED);
    });

    it('should stop a running scene with interrupted status', async () => {
      const { SessionStatus } = await import('../../src/types/session.js');

      const session = registry.create({
        name: 'Test Session',
        sceneDurationMinutes: 10,
        agentCount: 3,
      });

      await request(app)
        .post(`/sessions/${session.dramaId}/scene/start`)
        .expect(200);

      const res = await request(app)
        .post(`/sessions/${session.dramaId}/scene/stop`)
        .send({ status: 'interrupted' })
        .expect(200);

      expect(res.body.status).toBe(SessionStatus.INTERRUPTED);
    });

    it('should return 404 for non-existent session', async () => {
      const res = await request(app)
        .post('/sessions/non-existent/scene/stop')
        .send({ status: 'completed' })
        .expect(404);

      expect(res.body.error).toBe('Session not found');
    });

    it('should return 409 if session is not running', async () => {
      const session = registry.create({
        name: 'Test Session',
        sceneDurationMinutes: 10,
        agentCount: 3,
      });

      const res = await request(app)
        .post(`/sessions/${session.dramaId}/scene/stop`)
        .send({ status: 'completed' })
        .expect(409);

      expect(res.body.error).toContain('not running');
    });
  });
});
