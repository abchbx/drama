import { Router } from 'express';
import * as fs from 'node:fs';
import * as path from 'node:path';

import 'dotenv/config';

const DATA_DIR = process.env.BLACKBOARD_DATA_DIR ?? './data';

export const healthRouter = Router();

healthRouter.get('/', (req, res) => {
  const snapshotPath = path.join(DATA_DIR, 'blackboard.json');
  const snapshotExists = fs.existsSync(snapshotPath);
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    snapshotLoaded: snapshotExists,
  });
});
