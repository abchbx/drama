import { Router } from 'express';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const healthRouter = Router();

healthRouter.get('/', (req, res) => {
  const dataDir = (req.app.locals.config as { BLACKBOARD_DATA_DIR?: string } | undefined)?.BLACKBOARD_DATA_DIR ?? './data';
  const snapshotPath = path.join(dataDir, 'blackboard.json');
  const snapshotExists = fs.existsSync(snapshotPath);
  const routerService = req.app.locals.routerService as unknown;

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    snapshotLoaded: snapshotExists,
    services: {
      blackboard: 'connected',
      router: routerService ? 'connected' : 'disconnected',
      capability: 'connected',
      memory: 'connected',
    },
    config: {
      llmProvider: (req.app.locals.config as { LLM_PROVIDER?: string; LOG_LEVEL?: string } | undefined)?.LLM_PROVIDER,
      logLevel: (req.app.locals.config as { LLM_PROVIDER?: string; LOG_LEVEL?: string } | undefined)?.LOG_LEVEL,
    },
  });
});
