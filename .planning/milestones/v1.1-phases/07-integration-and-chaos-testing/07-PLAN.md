---
name: "07-integration-and-chaos-testing"
wave: 1
phase: 7
plan: "07-01"
type: implementation
depends_on:
  - "06-01"
requirements: [TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06, PROTO-01, PROTO-02, PROTO-03, PROTO-04, PROTO-05]
files_modified:
  - src/services/llm.ts
  - src/services/index.ts
  - src/app.ts
  - src/index.ts
  - tests/e2e.test.ts
  - tests/chaos.test.ts
  - tests/protocol.test.ts
new_files:
  - src/services/llm/openai.ts
  - src/services/llm/anthropic.ts
  - src/config.ts
  - src/session.ts
  - tests/e2e.test.ts
  - tests/chaos.test.ts
  - tests/protocol.test.ts
  - .env.example
autonomous: false
must_haves:
  truths:
    - "All protocol messages are Zod-schema-validated before processing."
    - "LlmProvider abstraction is fully working with OpenAI and Anthropic adapters."
    - "All configuration (API keys, ports, budgets, timeouts) comes from .env file."
    - "Every log line includes agent ID attribution."
    - "End-to-end: Director + 2 Actors complete 10 scenes with coherent narrative output."
    - "Boundary violations: Actor core writes rejected, drama continues gracefully."
    - "Silent actors: Director fallback triggers, drama continues."
    - "Concurrent writes: no data loss, optimistic locking works end-to-end."
    - "Message reorder: narrative state remains consistent despite out-of-order delivery."
    - "Token overflow: semantic layer folds mid-session, all agents continue correctly."
    - "YOLO mode assessment: documented which error paths are handled vs. instrumented-only."
  artifacts:
    - path: src/config.ts
      provides: Centralized .env-based config for all services
      min_lines: 60
    - path: src/session.ts
      provides: End-to-end drama session orchestrator
      min_lines: 280
    - path: src/services/llm/openai.ts
      provides: OpenAI adapter for LlmProvider
      min_lines: 100
    - path: src/services/llm/anthropic.ts
      provides: Anthropic adapter for LlmProvider
      min_lines: 100
    - path: tests/e2e.test.ts
      provides: E2E session tests covering TEST-01 through TEST-06
      min_lines: 400
    - path: tests/chaos.test.ts
      provides: Chaos testing harness for adversarial robustness
      min_lines: 250
    - path: tests/protocol.test.ts
      provides: Protocol message validation tests
      min_lines: 120
    - path: .env.example
      provides: Template config with all documented options
      min_lines: 40
  key_links:
    - from: src/session.ts
      to: src/services/director.ts
      via: DramaSession orchestrates Director.planBackbone() + signalSceneStart/End()
    - from: src/session.ts
      to: src/services/actor.ts
      via: DramaSession spins up Actor instances and routes scene turns
    - from: src/session.ts
      to: src/services/router.ts
      via: DramaSession coordinates Socket.IO message flow
    - from: src/session.ts
      to: src/services/memoryManager.ts
      via: DramaSession uses managed writes for all blackboard writes
    - from: src/services/llm/openai.ts
      to: src/services/llm.ts
      via: Implements LlmProvider with chat completions
    - from: src/services/llm/anthropic.ts
      to: src/services/llm.ts
      via: Implements LlmProvider with messages API
    - from: src/config.ts
      to: src/index.ts
      via: All services initialized from config
    - from: .env.example
      to: src/config.ts
      via: Config validates .env against Zod schema
---

# Phase 7 Plan: Integration + Chaos Testing

## Overview

Complete the system with end-to-end integration, protocol validation, LLM provider adapters, configuration management, structured logging, and a comprehensive chaos test suite. Define the "YOLO ends here" milestone.

## Requirements

TEST-01 (E2E session), TEST-02 (boundary chaos), TEST-03 (silent agent), TEST-04 (race conditions), TEST-05 (message reorder), TEST-06 (token overflow), PROTO-01 (message protocol), PROTO-02 (Zod schemas), PROTO-03 (LLM abstraction), PROTO-04 (.env config), PROTO-05 (structured logging)

## Architectural Guardrails

1. **Protocol messages are validated with Zod.**
   - Every incoming Socket.IO message validated before processing.
   - Every outgoing message validated before sending.
   - No raw untyped JSON flows through the system.

