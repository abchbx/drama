import 'dotenv/config';
import { createApp } from './app.js';
import { createServer } from 'http';
import { pino } from 'pino';
import { BlackboardService } from './services/blackboard.js';
import { SnapshotService } from './services/snapshot.js';
import { AuditLogService } from './services/auditLog.js';
import { createCapabilityService } from './services/capability.js';
import { RouterService } from './services/router.js';
import { setAuditLog as setBlackboardAuditLog } from './routes/blackboard.js';
import { setAuditLog as setAuditRouterAuditLog } from './routes/audit.js';
import { setSnapshotService } from './routes/blackboard.js';
import { setCapabilityService as setAgentsCapabilityService } from './routes/agents.js';
import { setCapabilityService as setBlackboardCapabilityService } from './routes/blackboard.js';

const app = createApp();

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

// 5b. Capability service
const capabilityService = createCapabilityService();
setAgentsCapabilityService(capabilityService);
setBlackboardCapabilityService(capabilityService);

// 6. Create httpServer + app, wire services
const httpServer = createServer(app);

// 7. Socket.IO router (also handles heartbeat, timeout, reconnect)
const socketPort = parseInt(process.env.SOCKET_PORT ?? '3001', 10);
const routerService = new RouterService(httpServer, pino({ level: process.env.LOG_LEVEL ?? 'info' }), {
  port: socketPort,
  heartbeatIntervalMs: parseInt(process.env.HEARTBEAT_INTERVAL_MS ?? '5000', 10),
  actorTimeoutMs: parseInt(process.env.ACTOR_TIMEOUT_MS ?? '30000', 10),
  actorRetryTimeoutMs: parseInt(process.env.ACTOR_RETRY_TIMEOUT_MS ?? '15000', 10),
  gracePeriodMs: parseInt(process.env.SOCKET_GRACE_PERIOD_MS ?? '10000', 10),
  sceneTimeoutMs: parseInt(process.env.SCENE_TIMEOUT_MS ?? '300000', 10),
});

// 8. Wire blackboard service into app.locals so route handlers can access it
app.locals.blackboard = blackboardService;
app.locals.capabilityService = capabilityService;
app.locals.routerService = routerService;

// 9. Start listening
httpServer.listen(PORT, () => {
  logger.info({ port: PORT, socketPort, snapshotRestored: !!initialState }, 'blackboard service started');
});

// 10. Graceful shutdown: flush snapshot before exit
const shutdown = async () => {
  logger.info('shutting down...');
  snapshotService.stopTimer();
  routerService.stop();
  await auditLogService.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
