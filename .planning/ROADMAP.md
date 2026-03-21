# Roadmap: Multi-Agent Drama System

## Milestones

- [x] **v1.0 — Foundation** — Phases 1-4 (shipped 2026-03-19)
- [x] **v1.1 — Routing, Memory & Integration** — Phases 5-7 (shipped 2026-03-20)
- [ ] **v1.2 — Frontend & Documentation** — Phases 8-13 (in progress)

---

## Phases

<details>
<summary>[x] v1.0 Foundation (Phases 1-4) — SHIPPED 2026-03-19</summary>

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Shared Blackboard Service | Central state store with four-layer hierarchy and concurrency control | BLKB-01-05 | 5 |
| 2 | Cognitive Boundary Control | Hard write-layer enforcement preventing boundary leakage | BOUND-01-04 | 4 |
| 3 | Actor Agents | Character-driven dialogue generation with scoped context | ACTR-01-05 | 5 |
| 4 | Director Agent | Orchestration, arbitration, and inter-phase validation | DIR-01-06 | 6 |

- [x] Phase 1: Foundation (2/2 plans) — completed 2026-03-18
- [x] Phase 2: Cognitive Boundary Control (1/1 plan) — completed 2026-03-18
- [x] Phase 3: Actor Agents (1/1 plan) — completed 2026-03-18
- [x] Phase 4: Director Agent (1/1 plan) — completed 2026-03-19

**Delivered:**
- Shared Blackboard Service: REST API, four-layer model, optimistic locking, audit log, JSON snapshots
- Cognitive Boundary Control: hard write-layer enforcement, JWT auth, namespace isolation
- Actor Agents: dialogue generation, scoped reads, hallucination flags, voice consistency
- Director Agent: plot backbone planning, arbitration, fact-checking, role contract

</details>

<details>
<summary>[x] v1.1 Routing, Memory & Integration (Phases 5-7) — SHIPPED 2026-03-20</summary>

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 5 | Message Routing Hub | Real-time communication with deadlock prevention | ROUTE-01-06 | 6 |
| 6 | Memory Management Engine | Token-budget-aware folding preserving narrative priority | MEM-01-05 | 5 |
| 7 | Integration + Chaos Testing | End-to-end session + adversarial robustness tests | TEST-01-06 + PROTO-01-05 | 11 |

- [x] Phase 5: Message Routing Hub (1/1 plan) — completed 2026-03-20
- [x] Phase 6: Memory Management Engine (1/1 plan) — completed 2026-03-20
- [x] Phase 7: Integration + Chaos Testing (1/1 plan) — completed 2026-03-20

**Delivered:**
- Socket.IO real-time messaging with broadcast, peer-to-peer, and multicast capabilities
- Four-layer memory management with automated folding, token budget enforcement, and core preservation
- Comprehensive integration testing with 104 tests covering E2E scenarios and chaos conditions
- LLM provider abstraction with OpenAI and Anthropic adapters behind a unified interface
- Formalized communication protocol using Zod schemas, .env configuration, and structured logging

</details>

---

## v1.2 — Frontend & Documentation (Current)

### Phase Summary Checklist

- [ ] **Phase 8: Frontend Foundation** - Project setup, Socket.IO integration, and basic session management UI
- [ ] **Phase 9: Session Configuration & Agent Dashboard** - LLM provider settings, session parameters, and agent status dashboard
- [ ] **Phase 10: Real-Time Visualization** - Message stream, communication graph, and memory state visualization
- [ ] **Phase 11: Script Generation & Export** - Export functionality for JSON, Markdown, and PDF formats
- [ ] **Phase 12: Documentation Site** - User guide, API reference, and architecture documentation
- [ ] **Phase 13: Polish & Integration** - Configuration, testing, and final integration

### Phase Details

#### Phase 8: Frontend Foundation
**Goal**: User can access a basic web interface that connects to the drama system backend
**Depends on**: Phase 7 (v1.1 completion)
**Requirements**: UI-01, UI-08, RT-01, CFG-01, CFG-02
**Success Criteria** (what must be TRUE):
  1. User can access the frontend web application via browser
  2. User can create a new drama session from the UI
  3. Frontend automatically reconnects if Socket.IO connection drops
  4. User can start and stop drama scenes from the interface
  5. API base URL and Socket.IO settings are configurable via environment variables