2. **LLM provider abstraction is complete.**
   - `OpenAiLlmProvider` and `AnthropicLlmProvider` implement `LlmProvider`.
   - Swapping providers requires only config change, no agent code changes.
   - Both adapters support streaming and non-streaming modes.

3. **All configuration from .env.**
   - `src/config.ts` reads and validates all config via Zod.
   - No hardcoded values in source code.
   - `.env.example` documents every option.

4. **Structured logging with agent attribution.**
   - Every log line includes `agentId` field.
   - Session logs include `dramaId`.
   - Log levels used appropriately: debug/info/warn/error/fatal.

5. **End-to-end session orchestration.**
   - `DramaSession` class coordinates Director + N Actors through a complete drama.
   - Manages scene flow, turn ordering, and error recovery.
   - Provides hooks for chaos injection in tests.

6. **YOLO mode assessment required.**
   - Document which error paths have full recovery vs. just logging.
   - Identify any "YOLO" paths that need instrumentation.
   - Prioritize gaps for v1.1 or v2.0.

## Files to Create

| File | Purpose |
|------|---------|
| `src/config.ts` | Centralized config loader with Zod validation, reads .env |
| `src/session.ts` | `DramaSession` orchestrates complete end-to-end drama sessions |
| `src/services/llm/openai.ts` | OpenAI adapter implementing `LlmProvider` |
| `src/services/llm/anthropic.ts` | Anthropic adapter implementing `LlmProvider` |
| `tests/e2e.test.ts` | E2E tests: TEST-01 through TEST-06 |
| `tests/chaos.test.ts` | Chaos test harness for adversarial robustness |
| `tests/protocol.test.ts` | Protocol message validation tests (PROTO-01, PROTO-02) |
| `.env.example` | Template configuration documenting all options |

## Files to Modify

| File | Change |
|------|--------|
| `src/services/llm.ts` | Export provider factory; update `LlmPrompt` for system/user messages |
| `src/services/index.ts` | Export config, session, and LLM providers |
| `src/app.ts` | Accept config via constructor instead of hardcoded values |
| `src/index.ts` | Load config from `src/config.ts`; initialize all services from config; wire up DramaSession endpoint |
| `tests/e2e.test.ts` | (New file) |
| `tests/chaos.test.ts` | (New file) |
| `tests/protocol.test.ts` | (New file) |

## Wave Map

| Wave | Tasks | Parallel? | Blocked by |
|------|-------|-----------|------------|
| 1 | T1 (config + Zod schemas) + T2 (protocol validation) | Yes | None |
| 2 | T3 (LLM providers) + T4 (structured logging) | Yes | T1 |
| 3 | T5 (DramaSession orchestration) | No | T2, T3 |
| 4 | T6 (E2E tests) + T7 (chaos tests) | Yes | T5 |
| 5 | T8 (YOLO assessment) | No | T6, T7 |

## Dependency Graph

```
T1 config-Zod + T2 protocol-validation
  -> T3 LLM-providers + T4 structured-logging
      -> T5 DramaSession-orchestration
          -> T6 E2E-tests + T7 chaos-tests
              -> T8 YOLO-assessment
```

## Detailed Tasks

<task>
<name>Create centralized config system with Zod validation</name>
<files>src/config.ts, .env.example</files>
<action>
Create `src/config.ts` as the single source of truth for all configuration, validated via Zod.

Specific steps:
1. Define Zod schemas for:
   - Server config (PORT, SOCKET_PORT)
   - LLM config (PROVIDER, OPENAI_API_KEY, ANTHROPIC_API_KEY, MODEL)
   - Blackboard config (token budgets for each layer)
   - Routing config (HEARTBEAT_INTERVAL_MS, ACTOR_TIMEOUT_MS, etc.)
   - Logging config (LOG_LEVEL)
2. Load from `process.env` after `dotenv.config()`
3. Validate on load; fail fast if config is invalid
4. Export typed config object
5. Create `.env.example` with all options documented:
   - API keys with placeholders
   - Port defaults
   - Budget defaults
   - Timeout defaults
   - Clear comments explaining each option
6. Add `dotenv` to dependencies if missing
7. Verify build
</action>
<verify>npm run build</verify>
<done>Centralized config with Zod validation exists; all options documented in .env.example</done>
</task>

