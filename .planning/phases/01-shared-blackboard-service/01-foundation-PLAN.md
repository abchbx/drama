---
phase: 01-shared-blackboard-service
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - tsconfig.json
  - .env
  - .env.example
  - src/types/blackboard.ts
  - src/services/blackboard.ts
  - src/routes/blackboard.ts
  - src/app.ts
  - src/index.ts
autonomous: true
requirements:
  - BLKB-01
  - BLKB-02
  - BLKB-03

must_haves:
  truths:
    - "Agent can write an entry to any layer via REST API and read it back"
    - "Token budget enforcement: write exceeding layer budget is rejected with 413"
    - "Concurrent writes to same layer: one succeeds, one gets 409 version conflict"
  artifacts:
    - path: "src/services/blackboard.ts"
      provides: "Core business logic: four-layer model, token counting, optimistic locking"
      min_lines: 200
    - path: "src/routes/blackboard.ts"
      provides: "REST API endpoints for all layer operations"
      exports: ["GET", "POST", "DELETE"]
    - path: "src/types/blackboard.ts"
      provides: "Shared TypeScript interfaces for entries, requests, responses"
      exports: ["BlackboardEntry", "BlackboardLayer", "WriteEntryRequest", "WriteEntryResponse", "LayerReadResponse"]
  key_links:
    - from: "src/routes/blackboard.ts"
      to: "src/services/blackboard.ts"
      via: "imports and calls blackboardService methods"
      pattern: "blackboardService\\.(read|write|delete)"
    - from: "src/app.ts"
      to: "src/routes/blackboard.ts"
      via: "router.use() mount"
      pattern: "router\\.use.*blackboard"
    - from: "src/index.ts"
      to: "src/app.ts"
      via: "imports and calls app.listen()"
      pattern: "import.*app.*from"
---

<objective>
Build the core blackboard REST API foundation: project scaffolding, TypeScript types, blackboard service with four-layer model + optimistic locking + token budget enforcement, and Express HTTP route handlers.
</objective>

<purpose>
Establishes the complete blackboard business logic and REST API surface. No other phase can run until this exists — all agents depend on these endpoints. This plan covers BLKB-01 (REST API), BLKB-02 (token budgets), and BLKB-03 (optimistic locking).
</purpose>

<context>
@D:/Coding/ClaudeCode/drama/.planning/phases/01-shared-blackboard-service/01-CONTEXT.md
</context>

<interfaces>
<!-- Key interfaces the executor needs. Do not explore the codebase — use these directly. -->

From src/types/blackboard.ts (to be created):
```typescript
// Layer identifier — exactly four values, no others allowed
type BlackboardLayer = 'core' | 'scenario' | 'semantic' | 'procedural';

// Token budgets in tokens (not characters)
const LAYER_BUDGETS: Record<BlackboardLayer, number> = {
  core: 2000,
  scenario: 8000,
  semantic: 8000,
  procedural: 4000,
};

// Entry stored in a layer
interface BlackboardEntry {
  id: string;           // UUID v4
  agentId: string;      // from X-Agent-ID header
  messageId?: string;   // from request body
  timestamp: string;    // ISO 8601
  content: string;       // arbitrary text — blackboard does not interpret structure
  tokenCount: number;    // counted synchronously on write via Tiktoken
  version: number;      // monotonically increasing per-layer
}

// Request body for POST /blackboard/layers/:layer/entries
interface WriteEntryRequest {
  content: string;
  expectedVersion?: number;  // omit for first write; required for updates
  messageId?: string;
}

// Success response after write
interface WriteEntryResponse {
  entry: BlackboardEntry;
  layerVersion: number;      // new currentVersion after this write
}

// GET /blackboard/layers/:layer/entries response
interface LayerReadResponse {
  layer: BlackboardLayer;
  currentVersion: number;
  tokenCount: number;
  tokenBudget: number;
  budgetUsedPct: number;   // 0–100
  entries: BlackboardEntry[];
}

// GET /blackboard/layers/:layer/entries/:id response
interface EntryReadResponse {
  entry: BlackboardEntry;
  currentVersion: number;
}

// Error responses
// 400: { error: "Bad Request", message: string }
// 404: { error: "Not Found", message: string }
// 409: { error: "Conflict", message: "Version mismatch", currentVersion: number, expectedVersion: number }
// 413: { error: "Payload Too Large", message: string, tokenBudget: number, currentTokenCount: number, attemptedEntryTokens: number }
```

