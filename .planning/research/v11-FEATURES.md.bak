# Feature Research

**Domain:** Multi-agent LLM-based collaborative drama creation with shared blackboard architecture
**Researched:** 2026-03-18
**Confidence:** MEDIUM -- Grounded in AutoGen, CrewAI, LangGraph multi-agent architecture patterns, blackboard system literature (Corkill 1991, Jennings et al. 1996), and LLM context management techniques. No live web verification performed at time of writing. Findings should be validated against current (2026) documentation before Phase 2 implementation begins.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or architecturally broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Shared Blackboard Service | The foundational memory substrate; without it, agents cannot share state and context drift is inevitable | HIGH | File-based or in-memory service; must support concurrent reads, serialized writes with optimistic locking; requires hard token budgets per layer from day one |
| Message Routing Hub | Users expect agents to actually communicate; without routing, messages go nowhere and the system is silent | MEDIUM | Must support broadcast, peer-to-peer, and multicast modes; requires timeout + fallback behaviors to prevent deadlock (Pitfall 6) |
| Actor Agents (dialogue generation) | The primary creative output unit; users expect each character to produce its own dialogue | MEDIUM | Each actor generates dialogue constrained by its character card; must not have access to the full plot backbone (boundary enforcement) |
| Director Agent (orchestration) | Users expect a conductor, not chaos; without a director the system has no narrative coherence | MEDIUM | Plans plot backbone, arbitrates key decisions, verifies context consistency; MUST NOT monopolize creative authority (Pitfall 2) |
| Four-Layer Memory Architecture (core/scenario/semantic/procedural) | Long sessions exceed context windows; users expect the system to remain coherent across many scenes | HIGH | Must enforce hard layer boundaries programmatically; core layer is NEVER evicted; Director promotes scenario content to core when plot-critical (Pitfall 9) |
| Cognitive Boundary Control (input limits, capability closure, decision authority isolation) | Users expect agents to stay in their lane; without boundaries, actors modify plot backbone and the system collapses into single-agent behavior | HIGH | Hard enforcement at blackboard write layer, not LLM self-restraint; Actor blackboard namespaces must be isolated from Director namespaces (Pitfall 4) |
| JSON Message Protocol with speaker identification | Standardized inter-agent communication; users expect agents to receive properly addressed messages with attribution | LOW | Include extensible `cognitive_state` field even if initially unused; define message types formally with JSON Schema before implementation (Pitfall 12) |
| Director arbitration and verification | Users expect an authority that resolves conflicts and validates consistency; without it, agent outputs contradict each other | MEDIUM | Director must fact-check scenes against the established core layer; validate character name consistency, timeline, character voice across all outputs |
| Actor character voice consistency | Users expect each character to sound distinct; without voice enforcement, all actors converge to the LLM's base voice (Pitfall 8) | MEDIUM | Character voice stored as explicit style constraints in the character's blackboard layer; Director acts as character consistency auditor |

---

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required by a naive user, but valuable for actual multi-agent creative collaboration.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Intentional Plot Holes (Actor Discretion Scenes) | Prevents the system from becoming a single-agent writer playing back a pre-planned script; enables emergent narrative that is the core value of multi-agent collaboration | MEDIUM | Director MUST leave "intentional holes" in the plot backbone; Director may specify beats and character arcs but NOT dialogue or scene-level action for Actor-discretion scenes; count Actor-introduced plot elements as a quality metric (Pitfall 5) |
| Three-Layer Cognitive Boundary Enforcement | Prevents the most common multi-agent LLM failure mode: agents overstepping their assigned roles (Pitfall 4); this is what makes the system genuinely multi-agent rather than a single-agent facade | HIGH | Input filtering: Actor agents see only their character card and relevant scene context; write-layer enforcement rejects entries violating capability closure; Director adjudicates cross-boundary disputes |
| Hierarchical Memory Folding with Narrative Priority | Prevents context overflow cascade (Pitfall 1) while preserving climactic scenes that occurred early in a long session; no other drama system handles this correctly | HIGH | Layer eviction policies enforced programmatically, not left to implicit LLM behavior; core layer NEVER evicted; Director explicitly promotes scenario content to core layer; automated token counting with alert at 60% threshold |
| Bidirectional Sync Flow (vertical + horizontal + sync) | Unique architecture that mirrors real-world theater production: Director controls vertically (initiates scenes), Actors collaborate horizontally (respond to each other), periodic sync keeps all agents grounded | MEDIUM | All agents periodically submit state summaries to shared blackboard and pull latest global views; this decouples agent internal state from global plot progression |
| Hallucination Flag System with Core-Layer Validation | Prevents hallucination amplification across the agent chain (Pitfall 7); unverified details are marked explicitly rather than being silently treated as ground truth | MEDIUM | All character and setting details must be defined in the core layer before any generation; Director fact-checks each scene against core facts; Actor agents can only introduce details within their character's authorized scope |
| Optimistic Locking with Audit Trail | Prevents shared state race conditions (Pitfall 3); every blackboard write attributed to the producing agent with timestamp and message ID; scene sequences remain coherent and verifiable | MEDIUM | Detect concurrent modifications; for v1, serialize writes even if reads are concurrent; audit log as first-class feature, not debugging afterthought |
| Dynamic Communication Protocol with Cognitive State | Rich message format that carries emotional state, scene phase, and turn context; reduces bandwidth spent re-establishing context on every message | LOW | Extensible `cognitive_state` field in every message; formal JSON Schema definition before implementation; future-proofs for emotional intelligence and scene dynamics |

