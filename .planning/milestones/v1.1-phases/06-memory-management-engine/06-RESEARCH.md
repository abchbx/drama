# Phase 6 Research: Memory Management Engine

**Researched:** 2026-03-20
**Domain:** Token-budgeted memory compaction, blackboard state management, LLM summarization, auditability, narrative continuity
**Confidence:** HIGH

---

## Summary

Phase 6 adds automated memory management on top of the existing four-layer blackboard. The codebase already has the core primitives needed: synchronous token counting, per-layer budget enforcement, metadata-bearing entries, route-level audit/snapshot hooks, and LLM abstractions reused by Actor and Director. The gap is orchestration: today writes simply fail on overflow in `src/services/blackboard.ts`, while Phase 6 requires pre-overflow alerts, automatic folding for semantic/procedural layers, explicit promotion from scenario to core, and a no-eviction guarantee for core.

The best fit is to keep `BlackboardService` as the authoritative state mutator and add explicit memory-management methods beside `writeEntry()` rather than scattering compaction logic across routes or agents. Semantic/procedural folding should happen inside blackboard-level orchestration so overflow handling remains deterministic and layer-aware. LLM-based summarization should be injected through the existing `LlmProvider` abstraction, likely via a small orchestrator service that composes blackboard + llm + audit/event emission. Actors then consume folded semantic summaries through `Actor.readFactContext()`, while the Director gets an explicit API to promote scenario entries into core without ever pruning core.

**Primary recommendation:** introduce a memory-management orchestration layer centered on blackboard writes: alert before saturation, fold on semantic/procedural overflow, preserve recent verbatim tail + protected entries, audit every fold/promotion, and expose folded summaries as normal blackboard entries with metadata instead of inventing a parallel memory store.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Semantic folding triggers automatically on the write that would exceed the semantic 8K budget.
- Semantic folding uses LLM summarization through the existing `LlmProvider` abstraction.
- Semantic summaries must preserve plot developments, scene context/order, and emotional arc.
- Semantic folding replaces older entries with one summary entry while keeping a small recent verbatim tail.
- Actor fact context must include folded semantic summaries in addition to core and scenario context.
- Promotion/fold immunity live on entry metadata, not in a separate registry.
- Only the Director may promote scenario content into core canon.
- Promotion is explicit, not heuristic.
- Promotion copies content into core, leaves the scenario entry in place, and links the two via metadata.
- Budget alerts are per-layer.
- The 60% threshold emits structured warning + real-time event; it does not block writes.
- Automatic folding still happens on overflow writes; proactive folding can happen after alerts.
- Metadata extends with `promotedToCore`, `foldPriority`, `promotedFromScenarioId`, and `foldVersion`.
- Fold operations must be explicitly auditable.
- Procedural voice preservation remains first-class and must survive folding.

### Claude's Discretion

- Exact recent-tail size retained after a fold.
- Exact summarization prompt structure and response schema.
- Exact alert event delivery shape.
- Exact numeric semantics/defaults for `foldPriority`.
- Exact metadata naming if alignment with current conventions is preferable.

### Deferred Ideas (OUT OF SCOPE)

- Cross-session memory.
- Heuristic or keyword-based automatic promotion to core.
- Replacing procedural voice constraints with semantic summaries.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| MEM-01 | Automated token counting on every blackboard write with 60% threshold alert | `BlackboardService.countTokens()` and `BUDGET_ALERT_THRESHOLD` already exist; missing piece is alert emission before/after writes and structured audit/event handling |
| MEM-02 | Semantic layer folding: when >8K tokens, summary replaces individual entries | `writeEntry()` currently rejects overflow; folding should intercept semantic overflow, summarize older entries, keep recent tail, then retry append |
| MEM-03 | Procedural layer folding: when >4K tokens, character voice constraints are preserved | Existing metadata includes `voiceConstraints`; procedural fold policy can exempt/pin these entries while compacting older non-voice coordination history |
| MEM-04 | Core layer is NEVER evicted — only explicitly updated | Current `Director.ensureCoreBudget()` violates this by pruning core into scenario; Phase 6 must remove or rewrite that behavior |
| MEM-05 | Director explicitly promotes scenario content to core layer when plot-critical | Metadata model already supports extension; a Director-owned promotion method can copy scenario content into core and link records auditably |
</phase_requirements>

---

## Existing Codebase Findings

### 1) Blackboard already owns budgets and token accounting

`src/services/blackboard.ts` is the canonical place for all layer mutation:
- `countTokens()` uses cached `tiktoken` encoder.
- `readLayer()` returns token totals and budget percentages.
- `writeEntry()` enforces budgets and throws `TokenBudgetExceededError` on overflow.
- `deleteEntry()` exists for compaction/removal flows.

This strongly suggests folding should remain blackboard-adjacent rather than route-adjacent. If routes own folding, direct in-process service users (`Actor`, `Director`) would bypass it.

### 2) Metadata already lives on entries, which matches promotion/folding needs

