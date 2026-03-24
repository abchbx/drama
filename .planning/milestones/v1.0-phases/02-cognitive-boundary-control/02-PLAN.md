---
name: "02-cognitive-boundary-control"
wave: 1
depends_on: []
requirements: [BOUND-01, BOUND-02, BOUND-03, BOUND-04]
files_modified:
  - src/types/blackboard.ts
  - src/services/capability.ts
  - src/routes/agents.ts
  - src/routes/blackboard.ts
  - src/app.ts
  - src/index.ts
  - .env.example
  - package.json
new_files:
  - tests/boundary.test.ts
autonomous: false
must_haves:
  truths:
    - "Actor write to core layer is rejected with 403 CAPABILITY_CLOSED"
    - "Actor read of full blackboard returns only character_card + current_scene"
    - "Director write to any layer succeeds (full access)"
    - "Boundary violations are logged with violation type and attempted operation"
  artifacts:
    - path: src/services/capability.ts
      provides: JWT verification + capability checking
      min_lines: 80
    - path: src/routes/agents.ts
      provides: Agent registration + scoped read endpoint
      min_lines: 60
    - path: src/routes/blackboard.ts
      provides: Route-level capability guards
      min_lines: 80
    - path: tests/boundary.test.ts
      provides: Boundary enforcement tests
      min_lines: 120
  key_links:
    - from: src/routes/agents.ts
      to: src/services/capability.ts
      via: module import + setter injection
    - from: src/routes/blackboard.ts
      to: src/services/capability.ts
      via: module import + setter injection
    - from: src/app.ts
      to: src/routes/agents.ts
      via: app.use('/blackboard/agents', agentsRouter)
    - from: tests/boundary.test.ts
      to: src/services/capability.ts
      via: createCapabilityService() in test setup
---

# Phase 2 Plan: Cognitive Boundary Control

## Wave Map

| Wave | Tasks | Parallel? | Blocked by |
|------|-------|-----------|------------|
| 1 | T1 (install deps) + T2 (types) + T7 (.env.example) | Yes | None |
| 2 | T3 (capability service) + T4 (agents router) | Yes | T2 (T4 only imports types) |
| 3 | T5 (blackboard guards) + T6 (app wiring) | Yes | T3 (T5 imports capability.ts) |
| 4 | T8 (tests) | No | T6 |

**Note on Wave 2:** T4 is listed alongside T3 because T4 only imports *types* from `capability.ts` (e.g., `AgentJwtPayload`), not the runtime `CapabilityService` class. It uses module-level setter injection. T5 is in Wave 3 because it calls `capabilityService.check()` at runtime, which requires T3's implementation.

---

## Tasks

<task>
<files>package.json</files>
<action>
Add `jsonwebtoken` (^9.0.0) and `@types/jsonwebtoken` as devDependency. Run `npm install`.
Specific steps:
1. Edit `package.json`, add to `dependencies`: `"jsonwebtoken": "^9.0.0"`
2. Add to `devDependencies`: `"@types/jsonwebtoken": "^9.0.0"`
3. Run `npm install` in the project root
</action>
<verify>npm list jsonwebtoken 2>&1 | grep -q jsonwebtoken</verify>
<done>jsonwebtoken and @types/jsonwebtoken present in package.json devDependencies</done>
</task>

<task>
<files>src/types/blackboard.ts</files>
<action>
Add new types and the `BoundaryViolationError` class. Extend `AuditLogEntry`.
Specific steps:
1. Add after the `ValidationError` class:
   ```typescript
   // === Agent roles & boundary types ===
   export type AgentRole = 'Actor' | 'Director' | 'Admin';
   export type ViolationType = 'CAPABILITY_CLOSED' | 'NAMESPACE_VIOLATION' | 'INPUT_SCOPE_VIOLATION';
   export type BoundaryOperation = 'read' | 'write';

   export class BoundaryViolationError extends Error {
     readonly violationType: ViolationType;
     readonly targetLayer: BlackboardLayer;
     readonly operation: BoundaryOperation;
     readonly allowedLayers: BlackboardLayer[];
     constructor(
       violationType: ViolationType,
       targetLayer: BlackboardLayer,
       operation: BoundaryOperation,
       allowedLayers: BlackboardLayer[],
     ) {
       super(`Boundary violation: ${operation} on '${targetLayer}' denied — ${violationType}`);
       this.name = 'BoundaryViolationError';
       this.violationType = violationType;
       this.targetLayer = targetLayer;
       this.operation = operation;
       this.allowedLayers = allowedLayers;
     }
   }
   ```
