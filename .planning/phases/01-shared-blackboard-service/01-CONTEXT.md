# Phase 1: Shared Blackboard Service - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

REST API backend service that is the single source of truth for all agent state. All agents (Director, Actors) read from and write to it via HTTP. Phase 1 implements BLKB-01 through BLKB-05: four-layer memory model with hard token budgets, optimistic locking, audit log, and JSON snapshot persistence. No Socket.IO, no agents, no boundary enforcement — those come in later phases.

</domain>

<decisions>
## Implementation Decisions

### API Design — Resource Naming + Layering

- **URL structure:** Nested paths — `GET/POST /blackboard/layers/{layer}/entries`, `GET/DELETE /blackboard/layers/{layer}/entries/:id`
- **Layer routing:** Four explicit layers: `core`, `scenario`, `semantic`, `procedural`
- **Write response:** Full entry returned on success (all metadata — version, timestamp, messageId, agentId)
- **Agent identity:** `X-Agent-ID` header on all requests. Body is content-only. Service derives attribution from header.
- **Optimistic locking:** Every layer read returns `currentVersion`. Client passes `expectedVersion` in write request body. Server rejects with 409 on version mismatch.

### Token Budget Enforcement Policy

- **Budget values:** Core: 2K tokens, Scenario: 8K tokens, Semantic: 8K tokens, Procedural: 4K tokens
- **At 100% budget:** Reject write outright with 413 Payload Too Large. Calling agent must truncate, fold, or retry.
- **At 60% budget:** Emit a warning-level log entry (not an error, not a write block). 60% alert is implemented in Phase 1 for Phase 6 foundation.
- **Token counting:** Tiktoken (accurate OpenAI-compatible encoder). Counted synchronously on every write attempt.
- **Core layer:** Budget applies but core is never evicted (Phase 6 memory folding handles this distinction — Phase 1 just enforces the write budget).

### Snapshot Strategy and Startup Behavior

- **Snapshot trigger:** Timer-based — write to disk every 30 seconds if state has changed since last snapshot. Not on every write (too much I/O), not only on shutdown (too risky for crashes).
- **Snapshot file structure:** `blackboard.json` (current) + `blackboard.backup.json` (previous copy). Overwrite current, keep one backup.
- **Snapshot format:** JSON with metadata header (timestamp, schemaVersion) + all four layers with their entries and version numbers.
- **Startup behavior:** Always load from snapshot if one exists. State is deterministic on restart.

### Audit Log Output Shape

- **Storage:** Separate append-only JSONL file — `audit-{YYYY-MM-DD}.jsonl`. One JSON object per line. Rotates daily.
- **Log entry fields:** timestamp, agentId, layer, messageId, entryId, operation ("write" | "reject"), rejectionReason (if applicable), entryContentHash (SHA-256)
- **Failed writes:** All rejected write attempts are also logged with rejectionReason. Rejections are critical for Phase 2 boundary debugging.
- **REST endpoint:** `GET /blackboard/audit` with optional filters: `?agentId=`, `?layer=`, `?since=` (ISO timestamp). Returns last N entries by default.

### Claude's Discretion

- **Entry content schema** — within an entry, the `content` field is a string. How that string is structured (JSON blob vs plain text) is not enforced by the blackboard — agents decide. The blackboard just stores and counts tokens.
- **Audit log retention** — how many days of JSONL files to keep is not specified. Planner should add a config knob but default to keeping all.
- **Snapshot filename path** — configurable via env var (`.env`). Defaults to `./data/blackboard.json`.
- **Read pagination** — if a layer has many entries, should GET return paginated results? Planner decides based on typical layer sizes.
- **Health check endpoint** — not required by success criteria, but useful. Planner adds `/health` at discretion.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets

- No existing `src/` directory — Phase 1 creates the entire backend foundation. No reusable components to pull from.
- Stack is already decided (research phase): Node.js 20 + TypeScript + Express.js + Socket.IO (later) + Zod + Pino + Tiktoken + Vitest

### Established Patterns

- Express.js for HTTP layer — middleware for logging, error handling, CORS
- Zod for runtime schema validation on all incoming requests
- Pino for structured JSON logging with child loggers (agent identity attached)
- Adapter pattern for LLM providers — relevant when agents call the blackboard from within LLM tool calls

### Integration Points

- Phase 1 is the foundation — no upstream dependencies
- Phase 2 (Boundary Control) hooks into the blackboard write path as middleware
- Phase 3+ (Agents) call the blackboard REST API as HTTP clients
- Phase 5 (Socket.IO) will layer real-time events on top of the existing Express server

</code_context>

<specifics>
## Specific Ideas

- "The blackboard is the single source of truth; all agents read from and write to it." — from ROADMAP.md. This is the guiding principle: no agent caches state locally, everything goes through the API.
- Audit rejections are the Phase 2 debugging foundation — make sure rejected writes are first-class log entries, not afterthoughts.
- Timer-based snapshots (30s dirty interval) chosen over every-write to avoid I/O overhead while still protecting against crash data loss.

</specifics>

<deferred>
## Deferred Ideas

- Socket.IO real-time events on top of Express (Phase 5) — blackboard write events could broadcast to connected agents
- Redis-backed persistence for horizontal scaling (Phase 7+) — in-memory + JSON files for now
- LLM provider abstraction for when agents call the blackboard from within tool calls
- Health check endpoint, read pagination — planner's discretion

</deferred>

---

*Phase: 01-shared-blackboard-service*
*Context gathered: 2026-03-18*
