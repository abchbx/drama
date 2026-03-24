---
name: "06-memory-management-engine"
wave: 1
phase: 6
plan: "06-01"
type: implementation
depends_on:
  - "05-01"
requirements: [MEM-01, MEM-02, MEM-03, MEM-04, MEM-05]
files_modified:
  - src/types/blackboard.ts
  - src/services/blackboard.ts
  - src/services/actor.ts
  - src/services/director.ts
  - src/services/auditLog.ts
  - src/routes/blackboard.ts
  - src/services/index.ts
  - tests/actor.test.ts
  - tests/director.test.ts
new_files:
  - src/services/memoryManager.ts
  - tests/memoryManager.test.ts
autonomous: false
must_haves:
  truths:
    - "Every blackboard write still counts tokens, and layer usage crossing 60% emits a non-blocking per-layer alert."
    - "Semantic overflow no longer hard-fails first; older semantic history folds into one summary entry while a recent verbatim tail remains."
    - "Procedural overflow preserves voice-constraint entries verbatim while compacting only foldable procedural history."
    - "Actors continue receiving narrative continuity after a semantic fold because folded semantic summaries are included in fact context."
    - "Core entries are never auto-deleted or summarized away during Director operations."
    - "Only the Director can explicitly promote scenario content into core, with source/target linkage preserved in metadata and audit logs."
  artifacts:
    - path: src/services/memoryManager.ts
      provides: Managed write orchestration, fold triggers, alerts, promotion API
      min_lines: 220
    - path: src/types/blackboard.ts
      provides: Metadata extensions, audit operation extensions, memory event types
      min_lines: 180
    - path: src/services/director.ts
      provides: No-core-eviction Director flow and explicit promotion entrypoint
      min_lines: 220
    - path: src/services/actor.ts
      provides: Fact-context assembly with folded semantic summaries included
      min_lines: 170
    - path: tests/memoryManager.test.ts
      provides: Unit coverage for MEM-01 through MEM-05 folding/promotion/alert flows
      min_lines: 240
  key_links:
    - from: src/services/memoryManager.ts
      to: src/services/blackboard.ts
      via: managed write path using token counts, fold selection, delete+rewrite orchestration
    - from: src/services/memoryManager.ts
      to: src/services/llm.ts
      via: LlmProvider summarization call for semantic/procedural folding
    - from: src/services/director.ts
      to: src/services/memoryManager.ts
      via: explicit promoteScenarioEntryToCore call; no ensureCoreBudget pruning
    - from: src/services/actor.ts
      to: src/services/blackboard.ts
      via: readFactContext includes foldSummary semantic entries with core and scenario context
    - from: src/routes/blackboard.ts
      to: src/services/memoryManager.ts
      via: HTTP writes use managed write path so alerts/folds also apply to API writes
    - from: src/services/auditLog.ts
      to: src/types/blackboard.ts
      via: extended AuditLogEntry.operation values for alert/fold/promote
---

# Phase 6 Plan: Memory Management Engine

## Overview
Implement a service-layer memory management engine that preserves narrative continuity under token budgets without violating cognitive boundaries or mutating core canon automatically. This phase adds per-layer alerts, semantic/procedural folding, explicit Director-only scenario→core promotion, auditability, and actor-facing folded-summary context.

## Requirements
MEM-01 (per-write token counting + 60% layer alert), MEM-02 (semantic folding at overflow), MEM-03 (procedural folding with voice preservation), MEM-04 (core never auto-evicted), MEM-05 (Director explicit promotion from scenario to core)

## Architectural Guardrails

1. Core is immutable by policy except explicit writes/promotions.
   - Remove or replace `Director.ensureCoreBudget()` pruning behavior.
   - Do not summarize or evict core entries automatically.
   - If a core write would exceed budget, fail explicitly rather than silently compacting core.

2. Folding logic belongs in a managed orchestration layer, not route-only glue.
   - Add `src/services/memoryManager.ts` to compose blackboard + llm + audit/event hooks.
   - Keep `BlackboardService` as the authoritative state container for reads, token counts, writes, and deletes.

