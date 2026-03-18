# Phase 2: Cognitive Boundary Control - Research

**Researched:** 2026-03-18
**Domain:** JWT-based multi-agent capability enforcement, Express route-level authorization guards, capability-mapped RBAC
**Confidence:** HIGH (for JWT + Express patterns, confirmed via official docs; for capability map design, derived from locked decisions)

---

## Summary

Phase 2 installs hard (programmatic) role-based access control on top of the Phase 1 blackboard REST API. The implementation requires: (1) a new `jsonwebtoken` dependency for stateless JWT issuance and verification, (2) a capability map loaded from `.env` at startup, (3) a new `agents` router for registration and scoped reads, and (4) route-level guards inside the existing `blackboardRouter`. Violations return 403 with structured body and are audit-logged as `violation` operations. No new middleware framework is needed; everything plugs into the existing Express Router + error-class pattern from Phase 1.

**Primary recommendation:** Add `jsonwebtoken` + `@types/jsonwebtoken`, extend `AuditLogEntry.operation` to include `'violation'`, create a `CapabilityService` class loaded from `.env`, add `BoundaryViolationError`, wire everything through route-level guards in `blackboardRouter`, and mount a new `agentsRouter` at `/blackboard/agents/`.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

- JWT-based agent registration (POST /blackboard/agents/register)
- Three roles: Actor, Director, Admin
- Route-level guards in blackboard router (not separate middleware)
- 403 Forbidden for all violations
- Violation types: CAPABILITY_CLOSED, NAMESPACE_VIOLATION, INPUT_SCOPE_VIOLATION
- Actor scoped read: GET /blackboard/agents/me/scope returns { character_card, current_scene }
- Capability map in config.json / .env at startup
- Violations audit-logged with agentId, role, attemptedLayer, operation, violationType, timestamp
- "current_scene" = semantic layer entry with id = 'current_scene'
- Phase 1 already has: BlackboardService, X-Agent-ID extraction, LAYER_NAMES, AuditLogEntry type

### Claude's Discretion

- Exact JWT secret key length and algorithm (HS256 vs RS256)
- Exact current_scene entry content structure
- Whether Director/Admin scoped reads also go through /me/scope or bypass entirely
- How many entries current_scene holds
- Whether Director can write to current_scene entry

### Deferred Ideas (OUT OF SCOPE)

- Actor sub-roles (Protagonist, Antagonist, Supporting) - Phase N
- Rate limiting per agent - Phase 5+
- Capability revocation / session invalidation - Phase 5+

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BOUND-01 | Write-layer gate rejects entries that violate capability closure (actors cannot write to core layer) | Route-level capability guard on POST /layers/:layer/entries checks role against capability map before calling blackboard.writeEntry() |
| BOUND-02 | Namespace isolation: Actor agents can only read their character card and current scene | GET /blackboard/agents/me/scope filters read results for Actor role; GET /layers/:layer/entries returns 403 for Actor |
| BOUND-03 | Per-agent input scope restriction enforced at blackboard API layer | Route-level guard on GET /layers/:layer/entries rejects Actor reads of restricted layers with NAMESPACE_VIOLATION |
| BOUND-04 | Boundary enforcement is hard (programmatic), not soft (prompt-based) | All checks are synchronous Express route guards that run before any BlackboardService call — no prompting involved |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `jsonwebtoken` | ^9.0.0 | JWT sign/verify for agent session tokens | De facto standard for stateless JWT in Node.js; maintained by Auth0 |
| `@types/jsonwebtoken` | ^9.0.0 | TypeScript type definitions for jsonwebtoken | Official @types package, ships with the project |

**Installation:**
```bash
npm install jsonwebtoken @types/jsonwebtoken
```

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `dotenv` | ^16.4.0 | Load .env variables at startup | Already in package.json; used to load JWT_SECRET and capability map |
| `zod` | ^3.23.0 | Runtime validation for registration request body and JWT payload | Already in package.json; used for input validation on agent registration |

### No New Dependencies Needed

