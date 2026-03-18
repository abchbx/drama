# Requirements: Multi-Agent Drama System

**Defined:** 2026-03-18
**Core Value:** Multiple AI agents can collaboratively create dramatic narratives without losing context, conflicting on state, or overstepping their assigned roles.

---

## v1 Requirements

### Phase 1: Shared Blackboard Service

- [x] **BLKB-01**: Shared blackboard service exposes REST API for read/write operations
- [x] **BLKB-02**: Four-layer memory model (core/scenario/semantic/procedural) with hard token budgets per layer
- [x] **BLKB-03**: Optimistic locking with version vectors on all blackboard writes
- [x] **BLKB-04**: Audit log: every write attributed to agent ID, timestamp, and message ID
- [x] **BLKB-05**: JSON file snapshot persistence for blackboard state

### Phase 2: Cognitive Boundary Control

- [x] **BOUND-01**: Write-layer gate rejects entries that violate capability closure (actors cannot write to core layer)
- [x] **BOUND-02**: Namespace isolation: Actor agents can only read their character card and current scene
- [x] **BOUND-03**: Per-agent input scope restriction enforced at the blackboard API layer
- [x] **BOUND-04**: Boundary enforcement is hard (programmatic), not soft (prompt-based)

### Phase 3: Actor Agents

- [ ] **ACTR-01**: Actor agents generate dialogue constrained by their character card
- [ ] **ACTR-02**: Actor agents have scoped blackboard read access (character card + current scene only)
- [ ] **ACTR-03**: Hallucination flag system marks unverified details in blackboard entries
- [ ] **ACTR-04**: Character voice consistency: character voice stored as explicit style constraints in procedural layer
- [ ] **ACTR-05**: Director acts as character consistency auditor and fact-checks scenes against core layer

### Phase 4: Director Agent

- [ ] **DIR-01**: Director agent plans plot backbone and writes to blackboard core/scenario layers
- [ ] **DIR-02**: Director arbitrates key decisions when Actor outputs conflict
- [ ] **DIR-03**: Director MUST NOT monopolize creative authority — explicit role contract enforced
- [ ] **DIR-04**: Intentional holes: Director mandates "Actor discretion" scenes where actors introduce creative content
- [ ] **DIR-05**: Director fact-checks all scenes against established core layer facts
- [ ] **DIR-06**: Director enforces inter-phase validation: validates Actor output at every phase transition

### Phase 5: Message Routing Hub

- [ ] **ROUTE-01**: Socket.IO server implements broadcast routing (Director → all actors)
- [ ] **ROUTE-02**: Socket.IO server implements peer-to-peer routing (Actor → Actor)
- [ ] **ROUTE-03**: Socket.IO server implements multicast routing (Director → subset of actors)
- [ ] **ROUTE-04**: Heartbeat signals: agents confirm alive status periodically
- [ ] **ROUTE-05**: Every message wait has explicit timeout with defined fallback behavior
- [ ] **ROUTE-06**: Director has unilateral fallback when actors do not respond within timeout

### Phase 6: Memory Management Engine

- [ ] **MEM-01**: Automated token counting on every blackboard write with 60% threshold alert
- [ ] **MEM-02**: Semantic layer folding: when >8K tokens, summary replaces individual entries
- [ ] **MEM-03**: Procedural layer folding: when >4K tokens, character voice constraints are preserved
- [ ] **MEM-04**: Core layer is NEVER evicted — only explicitly updated
- [ ] **MEM-05**: Director explicitly promotes scenario content to core layer when plot-critical

### Phase 7: Integration + Testing

- [ ] **TEST-01**: End-to-end drama session test: Director + 2+ Actors complete a scene from start to finish
- [ ] **TEST-02**: Chaos test: boundary violation attempts are rejected with appropriate error
- [ ] **TEST-03**: Chaos test: silent agent (no response) triggers timeout fallback
- [ ] **TEST-04**: Chaos test: concurrent blackboard writes are handled without data loss
- [ ] **TEST-05**: Chaos test: message reorder does not cause narrative inconsistency
- [ ] **TEST-06**: Token budget overflow test: session continues correctly after semantic layer fold

