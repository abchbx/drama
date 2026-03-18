# Domain Pitfalls: Multi-Agent LLM Drama Systems

**Domain:** Multi-agent LLM-based collaborative drama creation with shared blackboard architecture
**Researched:** 2026-03-18
**Confidence:** MEDIUM -- Domain knowledge from training data (through August 2025), applicable frameworks (AutoGen, CrewAI, LangGraph), and blackboard pattern literature. No live web verification possible at time of writing.
**Verification:** Web search tools were unavailable during this research cycle. Findings are grounded in documented patterns from AutoGen, CrewAI, LangChain multi-agent architectures, and academic multi-agent systems literature. Confidence ratings reflect this verification gap.

---

## Critical Pitfalls

Mistakes that cause rewrites, narrative incoherence, or complete system failure.

---

### Pitfall 1: Blackboard Content Explosion (Context Overflow Cascade)

**What goes wrong:** The shared blackboard accumulates content rapidly with multiple agents writing simultaneously. When total blackboard content exceeds the LLM context window, agents lose access to critical state -- character backstories, plot backbone, established scene details. The system degrades silently: agents continue producing output but with no awareness of what was already established.

**Why it happens:** Unlike a single-agent system where you control what enters context, a shared blackboard is written by many agents with no single owner enforcing size budget. Each agent wants to write its complete output. In drama systems, the problem is exacerbated because:
- Dialogue, scene descriptions, and character reactions all accumulate
- Each phase adds new content without removing old material
- No agent is explicitly responsible for blackboard size management

**Consequences:**
- Agents produce content that contradicts established plot (contextually unaware)
- Character dialogue loses consistency (actors forget their own character traits)
- Entire scenes become incoherent as agents write at cross-purposes
- System becomes unsalvageable without a hard reset

**Warning signs (detection):**
- Blackboard token count approaching 70% of target model context limit
- Actors producing dialogue that contradicts previously established scenes
- Director re-explaining plot details that were already on the blackboard
- Agent output quality degrading as sessions extend

**Prevention:**
- Hard token budget per blackboard layer (e.g., "core" layer max 2K tokens, "scenario" layer max 8K tokens)
- Implement memory folding BEFORE hitting limits, not as a reactive measure
- Design the Director agent's job to include explicit blackboard size management
- Set up automated token counting and alerting at 60% threshold

**Which phase addresses it:** Phase 3 (Memory Management Engine) and Phase 4 (Blackboard Service) -- size budgets and folding triggers must be designed in, not bolted on later.

---

### Pitfall 2: Director Monopolizing Creative Authority

**What goes wrong:** The Director agent, driven by a capable LLM, takes full creative control. It writes complete scene outlines, generates character dialogue, and issues detailed directives that leave nothing for Actor agents to do. The system looks multi-agent but behaves as a single-agent writer with extra steps.

