# Multi-Agent Drama System

## What This Is

A shared blackboard-driven decentralized multi-agent system for collaborative drama creation. Multiple AI agents — a Director and a cluster of Actors — collaborate to write and perform dramatic scripts, with a shared blackboard service managing global state to prevent LLM context drift and enforce cognitive boundaries between agents.

## Core Value

Multiple AI agents can collaboratively create dramatic narratives without losing context, conflicting on state, or overstepping their assigned roles.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Director Agent: orchestrates plot planning, arbitrates key decisions, verifies context consistency
- [ ] Actor Agents: play specific roles, generate dialogue based on character settings
- [ ] Shared Blackboard Service: central memory hub storing plot backbone and character state snapshots
- [ ] Message Routing Hub: dynamic message distribution with broadcast, peer-to-peer, and multicast modes
- [ ] Memory Management Engine: four-layer memory (core, scenario, semantic, procedural) with fold/unfold mechanisms
- [ ] Three-Layer Cognitive Boundary Control: input limits, capability closure, decision authority isolation
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
| Shared blackboard as central state store | Avoids full-prompt re-injection, solves context drift | — Pending |
| JSON message protocol for all inter-agent communication | Standardized, extensible, easy to route | — Pending |
| Four-layer memory architecture | Simulates human cognition, enables token-efficient context management | — Pending |
| YOLO execution mode for v1 | Speed of iteration critical for architecture validation | — Pending |

---
*Last updated: 2026-03-18 after initialization*