### Cross-Cutting

- [ ] **PROTO-01**: JSON message protocol with speaker identification, cognitive_state field, and scene phase
- [ ] **PROTO-02**: Message types formally defined (Zod schema) before implementation
- [ ] **PROTO-03**: LLM Provider abstraction: OpenAI and Anthropic adapters behind unified interface
- [ ] **PROTO-04**: All configuration via .env file (API keys, ports, token budgets, timeouts)
- [ ] **PROTO-05**: Structured JSON logging with agent attribution on every log line

---

## v2 Requirements

### Cross-Session Memory

- **MEM-跨-01**: Persistent character memory across separate drama sessions
- **MEM-跨-02**: Character arc tracking across multiple scripts

### Output Quality

- **QUAL-01**: Natural language speech synthesis for dialogue output
- **QUAL-02**: Visual rendering/animation of drama output
- **QUAL-03**: Real-time human-in-the-loop editing during performance

### Platform

- **PLAT-01**: Web UI for drama session control and monitoring
- **PLAT-02**: REST API for external integration
- **PLAT-03**: Docker containerization for all agent processes

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time human-in-the-loop script editing during performance | High complexity, shifts from autonomous to collaborative tool |
| Visual rendering or animation of drama output | Not core to narrative generation value |
| Natural language speech synthesis for dialogue | Post-processing concern, not multi-agent coordination |
| Persistent character memory across separate drama sessions | Requires identity management, deferred to v2 |
| Human actor participation in sessions | Pure AI multi-agent system; human involvement adds complexity beyond v1 |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BLKB-01 | Phase 1 | Complete |
| BLKB-02 | Phase 1 | Complete |
| BLKB-03 | Phase 1 | Complete |
| BLKB-04 | Phase 1 | Complete |
| BLKB-05 | Phase 1 | Complete |
| BOUND-01 | Phase 2 | Complete |
| BOUND-02 | Phase 2 | Complete |
| BOUND-03 | Phase 2 | Complete |
| BOUND-04 | Phase 2 | Complete |
| ACTR-01 | Phase 3 | Pending |
| ACTR-02 | Phase 3 | Pending |
| ACTR-03 | Phase 3 | Pending |
| ACTR-04 | Phase 3 | Pending |
| ACTR-05 | Phase 3 | Pending |
| DIR-01 | Phase 4 | Pending |
| DIR-02 | Phase 4 | Pending |
| DIR-03 | Phase 4 | Pending |
| DIR-04 | Phase 4 | Pending |
| DIR-05 | Phase 4 | Pending |
| DIR-06 | Phase 4 | Pending |
| ROUTE-01 | Phase 5 | Pending |
| ROUTE-02 | Phase 5 | Pending |
| ROUTE-03 | Phase 5 | Pending |
| ROUTE-04 | Phase 5 | Pending |
| ROUTE-05 | Phase 5 | Pending |
| ROUTE-06 | Phase 5 | Pending |
| MEM-01 | Phase 6 | Pending |
| MEM-02 | Phase 6 | Pending |
| MEM-03 | Phase 6 | Pending |
| MEM-04 | Phase 6 | Pending |
| MEM-05 | Phase 6 | Pending |
| TEST-01 | Phase 7 | Pending |
| TEST-02 | Phase 7 | Pending |
| TEST-03 | Phase 7 | Pending |
| TEST-04 | Phase 7 | Pending |
| TEST-05 | Phase 7 | Pending |
| TEST-06 | Phase 7 | Pending |
| PROTO-01 | Cross-Cutting | Pending |
| PROTO-02 | Cross-Cutting | Pending |
| PROTO-03 | Cross-Cutting | Pending |
| PROTO-04 | Cross-Cutting | Pending |
| PROTO-05 | Cross-Cutting | Pending |

**Coverage:**
- v1 requirements: 41 total
- Mapped to phases: 41
- Unmapped: 0

---
*Requirements defined: 2026-03-18*
*Last updated: 2026-03-18 after Phase 2 Plan 2 execution (BOUND-01 to BOUND-04 complete)*