2. Extend `AuditLogEntry.operation` union from `'write' | 'reject'` to `'write' | 'reject' | 'violation'`
3. Add new optional fields to `AuditLogEntry`:
   ```typescript
   role?: AgentRole;
   violationType?: ViolationType;
   ```
</action>
<verify>npm run build 2>&1 | grep -v "Starting" | grep -v "Build at" | tail -20 | grep -q "boundary" || echo "BUILD_OK"</verify>
<done>AgentRole, ViolationType, BoundaryOperation, BoundaryViolationError, and extended AuditLogEntry present in src/types/blackboard.ts</done>
</task>

<task>
<files>src/services/capability.ts</files>
<action>
Create `src/services/capability.ts` (NEW FILE) implementing the full capability service with JWT utilities and capability checking.
Specific steps:
1. Create `src/services/capability.ts` with the following exports:
   - `AgentJwtPayload` interface: `{ agentId: string; role: AgentRole; iat?: number; exp?: number }`
   - `CapabilityMap` type: `Record<AgentRole, BlackboardLayer[]>`
   - `loadCapabilityMap(): CapabilityMap` — reads `CAPABILITY_ACTOR`, `CAPABILITY_DIRECTOR`, `CAPABILITY_ADMIN` from `process.env`; splits by comma; validates each layer name against `LAYER_NAMES`; throws `Error` if any env var is missing or contains an invalid layer
   - `checkCapability(role: AgentRole, layer: BlackboardLayer, operation: BoundaryOperation, capabilityMap: CapabilityMap): { allowed: boolean; violationType?: ViolationType }` — returns `{ allowed: true }` if the layer is in the role's capability map; returns `{ allowed: false, violationType: 'CAPABILITY_CLOSED' }` for write violations; returns `{ allowed: false, violationType: 'NAMESPACE_VIOLATION' }` for read violations
   - `verifyAgentToken(token: string, secret: string): AgentJwtPayload` — calls `jwt.verify(token, secret, { algorithms: ['HS256'] })`, casts result; re-throws on failure
   - `extractBearerToken(authHeader: string | undefined): string | null`
   - `CapabilityService` class:
     ```typescript
     export class CapabilityService {
       readonly jwtSecret: string;
       readonly capabilityMap: CapabilityMap;
       constructor(jwtSecret: string, capabilityMap: CapabilityMap);
       verify(req: express.Request): AgentJwtPayload; // extracts token, verifies, returns payload
       check(agent: AgentJwtPayload, layer: BlackboardLayer, operation: BoundaryOperation): { allowed: boolean; violationType?: ViolationType; allowedLayers: BlackboardLayer[] };
     }
     ```
   - `createCapabilityService(): CapabilityService` factory — calls `loadCapabilityMap()`, reads `JWT_SECRET` from env, validates `JWT_SECRET` is at least 32 chars, constructs and returns `CapabilityService`
2. Import `jwt` from `'jsonwebtoken'`, `express`, `LAYER_NAMES`, `BlackboardLayer`, `AgentRole`, `ViolationType`, `BoundaryOperation`, `BoundaryViolationError` from types
</action>
<verify>npm run build --frozen-lockfile 2>&1 | tail -5 | grep -v "Starting" | grep -v "Build at" | tail -5</verify>
<done>src/services/capability.ts exists with CapabilityService, createCapabilityService, loadCapabilityMap, checkCapability, verifyAgentToken, extractBearerToken all implemented</done>
</task>

