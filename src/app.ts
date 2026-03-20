import express = require('express');
import type pino from 'pino';
import { blackboardRouter } from './routes/blackboard.js';
import { auditRouter } from './routes/audit.js';
import { healthRouter } from './routes/health.js';
import { agentsRouter } from './routes/agents.js';
import type { BlackboardService } from './services/blackboard.js';
import type { CapabilityService } from './services/capability.js';
import type { RouterService } from './services/router.js';
import type { DramaSession } from './session.js';

export interface AppServices {
  logger: pino.Logger;
  blackboard: BlackboardService;
  capabilityService: CapabilityService;
  routerService: RouterService;
  dramaSession?: DramaSession;
}

export function createApp(services: AppServices) {
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  // Simple request logging middleware using pino
  app.use((req, _res, next) => {
    services.logger.info({ method: req.method, url: req.url }, 'incoming request');
    next();
  });

  // X-Agent-ID extraction middleware — required on mutating requests
  app.use((req, _res, next) => {
    if (req.method === 'GET' || req.method === 'DELETE') return next();
    if (!req.headers['x-agent-id'] && req.method === 'POST') {
      // Will be handled by individual route handlers; middleware just passes through
    }
    next();
  });

  // Mount routes — audit BEFORE blackboard layers to avoid :layer treating 'audit' as a layer
  app.use('/blackboard/audit', auditRouter);
  app.use('/blackboard', blackboardRouter);
  app.use('/blackboard/agents', agentsRouter);
  app.use('/health', healthRouter);

  // Expose services via app.locals
  app.locals.logger = services.logger;
  app.locals.blackboard = services.blackboard;
  app.locals.capabilityService = services.capabilityService;
  app.locals.routerService = services.routerService;

  return app;
}
