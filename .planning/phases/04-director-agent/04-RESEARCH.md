# Phase 4: Director Agent - Research

**Researched:** 2026-03-19
**Domain:** Multi-agent orchestration, LLM narrative planning, conflict arbitration, hierarchical agent architecture
**Confidence:** MEDIUM-HIGH

> **Note on source limitations:** Context7 was partially available (LangGraph returned results; AutoGen timed out; LangGraph JS timed out). Web fetching official docs failed (404 on several URLs, timeouts on others). Key ecosystem knowledge is derived from training data (pre-2025) cross-referenced with the existing codebase patterns established in Phases 1-3. Claims about LangGraph supervisor and AutoGen group chat patterns are flagged accordingly.

---

## Summary

Phase 4 builds the Director agent: the orchestrator of a multi-Actor drama session. The Director does not write dialogue — it plans the plot backbone, arbitrates Actor conflicts, and fact-checks scene outputs against established facts. The existing codebase already provides the entire supporting stack (blackboard service, LlmProvider interface, Zod validation, tiktoken counting, pino logging). The Director simply follows the same patterns as Actor: inject services via constructor, call `llmProvider.generate()`, parse JSON, validate with Zod, write structured entries to the blackboard.

The primary design challenge is not technical infrastructure — it is **role discipline**: the Director must be architecturally prevented from writing dialogue (a hard constraint via capability enforcement, not a soft prompt). The secondary challenge is **token budget management** on the 2K-token core layer: the Director must proactively prune and summarize as it writes the backbone.

**Primary recommendation:** Mirror the Actor class structure exactly. `Director` is `Actor`-but-for-planning: same constructor injection, same `generate()` → parse → validate → write pattern, same Zod schema validation, but writes to core/scenario/procedural layers instead of semantic. Add a `buildDirectorSystemPrompt()` and `buildDirectorUserPrompt()` in `src/services/llm.ts` following the `buildActor*` pattern.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Plot backbone format:** Prose narrative written to core layer (LLM-native, flexible)
- **Actor discretion encoding:** Explicit `[ACTOR DISCRETION: brief description]` markers embedded in prose backbone
- **Scene signals:** Blackboard procedural layer entries (scene_start/scene_end), not API-level events
- **Conflict detection:** Hybrid — Actor-raised flag + Director LLM semantic analysis (two-layer)
- **Decision authority:** Binding — resolution written to scenario layer as prose narrative
- **Fact-checking timing:** Reactive — contradictions flagged after Actor outputs written; no rejection at write time
- **Fact-checking surface:** Procedural layer entry with severity (high/medium/low), sourceAgentId, conflictingClaim, coreFact
- **Core budget overflow:** Director proactively prunes at ~75% capacity; summaries migrate to scenario layer
- **Backbone updates:** Prune-and-write (no in-place versioning); history lives in scenario layer

### Claude's Discretion (research and recommend)

- Exact threshold for proactive backbone pruning (default: 75% of core budget)
- How the Director LLM performs semantic similarity comparison (prompt structure, threshold)
- The Director's own LLM provider interface — uses same `LlmProvider` abstraction as Actor
- Director's logger format and log level configuration
- Exact Zod schema for procedural scene signals and contradiction entries

### Deferred Ideas (OUT OF SCOPE)

- Director dashboard / monitoring UI
- Director self-assessment of pacing
- Human-in-the-loop escalation
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DIR-01 | Director plans plot backbone, writes to core/scenario layers | Actor class pattern (generate→write) applies directly; Director writes prose to core; Director uses LlmProvider same as Actor |
| DIR-02 | Director arbitrates conflicts when Actor outputs conflict | Hybrid detection (Actor flag + Director LLM analysis); binding decision format as prose to scenario layer; Zod schema for conflict entries |
| DIR-03 | Director MUST NOT monopolize creative authority — role contract enforced | Hard constraint via capability service: Director write capability to semantic layer must be blocked; system prompt encodes role contract; Zod schema prevents dialogue output shape |
| DIR-04 | Director mandates "Actor discretion" scenes | `[ACTOR DISCRETION: brief description]` prose marker in backbone; Director scan for marker to avoid overriding those beats |
| DIR-05 | Director fact-checks scenes against core layer facts | Reactive flagging; three severity levels (high/medium/low); Director reads core+scenario; contradiction entries to procedural layer |
| DIR-06 | Director enforces inter-phase validation (name changes propagate) | Director reads Actor outputs from semantic layer post-generation; validates against backbone; LayerState read gives entry list for comparison |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript 5.5 | 5.5 | Language | Already in use; strict mode enforces role contract at compile time |
| Zod | 3.23 | Runtime schema validation for all LLM outputs | Already in use; `DialogueOutputSchema` pattern extends directly to Director output schemas |
| tiktoken | 1.x | Token counting for budget monitoring | Already in use; `BlackboardService.countTokens()` available; Director uses same API for core budget monitoring |
| pino | 9.x | Structured JSON logging with agent attribution | Already in use; `pino.Logger` injected via constructor same as Actor |
| HS256 JWT | (jsonwebtoken 9.x) | Agent authentication | Already in use; Director authenticated same as Actors |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vitest | 2.x | Test framework | Already in use; `tests/actor.test.ts` pattern applies directly |
| uuid | 10.x | Exchange/scene ID generation | `crypto.randomUUID()` already in use; no new dependency needed |
| express | 4.19 | REST API server | Already in use; Director routes go through existing Express app |