3. Semantic continuity must survive compaction.
   - Semantic overflow folds older entries into one summary entry.
   - Keep a small recent tail of newest semantic entries verbatim.
   - Summary prompt must preserve plot developments, scene order/context, emotional arc, and unresolved tensions.
   - `Actor.readFactContext()` must include folded semantic summaries along with core and scenario.

4. Procedural folding is allowed, but voice constraints are sacred.
   - Entries with `metadata.voiceConstraints === true` must never be folded away.
   - Fold transient/procedural coordination history first.
   - Procedural summaries support continuity, but do not replace voice-constraint entries.

5. Promotion is explicit Director intent, never heuristic.
   - Only Director exposes/uses promotion API.
   - Promotion copies scenario content to core, leaves scenario entry in place, and links both entries via metadata.

6. Auditability is first-class.
   - Add explicit audit operations for alert, fold, and promote.
   - Record enough metadata to reconstruct what was folded/promoted and why.

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/memoryManager.ts` | `MemoryManagerService` orchestrating managed writes, threshold alerts, semantic/procedural folding, and Director-only promotion |
| `tests/memoryManager.test.ts` | Phase 6 requirement tests for alerts, folding, promotion, audit metadata, and no-core-eviction behavior |

## Files to Modify

| File | Change |
|------|--------|
| `src/types/blackboard.ts` | Extend entry metadata with folding/promotion fields; extend audit operation types and memory-event metadata types |
| `src/services/blackboard.ts` | Add metadata-aware write/update helpers needed by memory orchestration while keeping blackboard as canonical state owner |
| `src/services/actor.ts` | Include folded semantic summary entries in `readFactContext()` and preserve existing core/scenario sections |
| `src/services/director.ts` | Remove/replace current core-pruning path; add explicit promotion method that delegates to memory manager |
| `src/services/auditLog.ts` | Accept extended operations and ensure query path handles new operation values without narrowing assumptions |
| `src/routes/blackboard.ts` | Route writes through managed memory service for semantic/procedural writes; preserve existing audit/snapshot behavior for standard writes |
| `src/services/index.ts` | Export `MemoryManagerService` and its options/types |
| `tests/actor.test.ts` | Add coverage that folded semantic summaries appear in actor fact context after compaction |
| `tests/director.test.ts` | Replace core-pruning expectation with no-eviction + explicit-promotion expectations |

## Wave Map

| Wave | Tasks | Parallel? | Blocked by |
|------|-------|-----------|------------|
| 1 | T1 (types + blackboard primitives) | No | None |
| 2 | T2 (memory manager service) | No | T1 |
| 3 | T3 (actor/director integration) + T4 (route/service exports) | Yes | T2 |
| 4 | T5 (tests and regressions) | No | T3, T4 |

All work is in one plan, but the executor should follow the wave order above to avoid rework. T3 and T4 can be done in parallel once `MemoryManagerService` exists.

## Dependency Graph

```text
T1 types+blackboard helpers
  -> T2 memory manager orchestration
      -> T3 actor/director integration
      -> T4 route/export wiring
          \-> T5 tests/regressions
