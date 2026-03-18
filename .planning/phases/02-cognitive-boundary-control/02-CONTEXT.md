# Phase 2: Cognitive Boundary Control - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Prevent Actor agents from overstepping their assigned roles via hard (programmatic) enforcement — not soft (prompt-based). Boundary enforcement is installed as a gate between agents and the blackboard, protecting multi-agent integrity. Actors are restricted to semantic + procedural layers only. Directors and Admins have full access.

</domain>

<decisions>
## Implementation Decisions

### Agent Identity + Role Model

- **Identity mechanism:** Registration + session token. Agents call a registration endpoint with credentials; server issues a scoped session token (JWT). Replaces the raw X-Agent-ID header from Phase 1 for boundary-gated calls.
- **Roles:** Three roles — Actor, Director, Admin
  - **Actor** → semantic + procedural write; character card + current scene read
  - **Director** → all layers (core, scenario, semantic, procedural) read and write
  - **Admin** → all layers (core, scenario, semantic, procedural) read and write
- **Capability storage:** Config file (`.env` or `config.json`). Role → layer grants loaded at startup. No code changes needed to adjust permissions.
- **JWT verification:** All boundary-gated requests validate a signed JWT. Token contains `agentId` and `role`. Server verifies with a secret. Stateless, no in-memory session map needed.

### Enforcement Point

- **Enforcement location:** Route-level guards inside the existing blackboard router (`src/routes/blackboard.ts`). Boundary logic stays co-located with blackboard route handlers rather than in separate middleware.
- **Both reads and writes:** Boundary checks apply to both read and write operations — not just writes. An Actor requesting a restricted layer read gets a 403, not raw data.
- **Registration endpoint:** `POST /blackboard/agents/register`. Issues JWT on valid credentials. Registered under the same `/blackboard/` namespace as existing routes.

### Scoped Read Content

- **Actor scoped read scope:** Actor sees only: (1) their character card from core layer, (2) the `current_scene` entry from semantic layer. Nothing else.
- **"Current scene" identification:** A designated entry in the semantic layer with `id = 'current_scene'` is the canonical current scene. The Director maintains it and updates it on scene transitions.
- **Empty initial state:** When character card or `current_scene` entry doesn't exist yet, return HTTP 200 with empty `character_card` / `current_scene` fields. The calling system handles empty-state bootstrapping.
- **Scoped read endpoint:** `GET /blackboard/agents/me/scope` — returns `{ character_card, current_scene }` filtered to the requesting agent's role. Actor role gets scoped view; Director/Admin get full access (no filtering).

### Violation Response + Logging

- **HTTP status:** `403 Forbidden` for all boundary violations — writes to unauthorized layers and reads of restricted layers both return 403.
- **Error response body (full detail):** On violation, response body includes:
  - `violationType` — CAPABILITY_CLOSED | NAMESPACE_VIOLATION | INPUT_SCOPE_VIOLATION
  - `targetLayer` — the layer the agent attempted to access
  - `operation` — read | write
  - `allowedLayers` — the layers this role is permitted to access
  - `message` — human-readable description
- **Audit log on violation:** New `violation` operation type written to the audit log with:
  - `agentId`
  - `role`
  - `attemptedLayer`
  - `operation` (read/write)
  - `violationType` (CAPABILITY_CLOSED | NAMESPACE_VIOLATION | INPUT_SCOPE_VIOLATION)
  - `timestamp`
- **Violation types (three distinct types):**
  - `CAPABILITY_CLOSED` — Actor or restricted agent attempted to write to a prohibited layer
  - `NAMESPACE_VIOLATION` — Agent attempted to read a layer outside their read grant
  - `INPUT_SCOPE_VIOLATION` — Agent requested data via an out-of-scope API (e.g., Actor calls `/blackboard/layers/core/entries` directly)

### Claude's Discretion

- Exact JWT secret key length and algorithm (HS256 vs RS256)
- Exact `current_scene` entry content structure (just the scene text, or metadata too?)
- Whether Director/Admin scoped reads also go through `/blackboard/agents/me/scope` or bypass it entirely
- How many entries `current_scene` holds — last one only, or last N for context?
- Whether Director can write to `current_scene` entry or only create new entries tagged with scene metadata

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **X-Agent-ID header:** Phase 1 already extracts `X-Agent-ID` on POST routes. This is replaced by JWT validation in Phase 2 for boundary-gated calls. GET routes currently don't require auth — Phase 2 will gate reads too.
- **BlackboardService:** Already has `readLayer()`, `writeEntry()`, and `deleteEntry()`. Boundary checks happen at the route layer — `BlackboardService` methods remain unchanged.
- **AuditLogEntry type:** Already has `operation: 'write' | 'reject'`. New `violation` operation type extends this union. Audit log service interface already accepts `operation` field.
- **Four layer constants:** `LAYER_NAMES` and `BlackboardLayer` type already defined. Capability map just maps roles → subsets of these layers.
- **Express Router pattern:** `blackboardRouter` already in use. New capability-check middleware and route-level guards add to this file.

### Established Patterns
- **Error classes:** `VersionConflictError`, `TokenBudgetExceededError`, `NotFoundError`, `ValidationError` are already thrown by `BlackboardService` and mapped to HTTP responses in routes. `BoundaryViolationError` (new) follows the same pattern.
- **Service injection:** `setAuditLog()` and `setSnapshotService()` pattern used for dependency injection. A `setCapabilityService()` or similar follows the same pattern.
- **pino logger:** Already initialized in `app.ts`. New boundary checks should use `logger.warn()` for violations.

### Integration Points
- **`app.ts`:** Where `blackboardRouter` is mounted. New registration router (`/blackboard/agents/`) mounts alongside it.
- **`src/routes/blackboard.ts`:** Where route-level capability guards are added. Modifies `POST /layers/:layer/entries` and `GET /layers/:layer/entries` handlers.
- **`.env` file:** Where JWT secret and role→layer capability map are stored. Loaded at startup by a new capability loader.
- **`AuditLogEntry` operation field:** Extended from `'write' | 'reject'` to include `'violation'`.

</code_context>

<specifics>
## Specific Ideas

- "Hard enforcement must be programmatic, not prompt-based" — no amount of clever prompting bypasses the API-level check
- "Actors should never be able to see the plot backbone" — core layer is completely opaque to Actor role
- "BOUND-04: violations fail regardless of prompt" — the API rejects the operation before it reaches the agent's reasoning

</specifics>

<deferred>
## Deferred Ideas

- Actor sub-roles (Protagonist, Antagonist, Supporting) — deferred to a future phase if needed
- Rate limiting per agent — noted as a Phase 5 or later concern
- Capability revocation / session invalidation — noted for Phase 5 routing hub if needed

</deferred>

---

*Phase: 02-cognitive-boundary-control*
*Context gathered: 2026-03-18*
