# Phase 6: Memory Management Engine - Context

**Gathered:** 2026-03-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement automated memory folding that keeps the blackboard within token budgets while preserving core facts, plot-critical canon, procedural voice constraints, and enough narrative continuity for Actors and the Director to continue coherent scene generation.

</domain>

<decisions>
## Implementation Decisions

### Semantic folding strategy
- Folding triggers automatically on the write that would cause the semantic layer to exceed its 8K budget.
- Semantic folding uses LLM summarization through the existing `LlmProvider` abstraction rather than deterministic extraction.
- Semantic summaries must explicitly preserve plot developments, scene context/order, and emotional arc.
- Semantic folding replaces older entries with one summary entry while keeping a small recent tail of the newest verbatim entries for short-term continuity.
- After a fold, Actor fact context should include the semantic summary in addition to core and scenario context.

### Content promotion rules
- Promotion and fold immunity are tracked on entry metadata rather than a separate registry.
- Only the Director is allowed to promote scenario content into core canon.
- Promotion is an explicit Director action, not a heuristic or automatic keyword-based process.
- Promotion copies content into the core layer, leaves the original scenario entry in place, and marks the scenario entry metadata as promoted/linked to the core copy.

### Alert handling
- Token-budget alerts fire per layer rather than as one aggregate blackboard warning.
- The 60% alert threshold logs a structured warning and also emits a real-time event that the Director can react to.
- The 60% alert is an early warning only: it does not block writes and does not immediately force a fold.
- Automatic folding still happens on semantic overflow writes; proactive folding can be triggered in response to alerts.

### Data model extensions
- Extend entry metadata with `promotedToCore`, `foldPriority`, `promotedFromScenarioId`, and `foldVersion`.
- Fold operations should be auditable through explicit audit log events, not just inferred from surviving entries.
- Semantic summaries become part of Actor-readable fact context after folding.
- Voice preservation remains a first-class procedural-layer concern, with semantic summaries supporting continuity but not replacing procedural voice constraints.

### Claude's Discretion
- Exact number of recent semantic entries kept as the verbatim tail during fold.
- Exact prompt wording and response schema for semantic summarization.
- Exact event emitter/callback shape for budget alert delivery.
- Exact numeric interpretation of `foldPriority` and the default priorities for different entry types.
- Exact metadata field names for promotion linkage if naming needs to align with existing conventions.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BlackboardService` in `src/services/blackboard.ts`: already provides token counting, per-layer reads, write rejection on budget overflow, and entry deletion.
- `LAYER_BUDGETS` and `BUDGET_ALERT_THRESHOLD` in `src/types/blackboard.ts`: existing constants directly support Phase 6 thresholds.
- `LlmProvider` abstraction already exists and is used by both Actor and Director services, so fold summarization can reuse the same provider boundary.
- `AuditLogService` in `src/services/auditLog.ts`: existing persistent JSONL logging can absorb new fold and alert event types.
- `SnapshotService` in `src/services/snapshot.ts`: existing state persistence path can preserve fold results without introducing new storage infrastructure.

### Established Patterns
- Layer-specific budget enforcement already happens inside `BlackboardService.writeEntry()`.
- Metadata is already attached directly to `BlackboardEntry`, so promotion/folding state should extend that object rather than introduce a side registry.
- Service-style orchestration exists in `Actor` and `Director`, both of which compose blackboard + llm + logging dependencies.
- Route and audit handling already distinguish operational outcomes like write/reject/violation, which creates a natural place to add fold/alert observability.

### Integration Points
- `src/services/blackboard.ts`: primary integration point for alert checks, fold triggers, and any memory-management orchestration.
- `src/types/blackboard.ts`: where metadata extensions and audit operation typing will need to expand.
- `src/services/actor.ts`: `readFactContext()` must include folded semantic summaries so Actors retain narrative continuity after compaction.
- `src/services/director.ts`: current `ensureCoreBudget()` behavior conflicts with MEM-04 and should be reconciled with the new no-core-eviction rule and explicit promotion behavior.
- `src/routes/blackboard.ts`: existing write flow already calls audit + snapshot hooks, making it a likely place to surface alert/fold side effects if orchestration remains request-coupled.

</code_context>

<specifics>
## Specific Ideas

- The system should degrade gracefully: recent dialogue stays verbatim while older semantic history compresses into a narrative summary.
- Plot-critical facts should become durable canon only through an intentional Director decision, not accidental heuristics.
- Alerting should be proactive enough that the Director can react before hard overflow, but not so aggressive that the system folds prematurely.
- Semantic folding should preserve continuity of what happened and how scenes shifted emotionally, while procedural memory remains the authoritative place for character voice constraints.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-memory-management-engine*
*Context gathered: 2026-03-20*
