import 'dotenv/config';
import { createApp } from './app.js';
import { pino } from 'pino';
import { BlackboardService } from './services/blackboard.js';
import { SnapshotService } from './services/snapshot.js';
import { AuditLogService } from './services/auditLog.js';
import { setAuditLog as setBlackboardAuditLog } from './routes/blackboard.js';
import { setAuditLog as setAuditRouterAuditLog } from './routes/audit.js';
import { setSnapshotService } from './routes/blackboard.js';

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' });

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const DATA_DIR = process.env.BLACKBOARD_DATA_DIR ?? './data';

// 1. Snapshot service (must be created before blackboard for tryRestore)
const snapshotService = new SnapshotService(DATA_DIR);

// 2. Audit log service
const auditLogService = new AuditLogService(DATA_DIR);

// 3. Blackboard service (restore from snapshot if available)
const initialState = snapshotService.tryRestore();
const blackboardService = new BlackboardService(initialState);

// 4. Wire audit log into route handlers
setBlackboardAuditLog(auditLogService);
setAuditRouterAuditLog(auditLogService);

// 5. Wire snapshot service into route handlers
setSnapshotService(snapshotService);

// 6. Create and start app
const app = createApp();

// Wire blackboard service into app.locals so route handlers can access it
app.locals.blackboard = blackboardService;

app.listen(PORT, () => {
  logger.info({ port: PORT, snapshotRestored: !!initialState }, 'blackboard service started');
});

// 7. Graceful shutdown: flush snapshot before exit
const shutdown = async () => {
  logger.info('shutting down...');
  snapshotService.stopTimer();
  await auditLogService.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