T3 --------/
```

## Detailed Tasks

<task>
<name>Extend blackboard types and state primitives for fold/promotion operations</name>
<files>src/types/blackboard.ts, src/services/blackboard.ts</files>
<action>
Update the blackboard type system and primitive state APIs so Phase 6 orchestration can be implemented without introducing a parallel registry.

Specific steps:
1. In `src/types/blackboard.ts`, extend `BlackboardEntry.metadata` with Phase 6 fields:
   - `promotedToCore?: string`
   - `promotedFromScenarioId?: string`
   - `foldPriority?: number`
   - `foldVersion?: number`
   - `foldSummary?: boolean`
   - `foldedEntryIds?: string[]` (or a tighter provenance field if keeping metadata compact)
2. Keep all existing metadata fields intact (`characterCardFor`, `dialogueFor`, `unverifiedFacts`, `unverifiedClaims`, `voiceConstraints`).
3. Extend `WriteEntryRequest` to optionally accept `metadata` so managed writes can attach fold/promotion fields at creation time. Do not break existing callers that only send `content`, `expectedVersion`, and `messageId`.
4. Add explicit memory-management types in `src/types/blackboard.ts` for:
   - per-layer alert payloads
   - fold result payloads
   - promotion result payloads
   - optional callback/event interface used by memory manager
5. Expand `AuditLogEntry.operation` from `'write' | 'reject' | 'violation'` to include `'alert' | 'fold' | 'promote'`.
6. Add structured metadata typing for new audit operations so fold audits can carry before/after token counts, folded entry IDs/count, summary entry ID, threshold pct, and promotion source/target IDs.
7. In `src/services/blackboard.ts`, keep `countTokens()`, `readLayer()`, `writeEntry()`, and `deleteEntry()` authoritative, but add the minimum helper surface needed by Phase 6 orchestration. Good options include:
   - metadata-aware `writeEntry()` support
   - `updateEntryMetadata(layer, entryId, metadataPatch, agentId)`
   - `replaceEntriesWithSummary(...)` helper if it remains a pure blackboard mutation primitive
8. Do not put LLM summarization or Director policy into `BlackboardService`.
9. Preserve token budget enforcement for direct writes. Core should still hard-fail on overflow; semantic/procedural managed folding happens in the higher-level service, not by weakening blackboard invariants.
10. Verify build after type changes.
</action>
<verify>npm run build</verify>
<done>Blackboard types can represent folded summaries, promotion links, and new audit events; blackboard primitives can create/update metadata-bearing entries without introducing a side registry</done>
</task>

<task>
<name>Create MemoryManagerService for managed writes, alerts, folding, and promotion</name>
<files>src/services/memoryManager.ts</files>
<action>
Create `src/services/memoryManager.ts` as the Phase 6 orchestration layer. It must compose `BlackboardService`, `LlmProvider`, and optional audit/logger/event hooks so all memory-management behavior lives in one reusable service instead of route-specific branches.

Specific steps:
1. Create a `MemoryManagerService` class with injected dependencies:
   - `blackboard: BlackboardService`
   - `llmProvider: LlmProvider`
   - `logger: pino.Logger`
   - optional audit callback/service
   - optional alert callback/event emitter for Director-facing reactions
2. Add a public managed write API, e.g. `writeEntryWithMemoryManagement(layer, agentId, req)`.
3. For all managed writes, count tokens using existing blackboard token counting. MEM-01 requires this path to still enforce per-write token awareness.
4. Implement per-layer 60% advisory alerts:
   - compute layer usage after a successful write, and also when evaluating an incoming managed write if helpful
   - emit a structured warning + audit event when usage crosses or is at `BUDGET_ALERT_THRESHOLD`
   - alerts must not block writes and must not immediately force a fold
   - alerts are per layer, not aggregate board-wide
5. Implement semantic overflow folding (MEM-02):
   - when a semantic-layer write would exceed the 8K budget, do not immediately fail
   - select fold candidates from older semantic entries
   - preserve a small recent tail verbatim (choose a concrete number such as 3 or 4 and encode it in the plan implementation)
   - honor high-priority/protected entries using `foldPriority` metadata
   - summarize selected entries via `LlmProvider`
   - prompt the model to preserve plot developments, scene order/context, emotional arc, and unresolved tensions
   - delete folded entries, insert one summary entry with `metadata.foldSummary === true`, `foldVersion`, and provenance metadata, then retry the incoming write
6. Implement procedural overflow folding (MEM-03):
   - apply only to the procedural layer budget
   - never delete/fold entries with `metadata.voiceConstraints === true`
   - fold older transient coordination/control entries first
   - if summarizing procedural history, preserve coordination continuity while leaving voice constraints verbatim
7. Implement explicit promotion API (MEM-05), e.g. `promoteScenarioEntryToCore(scenarioEntryId, directorAgentId)`:
   - read the source scenario entry
   - create a copied core entry with `metadata.promotedFromScenarioId`
   - update the source scenario entry metadata with `promotedToCore`
   - do not remove the source scenario entry
   - emit a `promote` audit event with both IDs
8. Add internal audit/event helpers so `alert`, `fold`, and `promote` operations produce structured metadata consistently.
9. Core-layer behavior for managed writes must explicitly honor MEM-04:
   - no auto-fold
   - no auto-summary
   - no implicit move to scenario
   - if over budget, surface the failure clearly
10. Keep this service Phase 6-scoped only. Do not wire end-to-end session orchestration, live socket coordination, or full provider implementations from Phase 7.
</action>
<verify>npm run build</verify>
<done>`MemoryManagerService` exists and defines the canonical Phase 6 APIs for managed writes, semantic/procedural folds, layer alerts, and Director-only scenario→core promotion without any core auto-eviction logic</done>
</task>

<task>
<name>Integrate folded summaries into Actor context and remove Director core-pruning behavior</name>
<files>src/services/actor.ts, src/services/director.ts</files>
<action>
Update Actor and Director services to consume the new memory-management architecture correctly.

Specific steps:
1. In `src/services/actor.ts`, update `readFactContext()` so Actors still get:
   - `## Core Facts`
   - `## Scenario`
   - plus folded semantic continuity entries after compaction
