# Multi-Agent Drama System

## What This Is

A shared blackboard-driven decentralized multi-agent system for collaborative drama creation. Multiple AI agents — a Director and a cluster of Actors — collaborate to write and perform dramatic scripts, with a shared blackboard service managing global state to prevent LLM context drift and enforce cognitive boundaries between agents. Now includes real-time Socket.IO routing, automated memory folding, and comprehensive integration testing.

## Core Value

Multiple AI agents can collaboratively create dramatic narratives without losing context, conflicting on state, or overstepping their assigned roles.

## Current Milestone: v1.2 — Frontend & Documentation ✅ PLANNING

**Version:** v1.2
**Goal:** Develop a frontend interface for the Multi-Agent Drama System and write comprehensive user documentation to make the system accessible to non-technical users.

**Target features:**
- Interactive web interface for managing drama sessions
- Real-time visualization of agent communication and blackboard state
- Session configuration and LLM provider settings
- Script generation and export capabilities
- Comprehensive user guide and API documentation

## Requirements

### Validated

- [x] Director Agent: orchestrates plot planning, arbitrates key decisions, verifies context consistency — v1.0
- [x] Actor Agents: play specific roles, generate dialogue based on character settings — v1.0
- [x] Shared Blackboard Service: central memory hub storing plot backbone and character state snapshots — v1.0
- [x] Three-Layer Cognitive Boundary Control: input limits, capability closure, decision authority isolation — v1.0
- [x] Message Routing Hub: dynamic message distribution with broadcast, peer-to-peer, and multicast modes — v1.1
- [x] Memory Management Engine: four-layer memory (core, scenario, semantic, procedural) with fold/unfold mechanisms — v1.1
- [x] Dynamic Communication Protocol: standardized JSON messages with speaker identification and real-time cognitive updates — v1.1

### Active

- [ ] Frontend interface: interactive web UI for managing drama sessions
- [ ] Real-time visualization: display agent communication and blackboard state in real-time
- [ ] Session configuration: UI for configuring LLM providers, session parameters, and agent settings
- [ ] Script generation: export generated scripts in various formats (JSON, Markdown, PDF)
- [ ] Documentation: comprehensive user guide and API documentation

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
| JSON message protocol for all inter-agent communication | Standardized, extensible, easy to route | ✓ Good (v1.1) |
| Four-layer memory architecture | Simulates human cognition, enables token-efficient context management | ✓ Good (v1.1) |
| YOLO execution mode for v1 | Speed of iteration critical for architecture validation | ✓ Completed (v1.1) |
| Node.js 22 LTS + TypeScript 5.5 | Async I/O for concurrent agents; npm ecosystem; type safety | ✓ Good (Phase 1) |
| Socket.IO for message routing | Built-in heartbeat prevents deadlocks; rooms map to routing modes | ✓ Good (Phase 5) |
| Zod for JSON validation | Runtime schema enforcement; TypeScript inference | ✓ Good (Phase 3) |
| tiktoken v1.x for token counting | Synchronous WASM encoder (gpt-4 encoding = cl100k_base) | ✓ Good (Phase 1) |
| pino v9 + pino-http | Structured JSON logging with agent attribution | ✓ Good (Phase 1) |
| LLM Provider abstract interface | Swappable OpenAI/Anthropic adapters — no agent code changes | ✓ Good (Phase 3) |
| HS256 JWT for agent tokens | Service-internal symmetric tokens; no asymmetric key management | ✓ Good (Phase 2) |
| Semantic layer: 8K token budget threshold | Empirical measurement during Phase 6 | ✓ Good (Phase 6) |
| Core layer: 2K token budget, no eviction | Hard guarantee that core layer persists | ✓ Good (Phase 6) |
| 60% threshold triggers token count alert | Logged, not blocking | ✓ Good (Phase 6) |
| Promotion writes directly to core | Bypasses normal write path | ✓ Good (Phase 6) |
| Summary written to scenario during fold | Not core | ✓ Good (Phase 4/6) |
| MockLlmProvider used for all tests | No real API calls | ✓ Good (Phase 7) |
| DramaSession chaos hooks | Allow injection at any point in lifecycle | ✓ Good (Phase 7) |

---
*Last updated: 2026-03-21 after v1.1 milestone — Routing, Memory & Integration*