**No new dependencies required.** All libraries needed for Director are already in package.json.

**Installation:** No `npm install` needed for Phase 4 implementation.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── services/
│   ├── director.ts       # NEW: Director class (mirrors actor.ts)
│   ├── llm.ts            # MODIFIED: add buildDirectorSystemPrompt/buildDirectorUserPrompt
│   └── ...
├── types/
│   ├── director.ts       # NEW: DirectorOutput schemas, DirectorGenerationError, scene signal schemas
│   └── blackboard.ts     # MODIFIED: add Director-specific metadata fields to BlackboardEntry
└── ...
tests/
├── director.test.ts      # NEW: Director unit tests
└── ...
```

### Pattern 1: Actor-Class Mirror (Primary Implementation Pattern)

**What:** The Director is a structural clone of the Actor class with a different output target and role.

**When to use:** All Director operations (plan, arbitrate, fact-check, signal scenes).

The `Actor` class (src/services/actor.ts:24-163) establishes the canonical pattern:
1. Constructor accepts injected services: `{ blackboard, capabilityService, llmProvider, logger, agentId }`
2. `generate(context)` method: exchangeId → build prompts → call LLM → parse JSON → Zod validate → write to blackboard → return structured output
3. `readFactContext()` reads core + scenario layers as text
4. Error types extend `Error` with a `phase` field

The Director follows the same pattern but writes to core/scenario/procedural instead of semantic:
```
Director.generate(directorContext: DirectorContext)
  → exchangeId = crypto.randomUUID()
  → factContext = this.readBlackboardContext()   // reads all 4 layers
  → system = buildDirectorSystemPrompt(roleContract, ...)
  → user = buildDirectorUserPrompt(directorContext, factContext)
  → rawContent = await this.llmProvider.generate({ system, user })
  → parsed = JSON.parse(rawContent)
  → output = DirectorOutputSchema.parse(parsed)  // Zod validation
  → this.writeDirectorEntries(output)            // writes to core/scenario/procedural
  → return output
```

**Example source:** `src/services/actor.ts:56-106` — this exact pattern to be replicated.

### Pattern 2: Hierarchical Orchestrator (LangGraph Supervisor Analogy)

**What:** A central coordinator (Director) delegates specific work to specialized agents (Actors) and synthesizes results. The coordinator never does the delegated work itself.

**When to use:** Scene planning and scene execution loop.

The LangGraph supervisor pattern (source: Context7 — `/langchain-ai/langgraph` conditional routing docs) uses a state graph where:
- A router node evaluates state and decides which sub-agent to call next
- Sub-agents return results to the router
- The router synthesizes and decides next step

For this system, the Director operates as a supervisor over the scene execution loop:
1. Director writes scene_start signal to procedural layer (signals "Agents: execute scene N")
2. Director waits (Phase 5 provides the wait mechanism via Socket.IO heartbeat)
3. Director reads Actor outputs from semantic layer
4. Director fact-checks, arbitrates, writes backbone updates
5. Director writes scene_end signal to procedural layer
6. Loop to next scene or termination

**Key difference from LangGraph:** No graph state management library is needed. The blackboard service IS the state store. The Director reads current state, makes decisions, writes updates — same end result without a graph library.

### Pattern 3: Structured Output with Zod + LLM Contract

**What:** LLM outputs are validated with Zod schemas at runtime. Invalid outputs raise typed errors with the LLM's raw response for debugging.

**When to use:** Every Director LLM call (plot backbone, arbitration decision, fact-check result).

The Actor class (src/services/actor.ts:77-90) demonstrates the contract:
```typescript
// Parse JSON
let parsed: unknown;
try {
  parsed = JSON.parse(rawContent);
} catch {
  throw new ActorGenerationError('json_parse', 'LLM response is not valid JSON', rawContent);
}