---

## Feature Dependencies

```
[Cognitive Boundary Control]
    └──requires──> [Shared Blackboard Service]

[Shared Blackboard Service]
    └──requires──> [Message Routing Hub]

[Actor Agents]
    └──requires──> [Cognitive Boundary Control]
    └──requires──> [Shared Blackboard Service]
    └──requires──> [Message Routing Hub]

[Director Agent]
    └──requires──> [Shared Blackboard Service]
    └──requires──> [Message Routing Hub]

[Memory Management Engine]
    └──requires──> [Shared Blackboard Service]
    └──enhances──> [Actor Agents]         (memory folding keeps actors within context)
    └──enhances──> [Director Agent]       (scenario summaries keep director grounded)

[Dynamic Communication Protocol]
    └──requires──> [Message Routing Hub]  (protocol rides on the routing infrastructure)
    └──enhances──> [Actor Agents]         (rich cognitive_state reduces re-grounding overhead)
    └──enhances──> [Director Agent]       (speaker identification enables attribution)

[Actor Character Voice Consistency]
    └──requires──> [Director Agent]        (Director acts as character consistency auditor)
    └──requires──> [Memory Management Engine]  (character voice stored as persistent procedural memory)

[Intentional Plot Holes]
    └──requires──> [Director Agent]        (Director must be disciplined to leave holes)
    └──conflicts──> [Director Monopolizing Authority]  (anti-pattern that plot holes specifically prevent)
```

### Dependency Notes

- **Cognitive Boundary Control requires Shared Blackboard Service:** Boundaries are enforced at the blackboard write layer; no blackboard means no enforcement point.
- **Actor Agents require Cognitive Boundary Control:** Actors must be isolated from the plot backbone before they exist; without boundaries, actors modify unauthorized state (Pitfall 4).
- **Memory Management Engine requires Shared Blackboard Service:** Memory folding operates on blackboard content; the engine manages what gets stored, evicted, and promoted.
- **Director Agent requires Memory Management Engine:** The Director must be able to promote scenario content to core layer; without promotion, core layer has no mechanism to capture evolving plot-critical events.
- **Actor Character Voice Consistency requires Director Agent:** The Director is the consistency auditor; voice comparison and violation flagging is a Director responsibility.
- **Intentional Plot Holes conflicts with Director Monopolizing Authority:** These are inverses of each other; enforcing plot holes directly prevents the Director authority anti-pattern.
- **Dynamic Communication Protocol enhances Actor Agents and Director Agent:** Rich cognitive state in messages reduces the overhead of re-grounding agents on every turn, especially important for long sessions.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the multi-agent drama concept.

