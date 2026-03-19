# Roadmap: Multi-Agent Drama System

**Project:** Multi-Agent Drama System
**Phases:** 7 | **Requirements:** 41 | **Defined:** 2026-03-18

---

## Proposed Roadmap

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Shared Blackboard Service | Central state store with four-layer hierarchy and concurrency control | BLKB-01–05 | 5 |
| 2 | Cognitive Boundary Control | Hard write-layer enforcement preventing boundary leakage | BOUND-01–04 | 4 | 1/1 | Complete   | 2026-03-19 | Character-driven dialogue generation with scoped context | ACTR-01–05 | 5 |
| 4 | Director Agent | Orchestration, arbitration, and inter-phase validation | DIR-01–06 | 6 |
| 5 | Message Routing Hub | Real-time communication with deadlock prevention | ROUTE-01–06 | 6 |
| 6 | Memory Management Engine | Token-budget-aware folding preserving narrative priority | MEM-01–05 | 5 |
| 7 | Integration + Chaos Testing | End-to-end session + adversarial robustness tests | TEST-01–06 + PROTO-01–05 | 11 |

---

## Phase Details

### Phase 1: Shared Blackboard Service

**Goal:** Establish the central state store that all agents depend on. The blackboard is the single source of truth; all agents read from and write to it. Without this, no other component can function.

**Requirements:** BLKB-01, BLKB-02, BLKB-03, BLKB-04, BLKB-05

**Success Criteria:**
1. Agent can write an entry to any layer via REST API and read it back
2. Token budget enforcement: write exceeding layer budget is rejected with error
3. Concurrent writes to same layer: one succeeds, one gets version conflict error
4. Every write appears in audit log with agent ID, timestamp, message ID
5. Service restart: blackboard state restored from most recent JSON snapshot

---

### Phase 2: Cognitive Boundary Control

**Goal:** Prevent Actor agents from overstepping their assigned roles. Boundary enforcement must be hard (programmatic), not soft (prompt-based). This phase installs the gate that protects the system's multi-agent integrity.

**Requirements:** BOUND-01, BOUND-02, BOUND-03, BOUND-04

**Success Criteria:**
1. Actor write to core layer: rejected with capability closure error
2. Actor read of full blackboard: returns only character card + current scene
3. Director write to any layer: succeeds (full access)
4. Boundary violations logged with violation type and attempted operation

---

### Phase 3: Actor Agents

**Goal:** Build Actor agents that generate dialogue within their character constraints, maintaining distinct character voices across scenes. Actors are the primary creative output unit.

**Requirements:** ACTR-01, ACTR-02, ACTR-03, ACTR-04, ACTR-05

**Success Criteria:**
1. Two Actor agents with different character cards generate dialogue that sounds distinct
2. Actor dialogue does not contradict established core layer facts
3. Unverified details in actor output are marked with hallucination flag
4. After 10 scene exchanges, character voice remains consistent (Director validation)
5. Actors respect scoped read access (no plot backbone access)

**Status:** Complete (2026-03-18) — 43 tests pass
- Actor class with generate(), getCharacterCard(), readFactContext()
- LlmProvider abstract interface (concrete impl deferred to Phase 7)
- Actor types: CharacterCard, VoiceConstraints, SceneContext, DialogueOutput, Zod schemas
- Actor-specific metadata fields on BlackboardEntry
- GET /me/scope returns character card from semantic layer

---

### Phase 4: Director Agent

**Goal:** Build the Director agent that orchestrates the drama without monopolizing creative authority. The Director plans, arbitrates, and verifies — it never writes dialogue for Actor characters.

**Requirements:** DIR-01, DIR-02, DIR-03, DIR-04, DIR-05, DIR-06

**Success Criteria:**
1. Director writes plot backbone with at least one "Actor discretion" scene
2. Actor introduces plot element in Actor discretion scene; Director does not override it
3. Director fact-checks scene against core layer; contradiction detected and flagged
4. Director arbitrates conflicting Actor outputs; decision written to scenario layer
5. Character name change in plot backbone propagates to Actor dialogue within one scene
6. Director issues scene_start and scene_end signals correctly

**Status:** Complete (2026-03-19) — 65 tests pass (22 new Director tests)
- Director class with planBackbone(), arbitrate(), factCheck(), signalSceneStart(), signalSceneEnd()
- Director prompt builders: buildDirectorSystemPrompt, buildDirectorUserPrompt, buildFactCheckUserPrompt
- Hard semantic-layer capability assertion in constructor (DIR-03)
- ensureCoreBudget() prunes core at 75% threshold, summary written to scenario layer

---

### Phase 5: Message Routing Hub

**Goal:** Replace polling-based communication with Socket.IO-based real-time routing that prevents deadlock through heartbeat signals and timeout fallbacks.

**Requirements:** ROUTE-01, ROUTE-02, ROUTE-03, ROUTE-04, ROUTE-05, ROUTE-06

**Success Criteria:**
1. Director broadcasts scene_start: all connected actors receive within 100ms
2. Actor p2p message: recipient receives within 100ms
3. Actor multicast: subset of actors receives correctly
4. Actor silence (no response): Director fallback triggers within defined timeout
5. Network disconnect + reconnect: Socket.IO reconnects automatically
6. Heartbeat: alive signal observed every 5s from all connected agents

---

### Phase 6: Memory Management Engine

**Goal:** Implement automated memory folding that keeps the blackboard within token budgets while preserving climactic scenes and character voice constraints.

**Requirements:** MEM-01, MEM-02, MEM-03, MEM-04, MEM-05