// Validate with Zod schema
let output: DialogueOutput;
try {
  output = DialogueOutputSchema.parse(parsed) as DialogueOutput;
} catch (err) {
  throw new ActorGenerationError('validation', 'LLM response does not match DialogueOutputSchema', err);
}
```

Director output schemas (to be defined in `src/types/director.ts`):
- `DirectorBackboneOutput` — plot backbone prose + scene markers + ACTOR DISCRETION markers
- `ArbitrationOutput` — conflict decision prose + severity + affected characters
- `FactCheckOutput` — contradiction entries array + severity + canonical fact
- `SceneSignalOutput` — scene_start/scene_end structured data

### Pattern 4: Role Contract via System Prompt + Capability Enforcement

**What:** The Director's authority is constrained by both (a) a system prompt that defines what it can and cannot do, and (b) hard capability enforcement that rejects out-of-role writes.

**When to use:** Enforcing DIR-03 (Director MUST NOT write dialogue).

Two-layer enforcement:
1. **System prompt layer:** `buildDirectorSystemPrompt()` includes explicit role contract: "You are the Director. You plan the plot and coordinate Actors. You never write dialogue for characters."
2. **Capability enforcement layer:** `CapabilityService` already enforces layer-level write permissions per agent role. Director must have `semantic` write blocked in its capability map. The blackboard write gate (Phase 2 BOUND-01) rejects any Director write to semantic layer.

The Actor's semantic writes already use `blackboard.writeEntry('semantic', ...)` — if Director attempts the same call, Phase 2's `BoundaryViolationError` fires. This is the hard constraint, not a prompt.

**Warning:** The current `CapabilityService` in `src/services/capability.ts` may need Director added to its role definitions. Verify and extend as part of Phase 4 implementation.

### Pattern 5: Signal/State Pattern for Scene Boundaries

**What:** Scene boundaries (start/end) are written as structured entries to the procedural layer. The entries serve as both signals (for Phase 5 Socket.IO routing) and authoritative state (for Director's next-scene planning).

**When to use:** Scene lifecycle management (scene_start, scene_end).

Scene_start entry content (procedural layer):
```json
{ "sceneId": "...", "directorId": "...", "timestamp": "..." }
```

Scene_end entry content (procedural layer):
```json
{ "sceneId": "...", "directorId": "...", "timestamp": "...", "beats": ["..."], "conflicts": ["..."], "plotAdvancement": "...", "status": "completed" | "interrupted" | "timeout" }
```

**Why procedural and not semantic:** Procedural is for coordination signals, not creative content. The semantic layer holds Actor dialogue. Separating them keeps each layer focused.

### Pattern 6: Hybrid Conflict Detection (Two-Layer)

**What:** Fast Actor-raised flags + slow Director LLM analysis as a safety net.

**When to use:** Conflict detection for DIR-02.

Layer 1 — Actor raised flag (fast, no extra LLM call):
- Actors already populate `unverifiedFacts: true` and `unverifiedClaims: [...]` in their `DialogueOutput`
- Director reads semantic layer entries post-generation
- Director scans for entries with `unverifiedFacts: true` → immediately surfaces to conflict queue

Layer 2 — Director LLM analysis (slower, comprehensive):
- Director calls `llmProvider.generate()` with a semantic comparison prompt
- Prompt: "Given these Actor outputs and the established facts, identify any contradictions."
- Returns structured `ContradictionEntry[]` with severity levels
- Handles contradictions Actors missed

This two-layer approach avoids an LLM call on every Actor output while catching what Actors don't flag.

### Anti-Patterns to Avoid

- **Director writes to semantic layer:** Will be rejected by Phase 2 boundary enforcement. If not, it violates DIR-03. Must be verified in tests.
- **Dialogue content in Director backbone prose:** The backbone is plot structure only. No quoted speech. Actor discretion markers (`[ACTOR DISCRETION: ...]`) describe what the Actor controls, not the dialogue itself.
- **Director waits synchronously for Actor generation:** No. Phase 5 provides async heartbeat/wait mechanism. Director should write a scene_start, then return control. Phase 5's Socket.IO layer handles the wait-and-receive.
- **Core layer in-place editing:** No. `writeEntry()` appends only. "Updates" are new entries. History lives in scenario layer. This prevents version conflicts and keeps core as the current anchor.
- **Synchronous token budget checking at 100%:** Director should proactively check at 75% and prune before a write fails. The blackboard throws `TokenBudgetExceededError` on overflow — better to prevent than handle.
- **Hand-rolling LLM prompt engineering for semantic similarity:** Use structured comparison prompts with explicit "contradiction" / "consistent" / "unrelated" labels. Do not attempt fuzzy matching or custom embedding comparison without a vector store.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LLM output parsing | Custom regex or string splitting | `JSON.parse()` + Zod schema validation | Actor class already does this; Director mirrors it. LLM JSON output is unreliable without Zod validation. |
| Token counting |估算或自定义分词器 | `BlackboardService.countTokens()` (tiktoken) | Already implemented and tested in Phase 1. Direct injection. |
| JSON schema validation | Custom `typeof` checks | Zod `z.object()` schemas | Already in use (`DialogueOutputSchema`). Director schemas follow the same pattern. |
| Role enforcement | Prompt-based "please don't write dialogue" | `CapabilityService` + boundary enforcement | Phase 2 already has hard enforcement. Director's `semantic` layer write must be blocked. |
| Scene lifecycle state | Custom scene tracking in Director memory | Procedural layer entries (scene_start/scene_end) | Blackboard is the single source of truth. Director is stateless (like Actor). State lives on blackboard. |
| Conflict detection algorithm | Custom embedding/vector similarity | LLM semantic comparison prompt + structured output | Vector stores add infrastructure complexity. Structured LLM comparison is sufficient for 2-4 actor scenarios. |

**Key insight:** The entire "don't hand-roll" list is already solved by the existing Phase 1-3 codebase. The Director is primarily a matter of wiring the existing primitives together in the right sequence, not building new infrastructure.

---

## Common Pitfalls

### Pitfall 1: Core Layer Token Budget Exhaustion
**What goes wrong:** Director writes plot backbone prose; core layer hits 2K token limit; `writeEntry()` throws `TokenBudgetExceededError` mid-session; narrative state becomes inconsistent.
**Why it happens:** Director writes without monitoring cumulative token count. The core layer budget (2K) is tight relative to a full plot backbone.
**How to avoid:** Every Director `writeEntry()` call to core must be preceded by a token count check. At 75% (~1.5K tokens), trigger prune-and-summarize before writing. Wrap backbone writes in a `ensureCoreBudget()` helper that calls `blackboard.countTokens()` on the current core content and summarizes if needed.
**Warning signs:** `budgetUsedPct` approaching 75% in `LayerReadResponse` from `readLayer('core')`.

### Pitfall 2: Director Overriding Actor Discretion Scenes
**What goes wrong:** Director's LLM planning output inadvertently modifies a beat marked `[ACTOR DISCRETION: ...]` in the backbone prose.
**Why it happens:** Director LLM generates a new backbone version without scanning for `[ACTOR DISCRETION]` markers. The LLM doesn't know to preserve those sections.
**How to avoid:** `buildDirectorUserPrompt()` must include the existing backbone prose with explicit instruction: "When revising the backbone, preserve all `[ACTOR DISCRETION: ...]` markers and the text around them. Only modify plot beats you control." Director's LLM prompt engineering is critical here — no code enforcement possible for prose content.
**Warning signs:** Actor discretion scene outcomes are overridden in arbitration; Actor reports their creative contribution was ignored.

### Pitfall 3: Semantic Layer Write from Director (Role Contract Violation)
**What goes wrong:** Director code accidentally calls `blackboard.writeEntry('semantic', ...)` (e.g., copied from Actor pattern) and Phase 2 boundary enforcement is either absent or misconfigured for Director.
**Why it happens:** Developer copies `actor.ts` patterns without checking the target layer. Director and Actor have different target layers.
**How to avoid:**
1. Capability service must explicitly list Director's allowed write layers (core, scenario, procedural — NOT semantic).
2. Director class constructor should assert `capabilityService.getAllowedLayers('Director')` does not include 'semantic'.
3. Test: write a unit test that attempts `director.blackboard.writeEntry('semantic', ...)` and expects `BoundaryViolationError`.
**Warning signs:** No `BoundaryViolationError` when Director attempts semantic write in tests.

### Pitfall 4: Actor-to-Actor Direct Writes Bypassing Director Arbitration
**What goes wrong:** Actor A writes to semantic layer; Actor B writes to semantic layer; Director fact-checks too late (after both writes); conflict is detected but resolution creates confusion about which Actor "spoke first."
**Why it happens:** Fact-checking is reactive (per CONTEXT.md decision). Without a clear ordering mechanism, both Actors may write before Director processes either.
**How to avoid:** Phase 5's message routing hub (Socket.IO) provides the ordering mechanism. Director must write `scene_start` before inviting Actors to generate. Director must wait for all Actor outputs before writing the `scene_end` and arbitration decision. Scene lifecycle must be strictly sequential: plan → signal → wait → collect → check → close.
**Warning signs:** Conflicting Actor outputs in the same scene with no arbitration decision between them.

### Pitfall 5: Conflicting Director LLM Calls (Race Condition on Blackboard)
**What goes wrong:** Multiple Director operations (e.g., fact-check + arbitration + backbone update) race on `writeEntry()` calls without version coordination; `VersionConflictError` thrown.
**Why it happens:** Optimistic locking (`expectedVersion`) is available but not used when the Director makes sequential writes to the same layer.
**How to avoid:** For sequential writes within a single Director operation, read the layer version before the first write and use `expectedVersion` on subsequent writes. Or: use a single combined operation that writes all entries at once (batch write). The `BlackboardService` does not currently support batch writes — consider adding a `writeEntriesBatch()` method that writes atomically.
**Warning signs:** `VersionConflictError` in Director test fixtures.

### Pitfall 6: Fact-Check False Positives on Character Opinions
**What goes wrong:** Director LLM flags an Actor's dramatic statement or opinion as a factual contradiction against the core layer.
**Why it happens:** LLM semantic comparison is not precise about the distinction between "fact" (world state) and "opinion" (character stance). Actor dialogue may express views that conflict with core-layer facts but are intentionally dramatic.
**How to avoid:** Director fact-check prompt must explicitly distinguish: "Only flag contradictions of objective world state (who did what, when, where). Do NOT flag character opinions, emotional reactions, dramatic statements, or rhetorical choices." Reference the Actor's own hallucination detection rules from `buildActorSystemPrompt()`.
**Warning signs:** High volume of "contradictions" flagged by Director that are clearly character opinions or dramatic license.

---

## Code Examples

### Director Constructor (mirrors Actor)

```typescript
// Source: adapted from src/services/actor.ts:24-43
import type pino from 'pino';
import type { BlackboardService } from './blackboard.js';
import type { CapabilityService } from './capability.js';
import type { LlmProvider } from './llm.js';

