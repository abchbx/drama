---
phase: 04-director-agent
plan: 04-01
subsystem: agent
tags: [director, orchestration, arbitration, fact-check, zod, vitest]

# Dependency graph
requires:
  - phase: 01-shared-blackboard
    provides: BlackboardService, LAYER_BUDGETS, four-layer model, token counting
  - phase: 02-cognitive-boundary-control
    provides: CapabilityService, capabilityMap, BoundaryViolationError
  - phase: 03-actor-agents
    provides: Actor class, LlmProvider interface, LLM prompt builders, DialogueEntry type

provides:
  - Director class with planBackbone(), arbitrate(), factCheck(), signalSceneStart(), signalSceneEnd()
  - Director-specific Zod schemas (DirectorBackboneOutputSchema, ArbitrationOutputSchema, FactCheckOutputSchema)
  - DirectorGenerationError with phase tracking
  - Director prompt builders: buildDirectorSystemPrompt, buildDirectorUserPrompt, buildFactCheckUserPrompt

affects:
  - phase: 05-message-routing-hub (Director coordinates scene exchanges via Socket.IO)
  - phase: 07-integration-chaos-testing (Director + Actors integrated end-to-end)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Agent class pattern: constructor takes injected services (blackboard, capability, llmProvider, logger)"
    - "LLM-agnostic agent: LlmProvider interface enables concrete impl swap in Phase 7"
    - "Hard capability enforcement in constructor via assertion"
    - "Token budget management with pruning at 75% threshold"

key-files:
  created:
    - src/types/director.ts
    - src/services/director.ts
    - tests/director.test.ts
  modified:
    - src/services/llm.ts
    - src/services/index.ts

key-decisions:
  - "Director mirrors Actor class pattern: injected services, generate() returns typed output, Zod validation"
  - "Director reads ALL four layers (core/scenario/semantic/procedural) in readAllLayerContext() — differs from Actor which reads only core+scenario"
  - "Director capability constraint: hard assertion in constructor throws if capability map includes semantic layer (DIR-03)"
  - "ensureCoreBudget() prunes at 75% threshold (1500 tokens), writes summary to scenario layer"
  - "Arbitrate prompt built inline in Director.arbitrate() method rather than a separate builder function"

patterns-established:
  - "Plan-ahead budget management: check at 75%, prune proactively, write to scenario layer as rollback"
  - "Scene boundary signals: machine-readable JSON on procedural layer for downstream consumers"

requirements-completed: [DIR-01, DIR-02, DIR-03, DIR-04, DIR-05, DIR-06]

# Metrics
duration: 16min
completed: 2026-03-19
---

# Phase 4: Director Agent Summary

**Director class with planBackbone, arbitrate, factCheck, scene signal methods; 22 tests covering all 6 DIR requirements**

## Performance

- **Duration:** 16 min (964 seconds)
- **Started:** 2026-03-19T01:36:16Z
- **Completed:** 2026-03-19T01:52:20Z
- **Tasks:** 5
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments

- Director class mirrors Actor class pattern with injected LlmProvider (no hardcoded LLM SDK)
- Plot backbone planning with mandatory [ACTOR DISCRETION] scene markers
- Conflict arbitration writing canonical outcomes to scenario layer
- Fact-checking of actor outputs against core/scenario layer facts with severity levels
- Hard semantic-layer capability enforcement in constructor (DIR-03)
- Token budget management at 75% threshold with proactive pruning to scenario layer
- Scene boundary signals (start/end) to procedural layer

## Task Commits

Each task was committed atomically:

1. **Task 1: Define Director types and schemas** - `2aa008a` (feat)
2. **Task 2: Add Director prompt builders** - `794f3e5` (feat)
3. **Task 3: Implement Director class** - `6866a85` (feat)
4. **Task 4: Export Director from services index** - `027a4ca` (feat)
5. **Task 5: Write Director unit tests** - `758854e` (test)

**Plan metadata:** `master` (docs: complete plan)

## Files Created/Modified

- `src/types/director.ts` - Director types, Zod schemas, DirectorGenerationError
- `src/services/director.ts` - Director class with planBackbone, arbitrate, factCheck, signalSceneStart/End
- `src/services/llm.ts` - Added buildDirectorSystemPrompt, buildDirectorUserPrompt, buildFactCheckUserPrompt
- `src/services/index.ts` - Added Director and DirectorOptions exports
- `tests/director.test.ts` - 22 unit tests covering DIR-01 through DIR-06 + ERR-01/ERR-02

## Decisions Made

- Director reads all four layers (vs Actor which reads only core+scenario) to have full context for arbitration and fact-checking
- Prompt builders for planBackbone and factCheck; arbitrate prompt built inline to keep the method self-contained
- Scene signals written to procedural layer as JSON for downstream routing (Phase 5) to consume
- Budget pruning writes summary to scenario layer (not deleted) as a rollback mechanism

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed ensureCoreBudget condition using wrong budget threshold**
- **Found during:** Task 5 (Write Director unit tests)
- **Issue:** `ensureCoreBudget` used `core.tokenCount + additionalTokens > LAYER_BUDGETS.core` (checking against full budget 2000) instead of `> threshold` (75% = 1500), causing pruning to never trigger at 2000 tokens
- **Fix:** Changed condition to `core.tokenCount + additionalTokens <= threshold` with early return (correctly triggers pruning when tokenCount > 1500)
- **Files modified:** src/services/director.ts
- **Verification:** DIR-01c test passes — scenario write verified when core at 2000 tokens
- **Committed in:** `758854e` (Task 5 commit)

---

**Total deviations:** 1 auto-fixed (blocking issue)
**Impact on plan:** Bug fix essential for correct budget management behavior. No scope creep.

## Issues Encountered

- TypeScript esbuild error with `as unknown as` inside object literals — fixed by assigning casts to variables before the object literal
- `PlanningContext` import was incorrectly placed in `actor.ts` import instead of `director.ts` — fixed by separating imports
- DIR-05c test expected `## Core Facts` section header but `buildFactCheckUserPrompt` uses `[Established Facts — Core Layer]` — fixed test assertion to match actual prompt output

## Next Phase Readiness

- Phase 5 (Message Routing Hub) can now wire Director to Socket.IO-based scene exchange coordination
- All Director methods are tested and working; LlmProvider abstraction means concrete LLM impl deferred to Phase 7
- Capability map correctly configured: Director = [core, scenario, procedural], no semantic layer

---
*Phase: 04-director-agent*
*Completed: 2026-03-19*
