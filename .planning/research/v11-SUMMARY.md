# Project Research Summary

**Project:** Multi-Agent Drama System
**Domain:** Multi-agent LLM-based collaborative drama creation with shared blackboard architecture
**Researched:** 2026-03-18
**Confidence:** MEDIUM

---

## Executive Summary

This project builds a shared blackboard-driven decentralized multi-agent system where a Director AI and a cluster of Actor AIs collaborate to write and perform dramatic scripts. Unlike single-agent writing tools, this system's value is in the emergent narrative that arises from genuine multi-agent collaboration — where Actor agents introduce creative content that the Director must arbitrate, and where no single agent has full context.

The recommended architecture follows a **vertical control + horizontal perception + bidirectional sync** flow pattern: the Director initializes scripts and writes plot backbones to the shared blackboard, triggering scene signals; Actor agents receive these signals and write dialogue independently; all agents periodically sync state to prevent context drift. The shared blackboard is the single source of truth, replacing full-prompt re-injection and solving the core LLM context overflow problem.

The system must be built with **hard cognitive boundary enforcement** from day one — not LLM prompt engineering, but programmatic write-layer gating that prevents Actor agents from modifying the plot backbone. This is the primary architectural decision that determines whether the system is genuinely multi-agent or a single-agent facade.

---

## Key Findings

### Recommended Stack

**Core:** Node.js 20 LTS + TypeScript 5.x + Express.js 4.x + Socket.IO 4.x

The LLM integration uses dual-provider support: OpenAI SDK (`openai` ^4.x) for Director agents and Anthropic SDK (`anthropic` ^0.x) for Actor agents, abstracted behind a common `LLMProvider` interface. This allows per-role model selection without coupling to any single provider. Token budget management uses `tiktoken` for context window estimation. All JSON message payloads are validated with Zod at runtime. Structured logging uses pino (3-5x faster than winston) with child loggers per agent for debuggability.

**Avoid:** LangChain/AutoGen/CrewAI — these frameworks abstract away the very blackboard pattern and boundary enforcement this project must own explicitly.

**For v1 (YOLO mode):** In-memory EventEmitter blackboard + JSON file snapshots. Redis added only when concurrency requirements outgrow file-based locking.

### Expected Features

**Must have (table stakes):**
- Shared Blackboard Service — hard token budgets, optimistic locking, audit trail
- Message Routing Hub — broadcast + peer-to-peer + multicast with deadlock prevention
- Director Agent — orchestration (NOT content authorship)
- Actor Agents — dialogue generation isolated from plot backbone
- Four-Layer Memory Architecture — core/scenario/semantic/procedural with hard eviction boundaries
- Cognitive Boundary Control — hard write-layer enforcement, not LLM prompts
- JSON Message Protocol — speaker identification, extensible cognitive_state field

**Should have (differentiators):**
- Intentional Plot Holes (Actor Discretion Scenes) — prevents single-agent facade
- Hallucination Flag System — marks unverified details explicitly
- Optimistic Locking with Audit Trail — race condition prevention
- Dynamic Communication Protocol with Cognitive State

**Defer (v2+):**
- Persistent cross-session character memory
- Visual rendering/animation of output
- Natural language speech synthesis
- Real-time human-in-the-loop editing

### Architecture Approach

The system is structured as three concentric layers:

1. **Agent Layer** — Director + Actor LLM processes, each inheriting from `BaseAgent` with shared LLM client setup
2. **Service Layer** — Shared Blackboard Service (HTTP REST + WebSocket events) + Message Routing Hub (Socket.IO)
3. **Control Layer** — Cognitive Boundary Controller (middleware on blackboard write path) + Memory Management Engine

**Major components:**
1. **Shared Blackboard Service** — central state store with four-layer hierarchy, token budgets, optimistic locking, and JSON file persistence
2. **Message Routing Hub** — Socket.IO server implementing broadcast/p2p/multicast with heartbeat + timeout/fallback on every wait
3. **Cognitive Boundary Controller** — write-layer gate that enforces namespace isolation and capability closure for every agent write
4. **Director Agent** — orchestrates plot planning, arbitrates key decisions, fact-checks scenes against core layer
5. **Actor Agents** — generate dialogue constrained by character card + scene context, cannot access plot backbone

### Critical Pitfalls

1. **Director Monopolizing Creative Authority (Pitfall 2)** — The most common multi-agent failure. LLM-driven Directors optimize for output quality and do everything themselves. Prevention: explicit role contract + count Actor contributions as quality metric.

2. **Cognitive Boundary Layer Leakage (Pitfall 4)** — Actor agents modify the plot backbone when given full context. Prevention: hard enforcement at blackboard write layer, not LLM prompts. Actor namespaces isolated from Director namespaces.

3. **Shared State Race Conditions (Pitfall 3)** — Concurrent blackboard writes silently overwrite each other. Prevention: optimistic locking with version vectors from day one.

4. **Blackboard Content Explosion (Pitfall 1)** — Context overflow cascade when blackboard exceeds LLM context window. Prevention: hard token budgets per layer + automated folding triggers at 60% threshold.

5. **YOLO Mode Persistence (Pitfall 10)** — Speed shortcuts taken in v1 become permanent technical debt. Prevention: explicit "YOLO ends here" milestone + instrument YOLO mode from day one.

---

## Implications for Roadmap

Based on feature dependencies and the pitfall map, phases must be ordered to respect the constraint graph: Cognitive Boundary Control requires Shared Blackboard; Actor Agents require both; Memory Management enhances both agents; Message Routing integrates everything last.

### Suggested Phase Structure