**Success Criteria:**
1. Semantic layer exceeds 8K tokens: folding triggered, summary replaces entries
2. Core layer: no eviction after folding, content persists across all folds
3. Director promotes scenario content to core: promoted content immune to eviction
4. After fold: Actor agent generates dialogue consistent with pre-fold core layer facts
5. Token count alert fires at 60% threshold: alert logged, no write blocked

---

### Phase 7: Integration + Chaos Testing

**Goal:** Verify the complete system end-to-end and ensure adversarial conditions (boundary violations, silent agents, race conditions) are handled gracefully. Define the "YOLO ends here" milestone.

**Requirements:** TEST-01–06, PROTO-01–05

**Success Criteria:**
1. End-to-end: Director + 2 Actors complete a 10-scene drama with coherent output
2. Boundary violation: Actor attempting core layer write receives error, drama continues
3. Silent agent: Director's timeout fallback triggers, drama continues
4. Race condition: concurrent blackboard writes handled without data loss
5. Message reorder: late-arriving message does not corrupt narrative state
6. Token overflow: semantic layer folds mid-session, all agents continue correctly
7. All protocol messages validated against Zod schema (no malformed messages in flight)
8. LLM provider abstraction: swapping OpenAI for Anthropic adapter requires no agent code changes
9. All configuration loaded from .env file
10. All log entries include agent attribution (agent ID in every log line)
11. YOLO mode assessment: documented which error paths are handled vs. instrumented-only

---

## Phase Ordering Rationale

1. **Phase 1 (Blackboard) first:** All agents depend on shared state. Cannot build agents without something to share state with.
2. **Phase 2 (Boundary) before Phase 3 (Actors):** Boundary enforcement must be in place before actors generate content. Boundary violations caught in Phase 2 testing are fixed before Phase 3.
3. **Phase 3 (Actors) before Phase 4 (Director):** The Director's arbitration role only makes sense when there are actors to arbitrate. Director works with existing actors, not hypothetical ones.
4. **Phase 5 (Routing) after all agents:** Routing ties everything together and requires both Director and Actors to exist to test meaningfully.
5. **Phase 6 (Memory) after content generation exists:** Folding policies require real agent output to validate. Cannot design folding logic in a vacuum.
6. **Phase 7 (Integration) last:** All components must exist and be individually tested before end-to-end integration testing.

---

## Requirement Coverage Matrix

| Requirement | Phase | Quality Criteria |
|-------------|-------|-----------------|
| BLKB-01: REST API | 1 | write-read roundtrip succeeds |
| BLKB-02: Four-layer model | 1 | token budget enforced on write |
| BLKB-03: Optimistic locking | 1 | concurrent write conflict detected |
| BLKB-04: Audit log | 1 | log entry has agent ID + timestamp |
| BLKB-05: JSON snapshots | 1 | state restored after restart |
| BOUND-01: Capability closure | 2 | actor → core write rejected |
| BOUND-02: Namespace isolation | 2 | actor sees only scoped read |
| BOUND-03: Input scope restriction | 2 | API rejects out-of-scope read |
| BOUND-04: Hard enforcement | 2 | violations fail regardless of prompt |
| ACTR-01: Dialogue generation | 3 | dialogue matches character card |
| ACTR-02: Scoped reads | 3 | no plot backbone in actor context |
| ACTR-03: Hallucination flags | 3 | unverified details flagged |
| ACTR-04: Voice consistency | 3 | voice distinct after 10 exchanges |
| ACTR-05: Fact-checking | 3 | contradiction detected |
| DIR-01: Plot backbone | 4 | backbone written to core layer |
| DIR-02: Arbitration | 4 | conflict decision logged |
| DIR-03: Role contract | 4 | no director dialogue for actors |
| DIR-04: Intentional holes | 4 | actor discretion scene present |
| DIR-05: Fact-checking | 4 | scene validated against core |
| DIR-06: Inter-phase validation | 4 | name change propagates |
| ROUTE-01: Broadcast | 5 | all actors receive broadcast |
| ROUTE-02: Peer-to-peer | 5 | target actor receives p2p |
| ROUTE-03: Multicast | 5 | subset receives correctly |
| ROUTE-04: Heartbeat | 5 | alive signal observed |
| ROUTE-05: Timeout | 5 | fallback triggers on silence |
| ROUTE-06: Director fallback | 5 | director proceeds on timeout |
| MEM-01: Token counting | 6 | alert at 60% threshold |
| MEM-02: Semantic folding | 6 | fold produces coherent summary |
| MEM-03: Procedural preservation | 6 | voice constraints survive fold |
| MEM-04: Core immutability | 6 | core content never evicted |
| MEM-05: Promotion | 6 | promoted content immune |
| TEST-01: E2E session | 7 | 10-scene drama completes |
| TEST-02: Boundary chaos | 7 | violation contained |
| TEST-03: Silent agent | 7 | fallback triggers |
| TEST-04: Race condition | 7 | no data loss |
| TEST-05: Message reorder | 7 | state consistent |
| TEST-06: Token overflow | 7 | fold handled mid-session |
| PROTO-01: Message protocol | 7 | all messages valid schema |
| PROTO-02: Schema defined | 7 | Zod schemas committed |
| PROTO-03: LLM abstraction | 7 | provider swap is adapter-only |
| PROTO-04: .env config | 7 | no hardcoded values |
| PROTO-05: Agent logging | 7 | agent ID in every log line |

---

*Roadmap created: 2026-03-18*
*Ready for execution: yes*
*Phase 2: Complete (Plan 02 executed 2026-03-18 — JWT auth + capability enforcement, 26 tests pass)*