2. Only include semantic entries that are folded summaries or whatever filtered summary representation the memory manager defines for actor-safe continuity. Do not dump arbitrary semantic history if that breaks the earlier scoped-reading intent; the point is continuity after fold, not broadening actor privileges indiscriminately.
3. Ensure the folded semantic section is explicitly labeled (for example `## Semantic Continuity`) so prompts remain interpretable.
4. In `src/services/director.ts`, remove or replace the current `ensureCoreBudget()` pruning behavior entirely.
   - Delete the logic that summarizes core into scenario and deletes old core entries.
   - Update any prompt text or comments that instruct the Director to prune core automatically.
5. Inject or accept `MemoryManagerService` in `Director` where needed.
6. Add an explicit public Director method for promotion, such as `promoteToCore(scenarioEntryId: string): Promise<...>` that delegates to memory manager.
7. Keep the Director semantic-write prohibition intact.
8. Keep the rest of Phase 4 responsibilities unchanged; this task is about memory behavior only.
</action>
<verify>npm run build</verify>
<done>Actors include folded semantic summaries in fact context, and Director no longer auto-prunes core under any path; promotion is explicit and memory-manager-backed</done>
</task>

<task>
<name>Wire managed memory behavior into routes and service exports</name>
<files>src/routes/blackboard.ts, src/services/auditLog.ts, src/services/index.ts</files>
<action>
Connect the new service so HTTP writes and exported services can use Phase 6 behavior consistently.

Specific steps:
1. Export `MemoryManagerService` and its options/types from `src/services/index.ts`.
2. In `src/routes/blackboard.ts`, add a memory-manager injection point similar to existing audit/snapshot capability injection.
3. Route semantic and procedural POST writes through the managed write path when memory manager is configured.
4. Preserve existing capability checks, validation, audit logging, and snapshot dirty-marking semantics.
5. For non-managed fallback or layers that should remain primitive (especially core), keep behavior explicit and unsurprising.
6. Ensure route-level error handling still returns 413 for genuine unrecoverable overflows and does not hide failed folds/promotions.
7. In `src/services/auditLog.ts`, ensure write/query logic remains compatible with new operation names and metadata payloads. No schema migration storage layer is needed; JSONL append-only behavior remains.
8. Do not add Phase 7 integration logic, provider auth flows, or socket reactions here. Keep this task limited to Phase 6 plumbing.
</action>
<verify>npm run build</verify>
<done>Managed memory services are exportable and usable from HTTP write paths; route-level writes can trigger alerts/folds through the service without changing Phase 1 API contracts</done>
</task>

<task>
<name>Write Phase 6 regression and requirement tests</name>
<files>tests/memoryManager.test.ts, tests/actor.test.ts, tests/director.test.ts</files>
<action>
Add deterministic unit/regression tests that prove MEM-01 through MEM-05 and guard against the current core-pruning regression.