- [ ] **Shared Blackboard Service (basic)** — File-based blackboard with serialized writes, hard token budgets per layer, and audit trail. Concurrency control via optimistic locking. This is the foundational substrate; everything else depends on it.
- [ ] **Cognitive Boundary Control (enforced)** — Hard write-layer enforcement preventing Actor agents from writing to Director namespaces and vice versa. Input filtering: Actor agents receive only their character card and current scene context. This prevents the single most catastrophic failure mode (Pitfall 4) and must exist before Actor agents can safely run.
- [ ] **Message Routing Hub (basic)** — JSON message delivery with broadcast and peer-to-peer modes, timeout + fallback behaviors for deadlock prevention. Simple hub-and-spoke topology for v1.
- [ ] **Director Agent (orchestration + verification)** — Initializes plot backbone, writes to blackboard, triggers scene start signals. Explicit role contract: Director plans, arbitrates, verifies — it does NOT write dialogue or scene descriptions for Actor characters. Includes fact-checking against core layer.
- [ ] **Actor Agents (dialogue generation)** — Each Actor generates dialogue constrained by its character card. Actors write only to their character blackboard namespace. Character voice enforced via explicit style constraints stored in procedural memory layer.

### Add After Validation (v1.x)

Features to add once core architecture is validated and stable.

- [ ] **Memory Management Engine (full four-layer folding)** — Automated token counting with 60% threshold alerts. Layer eviction policies enforced programmatically. Director promotion mechanism for scenario-to-core content. *Trigger: running sessions longer than ~20 scenes reveals context pressure.*
- [ ] **Dynamic Communication Protocol (full)** — JSON Schema formalization of all message types. Extensible `cognitive_state` field including emotional state, scene phase, and turn context. *Trigger: agents spending excessive bandwidth re-establishing context on each message.*
- [ ] **Intentional Plot Holes enforcement** — Automated detection of "Actor discretion" scene markers. Quality metric tracking Actor-introduced plot elements vs. Director-authored content. *Trigger: Director producing >80% of plot backbone content.*
- [ ] **Hallucination Flag System** — Mark unverified details in blackboard explicitly. Director fact-check pass at each scene boundary. *Trigger: sensory details appearing in output that contradict established core layer facts.*
- [ ] **Actor Character Voice Auditing** — Periodic voice comparison between current dialogue and established character card. Director flags violations. *Trigger: character dialogue becoming indistinguishable across different actors.*

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Multicast routing for ensemble scenes** — Multiple actors responding to a single scene trigger, with conflict detection and resolution for overlapping character actions.
- [ ] **Persistent character memory across sessions** — Character state surviving between drama sessions, enabling recurring characters with accumulated history. Explicitly out of scope for v1 (see PROJECT.md).
- [ ] **Real-time human-in-the-loop script editing** — Human director intervening mid-scene to redirect plot. Explicitly out of scope (see PROJECT.md).
- [ ] **Visual rendering and animation** — Rendering script output as animated performance. Explicitly out of scope (see PROJECT.md).
- [ ] **Natural language speech synthesis** — Converting character dialogue to spoken output. Explicitly out of scope (see PROJECT.md).
- [ ] **Distributed blackboard service** — Horizontal scaling of blackboard across multiple machines for higher-throughput sessions. Relevant only if single-machine throughput becomes a bottleneck.
- [ ] **Adversarial robustness testing framework** — Automated chaos testing of silent agents, contradictory directives, message reorder, write conflicts, and boundary violations. Critical for production hardening but not for initial architecture validation.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Shared Blackboard Service | HIGH | HIGH | P1 |
| Cognitive Boundary Control | HIGH | HIGH | P1 |
| Director Agent (orchestration) | HIGH | MEDIUM | P1 |
| Actor Agents (dialogue generation) | HIGH | MEDIUM | P1 |
| Message Routing Hub | HIGH | MEDIUM | P1 |
| Director arbitration + verification | HIGH | MEDIUM | P1 |
| Actor character voice consistency | HIGH | MEDIUM | P2 |
| Optimistic locking + audit trail | HIGH | MEDIUM | P2 |
| Dynamic Communication Protocol (full) | MEDIUM | LOW | P2 |
| Memory Management Engine (full folding) | HIGH | HIGH | P2 |
| Hallucination flag system | MEDIUM | MEDIUM | P2 |
| Intentional plot holes enforcement | HIGH | MEDIUM | P2 |
| Multicast routing (ensemble scenes) | MEDIUM | MEDIUM | P3 |
| Persistent character memory | MEDIUM | HIGH | P3 |
| Distributed blackboard service | LOW | HIGH | P3 |
| Adversarial robustness framework | MEDIUM | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch (v1 MVP)
- P2: Should have, add when core is validated
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | AutoGen | CrewAI | LangGraph | Our Approach |
|---------|---------|--------|-----------|--------------|
| Shared state / blackboard | Session-level shared state via unified LLM context; no persistent blackboard with namespaces; vulnerable to context overflow in long sessions | Centralized crew memory as a shared dictionary; no layer hierarchy; no token budget enforcement; flat memory collapses in long tasks | Graph-based state passed through nodes; no persistent blackboard between nodes; state is ephemeral per graph execution | Shared blackboard with hard token budgets per layer, optimistic locking, and layer-specific eviction policies; first-class audit trail with agent attribution |
| Role boundary enforcement | Soft enforcement via system prompts; agents can and do overstep; documented as primary failure mode | Role definitions as text in prompts; boundary erosion is a known issue; requires developer discipline | Boundary is implicit in graph structure; enforced by developer, not the system | Hard enforcement at blackboard write layer; separate namespaces per layer; Director adjudicates cross-boundary disputes; boundary violations are programmatically rejected, not prompted |
| Memory folding / context management | No native folding; relies on model's context window; long sessions degrade silently | No native folding; long-term memory is a retrieval plugin, not a folding system | No native folding; state is passed through the graph; context overflow is the developer's problem | Four-layer memory (core/scenario/semantic/procedural) with programmatic layer boundaries; core layer NEVER evicted; automated token counting and folding triggers at 60% threshold |
| Director / orchestrator authority | Orchestrator can be too directive; AutoGen docs explicitly warn about this | Crew chief can monopolize; crewAI community reports this pattern frequently | Depends on graph design; poorly designed graphs create implicit monopolies | Explicit role contract: Director plans, arbitrates, verifies — it does NOT write dialogue or scene descriptions for Actor characters; "intentional holes" are a required part of the plot backbone |
| Multi-agent communication | Conversational: agents talk to each other directly; no message routing hub; implicit coupling | Task-passing model: tasks are assigned, not messages exchanged; no formal protocol | Edge-based: edges define communication; flexible but no standardized protocol | Message Routing Hub with broadcast, peer-to-peer, and multicast modes; Dynamic Communication Protocol with JSON Schema; standardized cognitive_state field; deadlock prevention via timeouts + fallback behaviors |
| Emergent narrative | Not a design goal; AutoGen optimizes for task completion | Not a design goal; CrewAI optimizes for task decomposition and execution | Not a design goal; LangGraph optimizes for workflow execution | Core design goal; "intentional plot holes" force Actor agents to introduce creative content; quality metric tracks Actor-introduced plot elements |
| Actor character voice | No concept; agents produce output, not character-consistent dialogue | Roles have descriptions, not voices; agents are interchangeable in voice | Agents are nodes; no character voice concept | Character voice stored as explicit style constraints in procedural memory layer; Director audits dialogue against character card; voice comparison is a validation step |

