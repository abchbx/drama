import * as express from 'express';
import { pino } from 'pino';
import { blackboardRouter } from './routes/blackboard.js';
import { healthRouter } from './routes/health.js';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  // Simple request logging middleware using pino
  app.use((req, _res, next) => {
    logger.info({ method: req.method, url: req.url }, 'incoming request');
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

  app.use('/blackboard', blackboardRouter);
  app.use('/health', healthRouter);

  return app;
}