`src/types/blackboard.ts` defines `BlackboardEntry.metadata` as an extensible object currently used for:
- `characterCardFor`
- `dialogueFor`
- `unverifiedFacts`
- `unverifiedClaims`
- `voiceConstraints`

Phase 6 can extend the same metadata object with fold/promotion fields without adding a side table. This is the cleanest way to encode:
- fold summary entries,
- protected/protected-from-fold entries,
- promotion linkage,
- fold version/audit traceability.

### 3) Current Director core-pruning logic conflicts with MEM-04

`src/services/director.ts` currently calls `ensureCoreBudget()` in `planBackbone()`. That helper:
- checks core at 75% of budget,
- summarizes the oldest half,
- writes summary into scenario,
- deletes old core entries.

This directly violates MEM-04. Phase 6 must remove or replace this behavior. After Phase 6, core should only grow via explicit writes/promotions and never be compacted automatically.

### 4) Actor fact context currently omits semantic continuity

`src/services/actor.ts` `readFactContext()` currently concatenates only:
- core
- scenario

It does not include semantic summaries. This means Actors lose folded scene continuity unless Phase 6 updates this method to include folded semantic summary entries (or a filtered semantic context view).

### 5) Route layer already has audit + snapshot hooks

`src/routes/blackboard.ts` already does the following after successful writes:
- audit log entry with content hash,
- snapshot dirty-marking.

Rejected writes already produce structured reject audit entries. This provides a natural integration point for new fold/alert/promotion audit events, but the audit types need expansion because current operations are only `'write' | 'reject' | 'violation'`.

### 6) Audit log and snapshot persistence can absorb memory operations

`src/services/auditLog.ts` is append-only JSONL logging and can record fold/promotion/alert events with no new storage layer.

`src/services/snapshot.ts` persists full blackboard state, so folded summaries and metadata extensions will automatically persist as part of normal state snapshots.

---

## Recommended Architecture

### Pattern 1: Blackbox mutation stays authoritative in BlackboardService

The blackboard should remain the single authority for:
- token counting,
- entry creation/deletion,
- version increments,
- layer state mutation.

Recommended evolution:
- keep raw `writeEntry()` as primitive,
- add higher-level memory-aware operations such as:
  - `writeEntryWithMemoryManagement(...)`
  - `promoteScenarioEntryToCore(...)`
  - `foldLayer(...)`
  - `getActorFactContext(...)` or semantic-summary filtering helpers.

This preserves a clean separation: routes/agents ask for writes, blackboard/memory manager decides whether alerts/folding/promotion side effects are needed.

### Pattern 2: LLM summarization belongs in a small orchestration service, not inside pure state code

`BlackboardService` is currently synchronous and state-focused. Injecting LLM calls directly into it would force async orchestration into the core state container.

Best compromise:
- keep `BlackboardService` as state primitive,
- add a new `MemoryManagerService` (or similarly named service) that composes:
  - `BlackboardService`
  - `LlmProvider`
  - logger/event emitter/audit callback
- route and in-process callers use this service for managed writes on semantic/procedural layers.