**Phase 1: Shared Blackboard Service**
- In-memory blackboard with four-layer model, token budgets, optimistic locking
- JSON file snapshot persistence
- Audit log with full attribution
- Rationale: All other components depend on the blackboard; must exist first
- Addresses: Pitfall 1 (token budgets), Pitfall 3 (locking), Pitfall 14 (audit trail)

**Phase 2: Cognitive Boundary Control**
- Write-layer gate enforcement, namespace isolation
- Per-agent input scope restriction
- Director vs. Actor capability closure
- Rationale: Boundary enforcement must be in place before agents go live; prevents Pitfall 4
- Addresses: Pitfall 4 (boundary leakage), Pitfall 2 (role contract foundation)

**Phase 3: Actor Agents**
- Character card system, dialogue generation, character voice consistency
- Scoped blackboard reads (character card + current scene only)
- Hallucination flag system
- Rationale: Actors require both blackboard (Phase 1) and boundary control (Phase 2)
- Addresses: Pitfall 7 (hallucination flags), Pitfall 8 (voice consistency)

**Phase 4: Director Agent**
- Plot backbone management, scene orchestration, arbitration
- Intentional holes mandate, fact-checking against core layer
- Director-blackboard sync protocol
- Rationale: Director needs Actors to exist before it can orchestrate; builds on Phases 1-3
- Addresses: Pitfall 2 (role contract), Pitfall 5 (premature plot lock-in), Pitfall 13 (inter-phase validation)

**Phase 5: Message Routing Hub**
- Socket.IO server with rooms for broadcast/p2p/multicast
- Heartbeat signals, timeout/fallback on every wait
- Agent connection management
- Rationale: All agents need routing to communicate; integrate after agents exist
- Addresses: Pitfall 6 (deadlock prevention), Pitfall 11 (excessive synchronization)

**Phase 6: Memory Management Engine**
- Four-layer memory folding with narrative priority
- Automated token counting with 60% threshold alerts
- Director promotes scenario → core layer on plot-critical events
- Rationale: Must be designed in from Phase 1 but finalized after all agents produce content
- Addresses: Pitfall 1 (folding triggers), Pitfall 9 (flat hierarchy collapse)

**Phase 7: Integration + Chaos Testing**
- End-to-end drama session test
- Adversarial boundary violation tests, silent agent tests, message reorder tests
- Define "YOLO ends here" milestone
- Rationale: Cross-component integration and chaos testing across all previous phases
- Addresses: Pitfall 15 (happy-path-only testing), Pitfall 10 (YOLO persistence)

### Phase Ordering Rationale

- Boundary Control (Phase 2) before Actor Agents (Phase 3) because actors must be prevented from overstepping before they generate content
- Actor Agents (Phase 3) before Director Agent (Phase 4) because the Director's arbitration role only makes sense when there are actors to arbitrate
- Message Routing (Phase 5) after all agents because routing ties everything together and is hardest to test in isolation
- Memory Folding (Phase 6) after content generation exists because folding policies can only be validated against real agent output
- Chaos Testing (Phase 7) at the end because it requires all components to exist first

### Research Flags

- **Phase 3 (Actor Agents):** LLM character voice consistency is underspecified in current literature; may need empirical testing with different models
- **Phase 6 (Memory Folding):** Token budget thresholds (2K core, 8K scenario) are estimates; validate against actual LLM context limits during implementation
- **All phases:** SDK versions (especially `anthropic` ^0.x) should be verified against current documentation before implementation — the LLM ecosystem evolves rapidly

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Grounded in established libraries (Node.js, TypeScript, Socket.IO, Zod); SDK alpha/beta status introduces uncertainty |
| Features | MEDIUM | Derived from domain analysis and competitor comparison (AutoGen, CrewAI, LangGraph); no live user validation |
| Architecture | MEDIUM | Blackboard pattern is well-documented; cognitive boundary enforcement pattern is novel; pitfall coverage is comprehensive |
| Pitfalls | MEDIUM | Grounded in documented multi-agent failure modes; some pitfalls (Pitfall 8: voice drift) are inferred from LLM behavior patterns, not rigorously studied |

**Overall confidence:** MEDIUM

### Gaps to Address

- **Token budget calibration:** Actual token counts for drama sessions of varying lengths not empirically measured. Handle by: instrumenting token counts from day one, adjusting budgets during Phase 6 based on real data.
- **LLM model selection:** No empirical comparison of which models work best for Director vs. Actor roles. Handle by: building the `LLMProvider` abstraction in Phase 1 so model swapping requires no architectural changes.
- **Real-world drama session length:** Unknown how many scenes/sessions the system handles before folding is required. Handle by: testing with artificially long session scripts during Phase 7.

---

## Sources

### Primary (HIGH confidence)
- Socket.IO documentation — rooms, namespaces, heartbeat mechanism. https://socket.io/docs/v4
- Zod documentation — schema validation patterns. https://zod.dev
- Pino logging benchmarks. https://getpino.io

### Secondary (MEDIUM confidence)
- AutoGen (Microsoft) GitHub — role confusion failure modes in multi-agent LLM systems. https://github.com/microsoft/autogen
- CrewAI documentation — role boundary erosion patterns. https://docs.crewai.com
- LangGraph/LangChain guides — state management failures in shared-memory designs. https://python.langchain.com/docs/concepts/agentic-systems
- Blackboard pattern literature — Corkill (1991), Jennings et al. (1996)

### Tertiary (LOW confidence)
- Community reports (HackerNews, Reddit r/LocalLLaMA) — anecdotal multi-agent failure patterns; needs validation against production deployments
- LLM context window management — documented in Anthropic/OpenAI system design guides but not rigorously studied for long-horizon drama generation

---

*Research completed: 2026-03-18*
*Ready for roadmap: yes*