<task>
<name>Ensure all protocol messages have Zod schemas and validation</name>
<files>src/types/routing.ts, tests/protocol.test.ts</files>
<action>
Verify and extend `src/types/routing.ts` to ensure every protocol message has a Zod schema.

Specific steps:
1. Review existing Zod schemas in `src/types/routing.ts`
2. Add schemas for any missing message types:
   - Scene control (scene_start, scene_end)
   - Turn ordering (your_turn, turn_complete)
   - Fact-check requests/responses
   - Arbitration requests/responses
   - Heartbeat (ping/pong)
   - Disconnect/reconnect signals
3. For each schema, add `safeParse` wrapper functions:
   - `validateIncomingMessage()` for server-side validation
   - `validateOutgoingMessage()` for client-side validation
4. Create `tests/protocol.test.ts` with:
   - Valid messages pass validation
   - Invalid messages fail with clear errors
   - Edge cases: extra fields, missing fields, wrong types
5. Verify all existing routing types are covered
6. Verify build + protocol tests pass
</action>
<verify>npm run build && npm test -- tests/protocol.test.ts</verify>
<done>All protocol messages have Zod schemas; validation tests pass</done>
</task>

<task>
<name>Implement OpenAI and Anthropic LLM provider adapters</name>
<files>src/services/llm.ts, src/services/llm/openai.ts, src/services/llm/anthropic.ts</files>
<action>
Implement complete LLM provider abstraction with both OpenAI and Anthropic adapters.

Specific steps:
1. Update `src/services/llm.ts` if needed:
   - Ensure `LlmPrompt` has separate `system` and `user` fields
   - Add factory function `createLlmProvider(config)` that returns correct implementation
2. Create `src/services/llm/openai.ts`:
   - Accepts OpenAI config (apiKey, model, baseUrl)
   - Implements `LlmProvider.generate()` using chat completions
   - Handles API errors with appropriate logging
   - Retries on transient errors (configurable)
3. Create `src/services/llm/anthropic.ts`:
   - Accepts Anthropic config (apiKey, model)
   - Implements `LlmProvider.generate()` using messages API
   - Translates system/user prompts to Anthropic format
   - Handles API errors with appropriate logging
   - Retries on transient errors
4. Update `src/services/index.ts` to export both providers and factory
5. Add `openai` and `@anthropic-ai/sdk` to dependencies
6. Create simple integration tests (mocked, no real API calls)
7. Verify build
</action>
<verify>npm run build</verify>
<done>OpenAI and Anthropic adapters exist; swapping requires only config change</done>
</task>

<task>
<name>Ensure every log line includes agent ID attribution</name>
<files>src/services/logger.ts, src/services/actor.ts, src/services/director.ts, src/services/router.ts, src/services/memoryManager.ts</files>
<action>
Review and update logging across all services to ensure agent attribution on every log line.

Specific steps:
1. If no `src/services/logger.ts`, create it:
   - Wraps pino logger
   - Provides `childLogger(agentId)` that adds agentId to every log
   - Provides `sessionLogger(dramaId, agentId)` for session context
2. Update `Actor` constructor to accept and store logger with agentId
3. Update `Director` constructor to accept and store logger with agentId
4. Update `RouterService` to log with agentId from socket handshake
5. Update `MemoryManagerService` to accept optional agentId for operations
6. Audit all existing `logger.*` calls:
   - `logger.info({ agentId }, 'message')` pattern
   - No `logger.info('message without agentId')`
7. Add pino-pretty for development logging if not present
8. Verify build
</action>
<verify>npm run build</verify>
<done>Every log line includes agent ID; session logs include dramaId</done>
</task>

<task>
<name>Create DramaSession orchestrator for end-to-end sessions</name>
<files>src/session.ts</files>
<action>
Create `DramaSession` class that orchestrates a complete drama from start to finish.

Specific steps:
1. Create `src/session.ts` with:
   - `DramaSession` class constructor accepts:
     - config
     - blackboard
     - router
     - memoryManager
     - llmProvider
     - logger
   - `initialize(characterCards: CharacterCard[]): Promise<void>`
   - `runScene(sceneConfig: SceneConfig): Promise<SceneResult>`
   - `runCompleteDrama(totalScenes: number): Promise<DramaResult>`