export interface DirectorOptions {
  blackboard: BlackboardService;
  capabilityService: CapabilityService;
  llmProvider: LlmProvider;
  logger: pino.Logger;
  agentId: string;
}

export class Director {
  private readonly blackboard: BlackboardService;
  private readonly capabilityService: CapabilityService;
  private readonly llmProvider: LlmProvider;
  private readonly logger: pino.Logger;
  private readonly agentId: string;

  constructor(options: DirectorOptions) {
    if (!options.blackboard) throw new Error('Director requires blackboard service');
    if (!options.capabilityService) throw new Error('Director requires capability service');
    if (!options.llmProvider) throw new Error('Director requires LLM provider');
    if (!options.logger) throw new Error('Director requires logger');
    if (!options.agentId) throw new Error('Director requires agentId');

    this.blackboard = options.blackboard;
    this.capabilityService = options.capabilityService;
    this.llmProvider = options.llmProvider;
    this.logger = options.logger;
    this.agentId = options.agentId;

    // Hard assertion: Director MUST NOT write to semantic layer (role contract)
    const allowedLayers = this.capabilityService.getAllowedLayers(this.agentId);
    if (allowedLayers.includes('semantic')) {
      throw new Error('Director capability configuration error: semantic layer write must be denied');
    }
  }
}
```

### Director.generate() — Backbone Planning (core flow)

```typescript
// Source: mirrors src/services/actor.ts:56-106 pattern
async planBackbone(context: PlanningContext): Promise<DirectorBackboneOutput> {
  const exchangeId = crypto.randomUUID();

  // Read all layers for context
  const factContext = this.readAllLayerContext();

  // Check core token budget before writing
  await this.ensureCoreBudget(context.newContentEstimate);

  const system = buildDirectorSystemPrompt({ roleContract: 'PLOT_PLANNER', ... });
  const user = buildDirectorUserPrompt({ ...context, factContext });

  let rawContent: string;
  try {
    const response = await this.llmProvider.generate({ system, user });
    rawContent = response.content;
  } catch (err) {
    throw new DirectorGenerationError('llm_call', String(err), err);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new DirectorGenerationError('json_parse', 'LLM response is not valid JSON', rawContent);
  }

  const output = DirectorBackboneOutputSchema.parse(parsed);
  if (!output.exchangeId) output.exchangeId = exchangeId;

  // Write backbone prose to core layer
  this.blackboard.writeEntry('core', this.agentId, {
    content: output.backboneProse,
    messageId: output.exchangeId,
  });

  return output;
}
```

### Scene Signal — scene_start

```typescript
// Source: CONTEXT.md scene signaling decision
function buildSceneStartSignal(sceneId: string, directorId: string): string {
  return JSON.stringify({
    type: 'scene_start',
    sceneId,
    directorId,
    timestamp: new Date().toISOString(),
  });
}