<task>
<files>src/routes/agents.ts</files>
<action>
Create `src/routes/agents.ts` (NEW FILE) implementing agent registration and scoped read endpoints.
Specific steps:
1. Create `src/routes/agents.ts`:
   - Import `Router`, `Request`, `Response` from `express`
   - Import `z` from `zod`
   - Import `AgentJwtPayload`, `BlackboardLayer`, `LAYER_NAMES`, `NotFoundError` from types
   - Import `CapabilityService` from `../services/capability.js`
   - Import `BlackboardService` from `../services/blackboard.js`
   - `export const agentsRouter = Router({ mergeParams: true })`
   - Inject `capabilityService` via module-level variable + `setCapabilityService()` setter (same pattern as `setAuditLog`)
   - `POST /register` handler:
     - Validate body with Zod: `{ agentId: z.string().min(1), role: z.enum(['Actor', 'Director', 'Admin']) }`
     - Return 400 on invalid role or missing agentId
     - Issue JWT: `jwt.sign({ agentId, role }, capabilityService.jwtSecret, { expiresIn: process.env.JWT_EXPIRES_IN ?? '24h', algorithm: 'HS256' })`
     - Return 200 with `{ token, agentId, role }`
   - `GET /me/scope` handler:
     - Call `capabilityService.verify(req)`; return 401 on missing/invalid token
     - Get `blackboard` from `req.app.locals.blackboard`
     - If `agent.role === 'Actor'`:
       - `character_card`: `null` (Phase 3 will add `characterCardFor` tagging; for Phase 2 return `null`)
       - `current_scene`: try `blackboard.readEntry('semantic', 'current_scene')`; catch `NotFoundError` → return `null`
       - Return 200 with `{ character_card: null, current_scene: <entry|null> }`
     - If `agent.role === 'Director' | 'Admin'`:
       - Return 200 with `{ full_access: true }` (these roles use raw `/layers/:layer/entries` endpoints)
</action>
<verify>npm run build 2>&1 | tail -5 | grep -v "Starting" | grep -v "Build at" | tail -5</verify>
<done>src/routes/agents.ts exists with POST /register and GET /me/scope handlers, agentsRouter exported</done>
</task>

<task>
<files>src/routes/blackboard.ts</files>
<action>
Add JWT verification and capability checks to all blackboard layer routes. Add violation logging.
Specific steps:
1. Add new imports at top of file:
   ```typescript
   import { extractBearerToken, verifyAgentToken } from '../services/capability.js';
   import {
     BoundaryViolationError,
     type AgentJwtPayload,
     type BoundaryOperation,
     type ViolationType,
   } from '../types/blackboard.js';
   ```
2. Add `BoundaryViolationError` to the existing error-class imports from `../types/blackboard.js`
3. Inject `capabilityService` via module-level variable `let capabilityService: CapabilityServiceInterface | undefined` and `export function setCapabilityService(s: CapabilityServiceInterface): void`
   - Define interface `CapabilityServiceInterface` with `verify(req: express.Request): AgentJwtPayload` and `check(agent: AgentJwtPayload, layer: BlackboardLayer, operation: BoundaryOperation): { allowed: boolean; violationType?: ViolationType; allowedLayers: BlackboardLayer[] }`
4. Add a `handleViolation()` helper inside the route module (not exported):
   ```typescript
   function handleViolation(
     res: express.Response,
     agent: AgentJwtPayload,
     layer: BlackboardLayer,
     operation: 'read' | 'write',
     violationType: ViolationType,
     allowedLayers: BlackboardLayer[],
   ): void {
     const err = new BoundaryViolationError(violationType, layer, operation, allowedLayers);
     if (auditLog) {
       auditLog.write({
         timestamp: new Date().toISOString(),
         agentId: agent.agentId,
         role: agent.role,
         layer,
         operation: 'violation',
         violationType,
       }, '');
     }
     // Log via app.locals logger if available
     const logger = (req.app.locals as { logger?: import('pino').Logger }).logger;
     logger?.warn({ agentId: agent.agentId, role: agent.role, layer, violationType }, 'boundary violation');
     res.status(403).json({
       error: 'Forbidden',
       violationType: err.violationType,
       targetLayer: err.targetLayer,
       operation: err.operation,
       allowedLayers: err.allowedLayers,
       message: err.message,
     });
   }
   ```
