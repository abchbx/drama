# Phase 3: Actor Agents - Context

**Gathered:** 2026-03-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Build Actor agents that generate dialogue within their character constraints, maintain distinct character voices across scenes, and flag unverified content. Actors are the primary creative output unit. The Director coordinates (Phase 4) and message routing (Phase 5) are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Agent Architecture
- Actor is an **in-process TypeScript class** instantiated by the server — not a separate process or external HTTP client
- Server calls `actor.generate(sceneContext)` directly — **synchronous scene exchange**; the server holds Actor instances and invokes them in sequence
- LLM calls go through an **LLM provider interface from day 1** — PROTO-03 (provider abstraction) will be satisfied at Phase 7, but the interface is built now so actors are not hardcoded to one provider
- Actors are **stateless** — the blackboard is the memory; actors reconstruct context from blackboard layers each scene (no in-memory conversation history)

### Dialogue Output Format
- LLM generates **structured JSON** — schema enforced with Zod (not plain text)
- Actor receives **structured scene context object** containing: character card, current scene description, relevant semantic layer entries, and other actors in scene
- Actor returns an **array of dialogue lines** per exchange — each line has speaker, text, and optional hallucination flag
- **Self-flagging**: actor's system prompt instructs it to mark `unverified_facts: true` if dialogue contains claims not in the provided context

### Hallucination Handling
- A hallucination is defined as a **fact that contradicts an established core or scenario layer entry** — narrow scope, clear boundary
- Detection via **system prompt instructions** (one-pass generation) — actor marks unverified facts inline in JSON output
- Flagged output is **written to the blackboard with the flag set** (`unverified_facts: true`) — Director reviews and can override
- Flag granularity is **per-entry** (not per-line or per-claim)

### Voice Constraints
- Voice is represented as **structured style attributes** (not prose or adjective list): vocabulary range, sentence length, emotional range, speech patterns (e.g., rhetorical questions, declarative statements), forbidden words/topics
- Voice constraints are stored in the **character card's voice field** — Actor-scoped, read every generation
- Director defines voice constraints per character **at session start** — structured and explicit
- Character voice stored in procedural layer persists across sessions for voice consistency

### Claude's Discretion
- Exact Zod schema field names for the dialogue JSON output
- Exact prompt wording for hallucination detection system instructions
- How many voice dimensions are required (minimum viable set)
- Response timing behavior on LLM failure
- What the structured scene context object looks like exactly

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/routes/agents.ts`: `POST /blackboard/agents/register` issues JWT; `GET /me/scope` returns Actor-scoped view — actor class should use these endpoints internally
- `src/services/capability.ts`: `CapabilityService`, `AgentJwtPayload`, `verify()` — actor should verify its own token on startup
- `src/services/blackboard.ts`: `BlackboardService` with 4-layer read/write — actor reads from core + semantic, writes to semantic
- `src/types/blackboard.ts`: `BlackboardEntry`, `AgentRole`, `BlackboardLayer` types — actor output schema should follow these naming conventions

### Established Patterns
- Setter injection for service dependencies (mirrors `setCapabilityService`, `setAuditLog` pattern)
- Zod for runtime validation of requests and responses
- Error classes extend `Error` with typed fields (e.g., `BoundaryViolationError`)
- pino logger available via `req.app.locals.logger`

### Integration Points
- Actor class receives: `BlackboardService`, `CapabilityService`, logger, LLM provider
- Actor reads: core layer (fact context), semantic layer (current scene, character card)
- Actor writes: semantic layer (dialogue entries with `unverified_facts` flag)
- Actor registers via `POST /blackboard/agents/register` with role 'Actor' at startup

</code_context>

<specifics>
## Specific Ideas

- Two actors with different character cards (e.g., "villain" vs "hero") should generate dialogue that sounds clearly distinct — voice constraints make this measurable
- The character card is the anchor for both voice and identity — all actor context flows from it
- ACTR-02 scoped reads (Phase 2 boundary enforcement) mean actors cannot accidentally access the plot backbone — this is enforced by the capability system, not by prompting

</specifics>

<deferred>
## Deferred Ideas

- LLM provider selection (OpenAI vs Anthropic) — Phase 7 PROTO-03 task; interface built in Phase 3, adapter implemented in Phase 7
- Real-time Socket.IO communication — Phase 5 (Message Routing Hub); Phase 3 uses synchronous `generate()` calls
- Character card evolution mid-session — voice constraints are set at session start; dynamic evolution is out of scope for v1
- Multi-character scene support (more than 2 actors in a scene) — defer to Phase 7 or backlog

</deferred>

---

*Phase: 03-actor-agents*
*Context gathered: 2026-03-18*