2. Scene flow orchestration:
   - Director plans backbone (if first scene)
   - Director signals scene_start
   - Round-robin actor turns with timeout fallbacks
   - Director fact-checks and arbitrates
   - Director signals scene_end
   - Optional promotion of scenario to core
3. Error recovery:
   - Catch blackboard errors
   - Catch LLM errors with retries
   - Handle silent actors with Director fallback
   - Continue on non-fatal errors
4. Chaos hooks for testing:
   - `injectChaosBeforeTurn(agentId, chaosFn)`
   - `injectChaosAfterWrite(chaosFn)`
   - `simulateDisconnect(agentId)`
5. Verify build
</action>
<verify>npm run build</verify>
<done>DramaSession orchestrates complete end-to-end sessions with error recovery and chaos hooks</done>
</task>

<task>
<name>Write comprehensive E2E tests covering TEST-01 through TEST-06</name>
<files>tests/e2e.test.ts</files>
<action>
Create `tests/e2e.test.ts` with complete end-to-end tests for all TEST requirements.

Specific steps:
1. Create test harness:
   - In-memory blackboard
   - Mock LlmProvider with deterministic outputs
   - Mock RouterService (no real sockets)
   - `TestDramaSession` extending DramaSession with inspection hooks
2. TEST-01: Complete 10-scene drama:
   - Director + 2 Actors
   - 10 scenes completed
   - Coherent narrative flow observed in blackboard
   - All layers used appropriately
3. TEST-02: Boundary violation handling:
   - Actor attempts core write
   - Error received
   - Drama continues without corruption
4. TEST-03: Silent agent fallback:
   - One Actor never responds
   - Timeout triggers
   - Director fallback executes
   - Drama continues
5. TEST-04: Concurrent write handling:
   - Simultaneous writes from multiple actors
   - No data loss
   - Optimistic locking works
   - All entries present
6. TEST-05: Message reorder resilience:
   - Deliver turn messages out of order
   - Narrative state remains consistent
   - Drama continues correctly
7. TEST-06: Token overflow handling:
   - Fill semantic layer to capacity
   - Write triggers fold
   - Summary created
   - All agents continue
8. All tests must pass
</action>
<verify>npm run build && npm test -- tests/e2e.test.ts</verify>
<done>E2E tests cover TEST-01 through TEST-06; all pass</done>
</task>

<task>
<name>Create chaos test harness for adversarial robustness</name>
<files>tests/chaos.test.ts</files>
<action>
Create `tests/chaos.test.ts` with adversarial testing harness.

Specific steps:
1. Chaos injection primitives:
   - `ChaosInjector` class with methods:
     - `delayMessages(agentId, delayMs)`
     - `dropMessages(agentId, probability)`
     - `corruptMessages(agentId, corruptFn)`
     - `simulateOutOfOrder(agentId)`
     - `fillLayerToCapacity(layer)`
     - `throwOnWrite(layer, probability)`
2. Chaos scenarios:
   - Flaky network: 10% message drop, drama continues
   - High latency: 2s delays, timeout fallbacks trigger
   - Message corruption: invalid JSON, validation catches it
   - Resource exhaustion: semantic layer fills, fold triggers
   - Concurrent chaos: multiple failures simultaneously
3. Metrics collection:
   - Track recovery rate
   - Track data corruption incidents
   - Track drama completion rate
4. YOLO mode documentation:
   - For each chaos scenario, note:
     - "Handled" → full recovery, drama continues
     - "Instrumented" → logged, but drama may fail
     - "YOLO" → no handling, undefined behavior
5. All chaos tests must run without crashing the process
</action>
<verify>npm run build && npm test -- tests/chaos.test.ts</verify>
<done>Chaos test harness exists; YOLO mode assessment documented</done>
</task>

<task>
<name>Wire everything together for full integration</name>
<files>src/index.ts, src/app.ts</files>
<action>
Update the main entrypoint to wire up all components with config.

Specific steps:
1. Update `src/app.ts`:
   - Accept config in constructor instead of hardcoding
   - Accept pre-instantiated services if provided