- **Express Router** — existing `blackboardRouter` is the enforcement point; no separate auth middleware framework needed
- **pino** — already initialized in `app.ts`; boundary violation logs use `logger.warn()`
- **tiktoken** — Phase 1 already integrated; not needed in Phase 2 boundary code

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|-----------|-----------|---------|
| `jsonwebtoken` | `jose` library | `jose` supports more runtimes (Deno, Bun) but has a heavier API; `jsonwebtoken` is simpler for this use case |
| HS256 | RS256 (asymmetric) | RS256 avoids secret sharing but requires key management infrastructure; deferred to v2 scale phase |
| .env capability map | config.json | Config file requires code changes to adjust permissions; .env is already loaded at startup via `dotenv` |

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── routes/
│   ├── blackboard.ts       # MODIFIED: add route-level capability guards
│   ├── audit.ts            # Unchanged
│   ├── agents.ts           # NEW: registration + scoped read router
│   └── health.ts           # Unchanged
├── services/
│   ├── blackboard.ts       # Unchanged
│   ├── auditLog.ts         # Unchanged
│   ├── snapshot.ts         # Unchanged
│   └── capability.ts       # NEW: CapabilityService — loads .env map, verifies JWT
├── types/
│   ├── blackboard.ts       # MODIFIED: add BoundaryViolationError, extend AuditLogEntry.operation
│   └── index.ts            # Unchanged
├── app.ts                  # MODIFIED: mount agentsRouter, wire CapabilityService into app.locals
└── index.ts               # MODIFIED: load CapabilityService at startup, inject into routes
```

### Pattern 1: Route-Level Capability Guard

**What:** A synchronous guard function injected into Express route handlers that checks `role` from the verified JWT against a capability map before any BlackboardService call is made.

**When to use:** When enforcement must be co-located with routes (not in separate middleware), and when the check is cheap and synchronous.

**Example:**
```typescript
// src/services/capability.ts
export type AgentRole = 'Actor' | 'Director' | 'Admin';
export type ViolationType = 'CAPABILITY_CLOSED' | 'NAMESPACE_VIOLATION' | 'INPUT_SCOPE_VIOLATION';
export type Operation = 'read' | 'write';

export interface CapabilityMap {
  [role: string]: BlackboardLayer[]; // layers this role can access
}

// Loaded from .env at startup, e.g.:
// CAPABILITY_ACTOR=semantic,procedural
// CAPABILITY_DIRECTOR=core,scenario,semantic,procedural
// CAPABILITY_ADMIN=core,scenario,semantic,procedural
export function loadCapabilityMap(): CapabilityMap { ... }

export function checkCapability(
  role: AgentRole,
  layer: BlackboardLayer,
  operation: Operation,
  capabilityMap: CapabilityMap,
): { allowed: boolean; violationType?: ViolationType } { ... }
```

```typescript
// src/routes/blackboard.ts — guard usage in POST route
blackboardRouter.post('/layers/:layer/entries', async (req, res) => {
  const layer = req.params.layer as BlackboardLayer;
  const agentId = req.headers['x-agent-id'] as string; // now extracted from verified JWT

  // NEW: capability check BEFORE calling BlackboardService
  const { allowed, violationType } = checkCapability(role, layer, 'write', capabilityMap);
  if (!allowed) {
    return handleViolation(req, res, { agentId, role, layer, operation: 'write', violationType });
  }
  // ... proceed to blackboard.writeEntry()
});
```

**Source:** Derived from Express Router pattern in existing `blackboardRouter.ts`; capability map pattern is standard RBAC in Node.js

### Pattern 2: JWT Verification + Locals Injection

**What:** Extract `Authorization: Bearer <token>` header, verify with secret, attach decoded payload to `req.body` (or a typed `req.body.agent`).

**Example:**
```typescript
// src/services/capability.ts
import jwt from 'jsonwebtoken';

export interface AgentJwtPayload {
  agentId: string;
  role: AgentRole;
  iat?: number;
  exp?: number;
}