**Plans**: 5 plans

Plans:
- [x] 08-01-PLAN.md — Backend session registry and REST API for session management ✓
- [x] 08-02-PLAN.md — Frontend React + Vite app bootstrap with API and Socket.IO clients
- [x] 08-03-PLAN.md — Session list and creation form UI components
- [x] 08-04a-PLAN.md — Scene start/stop controls and connection status indicator
- [ ] 08-04b-PLAN.md — Toast notifications, Socket.IO wiring, and human verification

#### Phase 9: Session Configuration & Agent Dashboard
**Goal**: User can configure session parameters and monitor agent status
**Depends on**: Phase 8
**Requirements**: UI-02, UI-03, UI-07, UI-09, RT-02, RT-04, CFG-03
**Success Criteria** (what must be TRUE):
  1. User can configure scene duration, agent count, and other session parameters
  2. User can select LLM provider (OpenAI, Anthropic, Mock) and enter API keys
  3. User can view dashboard showing connected agents, their roles, and connection quality
  4. Agent dashboard updates in real-time when agents connect/disconnect
  5. User can save and load session templates for quick setup
  6. User can view system health status and connection information
**Plans**: TBD

#### Phase 10: Real-Time Visualization
**Goal**: User can visualize agent communication and system state in real-time
**Depends on**: Phase 9
**Requirements**: UI-04, UI-05, UI-06, RT-03
**Success Criteria** (what must be TRUE):
  1. User can view real-time message stream showing all agent communication
  2. User can visualize agent communication patterns as a real-time graph
  3. User can inspect four-layer memory state and token budget usage
  4. Message stream updates automatically as new agent messages arrive
**Plans**: TBD

#### Phase 11: Script Generation & Export
**Goal**: User can export generated scripts in multiple formats
**Depends on**: Phase 10
**Requirements**: EXP-01, EXP-02, EXP-03, EXP-04
**Success Criteria** (what must be TRUE):
  1. User can export generated scripts as JSON file
  2. User can export generated scripts as formatted Markdown file
  3. User can export generated scripts as PDF file
  4. Exported files download directly to user's browser
**Plans**: TBD

#### Phase 12: Documentation Site
**Goal**: User can access comprehensive documentation for the system
**Depends on**: Phase 11
**Requirements**: DOC-01, DOC-02, DOC-03, DOC-04, DOC-05
**Success Criteria** (what must be TRUE):
  1. User can access getting started guide with step-by-step instructions
  2. User can access comprehensive API reference with OpenAPI 3.1 specification
  3. User can access detailed user guide with usage examples
  4. User can access architecture documentation with component diagrams
  5. Documentation site supports dark/light theme and responsive design
**Plans**: TBD

#### Phase 13: Polish & Integration
**Goal**: All features work together seamlessly and are ready for release
**Depends on**: Phase 12
**Requirements**: (integration and polish)
**Success Criteria** (what must be TRUE):
  1. All v1.2 features work together in end-to-end workflow
  2. Frontend maintains stable connection through scene completions
  3. Documentation accurately reflects implemented features
  4. All export formats produce valid, readable output
  5. User can complete full workflow from session creation to script export
**Plans**: TBD

### Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 8. Frontend Foundation | 4/5 | In Progress | - |
| 9. Session Configuration & Agent Dashboard | 0/0 | Not started | - |
| 10. Real-Time Visualization | 0/0 | Not started | - |
| 11. Script Generation & Export | 0/0 | Not started | - |
| 12. Documentation Site | 0/0 | Not started | - |
| 13. Polish & Integration | 0/0 | Not started | - |

### Coverage

**Total v1.2 requirements:** 23
**Mapped to phases:** 23
**Unmapped:** 0

---

*Roadmap last updated: 2026-03-21 with Phase 8 plan split (08-04 -> 08-04a + 08-04b)*