2. Update `src/index.ts`:
   - Load config from `src/config.ts`
   - Initialize logger from config
   - Initialize blackboard from config
   - Initialize memoryManager with blackboard + llmProvider
   - Initialize capabilityService
   - Initialize routerService with httpServer
   - Initialize llmProvider via factory
   - Create app with all services
   - Add `/session` endpoint that creates `DramaSession`
   - Add `/health` endpoint that checks all services
   - Start server on config.PORT
3. Verify build
4. Verify server starts with valid .env
</action>
<verify>npm run build</verify>
<done>All components wired through config; server starts cleanly</done>
</task>

<task>
<name>Produce YOLO mode assessment document</name>
<files>.planning/phases/07-integration-and-chaos-testing/YOLO-ASSESSMENT.md</files>
<action>
Create YOLO-ASSESSMENT.md documenting error handling coverage.

Specific sections:
1. Executive Summary
   - Total error paths identified
   - Percent handled vs. instrumented vs. YOLO
   - Recommendation for v1.0 release

2. Error Path Inventory
   Table with:
   - Error type
   - Location
   - Handling level (Handled | Instrumented | YOLO)
   - Notes

3. Handled Paths
   - Blackboard optimistic lock conflict
   - LLM API transient errors (retried)
   - Actor timeout (Director fallback)
   - Socket disconnect (reconnect + replay)
   - Token overflow (fold)
   - Boundary violation (rejected, logged)

4. Instrumented Paths
   - LLM API permanent errors
   - Blackboard corruption (detected, logged)
   - Invalid protocol messages (rejected, logged)

5. YOLO Paths
   - Out-of-memory crashes
   - File system corruption
   - Network partition spanning entire scene
   - Simultaneous failure of >50% of actors
   - Malicious actor with valid JWT

6. Recommendations
   - High priority for v1.1
   - Medium priority for v2.0
   - Out of scope for v1.x

7. v1.0 Release Readiness
   - GO/NO-GO recommendation
   - Rationale
</action>
<verify>cat .planning/phases/07-integration-and-chaos-testing/YOLO-ASSESSMENT.md</verify>
<done>YOLO assessment complete; documented which paths are handled vs. instrumented vs. YOLO</done>
</task>

## Test Plan

| Test ID | Requirement | Verify |
|---------|-------------|--------|
| PROTO-01a | Message protocol defined | All message types have Zod schemas |
| PROTO-01b | Speaker identification | Every message includes agentId |
| PROTO-02 | Zod validation | Invalid messages fail safeParse |
| PROTO-03 | LLM abstraction | OpenAI and Anthropic both implement LlmProvider |
| PROTO-04 | .env config | All config from env, no hardcodes |
| PROTO-05 | Agent logging | Every log line has agentId |
| TEST-01 | E2E 10-scene drama | DramaSession completes 10 scenes |
| TEST-02 | Boundary chaos | Actor core write rejected, drama continues |
| TEST-03 | Silent agent | Timeout fallback triggers, drama continues |
| TEST-04 | Race condition | Concurrent writes, no data loss |
| TEST-05 | Message reorder | Out-of-order delivery, state consistent |
| TEST-06 | Token overflow | Semantic fold triggers, agents continue |

## Verification Criteria

After all tasks complete, run:

```bash
npm run build
npm test
```

Expected outcomes:
- TypeScript compiles without errors.
- All existing tests pass.
- New E2E tests (TEST-01 through TEST-06) pass.
- New protocol tests pass.
- New chaos tests run without process crashes.
- YOLO-ASSESSMENT.md is complete.
- Server starts cleanly with valid .env.

## Goal-Backward Verification (must_haves)

| Phase Success Criterion | How Verified |
|------------------------|---------------|
| All protocol messages Zod-validated | PROTO-01/PROTO-02 tests pass; no untyped JSON |
| LLM provider abstraction complete | OpenAI + Anthropic adapters; no agent code changes on swap |
| All configuration from .env | src/config.ts validates env; .env.example documents all |
| Every log line has agent ID | Audit of logger calls; PROTO-05 tests pass |
| E2E 10-scene drama completes | TEST-01 passes |
| Boundary violations handled gracefully | TEST-02 passes |
| Silent agent fallback works | TEST-03 passes |
| Concurrent writes no data loss | TEST-04 passes |
| Message reorder state consistent | TEST-05 passes |
| Token overflow handled | TEST-06 passes |
| YOLO mode documented | YOLO-ASSESSMENT.md exists with inventory |