export function verifyAgentToken(token: string, secret: string): AgentJwtPayload {
  return jwt.verify(token, secret) as AgentJwtPayload;
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}
```

```typescript
// In route: verify then use
const token = extractBearerToken(req.headers['authorization']);
if (!token) return res.status(401).json({ error: 'Unauthorized' });
let agent: AgentJwtPayload;
try {
  agent = verifyAgentToken(token, jwtSecret);
} catch {
  return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
}
// agent.agentId and agent.role are now available
```

**Source:** Standard `jsonwebtoken` API confirmed via [Auth0/node-jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) — `jwt.sign()` and `jwt.verify()` with HS256 default algorithm.

### Pattern 3: BoundaryViolationError + 403 Response

**What:** A custom Error subclass thrown or handled at the route layer, mapped to a structured 403 response body.

**Example:**
```typescript
// src/types/blackboard.ts
export type ViolationType = 'CAPABILITY_CLOSED' | 'NAMESPACE_VIOLATION' | 'INPUT_SCOPE_VIOLATION';

export class BoundaryViolationError extends Error {
  readonly violationType: ViolationType;
  readonly targetLayer: BlackboardLayer;
  readonly operation: 'read' | 'write';
  readonly allowedLayers: BlackboardLayer[];
  constructor(violationType: ViolationType, targetLayer: BlackboardLayer, operation: 'read' | 'write', allowedLayers: BlackboardLayer[]) {
    super(`Boundary violation: ${operation} on '${targetLayer}' denied — ${violationType}`);
    this.name = 'BoundaryViolationError';
    this.violationType = violationType;
    this.targetLayer = targetLayer;
    this.operation = operation;
    this.allowedLayers = allowedLayers;
  }
}
```

```typescript
// In blackboard route handler:
} catch (err) {
  if (err instanceof BoundaryViolationError) {
    // Audit log violation
    await auditLog?.write({
      timestamp: new Date().toISOString(),
      agentId: agent.agentId,
      role: agent.role,
      layer: err.targetLayer,
      operation: 'violation',
      violationType: err.violationType,
    }, '');
    logger.warn({ agentId: agent.agentId, role: agent.role, layer: err.targetLayer, violationType: err.violationType }, 'boundary violation');
    return res.status(403).json({
      error: 'Forbidden',
      violationType: err.violationType,
      targetLayer: err.targetLayer,
      operation: err.operation,
      allowedLayers: err.allowedLayers,
      message: err.message,
    });
  }
  throw err;
}
```

**Note:** The audit log `operation` field must be extended from `'write' | 'reject'` to `'write' | 'reject' | 'violation'`. See `AuditLogEntry` modification below.

### Pattern 4: Scoped Read Endpoint

**What:** `GET /blackboard/agents/me/scope` returns `{ character_card, current_scene }` filtered by the requesting agent's role. Actor role gets only character card + current_scene. Director/Admin get full blackboard access (bypass).

**Recommendation:** Director/Admin get full access by bypassing the scoped endpoint entirely — they use the raw `/layers/:layer/entries` endpoints. Actor gets only the scoped endpoint.

```typescript
// src/routes/agents.ts
agentsRouter.get('/me/scope', (req, res) => {
  const blackboard = req.app.locals.blackboard as BlackboardService;
  const agent: AgentJwtPayload = req.body.agent; // injected by auth guard

  if (agent.role === 'Actor') {
    // character_card: core layer entry tagged with agent's agentId (Phase 3 tagging)
    // For Phase 2: no character card tagging yet — return empty
    // current_scene: semantic layer entry with id = 'current_scene'
    let currentScene: BlackboardEntry | null = null;
    try {
      currentScene = blackboard.readEntry('semantic', 'current_scene').entry;
    } catch (err) {
      if (!(err instanceof NotFoundError)) throw err;
    }
    return res.status(200).json({
      character_card: null,
      current_scene: currentScene,
    });
  }

  // Director/Admin: return full state (or redirect to raw endpoints)
  return res.status(200).json({ full_access: true });
});
```

### Pattern 5: Agent Registration Endpoint

**What:** `POST /blackboard/agents/register` accepts `{ agentId, role, credentials }`, verifies credentials, and issues a signed JWT.

```typescript
// src/routes/agents.ts
agentsRouter.post('/register', (req, res) => {
  const { agentId, role } = req.body;
  if (!['Actor', 'Director', 'Admin'].includes(role)) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid role' });
  }
  // Issue JWT (in v1: any valid request gets a token; credentials check deferred)
  const token = jwt.sign(
    { agentId, role },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? '24h', algorithm: 'HS256' }
  );
  return res.status(200).json({ token, agentId, role });
});
```

**Source:** Standard `jwt.sign()` API confirmed via [Auth0/node-jsonwebtoken](https://github.com/auth0/node-jsonwebtoken).

### Pattern 6: AuditLogEntry Extension for Violations

**What:** Extend the `AuditLogEntry.operation` union to include `'violation'` and add new fields.

```typescript
// src/types/blackboard.ts — modified interface
export interface AuditLogEntry {
  timestamp: string;
  agentId: string;
  layer: BlackboardLayer;
  messageId?: string;
  entryId?: string;
  operation: 'write' | 'reject' | 'violation'; // extended
  rejectionReason?: string;
  entryContentHash?: string;
  // New fields for violation:
  role?: AgentRole; // the agent's role at time of violation
  violationType?: ViolationType; // CAPABILITY_CLOSED | NAMESPACE_VIOLATION | INPUT_SCOPE_VIOLATION
}
```

### Anti-Patterns to Avoid

- **Prompt-based enforcement:** Never add capability checks to LLM prompts. The Phase 2 requirement explicitly states enforcement must be programmatic. Any soft/prompt-based check goes in Phase 3+.

- **Separate auth middleware:** CONTEXT.md specifies "route-level guards in blackboard router (not separate middleware)." A separate auth middleware file would scatter enforcement logic and make it harder to co-locate with route handlers.

- **Blocking read enforcement in BlackboardService:** Capability checks must happen at the route layer. `BlackboardService` remains unchanged and should not know about roles/capabilities.

- **Storing JWT secret in source code:** Always load from `process.env.JWT_SECRET` via `.env`. Never hardcode.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT signing/verification | Custom token signing with raw crypto | `jsonwebtoken` | Handles edge cases: algorithm confusion attacks, timing attacks on verification, exp/iat/nbf claims, key format normalization |
| Capability map loading from .env | Custom string splitting | `dotenv` already present | `dotenv.config()` is already called in `src/index.ts`; load via `process.env` |
| 403 response shape | Ad-hoc objects | `BoundaryViolationError` class | Consistent shape, TypeScript-typed, matches existing `VersionConflictError` pattern |

**Key insight:** JWT signing/verification has subtle security pitfalls (algorithm confusion, secret confusion with `none` algorithm, timing attacks) that battle-tested libraries handle. `jsonwebtoken` is the de facto standard with >14M weekly downloads.

---

## Common Pitfalls

### Pitfall 1: JWT Algorithm Confusion
**What goes wrong:** Attacker crafts a token with `alg: none` or switches HS256 to RS256, bypassing verification.
**Why it happens:** `jwt.verify()` accepts the algorithm from the token header by default unless explicitly restricted.
**How to avoid:** Always pass `algorithms: ['HS256']` to `jwt.verify()` when using symmetric keys. Never trust the token's declared algorithm.
**Warning signs:** `jwt.verify(token, secret)` without `algorithms` option.

### Pitfall 2: Actor Gets Full Layer on `/layers/:layer/entries` GET
**What goes wrong:** `GET /layers/core/entries` returns all core entries to an Actor who should only see their character card.
**Why it happens:** Phase 1 made GET routes unauthenticated. Phase 2 must gate both reads and writes.
**How to avoid:** Add capability check to `GET /layers/:layer/entries` route before calling `blackboard.readLayer()`. Actor reading restricted layer returns 403 with `NAMESPACE_VIOLATION`.

### Pitfall 3: Missing `Authorization` Header Check on All Routes
**What goes wrong:** A request with no `Authorization` header reaches the capability check with `role = undefined`, causing unexpected behavior.
**Why it happens:** Phase 1 routes that don't require auth were left unauthenticated. Boundary-gated routes must require the JWT.
**How to avoid:** All routes under `/blackboard/layers/` must validate the JWT is present and valid before any capability check. `POST /blackboard/agents/register` is the only unauthenticated route.

### Pitfall 4: `.env` Not Loaded Before Capability Map Access
**What goes wrong:** `process.env.JWT_SECRET` is `undefined` at startup because `dotenv.config()` runs in `src/index.ts` after imports.
**Why it happens:** ESM module-level imports run before `dotenv.config()`.
**How to avoid:** Load dotenv at the top of `src/index.ts` (already done: `import 'dotenv/config'`). CapabilityService reads from `process.env` inside its constructor, which is called after dotenv has run.

### Pitfall 5: Actor Can Tag Character Card Without Knowing Core Content
**What goes wrong:** Actor read of core layer is blocked (correct), but Phase 3 needs a way to retrieve the Actor's own character card.
**Why it happens:** Phase 2 scoped read endpoint does not yet handle character card retrieval by agentId.
**How to avoid:** The scoped read endpoint `GET /blackboard/agents/me/scope` should return a `character_card` field (can be `null` in Phase 2; Phase 3 adds the actual card). The `current_scene` returns the `current_scene` entry from semantic. This is the known interface for Phase 3 Actor agents.

---

## Code Examples

### Verified JWT Sign + Verify (from Auth0/node-jsonwebtoken official docs)

```typescript
// Signing
const token = jwt.sign(
  { agentId: 'actor-1', role: 'Actor' },
  process.env.JWT_SECRET!,
  { expiresIn: '24h', algorithm: 'HS256' }
);