// Usage in Director:
this.blackboard.writeEntry('procedural', this.agentId, {
  content: buildSceneStartSignal(sceneId, this.agentId),
  messageId: sceneId,
});
```

### Scene Signal — scene_end

```typescript
// Source: CONTEXT.md scene signaling decision
function buildSceneEndSignal(params: {
  sceneId: string;
  directorId: string;
  beats: string[];
  conflicts: string[];
  plotAdvancement: string;
  status: 'completed' | 'interrupted' | 'timeout';
}): string {
  return JSON.stringify({
    type: 'scene_end',
    ...params,
    timestamp: new Date().toISOString(),
  });
}
```

### Hybrid Conflict Detection

```typescript
// Layer 1: Actor-raised flags (fast path)
function extractActorConflicts(semanticEntries: BlackboardEntry[]): ContradictionEntry[] {
  return semanticEntries
    .filter(e => e.metadata?.unverifiedFacts === true)
    .map(e => {
      const dialogue = JSON.parse(e.content);
      return {
        sceneId: e.messageId ?? '',
        conflictingClaim: dialogue.text ?? '',
        sourceAgentId: e.agentId,
        severity: 'medium' as const, // Actor flags are medium by default
        timestamp: e.timestamp,
      };
    });
}

// Layer 2: Director LLM analysis (comprehensive safety net)
async factCheckScenes(actorOutputs: DialogueOutput[], coreFacts: string, scenarioFacts: string): Promise<FactCheckOutput> {
  const system = buildDirectorSystemPrompt({ roleContract: 'FACT_CHECKER' });
  const user = buildFactCheckUserPrompt({ actorOutputs, coreFacts, scenarioFacts });
  const response = await this.llmProvider.generate({ system, user });
  return FactCheckOutputSchema.parse(JSON.parse(response.content));
}
```

### Token Budget Monitoring Helper

```typescript
// Source: CONTEXT.md core budget overflow decision
private async ensureCoreBudget(additionalTokens: number): Promise<void> {
  const core = this.blackboard.readLayer('core');
  const threshold = LAYER_BUDGETS.core * 0.75; // 1.5K tokens

  if (core.tokenCount + additionalTokens > LAYER_BUDGETS.core) {
    // Prune: summarize oldest entries and move to scenario
    const summary = await this.summarizeAndPruneCore(core.entries);
    // Write summary to scenario (history layer)
    this.blackboard.writeEntry('scenario', this.agentId, {
      content: summary,
      messageId: crypto.randomUUID(),
    });
    // Delete pruned entries from core (if deleteEntry is available)
    for (const entry of core.entries.slice(0, Math.floor(core.entries.length / 2))) {
      this.blackboard.deleteEntry('core', entry.id, this.agentId);
    }
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Monolithic LLM generates entire script | Hierarchical Director plans backbone; Actors generate dialogue | Phase 3-4 separation of concerns | Director is a coordinator, not an author. Better creative diversity. |
| Hard-coded LLM SDK in agents | `LlmProvider` abstraction with `generate({system, user})` interface | Phase 3 (resolved) | Director uses same interface — no vendor lock-in |
| All agents write to shared state freely | Layered blackboard (core/scenario/semantic/procedural) with boundary enforcement | Phase 1-2 | Director has full access; Actors are constrained; role contract enforced structurally |
| Prompt-based role enforcement | Hard capability enforcement via `CapabilityService` + boundary gate | Phase 2 | DIR-03 enforced programmatically, not by prompt |
| Vector store for semantic similarity | LLM structured comparison prompt for contradiction detection | Phase 4 (this phase) | Avoids infrastructure complexity; sufficient for 2-4 actor drama scale |

**Deprecated/outdated:**
- **LangGraph / AutoGen as runtime dependencies:** These are Python/JS orchestration libraries. This system uses the blackboard service as the state store and `LlmProvider` as the LLM interface. LangGraph/AutoGen patterns inform the design (supervisor pattern, group chat) but are not imported. The Director is a TypeScript class, not a LangGraph node.
- **Synchronous token counting with external API:** Replaced by in-process tiktoken WASM (Phase 1).
- **Prompt-only hallucination detection:** Replaced by structured `unverifiedFacts` flags on `DialogueEntry` (Phase 3) plus Director LLM analysis (Phase 4).

---

## Open Questions

1. **Does the BlackboardService support `deleteEntry` in all layers?**
   - What we know: `deleteEntry(layer, entryId, agentId)` exists in `src/services/blackboard.ts:137`.
   - What's unclear: Does the capability service allow Director to delete from core? Actors cannot delete from core (boundary enforcement). Director may need to delete from core during pruning.
   - Recommendation: Add explicit capability assertion in Director constructor: `capabilityService.canDelete('Director', 'core')` must be true. Test this in `director.test.ts`.

2. **Should Director support batch writes for atomicity?**
   - What we know: `BlackboardService.writeEntry()` writes one entry at a time. Version conflicts are possible on sequential writes.
   - What's unclear: Is a batch write API needed for Phase 4, or does the current sequential write pattern suffice for drama session scale?
   - Recommendation: Start without batch writes. If `VersionConflictError` appears in Director tests, add `writeEntriesBatch()` to `BlackboardService` as a Phase 4 task.

3. **Director's LLM model selection (PROTO-03)**
   - What we know: `LlmProvider` is an abstraction. No concrete implementation exists yet (deferred to Phase 7).
   - What's unclear: Should Director use a different (e.g., more capable) model than Actors?
   - Recommendation: `LlmProvider` is instantiated with a model config. Director and Actor can use different provider instances with different model settings. This is a Phase 7 concern but Director code should not hardcode model names.

4. **Semantic layer write rejection test for DIR-03**
   - What we know: Phase 2 boundary enforcement exists. Director has full access per capability map.
   - What's unclear: Is `semantic` explicitly denied for Director in the capability service, or is it just "not granted"?
   - Recommendation: In Phase 4, add a Director-specific capability entry: `{ role: 'Director', allowedLayers: ['core', 'scenario', 'procedural'], deniedLayers: ['semantic'] }`. Test that `BoundaryViolationError` fires when Director attempts semantic write.

---

## Validation Architecture

> Note: `workflow.nyquist_validation` was not found in `.planning/config.json` — the key is absent, treated as `false`. Validation Architecture section is included for completeness; it should be activated when `nyquist_validation` is set to `true`.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 2.x |
| Config file | `vitest.config.ts` (if present) or `package.json` vitest section |
| Quick run command | `npm test -- --run tests/director.test.ts` |
| Full suite command | `npm test -- --run` |
| Per-wave command | `npm test -- --run --reporter=dot` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DIR-01 | Director writes plot backbone prose to core layer | unit | `npm test -- --run tests/director.test.ts -t "writes.*backbone.*core"` | Wave 0 needed |
| DIR-01 | Backbone includes at least one `[ACTOR DISCRETION]` marker | unit | `npm test -- --run tests/director.test.ts -t "ACTOR DISCRETION"` | Wave 0 needed |
| DIR-01 | Director monitors core token budget; prunes at 75% | unit | `npm test -- --run tests/director.test.ts -t "core.*budget\|prune"` | Wave 0 needed |
| DIR-02 | Director detects Actor-raised conflict flag | unit | `npm test -- --run tests/director.test.ts -t "conflict.*flag"` | Wave 0 needed |
| DIR-02 | Director arbitration decision written to scenario layer | unit | `npm test -- --run tests/director.test.ts -t "arbitrat.*scenario"` | Wave 0 needed |
| DIR-03 | Director semantic layer write raises BoundaryViolationError | unit | `npm test -- --run tests/director.test.ts -t "semantic.*violation"` | Wave 0 needed |
| DIR-03 | Director capability constructor asserts semantic denied | unit | `npm test -- --run tests/director.test.ts -t "constructor.*semantic"` | Wave 0 needed |
| DIR-04 | Actor discretion scene present in backbone | unit | `npm test -- --run tests/director.test.ts -t "ACTOR DISCRETION"` | Wave 0 needed |
| DIR-04 | Director does not override Actor discretion beat in arbitration | unit/integration | `npm test -- --run tests/director.test.ts -t "override.*discretion"` | Wave 0 needed |
| DIR-05 | Director fact-checks scene against core; contradiction flagged | unit | `npm test -- --run tests/director.test.ts -t "fact.*check\|contradiction"` | Wave 0 needed |
| DIR-05 | Three severity levels applied (high/medium/low) | unit | `npm test -- --run tests/director.test.ts -t "severity"` | Wave 0 needed |
| DIR-06 | Name change in backbone propagates to Actor dialogue within one scene | integration | `npm test -- --run tests/director.test.ts -t "name.*change\|propagate"` | Wave 0 needed |
| DIR-06 | scene_start and scene_end signals written to procedural layer | unit | `npm test -- --run tests/director.test.ts -t "scene_start\|scene_end"` | Wave 0 needed |

### Wave 0 Gaps
- [ ] `tests/director.test.ts` — covers DIR-01 through DIR-06 with mocked LlmProvider
- [ ] `tests/director.integration.test.ts` — end-to-end Director + Actor flow (if nyquist_validation enabled)
- [ ] `tests/conftest.ts` — shared Director test fixtures (mockDirector, mockBlackboard, mockLlmProvider)
- [ ] `src/types/director.ts` — DirectorOutput schemas, DirectorGenerationError, scene signal schemas
- [ ] `src/services/llm.ts` — add buildDirectorSystemPrompt, buildDirectorUserPrompt, buildFactCheckUserPrompt

---

## Sources

### Primary (HIGH confidence — from existing codebase)
- `src/services/actor.ts` — Actor class constructor and generate() pattern (the primary code example for Director implementation)
- `src/services/llm.ts` — LlmProvider interface, buildActorSystemPrompt, buildActorUserPrompt (pattern to mirror)
- `src/types/actor.ts` — Zod schema patterns, error class patterns, DialogueOutput/DialogueEntry (pattern to extend)
- `src/types/blackboard.ts` — BlackboardEntry, LayerState, LAYER_BUDGETS, capability types, error types
- `src/services/blackboard.ts` — BlackboardService API: readLayer(), writeEntry(), deleteEntry(), countTokens()
- `tests/actor.test.ts` — Test structure, mock patterns, test data factories
- `package.json` — All dependencies already in place; no new installs needed

### Secondary (MEDIUM confidence — from Context7)
- LangGraph conditional routing patterns (`/langchain-ai/langgraph` — Context7 ID) — supervisor orchestration analogy for Director scene loop
- LangGraph `StateGraph` + `add_conditional_edges` — confirms graph-based orchestration without requiring LangGraph import
- `src/services/capability.ts` (not yet read) — capability enforcement for DIR-03 hard constraint; verify Director semantic-deny config

### Tertiary (LOW confidence — training data, not verified)
- AutoGen group chat manager pattern — supervisor/speaker selection for multi-agent orchestration (Context7 query timed out; documentation URL 404)
- LangGraph supervisor Python library (`/langchain-ai/langgraph-supervisor-py`) — hierarchical agent coordination (Context7 query failed; library concept known from training)
- Specific Zod schema shapes for Director output types — must be designed in implementation; no canonical standard exists

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — entirely derived from existing codebase, no new dependencies
- Architecture: HIGH — mirrors proven Actor class pattern; LangGraph supervisor analogy verified via Context7
- Pitfalls: MEDIUM — derived from training knowledge of LLM multi-agent systems; verified against existing codebase patterns where possible
- Don't hand-roll: HIGH — all items already solved by Phase 1-3 codebase

**Research date:** 2026-03-19
**Valid until:** 2026-04-19 (30 days — domain is stable; no fast-moving library changes expected)
