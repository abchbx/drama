# Phase 4: Director Agent - Context

**Gathered:** 2026-03-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the Director agent that orchestrates the drama without monopolizing creative authority. The Director plans (writes plot backbone to core layer), arbitrates (resolves Actor output conflicts), and verifies (fact-checks scenes against core + scenario). The Director **never writes dialogue for Actor characters**. Scope is fixed per ROADMAP.md: DIR-01 through DIR-06.
</domain>

<decisions>
## Implementation Decisions

### Plot Backbone Structure (core layer)

- **Format:** Prose narrative — natural language written to the core layer. LLM-native and flexible. Consistent with Director's creative role.
- **Actor discretion encoding:** Explicit `[ACTOR DISCRETION: brief description]` markers embedded in prose. The Director scans for this pattern to avoid overriding Actor-controlled beats.
- **Budget overflow:** Director proactively monitors core layer usage. At ~75% capacity (~1.5K tokens), Director summarizes the oldest beats and migrates them to the scenario layer, then prunes from core. Core always holds the current narrative anchor. *(Note: This pruning behavior should be coordinated with Phase 6's memory folding policy — Planner should align the two.)*
- **Backbone updates:** Prune-and-write — no in-place versioning. History lives in scenario layer. Core always holds the current anchor within budget.

### Scene Signaling Mechanism (procedural layer)

- **Signal form:** Blackboard entries written to the procedural layer. Fits the blackboard-as-source-of-truth model. Phase 5 (Message Routing Hub) layers Socket.IO broadcasts on top for real-time delivery; procedural entries remain the authoritative record.
- **scene_start content:** Minimal — `{ sceneId, directorId, timestamp }`. Actors read scene context from the core backbone prose. Procedural stays lean for signaling only.
- **scene_end content:** Structured outcome — `{ sceneId, directorId, timestamp, beats: string[], conflicts: string[], plotAdvancement: string, status: 'completed' | 'interrupted' | 'timeout' }`. Director reads structured outcomes for next-scene planning; Actors read semantic layer for dialogue.
- **Scene ending detection:** Goal-beat completion. Director writes explicit goals into each scene's backbone prose; judges completion based on Actor contributions. Aligned with Director's planning role; testable against written goals.

### Conflict Arbitration Mode

- **Conflict detection:** Hybrid two-layer approach:
  1. Actor-raised flag — Actors use existing `unverifiedFacts` mechanism or a new `conflictFlag` field in `DialogueOutput` to surface contradictions. Fast, distributed, no extra LLM call.
  2. Director semantic analysis — Director proactively compares Actor outputs against each other and against core+scenario using LLM. Acts as a safety net for contradictions Actors miss.
- **Decision authority:** Binding — resolution is written to the scenario layer as prose narrative. All Actors must be consistent with it going forward. Authoritative; aligns with success criteria.
- **Decision format:** Prose narrative — natural language describing the canonical outcome (e.g., "Maria confesses to David that she orchestrated the theft. This is the canonical version of events."). Consistent with backbone format; LLM-friendly.
- **Actor discretion scenes:** Director retains authority for plot-critical canonical facts (character deaths, relationship status, world-state changes) even in `[ACTOR DISCRETION]` scenes. Actors control dialogue and character voice; Director controls canonical state. `[ACTOR DISCRETION]` means creative freedom for *how*, not authority to change *what*.

### Fact-Checking Timing and Surface

- **Timing:** Reactive — Director flags contradictions after Actor outputs are written to the semantic layer. Contradictions are flagged, not rejected. Faster write path; Director's arbitration handles resolution after the flag is raised. (Success criteria says "flagged," not rejected.)
- **Surface method:** Procedural layer entry — `{ sceneId, conflictingClaim: string, coreFact: string, scenarioFact?: string, severity: 'high' | 'medium' | 'low', sourceAgentId: string, timestamp: string }`. Actor entries remain immutable. Procedural is the right layer for coordination signals.
- **Severity levels:** Three levels with core/scenario weighting:
  - **High** — plot contradiction against core (core is immutable). Director must resolve before scene proceeds.
  - **Medium** — inconsistency against scenario, or character inconsistency (voice/trait violation). Director notes it.
  - **Low** — minor detail (setting, minor action). Logged only.
- **Scope:** Core + scenario with differential severity weighting. Matches how Actors already use fact context (`Actor.readFactContext()` reads both core and scenario). Core violations are high severity; scenario violations are medium (Director can update scenario through arbitration).

### Claude's Discretion

The following were delegated to implementation-time judgment:
- Exact threshold for proactive backbone pruning (default: 75% of core budget)
- How the Director LLM performs semantic similarity comparison (prompt structure, threshold)
- The Director's own LLM provider interface — uses same `LlmProvider` abstraction as Actor
- Director's logger format and log level configuration
- Exact Zod schema for procedural scene signals and contradiction entries

</decisions>

<specifics>
## Specific Ideas

- Core layer is intentionally tight (2K tokens) — Director must actively manage budget; passive approach leads to write failures
- Phase 6 (Memory Management Engine) folding policy should align with Director's proactive pruning behavior — Planner should ensure both phases use compatible summary/eviction strategies
- Director uses the same `LlmProvider` interface as Actor — no hardcoded LLM SDK
- Director has full layer access (all 4 layers) per existing capability map — no boundary enforcement needed for Director writes
- Actor discretion scenes are testable: Director writes at least one `[ACTOR DISCRETION]` scene in the backbone; that scene's Actor output is not overridden in arbitration

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`Actor` class** (`src/services/actor.ts`): Follow the same constructor pattern and service injection approach. Director will be instantiated similarly: `{ blackboard, capabilityService, llmProvider, logger, agentId }`.
- **`LlmProvider` interface** (`src/services/llm.ts`): Director uses the same `generate({ system, user })` interface. Build `buildDirectorSystemPrompt()` and `buildDirectorUserPrompt()` in the style of `buildActorSystemPrompt()` and `buildActorUserPrompt()`.
- **`Actor.generate()` flow** (`actor.ts:56`): The Director's orchestration flow should mirror this pattern: generate exchangeId → build prompts → call LLM → parse/validate → write entries to blackboard → return structured output.
- **`BlackboardEntry` metadata fields** (`types/blackboard.ts:25-31`): Add Director-specific metadata fields as needed (e.g., `directorDecisionFor?: string`, `contradictionSeverity?: string`).
- **`LayerState` and `BlackboardState`** (`types/blackboard.ts:139-149`): Director reads and writes these structures. Understand how `readLayer()` and `writeEntry()` work.

### Established Patterns

- **Prose-first with structured metadata**: Existing entries use JSON-stringified content in `BlackboardEntry.content`. Director entries should follow this: prose narrative in `content`, structured data in `metadata`.
- **Scoped reads for Actors, full access for Director**: Actor reads only `semantic` and filtered layers. Director reads all layers. Planner should ensure `capabilityService.getAllowedLayers('Director')` returns all four.
- **LLM call + Zod validation + write pattern**: Every LLM call in the codebase follows: call `llmProvider.generate()` → parse JSON → validate with Zod schema → write to blackboard. Director should follow this exactly.
- **`unverifiedFacts` on Actor entries** (`types/blackboard.ts:28`): Actor entries already carry hallucination flags. Director's contradiction signals are separate Director-authored entries — not modifying Actor entries.

### Integration Points

- **Phase 3 (`Actor` class)**: Director orchestrates Actors. Actors expose `generate(context: SceneContext)`. Director calls Actor generation and reads Actor outputs from semantic layer.
- **Phase 2 (`CapabilityService`)**: Boundary enforcement is already tested. Director has full access (no enforcement). Planner should add capability assertions in Director tests matching Phase 2's pattern.
- **Phase 5 (Message Routing Hub)**: Procedural layer entries are the blackboard-side of scene signals. Phase 5 wraps these with Socket.IO broadcasts for real-time delivery. Planner should treat procedural entries as the authoritative record.
- **Phase 6 (Memory Management Engine)**: Director's proactive pruning and Phase 6's folding will both touch core/scenario boundaries. Planner should add a note to Phase 6 that Director pruning and fold eviction must not conflict.
- **Audit log** (`AuditLogEntry` in `types/blackboard.ts`): Director actions should be logged. Follow the existing `operation: 'write' | 'reject' | 'violation'` pattern for Director entries.

</code_context>

<deferred>
## Deferred Ideas

- Director dashboard / monitoring UI — out of scope for Phase 4; consider Phase 7 or a future observability phase
- Director self-assessment of pacing — Director could score scene rhythm; add as potential Phase 6 enhancement
- Human-in-the-loop escalation — escalation to external decision-maker was discussed but rejected in favor of fully autonomous arbitration

</deferred>

---

*Phase: 04-director-agent*
*Context gathered: 2026-03-19*