**Why it happens:** LLM-based agents optimize for producing good output. When a Director has a capable model, it sees no reason to defer to less-capable Actor agents. The incentive structure is inverted: delegating produces worse results (in the Director's estimation) than doing everything itself. This is the single most common failure mode in real-world multi-agent LLM systems (documented extensively in AutoGen and CrewAI community discussions).

**Consequences:**
- Actor agents become dumb pipes that rubber-stamp Director decisions
- Loss of the creative surprise and emergent narrative that multi-agent collaboration should provide
- The system is architecturally multi-agent but functionally single-agent
- Actor agents may still generate "their" dialogue but it has no impact on the plot

**Warning signs:**
- Blackboards dominated by Director-written content; Actor contributions are minimal
- Director prompts containing "write the full scene" rather than "direct the actors"
- No substantive pushback or variation from Actor agents
- Phase output looks like it was written by one author

**Prevention:**
- Explicit Director scope constraints: Director plans, arbitrates, and verifies -- it does not write dialogue or scene descriptions for Actor characters
- Force Director to issue role-specific directives that only the relevant Actor can act on
- Evaluate the system on Actor agent contribution volume and diversity, not just final output quality
- Build in "Director cannot know" constraints -- certain creative decisions must come from actors

**Which phase addresses it:** Phase 2 (Director Agent) -- the Director's role contract must be defined with hard boundaries before implementation begins.

---

### Pitfall 3: Shared State Race Conditions (Overwrite Cascade)

**What goes wrong:** Multiple agents read and write to the blackboard concurrently. An Actor agent reads the current scene state, writes an update, but in between, another agent wrote a different update based on stale data. Changes are silently overwritten. The plot backbone develops invisible holes that no agent notices.

**Why it happens:** The blackboard is a shared mutable data store with no concurrency control. In a drama system, this is especially dangerous because:
- Scene sequences matter for narrative coherence
- Character state (emotions, relationships, knowledge) depends on correct ordering
- Multiple agents working on adjacent scenes can overwrite each other's context
- No transaction semantics means "last write wins" by default

**Consequences:**
- Established plot beats disappear silently from the blackboard
- Character A's reaction to Scene 3 gets overwritten by Character B writing Scene 4
- Actors act on contradictory world state without knowing it
- Debugging is extremely difficult because the overwrite is invisible

**Warning signs:**
- Scene sequences that jump or repeat without narrative transition
- Characters referencing events that don't appear in the blackboard history
- Agents asking "wait, what happened in scene X?" despite it being written
- Black box: blackboard state changes with no clear attribution

**Prevention:**
- Implement optimistic locking on blackboard writes (detect concurrent modifications)
- Sequence scene writes with explicit turn-taking or locking
- For v1, serialize writes (one agent writes at a time) even if reads are concurrent
- Store immutable snapshots rather than mutable updates when possible
- Audit log of all blackboard changes with agent attribution

**Which phase addresses it:** Phase 4 (Blackboard Service) -- concurrency control must be part of the core blackboard design, not added as an afterthought.

---

### Pitfall 4: Cognitive Boundary Layer Leakage

**What goes wrong:** The three-layer cognitive boundary control (input limits, capability closure, decision authority isolation) fails. Actor agents discover they can perform actions or access information outside their authorized scope. A Actor agent, asked to generate a line of dialogue, instead rewrites the plot backbone because its LLM saw no reason not to when given the context.

**Why it happens:** LLM-based agents do not natively respect role boundaries. They respond to the context they're given. If an Actor agent's input includes the full plot backbone, it will comment on and modify it -- because that is what capable LLMs do when given authority. The boundary system must enforce constraints programmatically, not rely on LLM self-restraint.

**Consequences:**
- Actor agents modifying the Director's plot backbone, causing conflicts
- Agents executing actions in unauthorized domains (e.g., a dialogue agent making plot decisions)
- System-level decisions being made by role-specific agents
- Cascading inconsistencies as unauthorized changes propagate

**Warning signs:**
- Actor agent outputs containing plot-level directives rather than character-level dialogue
- Black swan events that contradict Director's planned arc, introduced by Actor agents
- Agents referencing blackboard data outside their information scope
- Messages routed to the wrong agent layer (Actor-to-Director authority escalation)

**Prevention:**
- Hard enforcement at the blackboard write layer: reject entries that violate capability closure
- Strict input filtering: Actor agents see only their character card and relevant scene context, never the full plot backbone
- Separate blackboard namespaces per layer (core/authority vs. character/local)
- Director acts as final arbiter for cross-boundary disputes
- Test boundary violations explicitly during Phase 2 (adversarial role-play)

**Which phase addresses it:** Phase 1 (Cognitive Boundary Control) -- must be implemented with enforcement, not prompts alone.

---

### Pitfall 5: Premature Plot Lock-In

**What goes wrong:** The Director agent, during early planning, creates a detailed scene-by-scene outline. This outline is written to the blackboard as "locked" content. Actor agents are given roles in a predetermined story with no room for emergent creativity. The multi-agent drama system becomes a playback mechanism for a single-agent plan.

**Why it happens:** Natural human (and LLM) planning behavior is to resolve ambiguity early. A Director with context-window capacity will fill it with a detailed plan. This is especially tempting in drama creation where coherence seems to require detailed planning. But pre-planning the entire drama arc before Actor agents contribute is exactly backwards -- the value is in the collaboration.

**Consequences:**
- All dialogue becomes predictable; actors are "performing" a script, not creating
- Loss of surprise, tension, and emergent narrative
- Actor agents produce technically correct but creatively dead output
- The system is a single-agent writer with extra overhead

**Warning signs:**
- Director blackboard entries contain scene-level dialogue or character reactions before Actor input
- Plot backbone is 90%+ complete after Director planning phase with no Actor contributions
- Actor agents are asked to "fill in dialogue" for pre-planned scenes
- Phase 1 output is a near-complete script before any Actor phase begins

**Prevention:**
- Mandate "intentional holes" in the plot backbone: scenes marked "Actor discretion"
- Director's plan may specify beats and character arcs, but not dialogue or scene-level action
- Count plot elements introduced by Actor agents as a quality metric
- Force the Director to wait for Actor contributions before finalizing adjacent scenes

**Which phase addresses it:** Phase 2 (Director Agent) -- Director role contract must include "what not to decide."

---

## Moderate Pitfalls

Significant issues that degrade output quality or system reliability but do not cause complete failure.

---

### Pitfall 6: Message Routing Deadlock

**What goes wrong:** Agents waiting on messages that will never arrive. Actor A waits for Director's scene-start signal before acting. Director waits for Actor A's state summary before issuing the next scene directive. Neither proceeds. The system stalls indefinitely.

**Why it happens:** In a system with multiple agent types and interdependencies, circular wait conditions are easy to build. Without explicit timeout and fallback mechanisms, agents that don't receive expected messages simply wait. This is especially dangerous in drama systems where scene sequencing creates natural dependencies.

**Consequences:**
- System hangs with no progress and no error message
- Sessions timeout without producing any output
- Debugging is difficult because the deadlock is a race condition in timing
- Often only reproducible in specific timing conditions

**Warning signs:**
- No new blackboard entries despite all agents being active
- Log shows agents in "waiting" state
- System produces first scene then stalls
- Failure only appears under specific agent load or timing conditions

**Prevention:**
- Every message wait must have a timeout with a defined fallback behavior
- Director should have a "no-response fallback" that retries or proceeds unilaterally
- Build a state machine that enforces progress even when expected messages are missing
- Add heartbeat signals: agents periodically confirm they are alive even with no new content

**Which phase addresses it:** Phase 5 (Message Routing Hub) -- the routing hub must enforce progress guarantees, not just message delivery.

---

### Pitfall 7: LLM Hallucination Amplification Across Agent Chain

**What goes wrong:** Agent A generates a scene with a detail (a character's eye color, a setting element). Agent B reads this, incorporates it, and adds a new detail. By Agent D, the original hallucination has been elaborated into canon. The blackboard is full of confidently stated false details that all agents treat as ground truth.

**Why it happens:** LLMs are confident hallucination machines when given incomplete context. In a multi-agent chain, each agent inherits the context of its predecessors, including their hallucinations. Drama systems are particularly vulnerable because:
- Specific sensory details (sounds, smells, physical descriptions) are exactly what LLMs hallucinate most
- Once established in the blackboard, all agents treat blackboard content as authoritative
- No external ground truth exists to correct false details

**Consequences:**
- Script fills with implausible or contradictory sensory details
- Character descriptions become inconsistent across scenes
- Setting details drift as different agents "enhance" previous descriptions
- The script becomes increasingly surreal in ways that break immersion

**Warning signs:**
- Specific physical details appearing in early scenes that are never referenced in Director's character cards
- Setting descriptions that contradict the established scene environment
- Character traits that appeared in one agent's output but were never explicitly defined
- Output feels "AI-generated" in the negative sense (sensory hallucination artifacts)

**Prevention:**
- Require all character and setting details to be defined in the blackboard's core layer before any generation
- Director validates each scene against the established core facts (fact-checking role)
- Actor agents can only introduce details within their character's authorized scope
- Implement a "hallucination flag" in the blackboard: mark unverified details explicitly

**Which phase addresses it:** Phase 2 (Director Agent) and Phase 3 (Memory Management) -- validation against core facts should be a Director responsibility, and core layer immutability prevents hallucinated details from being promoted.

---

### Pitfall 8: Actor Character Voice Drift

**What goes wrong:** Actor agents generate dialogue that starts in-character but gradually drifts. A character defined as terse and sardonic begins generating flowery speeches. By scene 10, the character bears little resemblance to the original character card.

**Why it happens:** LLMs default to their own voice unless strongly prompted. A character card provided at the start of a session has diminishing influence as new context (the evolving plot, recent dialogue from other characters) accumulates. Without constant reinforcement, the LLM's base model personality reasserts itself.

**Consequences:**
- Characters become indistinguishable from each other in voice
- The drama loses character-specific tension and flavor
- Readers cannot predict how a character will respond based on established traits
- Character consistency becomes a quality bottleneck

**Warning signs:**
- Dialogue quality is high but character voice is uniform across all actors
- Actor outputs are technically excellent but feel interchangeable
- Director does not flag voice inconsistencies
- No character-specific language patterns (vocabulary, sentence length, rhetoric style) in output

**Prevention:**
- Store character voice as explicit style constraints in the character's blackboard layer, not just in a prompt card
- Director acts as a "character consistency auditor" -- explicitly flags dialogue that violates character voice
- Include "voice comparison" as a validation step: does this line sound like it could come from Character X or Character Y?
- Periodically re-ground Actor agents by re-reading their character card mid-session

**Which phase addresses it:** Phase 2 (Director Agent validation role) and Phase 3 (Memory layers should include character voice as persistent "procedural" memory).

---

### Pitfall 9: Flat Memory Architecture Ignoring Drama Hierarchy

**What goes wrong:** All blackboard content is treated with equal importance. A crucial plot twist and a minor stage direction compete for the same memory space. When folding happens, the system arbitrarily drops content based on recency rather than narrative importance. The climax of the drama is forgotten because it happened early.

**Why it happens:** Four-layer memory (core/scenario/semantic/procedural) is only valuable if each layer has a distinct eviction policy. If the blackboard implements the layers but doesn't enforce their separation -- for example, if "core" plot beats can be evicted when "scenario" content grows -- the hierarchy collapses into a flat list.

**Consequences:**
- Core plot beats lost during memory folding
- Climactic scenes forgotten because they happened early in a long session
- Character relationship changes (core layer) lost when semantic layer is folded
- System loses the "story so far" in a long performance

**Warning signs:**
- Late-session characters referencing plot events that no longer appear in context
- Actors asking about scenes that were established early but seem to have disappeared
- The blackboard summary doesn't include the drama's central conflict
- Memory folding produces visibly different stories in different runs of the same session

**Prevention:**
- Enforce hard layer boundaries: core layer content is NEVER evicted (only explicitly updated)
- Define explicit "what belongs in each layer" rules, not just conceptual ones
- The Director must explicitly promote scenario content to core layer when it becomes plot-critical
- Test folding by running long sessions (100+ scenes equivalent) and verifying core layer integrity

**Which phase addresses it:** Phase 3 (Memory Management Engine) -- layer eviction policies must be enforced programmatically, not left to implicit LLM behavior.

---

### Pitfall 10: YOLO Mode Persistence Into Production

**What goes wrong:** The project intentionally ships v1 in "YOLO execution mode" (speed of iteration critical for architecture validation). This mode -- with no error handling, no retry logic, no validation gates, no graceful degradation -- persists into later phases and eventually into a production-like state. The team has optimized for moving fast and never slowed down to fix the foundation.

**Why it happens:** "YOLO for v1" is a rational decision for architecture validation. The danger is that the shortcuts taken for speed become permanent. No one defines when "YOLO mode ends." The system grows around its unvalidated core. Eventually, the technical debt exceeds the value of the architecture and a rewrite is required.

**Consequences:**
- Any unexpected input causes silent failure or crash
- No recovery mechanism: a single malformed message halts the system
- Can't run in real environments with noisy inputs
- The "validated architecture" was never actually validated because error paths were never tested

**Warning signs:**
- Error handling code consists of `try/catch: pass` or `except: continue`
- No validation of incoming messages before processing
- System assumes all agents behave correctly (no adversarial robustness)
- Version 1.x is still labeled "YOLO" after more than one phase of development

**Prevention:**
- Define explicit phase gates: "this phase must have error handling before the next begins"
- Instrument YOLO mode: log what would have failed even if you don't handle it
- Set a specific milestone where YOLO mode ends and hardening begins
- Test the error paths even during YOLO mode -- know what breaks even if you don't fix it yet

**Which phase addresses it:** Phase 1 and ongoing -- must be a project discipline, not a technical constraint.

---

## Minor Pitfalls

Localized issues that degrade quality or require rework but are recoverable within a phase.

---

### Pitfall 11: Excessive Synchronization / Director Bottleneck

**What goes wrong:** The Director agent is consulted for every micro-decision. Actor agents wait for Director approval before each line of dialogue. The system becomes synchronous and slow, negating the parallelism benefits of multi-agent architecture.

**Prevention:** Distinguish between irreversible decisions (plot-level, must involve Director) and reversible ones (dialogue, can be changed later). Actors should act first and apologize later for reversible decisions.

---

### Pitfall 12: Under-Specifying the JSON Message Protocol

**What goes wrong:** The JSON message protocol is designed for simple text routing. It omits cognitive state, speaker emotional state, scene phase, and turn context. Agents spend significant bandwidth re-establishing context that a richer protocol would carry automatically.

**Prevention:** Design the protocol with extensibility in mind. Include a `cognitive_state` field even if initially unused. Define message types formally (using JSON Schema) before implementation.

---

### Pitfall 13: No Inter-Phase Validation Gates

**What goes wrong:** Content flows from planning to writing to editing without validation. Inconsistencies accumulate silently. A character whose name was changed in the planning phase still has their old name in dialogue generated in the writing phase.

**Prevention:** Every phase transition should include a validation pass. Director validates Actor output against the plot backbone. Even a simple automated check (character name consistency, timeline consistency) catches most issues.

---

### Pitfall 14: Implicit Agent Identity / No Audit Trail

**What goes wrong:** The blackboard stores content but doesn't clearly attribute it to the agent that produced it. When the system behaves unexpectedly, debugging requires reconstructing agent attribution from context. In a drama system with multiple contributing agents, this is especially painful.

**Prevention:** Every blackboard write should be attributed to the producing agent with a timestamp and message ID. The audit trail should be a first-class feature of the blackboard, not a debugging afterthought.

---

### Pitfall 15: Testing With Only Happy Paths

**What goes wrong:** The system is tested with well-behaved agents producing good output. Edge cases -- a Director that gives contradictory directives, an Actor that goes silent, a message that arrives out of order -- are never tested. Production deployment reveals all the untested paths.

**Prevention:** Include chaos testing in every phase. Specifically test: silent agents, contradictory directives, message reorder, blackboard write conflicts, and boundary violations. Document what breaks and make explicit decisions about acceptable failure modes.

---

## Phase-Specific Warnings

| Phase Topic | Most Likely Pitfall | Mitigation |
|-------------|---------------------|------------|
| Phase 1: Cognitive Boundaries | Boundary leakage via prompt injection | Hard enforcement at write layer, not LLM self-restraint |
| Phase 2: Director Agent | Monopolizing authority (Pitfall 2) | Explicit role contract; count Actor contributions as metric |
| Phase 2: Actor Agents | Voice drift (Pitfall 8) | Director as consistency auditor; persistent character voice constraints |
| Phase 3: Memory Management | Flat hierarchy collapse (Pitfall 9) | Programmatic layer enforcement; test long sessions for core integrity |
| Phase 4: Blackboard Service | Race conditions (Pitfall 3) | Optimistic locking from day 1; do not defer concurrency control |
| Phase 5: Message Routing | Deadlock (Pitfall 6) | Timeouts + fallback behaviors required before agents go live |
| Phase 6: Protocol Design | Under-specification (Pitfall 12) | JSON Schema before implementation; extensible cognitive_state field |
| All phases | YOLO persistence (Pitfall 10) | Explicit "YOLO ends here" milestone; instrument even if not handled |
| Cross-phase | Hallucination amplification (Pitfall 7) | Core layer as source of truth; Director fact-checks each scene |

---

## Sources

**Confidence levels reflect inability to verify via live web search at time of writing.**

- **MEDIUM**: AutoGen (Microsoft) multi-agent framework documentation and GitHub discussions -- documents Director/Worker role confusion as the primary failure mode in multi-agent LLM systems. https://github.com/microsoft/autogen
- **MEDIUM**: CrewAI community patterns and anti-patterns -- documents role boundary erosion in multi-actor agent systems. https://docs.crewai.com
- **MEDIUM**: LangGraph/LangChain multi-agent architecture guides -- documents state management failures in shared-memory multi-agent designs. https://python.langchain.com/docs/concepts/agentic-systems
- **MEDIUM**: Blackboard pattern (multi-agent systems, academic literature) -- decades of documented failures in shared-blackboard architectures around concurrency control and content management. Classic references: Corkill (1991), Jennings et al. (1996).
- **MEDIUM**: LLM context window management literature -- context overflow in long-horizon LLM tasks (documented in Anthropic and OpenAI system design guides).
- **LOW**: General community reports on multi-agent LLM production deployments (Twitter/X, HackerNews, Reddit r/LocalLLaMA) -- anecdotal but consistent pattern of the pitfalls documented above.
- **Note**: All findings should be verified against current (2026) documentation before Phase 2 implementation begins. The LLM agent landscape evolves rapidly.

---

## Validation Reminder

**This document was written without live web verification due to tool availability issues. The pitfalls are grounded in documented patterns from AutoGen, CrewAI, LangGraph, and blackboard architecture literature, but confidence is MEDIUM rather than HIGH. Before Phase 2 implementation, validate at minimum:**

1. Director role boundary patterns in current AutoGen/CrewAI documentation
2. Blackboard concurrency patterns in multi-agent systems literature
3. Context window management strategies for long-horizon drama generation
4. Cognitive boundary enforcement techniques in production multi-agent systems

**Gaps to address in phase-specific research:**
- Actual token budgets for target LLM models (what is the real context limit for the chosen model?)
- Specific failure modes observed in other drama/narrative LLM systems (if any exist)
- Current best practices for memory folding in multi-agent systems (Context7 search recommended)