---

## Sources

- **MEDIUM**: AutoGen (Microsoft) multi-agent framework documentation and GitHub discussions -- documents Director/Worker role confusion, context overflow, and boundary erosion as primary failure modes. https://github.com/microsoft/autogen
- **MEDIUM**: CrewAI community patterns and anti-patterns -- documents role boundary erosion and authority monopolization in multi-actor agent systems. https://docs.crewai.com
- **MEDIUM**: LangGraph/LangChain multi-agent architecture guides -- documents state management failures in shared-memory multi-agent designs. https://python.langchain.com/docs/concepts/agentic-systems
- **MEDIUM**: Blackboard pattern (multi-agent systems, academic literature) -- decades of documented failures around concurrency control and content management. Classic references: Corkill (1991), Jennings et al. (1996).
- **MEDIUM**: LLM context window management literature -- context overflow in long-horizon LLM tasks (Anthropic and OpenAI system design guides).
- **MEDIUM**: PITFALLS.md for this project -- domain-specific pitfalls documented for the multi-agent drama creation domain, grounded in the same literature base.
- **Note**: All findings should be verified against current (2026) documentation before Phase 2 implementation begins. The LLM agent landscape evolves rapidly; confidence is MEDIUM rather than HIGH due to inability to perform live web verification at time of writing.

---
*Feature research for: Multi-agent LLM-based collaborative drama creation with shared blackboard architecture*
*Researched: 2026-03-18*