Specific steps:
1. Create `tests/memoryManager.test.ts` using the repo’s Vitest mock style (direct class instantiation, mocked `LlmProvider`, in-memory blackboard doubles).
2. Add MEM-01 tests:
   - write below threshold → no alert
   - crossing 60% on a layer → `alert` audit/event emitted
   - alert does not block the write
3. Add MEM-02 tests:
   - semantic overflow write triggers fold instead of immediate failure
   - summary entry is inserted with `foldSummary` metadata
   - recent tail remains verbatim
   - incoming semantic write succeeds after fold
   - fold audit metadata includes before/after counts and summary entry ID
4. Add MEM-03 tests:
   - procedural overflow compacts foldable entries
   - entries marked `voiceConstraints: true` remain present verbatim after fold
5. Add MEM-04 tests in `tests/director.test.ts`:
   - `planBackbone()` no longer causes scenario summary writes from pruned core
   - no core deletions happen automatically during Director backbone planning
   - if core write capacity is exceeded, failure is explicit rather than silent compaction
6. Add MEM-05 tests:
   - Director promotion copies scenario content to core
   - source scenario entry remains in place
   - source metadata has `promotedToCore`
   - target metadata has `promotedFromScenarioId`
   - `promote` audit event recorded
7. Add Actor continuity regression tests in `tests/actor.test.ts`:
   - folded semantic summary appears in `readFactContext()` / prompt context after compaction
   - core and scenario context still appear unchanged
8. Keep tests Phase 6-scoped only. Do not add end-to-end multi-agent drama session tests here; that belongs to Phase 7.
9. Final verification must run the full build and test suite.
</action>
<verify>npm run build && npm test</verify>
<done>Automated tests cover all five Memory Management requirements plus the critical regression that core must never be auto-evicted</done>
</task>

## Test Plan

| Test ID | Requirement | Verify |
|---------|-------------|--------|
| MEM-01a | Per-write token awareness | Managed write counts tokens and stores entry successfully below threshold |
| MEM-01b | 60% alert fires per layer | Crossing threshold emits structured alert/audit event without rejecting write |
| MEM-02a | Semantic overflow folds | Old semantic entries replaced by one folded summary + recent tail preserved |
| MEM-02b | Fold retry succeeds | Incoming semantic write succeeds after fold instead of hard 413 |
| MEM-02c | Actor continuity preserved | Fold summary appears in Actor fact context |
| MEM-03a | Procedural fold preserves voice | `voiceConstraints` entries survive compaction intact |
| MEM-03b | Only transient procedural history folds | Non-voice procedural entries are summarized/deleted first |
| MEM-04a | No core pruning in Director | `planBackbone()` does not summarize core into scenario or delete core entries |
| MEM-04b | Core overflow is explicit | Over-budget core path fails clearly instead of auto-evicting |
| MEM-05a | Director promotion copies scenario to core | Core copy created, scenario source retained |
| MEM-05b | Promotion linkage auditable | Metadata links exist on both entries and `promote` audit event is written |

## Verification Criteria

After all tasks complete, run:

```bash
npm run build
npm test
```

Expected outcomes:
- TypeScript compiles without errors.
- New Phase 6 tests pass.
- Existing Actor/Director tests still pass after memory behavior changes.
- No test asserts or implementation path still depends on the old core-pruning behavior.

## Goal-Backward Verification (must_haves)

| Phase Success Criterion | How Verified |
|------------------------|---------------|
| Writes remain token-budget-aware and warn at 60% per layer | MEM-01 tests emit alert without blocking write |
| Semantic history compresses without losing continuity | MEM-02 tests confirm summary entry + recent tail + successful retry |
| Procedural memory compacts without losing voice constraints | MEM-03 tests confirm voice-constraint entries remain verbatim |
| Actors still see continuity after folds | Actor regression test confirms folded semantic summary in fact context |
| Core canon is never auto-evicted | Director regression tests confirm no automatic core deletion/summarization |
| Plot-critical scenario content can become durable canon intentionally | MEM-05 promotion tests confirm explicit Director promotion with metadata + audit trail |