From src/services/blackboard.ts (to be created):
```typescript
// Constructor accepts optional initial state (for snapshot restore)
class BlackboardService {
  constructor(initialState?: BlackboardState);

  // Read operations
  readLayer(layer: BlackboardLayer): LayerReadResponse;
  readEntry(layer: BlackboardLayer, entryId: string): EntryReadResponse;

  // Write operations — throw typed errors, routes convert to HTTP responses
  writeEntry(layer: BlackboardLayer, agentId: string, req: WriteEntryRequest): WriteEntryResponse;
  // Throws: VersionConflictError | TokenBudgetExceededError | ValidationError

  // Delete
  deleteEntry(layer: BlackboardLayer, entryId: string, agentId: string): void;
  // Throws: NotFoundError

  // State export (for snapshot)
  exportState(): BlackboardState;

  // Internal token count (synchronous)
  countTokens(text: string): number;
}

// Typed errors (extend Error)
class VersionConflictError { currentVersion: number; expectedVersion: number; }
class TokenBudgetExceededError { layer: BlackboardLayer; budget: number; currentCount: number; attemptedCount: number; }
class NotFoundError { layer: BlackboardLayer; entryId: string; }
class ValidationError { message: string; }
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Project scaffolding</name>
  <files>
    package.json
    tsconfig.json
    .env
    .env.example
  </files>
  <action>
    Create a complete Node.js 20 + TypeScript project in D:/Coding/ClaudeCode/drama.

    **package.json** — create at project root with:
    - name: "drama-blackboard"
    - version: "0.1.0"
    - type: "module"
    - scripts:
      - "dev": "tsx watch src/index.ts"
      - "build": "tsc"
      - "start": "node dist/index.js"
      - "test": "vitest run"
      - "test:watch": "vitest"
    - dependencies: express@^4.19.0, zod@^3.23.0, pino@^9.0.0, pino-http@^10.0.0, @ pinojs/file-rotating-storage@^7.0.0, tiktoken@^1.0.0, uuid@^10.0.0
    - devDependencies: typescript@^5.5.0, @ types/express@^5.0.0, @ types/uuid@^10.0.0, tsx@^4.16.0, vitest@^2.0.0, supertest@^7.0.0, @ types/supertest@^6.0.0

    **tsconfig.json** — strict mode, ESNext target, Node.js 20 types:
    ```json
    {
      "compilerOptions": {
        "target": "ES2022",
        "module": "NodeNext",
        "moduleResolution": "NodeNext",
        "lib": ["ES2022"],
        "outDir": "./dist",
        "rootDir": "./src",
        "strict": true,
        "noUncheckedIndexedAccess": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "resolveJsonModule": true,
        "declaration": true
      },
      "include": ["src/**/*"],
      "exclude": ["node_modules", "dist", "tests"]
    }
    ```

    **.env** — development defaults:
    ```
    PORT=3000
    BLACKBOARD_DATA_DIR=./data
    LOG_LEVEL=info
    ```

    **.env.example** — same keys with no values (for documentation):
    ```
    PORT=3000
    BLACKBOARD_DATA_DIR=./data
    LOG_LEVEL=info
    ```
  </action>
  <verify>
    <automated>cd D:/Coding/ClaudeCode/drama && node --version && npm --version && cat package.json | grep '"type": "module"'</automated>
  </verify>
  <done>package.json, tsconfig.json, .env, .env.example created and valid; npm install has been run</done>
</task>

<task type="auto">
  <name>Task 2: TypeScript type definitions</name>
  <files>src/types/blackboard.ts</files>
  <action>
    Create D:/Coding/ClaudeCode/drama/src/types/blackboard.ts with ALL of the following exports. No implementation — types only.

    ```typescript
    // === Layer constants ===
    export const LAYER_NAMES = ['core', 'scenario', 'semantic', 'procedural'] as const;
    export type BlackboardLayer = typeof LAYER_NAMES[number];

    export const LAYER_BUDGETS: Record<BlackboardLayer, number> = {
      core: 2000,       // 2K tokens
      scenario: 8000,  // 8K tokens
      semantic: 8000,  // 8K tokens
      procedural: 4000, // 4K tokens
    } as const;

    // 60% alert threshold
    export const BUDGET_ALERT_THRESHOLD = 0.6;

    // === Entry ===
    export interface BlackboardEntry {
      id: string;
      agentId: string;
      messageId?: string;
      timestamp: string; // ISO 8601
      content: string;
      tokenCount: number;
      version: number;
    }

    // === Write request/response ===
    export interface WriteEntryRequest {
      content: string;
      expectedVersion?: number; // optimistic locking
      messageId?: string;
    }

    export interface WriteEntryResponse {
      entry: BlackboardEntry;
      layerVersion: number;
    }

    // === Read responses ===
    export interface LayerReadResponse {
      layer: BlackboardLayer;
      currentVersion: number;
      tokenCount: number;
      tokenBudget: number;
      budgetUsedPct: number;
      entries: BlackboardEntry[];
    }

    export interface EntryReadResponse {
      entry: BlackboardEntry;
      currentVersion: number;
    }

    // === Error shapes ===
    export interface ErrorResponse {
      error: string;
      message: string;
      [key: string]: unknown;
    }

    // === Service errors (thrown by BlackboardService) ===
    export class VersionConflictError extends Error {
      readonly currentVersion: number;
      readonly expectedVersion: number;
      constructor(currentVersion: number, expectedVersion: number) {
        super(`Version conflict: expected ${expectedVersion}, current ${currentVersion}`);
        this.name = 'VersionConflictError';
        this.currentVersion = currentVersion;
        this.expectedVersion = expectedVersion;
      }
    }

    export class TokenBudgetExceededError extends Error {
      readonly layer: BlackboardLayer;
      readonly budget: number;
      readonly currentCount: number;
      readonly attemptedCount: number;
      constructor(layer: BlackboardLayer, budget: number, currentCount: number, attemptedCount: number) {
        super(`Token budget exceeded for layer '${layer}': budget=${budget}, current=${currentCount}, attempted=${attemptedCount}`);
        this.name = 'TokenBudgetExceededError';
        this.layer = layer;
        this.budget = budget;
        this.currentCount = currentCount;
        this.attemptedCount = attemptedCount;
      }
    }

    export class NotFoundError extends Error {
      readonly layer: BlackboardLayer;
      readonly entryId: string;
      constructor(layer: BlackboardLayer, entryId: string) {
        super(`Entry '${entryId}' not found in layer '${layer}'`);
        this.name = 'NotFoundError';
        this.layer = layer;
        this.entryId = entryId;
      }
    }

    export class ValidationError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
      }
    }

    // === Board state (for snapshot + service) ===
    export interface LayerState {
      entries: BlackboardEntry[];
      version: number;
    }

    export interface BlackboardState {
      core: LayerState;
      scenario: LayerState;
      semantic: LayerState;
      procedural: LayerState;
    }

    // === Audit log (written by routes, consumed by audit service) ===
    export interface AuditLogEntry {
      timestamp: string; // ISO 8601
      agentId: string;
      layer: BlackboardLayer;
      messageId?: string;
      entryId?: string;
      operation: 'write' | 'reject';
      rejectionReason?: string;
      entryContentHash?: string; // SHA-256 of entry content
    }
    ```

    Also create src/types/index.ts that re-exports everything:
    ```typescript
    export * from './blackboard.js';
    ```
  </action>
  <verify>
    <automated>cd D:/Coding/ClaudeCode/drama && npx tsc --noEmit src/types/blackboard.ts 2>&1 | head -20</automated>
  </verify>
  <done>src/types/blackboard.ts exists with all listed exports; TypeScript compiles without errors</done>
</task>

<task type="auto">
  <name>Task 3: BlackboardService implementation</name>
  <files>src/services/blackboard.ts</files>
  <action>
    Create D:/Coding/ClaudeCode/drama/src/services/blackboard.ts implementing the full blackboard service.

    Use tiktoken (import { encoding_for_model } from 'tiktoken') for synchronous token counting on every write. Cache the encoder as a module-level singleton (create once, reuse).

    **Class: BlackboardService**

    Constructor: `constructor(initialState?: BlackboardState)` — if initialState is provided, use it; otherwise start with empty state (all layers empty, version 0).

    **Private state shape:**
    ```typescript
    private state: BlackboardState = {
      core: { entries: [], version: 0 },
      scenario: { entries: [], version: 0 },
      semantic: { entries: [], version: 0 },
      procedural: { entries: [], version: 0 },
    };
    ```

    **countTokens(text: string): number**
    - Use cached tiktoken encoder (cl100k_base model equivalent — tiktoken.encoding_for_model('gpt-4'))
    - Return encoder.encode(text).length

    **Private sumTokenCount(entries: BlackboardEntry[]): number**
    - Return entries.reduce((sum, e) => sum + e.tokenCount, 0)

    **readLayer(layer: BlackboardLayer): LayerReadResponse**
    - Validate layer (throw ValidationError if unknown — should not happen with route-level validation)
    - Get layerState from this.state
    - Compute tokenCount, budget, budgetUsedPct
    - Return LayerReadResponse with entries in insertion order (oldest first)

    **readEntry(layer: BlackboardLayer, entryId: string): EntryReadResponse**
    - Find entry by id in layer
    - Throw NotFoundError if not found
    - Return EntryReadResponse with entry + currentVersion

    **writeEntry(layer: BlackboardLayer, agentId: string, req: WriteEntryRequest): WriteEntryResponse**
    - Validate req.content is non-empty string (throw ValidationError)
    - Count tokens: tokenCount = this.countTokens(req.content)
    - Get layerState: const ls = this.state[layer]
    - **Optimistic locking check:** if req.expectedVersion !== undefined AND req.expectedVersion !== ls.version → throw new VersionConflictError(ls.version, req.expectedVersion)
    - **Token budget check:** compute current total + tokenCount; if > LAYER_BUDGETS[layer] → throw new TokenBudgetExceededError(layer, LAYER_BUDGETS[layer], currentTotal, tokenCount)
    - **60% alert:** compute budgetUsedPct = (currentTotal + tokenCount) / LAYER_BUDGETS[layer]; if >= 0.6 → log.warn({ layer, budgetUsedPct, ... }) — logging happens in the route layer (service just returns; route logs)
    - Create entry: { id: randomUUID(), agentId, messageId: req.messageId, timestamp: new Date().toISOString(), content: req.content, tokenCount, version: ls.version + 1 }
    - Push to ls.entries, set ls.version = ls.version + 1
    - Return { entry, layerVersion: ls.version }

    **deleteEntry(layer: BlackboardLayer, entryId: string, agentId: string): void**
    - Find entry index in layer.entries
    - Throw NotFoundError if not found
    - Splice out the entry
    - Increment layer version

    **exportState(): BlackboardState**
    - Deep copy and return this.state (JSON parse/stringify for clone)

    Also create src/services/index.ts that re-exports the service.
  </action>
  <verify>
    <automated>cd D:/Coding/ClaudeCode/drama && npx tsc --noEmit src/services/blackboard.ts 2>&1 | head -20</automated>
  </verify>
  <done>BlackboardService class is fully implemented with countTokens, readLayer, readEntry, writeEntry, deleteEntry, exportState; TypeScript compiles without errors</done>
</task>

<task type="auto">
  <name>Task 4: Express HTTP route handlers</name>
  <files>
    src/routes/blackboard.ts
    src/app.ts
    src/index.ts
  </files>
  <action>
    Create D:/Coding/ClaudeCode/drama/src/routes/blackboard.ts with Express Router handling all blackboard endpoints.

    **Import:** BlackboardService, all types/errors from '../types/blackboard.js', Zod schemas.

    **Route: GET /blackboard/layers/:layer/entries**
    - Validate :layer param against LAYER_NAMES (400 if invalid)
    - Call service.readLayer(layer)
    - Return 200 with LayerReadResponse

    **Route: GET /blackboard/layers/:layer/entries/:id**
    - Validate :layer param (400 if invalid)
    - Call service.readEntry(layer, req.params.id)
    - Return 200 with EntryReadResponse
    - Catch NotFoundError → 404

    **Route: POST /blackboard/layers/:layer/entries**
    - Validate :layer param (400 if invalid)
    - Validate request body with Zod: z.object({ content: z.string().min(1), expectedVersion: z.number().int().nonnegative().optional(), messageId: z.string().optional() })
    - Extract agentId from X-Agent-ID header (REQUIRED — return 400 if missing)
    - Call service.writeEntry(layer, agentId, parsedBody)
    - Log write to audit (auditLog.write(entry, 'write', agentId)) — auditLog is injected or imported
    - Return 201 with WriteEntryResponse
    - Catch VersionConflictError → 409 { error: "Conflict", message: ..., currentVersion, expectedVersion }
    - Catch TokenBudgetExceededError → 413 { error: "Payload Too Large", message: ..., tokenBudget, currentTokenCount, attemptedEntryTokens }
    - Catch ValidationError → 400

    **Route: DELETE /blackboard/layers/:layer/entries/:id**
    - Validate :layer param (400 if invalid)
    - Extract agentId from X-Agent-ID header (REQUIRED)
    - Call service.deleteEntry(layer, req.params.id, agentId)
    - Return 204 No Content
    - Catch NotFoundError → 404

    **Important:** The route file should import auditLog as a variable that will be set at app startup. Use a module-level setter pattern:
    ```typescript
    let auditLog: AuditLogService;
    export function setAuditLog(service: AuditLogService) { auditLog = service; }
    ```
    The blackboard routes need to call auditLog.write(...) on every write. Since auditLog is created in index.ts, use this setter.

    **Create src/app.ts** — Express app factory (exported for testing with supertest):
    ```typescript
    import express from 'express';
    import pinoHttp from 'pino-http';
    import { blackboardRouter } from './routes/blackboard.js';
    import { healthRouter } from './routes/health.js'; // imported but created in plan 02

    export function createApp(opts?: { blackboard?: BlackboardService; auditLog?: AuditLogService }) {
      const app = express();
      app.use(express.json({ limit: '1mb' }));
      app.use(pinoHttp({ logger: pino }));
      // X-Agent-ID extraction middleware
      app.use((req, res, next) => {
        if (req.method === 'GET' || req.method === 'DELETE') return next();
        if (!req.headers['x-agent-id'] && req.method === 'POST') {
          return res.status(400).json({ error: 'Bad Request', message: 'X-Agent-ID header is required' });
        }
        next();
      });
      app.use('/blackboard', blackboardRouter);
      app.use('/health', healthRouter);
      return app;
    }
    ```
    Note: healthRouter will be imported but defined in plan 02. For now, either create a stub health route in plan 01 or have app.ts conditionally skip it if not yet available. Better approach: create a minimal health route in plan 01 (just returns { status: 'ok' }) so app.ts does not have a circular import.

    **Create src/index.ts** — server entry point:
    ```typescript
    import { config } from 'dotenv';
    import { createApp } from './app.js';
    import { BlackboardService } from './services/blackboard.js';
    import { SnapshotService } from './services/snapshot.js'; // created in plan 02
    import { AuditLogService } from './services/auditLog.js'; // created in plan 02

    config(); // load .env

    const PORT = parseInt(process.env.PORT ?? '3000', 10);
    const DATA_DIR = process.env.BLACKBOARD_DATA_DIR ?? './data';

    // Services (created in order)
    const snapshotService = new SnapshotService(DATA_DIR); // plan 02
    const auditLogService = new AuditLogService(DATA_DIR); // plan 02
    const blackboardService = new BlackboardService(snapshotService.tryRestore());

    // Wire audit log into routes
    import { setAuditLog } from './routes/blackboard.js';
    setAuditLog(auditLogService);

    const app = createApp({ blackboard: blackboardService, auditLog: auditLogService });
    app.listen(PORT, () => {
      pino.info({ port: PORT }, 'blackboard service started');
    });
    ```
    Note: index.ts imports SnapshotService and AuditLogService which don't exist yet. In plan 01, create a stub version of index.ts that just starts the HTTP server without snapshot/audit wiring, or defer the full index.ts to plan 02. Recommend: Create a simple index.ts in plan 01 that starts the app without snapshot/audit (they'll be added in plan 02), or better yet, create the full structure but with no-op/stub services that will be replaced.

    Actually the cleaner approach: Plan 01's index.ts creates the app and starts listening WITHOUT snapshot/audit. Plan 02 updates index.ts to add snapshot + audit. To do this, plan 01 index.ts should just be:
    ```typescript
    import 'dotenv/config';
    import { createApp } from './app.js';
    import { BlackboardService } from './services/blackboard.js';

    const PORT = parseInt(process.env.PORT ?? '3000', 10);
    const blackboardService = new BlackboardService();
    const app = createApp({ blackboard: blackboardService });
    app.listen(PORT, () => {
      console.log(`blackboard service started on port ${PORT}`);
    });
    ```
    And plan 02 will replace index.ts with the full version including snapshot + audit.
  </action>
  <verify>
    <automated>cd D:/Coding/ClaudeCode/drama && npx tsc --noEmit src/routes/blackboard.ts src/app.ts src/index.ts 2>&1 | head -30</automated>
  </verify>
  <done>src/routes/blackboard.ts, src/app.ts, src/index.ts created; all routes registered; TypeScript compiles without errors</done>
</task>

</tasks>

<verification>
After all tasks complete:
- [ ] npm install succeeds
- [ ] npx tsc --noEmit passes for all src/ files
- [ ] All source files exist at specified paths
- [ ] Service throws the correct typed errors (VersionConflictError, TokenBudgetExceededError, NotFoundError, ValidationError)
- [ ] Route handlers convert typed errors to correct HTTP status codes (409, 413, 404, 400)
- [ ] X-Agent-ID header is required on POST/DELETE, rejected with 400 if missing
</verification>

<success_criteria>
All five Phase 1 success criteria are addressable once plan 02 adds tests:
1. Write-read roundtrip: POST then GET returns entry
2. Token budget: write with content exceeding budget → 413
3. Optimistic locking: POST with wrong expectedVersion → 409
4. Audit log: every write appears in audit JSONL with agentId, timestamp, messageId
5. Snapshot: state restored on restart from blackboard.json

These are verified by the integration tests created in plan 02.
</success_criteria>

<output>
After completion, create D:/Coding/ClaudeCode/drama/.planning/phases/01-shared-blackboard-service/01-foundation-SUMMARY.md referencing the summary template at C:/Users/Administrator/.claude/get-shit-done/templates/summary.md.
</output>