5. **Guard `GET /layers/:layer/entries`**:
   - Add at start of handler: extract Bearer token, verify, get agent
   - Check `capabilityService.check(agent, layer, 'read')`
   - If not allowed: call `handleViolation(res, agent, layer, 'read', violationType, allowedLayers)` and return
6. **Guard `GET /layers/:layer/entries/:id`**:
   - Same JWT + capability check for `'read'` operation
7. **Guard `POST /layers/:layer/entries`**:
   - Replace `X-Agent-ID` extraction with Bearer token verification (Phase 2: JWT is required)
   - After layer validation, before body parsing: capability check for `'write'`
   - In the catch block, add handling for `BoundaryViolationError`:
     ```typescript
     if (err instanceof BoundaryViolationError) {
       handleViolation(res, agent, layer, 'write', err.violationType, err.allowedLayers);
       return;
     }
     ```
8. **Guard `DELETE /layers/:layer/entries/:id`**:
   - Replace `X-Agent-ID` extraction with Bearer token verification
   - Add capability check for `'write'` operation
</action>
<verify>npm run build 2>&1 | tail -5 | grep -v "Starting" | grep -v "Build at" | tail -5</verify>
<done>src/routes/blackboard.ts has JWT guards on GET/POST/DELETE /layers/:layer/entries routes, handleViolation helper, setCapabilityService exported</done>
</task>

<task>
<files>src/app.ts, src/index.ts</files>
<action>
Wire agentsRouter and capabilityService into the app. Pass logger to app.locals.

**`src/app.ts`:**
1. Import `agentsRouter` from `./routes/agents.js`
2. Mount it: `app.use('/blackboard/agents', agentsRouter)` — place AFTER audit and blackboard routers to avoid path conflicts
3. Pass `logger` into `app.locals` so violation handler can use it:
   ```typescript
   app.locals.logger = logger;
   ```

**`src/index.ts`:**
1. Import `createCapabilityService`, `setCapabilityService` from `./services/capability.js`
2. Import `setCapabilityService as setAgentsCapabilityService` from `./routes/agents.js`
3. After step 5 (wire snapshot), add step 5b:
   ```typescript
   // 5b. Capability service
   const capabilityService = createCapabilityService();
   setAgentsCapabilityService(capabilityService);
   ```
4. After `app.locals.blackboard = blackboardService`, add:
   ```typescript
   app.locals.capabilityService = capabilityService;
   ```
5. Add:
   ```typescript
   import { setCapabilityService as setBlackboardCapabilityService } from './routes/blackboard.js';
   // after creating capabilityService:
   setBlackboardCapabilityService(capabilityService);
   ```
</action>
<verify>npm run build 2>&1 | tail -5 | grep -v "Starting" | grep -v "Build at" | tail -5</verify>
<done>agentsRouter mounted at /blackboard/agents in app.ts; capabilityService created and injected via setters in index.ts; app.locals.logger and app.locals.capabilityService set</done>
</task>

<task>
<files>.env.example</files>
<action>
Add JWT and capability map environment variables.
Specific steps:
1. Append to `.env.example`:
   ```
   # Phase 2: JWT & capability configuration
   JWT_SECRET=your-secret-key-at-least-32-characters-long
   JWT_EXPIRES_IN=24h

   # Capability map: comma-separated layer names per role
   # Actor: semantic + procedural only (cannot write core/scenario)
   CAPABILITY_ACTOR=semantic,procedural
   # Director: full access to all layers
   CAPABILITY_DIRECTOR=core,scenario,semantic,procedural
   # Admin: full access to all layers
   CAPABILITY_ADMIN=core,scenario,semantic,procedural
   ```
2. Also copy the new variables into `.env` so the running app picks them up (append only — do not overwrite existing values)
</action>
<verify>grep -q "JWT_SECRET" .env.example && grep -q "CAPABILITY_ACTOR" .env.example && echo "ENV_EXAMPLE_OK"</verify>
<done>JWT_SECRET, JWT_EXPIRES_IN, CAPABILITY_ACTOR, CAPABILITY_DIRECTOR, CAPABILITY_ADMIN all present in .env.example and .env</done>
</task>

