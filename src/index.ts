import 'dotenv/config';
import { createApp } from './app.js';
import { createServer } from 'http';
import { pino } from 'pino';
import { BlackboardService } from './services/blackboard.js';
import { SnapshotService } from './services/snapshot.js';
import { AuditLogService } from './services/auditLog.js';
import { createCapabilityService } from './services/capability.js';
import { RouterService } from './services/router.js';
import { MemoryManagerService } from './services/memoryManager.js';
import { createLlmProvider } from './services/llm.js';
import { DramaSession } from './session.js';
import { SessionRegistry } from './services/sessionRegistry.js';
import { config } from './config.js';
import { setAuditLog as setBlackboardAuditLog } from './routes/blackboard.js';
import { setAuditLog as setAuditRouterAuditLog } from './routes/audit.js';
import { setSnapshotService } from './routes/blackboard.js';
import { setCapabilityService as setAgentsCapabilityService } from './routes/agents.js';
import { setCapabilityService as setBlackboardCapabilityService } from './routes/blackboard.js';

const logger = pino({ level: config.LOG_LEVEL });

// ---------------------------------------------------------------------------
// Initialize all services from config
// ---------------------------------------------------------------------------

// 1. Snapshot service (must be created before blackboard for tryRestore)
const snapshotService = new SnapshotService(config.BLACKBOARD_DATA_DIR);

// 2. Audit log service
const auditLogService = new AuditLogService(config.BLACKBOARD_DATA_DIR);

// 3. Blackboard service (restore from snapshot if available)
const initialState = snapshotService.tryRestore();
const blackboardService = new BlackboardService(initialState);

// 4. Wire audit log into route handlers
setBlackboardAuditLog(auditLogService);
setAuditRouterAuditLog(auditLogService);

// 5. Wire snapshot service into route handlers
setSnapshotService(snapshotService);

// 6. Capability service
const capabilityService = createCapabilityService();
setAgentsCapabilityService(capabilityService);
setBlackboardCapabilityService(capabilityService);

// 6.5. Session registry (in-memory storage for sessions)
const sessionRegistry = new SessionRegistry();

// 7. Create httpServer + app, wire services
const app = createApp({
  logger,
  config,
  blackboard: blackboardService,
  capabilityService,
  routerService: null as any, // Will be initialized after httpServer
  sessionRegistry,
});

const httpServer = createServer(app);

// 8. Socket.IO router (also handles heartbeat, timeout, reconnect)
const routerService = new RouterService(httpServer, logger, {
  port: config.SOCKET_PORT,
  heartbeatIntervalMs: config.HEARTBEAT_INTERVAL_MS,
  actorTimeoutMs: config.ACTOR_TIMEOUT_MS,
  actorRetryTimeoutMs: config.ACTOR_RETRY_TIMEOUT_MS,
  gracePeriodMs: config.SOCKET_GRACE_PERIOD_MS,
  sceneTimeoutMs: config.SCENE_TIMEOUT_MS,
});

app.locals.routerService = routerService;
app.locals.blackboardService = blackboardService;

// 9. Memory manager (initialized with blackboard + LLM provider for folding)
//    Budgets are configured via LAYER_BUDGETS in types/blackboard.ts
const llmProvider = await createLlmProvider(logger);
const memoryManager = new MemoryManagerService({
  blackboard: blackboardService,
  llmProvider,
  logger,
  alertCallback: (layer, metadata) => {
    logger.warn({ layer, usagePct: metadata.usagePct }, 'Memory alert: layer approaching budget');
  },
  foldCallback: (layer, metadata) => {
    logger.info({ layer, foldedEntryCount: metadata.foldedEntryCount, summaryEntryId: metadata.summaryEntryId }, 'Memory fold completed');
  },
  promoteCallback: (metadata) => {
    logger.info({ sourceScenarioEntryId: metadata.sourceScenarioEntryId, targetCoreEntryId: metadata.targetCoreEntryId, promotedBy: metadata.promotedBy }, 'Scenario entry promoted to core');
  },
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

httpServer.listen(config.PORT, '0.0.0.0', () => {
  logger.info({
    port: config.PORT,
    socketPort: config.SOCKET_PORT,
    logLevel: config.LOG_LEVEL,
    snapshotRestored: !!initialState,
  }, 'blackboard service started');
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

const shutdown = async () => {
  logger.info('shutting down...');
  snapshotService.stopTimer();
  routerService.stop();
  await auditLogService.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