This matches the project’s established composition style in [src/services/actor.ts](src/services/actor.ts#L16-L43) and [src/services/director.ts](src/services/director.ts#L26-L59).

### Pattern 3: Fold by summarizing old entries, preserving protected entries and recent tail

Recommended semantic folding algorithm:
1. Detect incoming overflow before write.
2. Select fold candidates from oldest semantic entries.
3. Exclude protected entries if metadata says they are immune/high priority.
4. Preserve the most recent N entries verbatim for short-term continuity.
5. Summarize selected old entries via `LlmProvider` with explicit instructions to preserve:
   - event order,
   - plot changes,
   - emotional progression,
   - unresolved tensions.
6. Delete summarized entries.
7. Insert one summary entry with metadata marking it as folded summary + fold version.
8. Retry original write.

Recommended initial tail size: 3–5 most recent entries, with exact count chosen during planning.

### Pattern 4: Procedural folding must preserve voice constraints

Procedural entries are not all equivalent. Existing metadata already marks voice-constraint entries using `voiceConstraints`.

Recommended procedural folding policy:
- never fold/delete entries with `metadata.voiceConstraints === true`,
- compact old transient coordination signals first (scene start/end, contradictions, temporary control signals),
- if summarization is used, preserve character instruction continuity but keep voice-constraint entries verbatim.

This satisfies MEM-03 without turning procedural into another semantic layer.

### Pattern 5: Alerts should be emitted per layer as side effects, not as blocking errors

Current `BUDGET_ALERT_THRESHOLD` is 0.6. The blackboard already computes used percent in `readLayer()`.

Recommended alert behavior:
- after each successful managed write, compute `budgetUsedPct` for that layer,
- if crossing >=60% and not previously alerted at the current layer version window, emit:
  - structured logger warning,
  - audit event,
  - callback/event to Director-facing orchestration.

The alert should not reject or mutate state by itself. It is advisory only.

### Pattern 6: Promotion is copy + linkage, never move

For MEM-05, promotion should:
1. read scenario entry,
2. write equivalent content into core,
3. update/link metadata:
   - scenario entry gets `promotedToCore` reference,
   - new core entry gets `promotedFromScenarioId`,
4. audit the promotion.

This preserves provenance and avoids destructive movement.

---

## Data Model Recommendations

### BlackboardEntry.metadata extensions

Recommended fields:
- `promotedToCore?: string` — core entry ID linked from scenario entry
- `promotedFromScenarioId?: string` — scenario source for core entry
- `foldPriority?: number` — higher means protect longer from folding
- `foldVersion?: number` — tracks compaction generation
- `foldSummary?: boolean` — marks synthesized summary entries
- `foldedEntryIds?: string[]` or compact metadata summary if provenance is needed

If minimizing metadata size is important, keep provenance in audit log and use only `foldSummary` + `foldVersion` on entries.

### AuditLogEntry extensions

Current `AuditLogEntry.operation` is too narrow for Phase 6. Add explicit operations such as:
- `fold`
- `alert`
- `promote`

Metadata payloads should include:
- affected layer,
- folded entry IDs/count,
- created summary entry ID,
- token counts before/after,
- alert threshold percent,
- promotion source/target entry IDs.

---

## File-Level Impact

### Files likely to modify

| File | Why |
|------|-----|
| `src/types/blackboard.ts` | extend metadata and audit operation typing |
| `src/services/blackboard.ts` | add fold-friendly helpers or integrate managed write surface |
| `src/services/director.ts` | remove/replace core-pruning logic; add explicit promotion flow |
| `src/services/actor.ts` | include folded semantic summaries in fact context |
| `src/routes/blackboard.ts` | wire new managed write side effects, alert/fold audit emission if request-coupled |
| `tests/actor.test.ts` | update/add tests for folded semantic context visibility |

### Files likely to create

| File | Why |
|------|-----|
| `src/services/memoryManager.ts` | async orchestration for folding, summarization, alerts, promotion |
| `tests/memoryManager.test.ts` and/or `tests/blackboard.memory.test.ts` | direct Phase 6 requirement coverage |

---

## Test Strategy

Existing test style in `tests/actor.test.ts` favors:
- in-memory mock blackboard,
- mocked LLM provider,
- direct class instantiation,
- requirement-labeled test names.

Phase 6 should mirror that with deterministic unit tests:

1. **MEM-01 alert tests**
   - write below threshold → no alert
   - write crossing 60% → alert emitted/logged
   - alert does not block write

2. **MEM-02 semantic folding tests**
   - overflow-triggered semantic write folds old entries
   - summary entry inserted
   - recent tail preserved verbatim
   - incoming write succeeds after fold
   - summary prompt/output validation tested with mocked LLM

3. **MEM-03 procedural folding tests**
   - voice constraint entries survive fold
   - transient procedural entries compact first

4. **MEM-04 core invariance tests**
   - no automatic core deletion during Director operations
   - legacy `ensureCoreBudget()` behavior removed/replaced

5. **MEM-05 promotion tests**
   - Director promotion copies scenario content to core
   - source scenario entry remains
   - metadata linkage exists on both sides
   - audit event written

6. **Actor continuity tests**
   - folded semantic summary appears in `Actor.readFactContext()` after compaction

---

## Risks and Mitigations

### Risk: Async LLM folding breaks current synchronous write assumptions

Mitigation:
- introduce a managed async write path for memory-sensitive layers,
- keep primitive synchronous methods for low-level state changes/tests.

### Risk: Summary entries become too lossy for narrative coherence

Mitigation:
- require summaries to preserve plot, order, and emotional arc,
- keep recent verbatim tail,
- add tests asserting actor prompts include both summary and fresh context.

### Risk: Core budget logic remains inconsistent after Phase 6

Mitigation:
- remove or rewrite [src/services/director.ts:172-203](src/services/director.ts#L172-L203),
- add explicit regression tests asserting no core eviction occurs.

### Risk: Route-only implementation misses in-process callers

Mitigation:
- place fold/promotion logic in services, not just in [src/routes/blackboard.ts](src/routes/blackboard.ts).

---

## Don’t Hand-Roll

| Problem | Don’t Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token counting | custom estimator | `BlackboardService.countTokens()` | Already implemented and consistent with existing budgets |
| Promotion registry | separate side table | entry metadata + audit log | Simpler, already aligned with current entry model |
| Summary persistence store | second memory DB | normal blackboard entries + snapshots | Existing snapshot system already persists state |
| Prompt parsing | regex/manual extraction | JSON schema contract through `LlmProvider` result handling | Matches Actor/Director patterns |
| Route-only fold logic | ad hoc POST handler branches | service-level orchestration | Covers both HTTP and in-process users |

---

## Key Recommendation

Implement Phase 6 as a service-layer memory orchestration addition, not a rewrite of the blackboard model. Preserve the current blackboard as the canonical state container, add an async memory manager around it for alerting/folding/promotion, update Actor to read folded summaries, and remove the Director’s current core-pruning behavior so MEM-04 becomes enforceable.