<task>
<files>tests/boundary.test.ts</files>
<action>
Cover all four success criteria for Phase 2 with comprehensive boundary enforcement tests.
Specific steps:
1. Create `tests/boundary.test.ts` using the same `createTestApp` pattern from `blackboard.test.ts`
2. In `createTestApp`, add a `capabilityService` created via `createCapabilityService()` and inject it via `setCapabilityService` from both `blackboard.ts` and `agents.ts`
3. Also inject `app.locals.capabilityService = capabilityService`
4. Add a `getToken(agentId: string, role: AgentRole): string` helper that calls the register endpoint and returns the token
5. Write these test cases:

| # | Test | Steps | Expected |
|---|------|-------|----------|
| BOUND-01 | Actor POST to core → 403 CAPABILITY_CLOSED | Register Actor, POST to /layers/core/entries | 403, `violationType: 'CAPABILITY_CLOSED'`, `targetLayer: 'core'` |
| BOUND-01b | Actor POST to scenario → 403 CAPABILITY_CLOSED | Register Actor, POST to /layers/scenario/entries | 403, `violationType: 'CAPABILITY_CLOSED'` |
| BOUND-01c | Actor POST to semantic → 201 (allowed) | Register Actor, POST to /layers/semantic/entries | 201, entry returned |
| BOUND-02 | GET /layers/core/entries as Actor → 403 NAMESPACE_VIOLATION | Register Actor, GET /layers/core/entries | 403, `violationType: 'NAMESPACE_VIOLATION'` |
| BOUND-02b | GET /layers/scenario/entries as Actor → 403 NAMESPACE_VIOLATION | Register Actor, GET /layers/scenario/entries | 403, `violationType: 'NAMESPACE_VIOLATION'` |
| BOUND-02c | GET /me/scope as Actor → 200 with null fields | Register Actor, GET /me/scope | 200, `character_card: null`, `current_scene: null` |
| BOUND-03 | Actor reads semantic via /me/scope | Register Actor + Director (Director writes current_scene), GET /me/scope | 200, `current_scene` entry returned |
| BOUND-04 | No Authorization header → 401 | POST /layers/core/entries with no auth | 401 Unauthorized |
| BOUND-04b | Director POST to core → 201 (full access) | Register Director, POST to /layers/core/entries | 201, entry returned |
| BOUND-04c | Violation logged to audit log | Actor attempts core write, check audit log | Log entry with `operation: 'violation'`, `violationType: 'CAPABILITY_CLOSED'` |
| BOUND-04d | Director GET /me/scope → full_access | Register Director, GET /me/scope | 200, `full_access: true` |

6. Use `beforeEach` to set up temp data dir and test app; use `afterEach` to clean up
7. After boundary tests, add a test for `BoundaryViolationError` class instantiation to ensure the class is correctly defined
8. Verify the JWT token can be decoded correctly (decode without verify)
</action>
<verify>npm run build && npm test 2>&1 | tail -20</verify>
<done>All 11+ boundary test cases pass; BoundaryViolationError class tested; JWT decode verified</done>
</task>

## Verification Criteria

After all tasks complete, run:

```bash
npm run build   # TypeScript compiles without errors
npm test        # All tests pass including new boundary.test.ts
```

**Expected test output:** All 11+ boundary test cases pass.

### Goal-Backward Verification (must_haves)

| Phase Success Criterion | How Verified |
|------------------------|---------------|
| 1. Actor write to core layer: rejected with capability closure error | `BOUND-01` test: POST /layers/core/entries as Actor → 403 CAPABILITY_CLOSED |
| 2. Actor read of full blackboard: returns only character card + current scene | `BOUND-02c` test: GET /me/scope as Actor → 200 with scoped fields; `BOUND-02`/`BOUND-02b`: direct layer GETs return 403 |
| 3. Director write to any layer: succeeds (full access) | `BOUND-04b` test: Director POST to core → 201 |
| 4. Boundary violations logged with violation type and attempted operation | `BOUND-04c` test: audit log file contains violation entry with operation='violation', violationType, agentId, role, layer |