// Verification (secure: specify algorithm)
const payload = jwt.verify(token, process.env.JWT_SECRET!, {
  algorithms: ['HS256'],
}) as { agentId: string; role: string };
```

### Route-Level Guard Pattern (from existing blackboardRouter.ts)

```typescript
// Pattern from existing code (Phase 1) — to be extended for Phase 2
blackboardRouter.get('/layers/:layer/entries', (req, res) => {
  const layer = req.params.layer as BlackboardLayer;

  // NEW: JWT verification (replaces X-Agent-ID extraction)
  const token = extractBearerToken(req.headers['authorization']);
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  let agent: AgentJwtPayload;
  try {
    agent = verifyAgentToken(token, jwtSecret);
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // NEW: Capability check for GET (reads are also gated)
  const { allowed, violationType } = checkCapability(agent.role, layer, 'read', capabilityMap);
  if (!allowed) {
    return handleViolation(req, res, { agentId: agent.agentId, role: agent.role, layer, operation: 'read', violationType });
  }

  const result = (req.app.locals.blackboard as BlackboardService).readLayer(layer);
  return res.status(200).json(result);
});
```

### Capability Map Loading from .env

```typescript
// src/services/capability.ts
import { LAYER_NAMES, type BlackboardLayer } from '../types/blackboard.js';

export function loadCapabilityMap(): CapabilityMap {
  const roles = ['Actor', 'Director', 'Admin'] as const;
  const map: CapabilityMap = {};
  for (const role of roles) {
    const envKey = `CAPABILITY_${role.toUpperCase()}`;
    const value = process.env[envKey];
    if (!value) throw new Error(`Missing ${envKey} in .env`);
    const layers = value.split(',').map(s => s.trim()) as BlackboardLayer[];
    // Validate all layers are known
    for (const layer of layers) {
      if (!LAYER_NAMES.includes(layer)) {
        throw new Error(`Invalid layer '${layer}' in ${envKey}`);
      }
    }
    map[role] = layers;
  }
  return map;
}
```

### .env Additions for Phase 2

```bash
# JWT configuration
JWT_SECRET=your-secret-key-at-least-32-characters-long
JWT_EXPIRES_IN=24h

# Capability map: comma-separated layer names per role
CAPABILITY_ACTOR=semantic,procedural
CAPABILITY_DIRECTOR=core,scenario,semantic,procedural
CAPABILITY_ADMIN=core,scenario,semantic,procedural
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No auth on GET routes | JWT auth + capability check on all routes | Phase 2 | Actors cannot read restricted layers |
| Raw X-Agent-ID header | JWT session token | Phase 2 | Stateless auth; token carries role; no session map needed |
| AuditLogEntry with 'write'/'reject' only | 'violation' operation added | Phase 2 | Full audit trail of boundary violations |
| All agents have full access | Capability map gates writes and reads | Phase 2 | Hard multi-agent role isolation |

**Deprecated/outdated:**
- `X-Agent-ID` header for authorization: Replaced by JWT Bearer token in Phase 2. Old header is no longer used for boundary-gated routes.
- Raw agent identification without roles: Agent IDs alone no longer carry authorization info; JWT payload now includes `role`.

---

## Open Questions

1. **JWT secret key length and algorithm**
   - What we know: HS256 is simpler; RS256 requires key pairs but avoids secret sharing
   - What's unclear: Whether the project has key management infrastructure
   - Recommendation: Use HS256 for Phase 2 (v1). Use `crypto.randomBytes(32)` to generate a 256-bit secret. Add `JWT_SECRET_MIN_LENGTH=32` validation at startup.

2. **Character card identification**
   - What we know: `current_scene` is identified by `id = 'current_scene'` in semantic layer. Actor reads their character card.
   - What's unclear: How is the character card identified in the core layer? By `id = agentId`? By a `characterCardFor` field? Phase 1 has no tagging on entries.
   - Recommendation: Phase 2 scoped read returns `character_card: null` (no tagging yet). Phase 3 adds character card entries with `characterCardFor: agentId` metadata and updates the scoped read to filter by that.

3. **POST /blackboard/agents/register credential check**
   - What we know: Registration endpoint exists; credentials are part of the request.
   - What's unclear: What format are credentials? (API key, password, shared secret?) How are credentials validated?
   - Recommendation: For Phase 2 v1, any valid POST body with `agentId` and `role` issues a token (similar to how `X-Agent-ID` currently works). Credential validation is a Phase 3+ concern.

4. **Director/Admin scoped read behavior**
   - What we know: Actor scoped read returns `{ character_card, current_scene }`. Director/Admin have full access.
   - What's unclear: Do Director/Admin also have the `/me/scope` endpoint? Do they bypass it and use raw endpoints?
   - Recommendation: Director/Admin use raw `/layers/:layer/entries` endpoints. `/me/scope` returns `{ full_access: true }` for Director/Admin.

---

## Validation Architecture

> Skipped: `workflow.nyquist_validation` is `false` in `.planning/config.json`.

### Wave 0 Gaps

- `tests/boundary.test.ts` — covers BOUND-01 through BOUND-04
- `tests/conftest.ts` — shared fixtures (existing `createTestApp` helper in `blackboard.test.ts` can be extracted)
- `vitest` already installed and configured

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| BOUND-01 | Actor write to core layer: rejected with CAPABILITY_CLOSED + 403 | unit/integration | `vitest run tests/boundary.test.ts` |
| BOUND-02 | Actor read of full blackboard: returns only character_card + current_scene | unit/integration | `vitest run tests/boundary.test.ts` |
| BOUND-03 | Actor read of core/scenario: returns 403 with NAMESPACE_VIOLATION | unit/integration | `vitest run tests/boundary.test.ts` |
| BOUND-04 | Boundary enforcement is hard (API rejects before agent reasoning) | smoke | `vitest run tests/boundary.test.ts` |

---

## Sources

### Primary (HIGH confidence)

- [Auth0/node-jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) — JWT `sign()` and `verify()` API, confirmed `algorithms` option for HS256 restriction
- Existing `src/routes/blackboard.ts` — Express Router pattern, service injection via setters, error-class-to-HTTP mapping pattern
- Existing `src/services/blackboard.ts` — BlackboardService API, unchanged in Phase 2

### Secondary (MEDIUM confidence)

- Express Router route-level middleware pattern — standard Express.js pattern, well-established

### Tertiary (LOW confidence)

- None — all key technology (jsonwebtoken, Express, TypeScript) is well-documented and verified

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — jsonwebtoken is the de facto standard; no ambiguity
- Architecture: HIGH — all patterns derived directly from locked decisions in CONTEXT.md and existing Phase 1 code
- Pitfalls: HIGH — JWT algorithm confusion and GET route auth gaps are known real-world issues

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (30 days — stable domain, no fast-moving changes expected)
