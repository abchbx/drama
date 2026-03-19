# Multi-Agent Drama System

## What This Is

A shared blackboard-driven decentralized multi-agent system for collaborative drama creation. Multiple AI agents — a Director and a cluster of Actors — collaborate to write and perform dramatic scripts, with a shared blackboard service managing global state to prevent LLM context drift and enforce cognitive boundaries between agents.

## Core Value

Multiple AI agents can collaboratively create dramatic narratives without losing context, conflicting on state, or overstepping their assigned roles.

## Current Milestone: v1.1 — Routing, Memory & Integration

**Goal:** Complete the remaining Phases 5–7: Socket.IO real-time routing, memory folding engine, and end-to-end integration testing.

**Target features:**
- Message Routing Hub (Phase 5) — Socket.IO broadcast/p2p/multicast, heartbeat, timeout fallbacks
- Memory Management Engine (Phase 6) — four-layer token counting, automated folding, core preservation
- Integration + Chaos Testing (Phase 7) — E2E drama session, adversarial robustness, LLM provider abstraction
- Cross-cutting: Dynamic Communication Protocol (PROTO-01–05) — formalized Zod schemas, .env config, agent logging

**Validated from v1.0:**
- ✓ Shared Blackboard Service — REST API, four-layer model, optimistic locking, audit log, JSON snapshots
- ✓ Cognitive Boundary Control — hard write-layer enforcement, namespace isolation
- ✓ Actor Agents — dialogue generation, scoped reads, hallucination flags, voice consistency
- ✓ Director Agent — plot backbone planning, arbitration, fact-checking, role contract

## Current Milestone: v1.1 — Routing, Memory & Integration

**Goal:** Complete Phases 5–7: Socket.IO real-time routing hub, memory folding engine, and end-to-end integration testing.

**Target features:**
- Phase 5: Message Routing Hub — Socket.IO broadcast/p2p/multicast, heartbeat, timeout fallbacks
- Phase 6: Memory Management Engine — four-layer token counting, automated folding, core preservation
- Phase 7: Integration + Chaos Testing — E2E drama session, adversarial robustness, LLM provider abstraction
- Cross-cutting: Dynamic Communication Protocol (PROTO-01–05) — formalized Zod schemas, .env config, agent logging

**Validated from v1.0:**
- ✓ Shared Blackboard Service — REST API, four-layer model, optimistic locking, audit log, JSON snapshots
- ✓ Cognitive Boundary Control — hard write-layer enforcement, namespace isolation
- ✓ Actor Agents — dialogue generation, scoped reads, hallucination flags, voice consistency
- ✓ Director Agent — plot backbone planning, arbitration, fact-checking, role contract

## Requirements

### Validated

- [x] Director Agent: orchestrates plot planning, arbitrates key decisions, verifies context consistency — v1.0
- [x] Actor Agents: play specific roles, generate dialogue based on character settings — v1.0
- [x] Shared Blackboard Service: central memory hub storing plot backbone and character state snapshots — v1.0
- [x] Three-Layer Cognitive Boundary Control: input limits, capability closure, decision authority isolation — v1.0

### Active

- [ ] Message Routing Hub: dynamic message distribution with broadcast, peer-to-peer, and multicast modes
- [ ] Memory Management Engine: four-layer memory (core, scenario, semantic, procedural) with fold/unfold mechanisms
- [ ] Dynamic Communication Protocol: standardized JSON messages with speaker identification and real-time cognitive updates

### Out of Scope

- Real-time human-in-the-loop script editing during performance
- Visual rendering or animation of drama output
- Natural language speech synthesis for dialogue
- Persistent character memory across separate drama sessions

## Context

Architecture is inspired by the "decentralized communication + centralized memory" hybrid pattern:
- **Vertical control flow**: Director initializes script and writes to blackboard, triggering scene start signals
- **Horizontal perception flow**: Actor agents receive outputs through message routing hub, updating local mental models
- **Bidirectional sync flow**: All agents periodically submit state summaries to shared blackboard and pull latest global views

The system solves two core problems in multi-agent drama creation:
1. **Main LLM context drift**: Shared blackboard replaces full-prompt injection, decoupling agent internal state from global plot progression
2. **Subagent cognitive boundary control**: Three-layer boundary system prevents agents from overstepping reasoning or executing unauthorized behaviors

## Constraints

- **Tech**: LLM-based agents (compatible with OpenAI/Anthropic/Qwen-compatible APIs)
- **Storage**: Shared blackboard as external persistent storage (file-based or in-memory service)
- **Communication**: JSON-based message protocol with standardized format
- **Token Efficiency**: Four-layer memory folding to stay within context windows

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Shared blackboard as central state store | Avoids full-prompt re-injection, solves context drift | ✓ Good (Phase 1) |
| JSON message protocol for all inter-agent communication | Standardized, extensible, easy to route | — Pending (Phase 5) |
| Four-layer memory architecture | Simulates human cognition, enables token-efficient context management | — Pending (Phase 6) |
| YOLO execution mode for v1 | Speed of iteration critical for architecture validation | — Pending (Phase 7) |
| Node.js 22 LTS + TypeScript 5.5 | Async I/O for concurrent agents; npm ecosystem; type safety | ✓ Good (Phase 1) |
| Socket.IO for message routing | Built-in heartbeat prevents deadlocks; rooms map to routing modes | ✓ Good (Phase 5) |
| Zod for JSON validation | Runtime schema enforcement; TypeScript inference | ✓ Good (Phase 3) |
| tiktoken v1.x for token counting | Synchronous WASM encoder (gpt-4 encoding = cl100k_base) | ✓ Good (Phase 1) |
| pino v9 + pino-http | Structured JSON logging with agent attribution | ✓ Good (Phase 1) |
| LLM Provider abstract interface | Swappable OpenAI/Anthropic adapters — no agent code changes | ✓ Good (Phase 3) |
| HS256 JWT for agent tokens | Service-internal symmetric tokens; no asymmetric key management | ✓ Good (Phase 2) |

---
*Last updated: 2026-03-19 after v1.1 milestone initialization — Routing, Memory & Integration*
