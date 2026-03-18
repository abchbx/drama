# Architecture Research

**Domain:** Multi-agent LLM-based collaborative drama creation with shared blackboard architecture
**Researched:** 2026-03-18
**Confidence:** MEDIUM

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL LLM PROVIDERS                         │
│         (OpenAI GPT, Anthropic Claude, OpenAI-Compatible)        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐  Director  ┌─────────────────────────────────┐  │
│  │  Director   │────────────│     Shared Blackboard Service     │  │
│  │  Agent      │   plans,   │  ┌─────────────────────────────┐│  │
│  │  (LLM)      │  arbitrates│  │  CORE LAYER  (max 2K tokens) ││  │
│  └──────┬──────┘  verifies │  │  plot backbone, characters,   ││  │
│         │                  │  │  core facts — NEVER evicted   ││  │
│         │                  │  ├─────────────────────────────┤│  │
│         │                  │  │  SCENARIO LAYER (max 8K)    ││  │
│         │                  │  │  scene state, active events  ││  │
│         │                  │  ├─────────────────────────────┤│  │
│         │                  │  │  SEMANTIC LAYER (foldable)  ││  │
│         │                  │  │  summaries, character state  ││  │
│         │                  │  ├─────────────────────────────┤│  │
│         │                  │  │  PROCEDURAL LAYER (foldable)││  │
│         │                  │  │  character voice, protocols ││  │
│         │                  │  └─────────────────────────────┘│  │
│         │                  └───────────────┬──────────────────┘  │
│         │                                  │                      │
│         │           ┌─────────────────────┼─────────────────┐    │
│         │           │                     │                  │    │
│         ▼           ▼                     ▼                  ▼    │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐        │
│  │  Actor A  │ │  Actor B  │ │  Actor C  │ │  Actor N  │        │
│  │  (LLM)    │ │  (LLM)    │ │  (LLM)    │ │  (LLM)    │        │
│  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘        │
│        │             │             │             │                │
│        └─────────────┴─────────────┴─────────────┘                │
│                              │                                    │
│                    ┌─────────▼──────────┐                        │
│                    │ Message Routing Hub │                         │
│                    │ (Socket.IO Server)  │                        │
│                    │ broadcast / p2p /   │                        │
│                    │ multicast + timeout │                        │
│                    └─────────────────────┘                        │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│                      Cognitive Boundary Controller                  │
│   Input Filter  │  Capability Closure  │  Decision Authority       │
└──────────────────────────────────────────────────────────────────┘
```

### Three Data Flows

**Vertical Control Flow** (top-down):
```
Director LLM → writes plot backbone → Blackboard → scene_start signal → Actors
```
**Horizontal Perception Flow** (peer-to-peer):
```
Actor A writes dialogue → Blackboard update → Actor B receives notification → reads context → responds
```
**Bidirectional Sync Flow** (periodic):
```
All Agents → submit_state_summary() → Blackboard
All Agents → pull_latest_global_view() → Blackboard
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| Director Agent | Plot planning, arbitration, verification, blackboard size management | LLM process + structured output parsing |
| Actor Agents | Dialogue generation within character constraints, character voice maintenance | LLM process + character card grounding |
| Shared Blackboard Service | Central state persistence, layer management, token budgets, locking | Express.js REST + in-memory store + JSON file snapshots |
| Message Routing Hub | Real-time message delivery, broadcast/p2p/multicast, heartbeat, timeout/fallback | Socket.IO server with rooms |
| Cognitive Boundary Controller | Input filtering, write-layer enforcement, namespace isolation | Middleware on blackboard write path |
| Memory Management Engine | Layer folding, token counting, eviction policy enforcement | Standalone service + blackboard layer integration |
| LLM Provider Abstraction | Unified interface for OpenAI/Anthropic/custom APIs | Adapter pattern with provider-specific retry logic |
| Audit Log | Every write attributed, timestamps, message IDs | Append-only log file + in-memory ring buffer |

---

## Recommended Project Structure

```
drama/
├── src/
│   ├── agents/
│   │   ├── base/           # BaseAgent abstract class, shared LLM client setup
│   │   ├── director/        # Director agent implementation + role contract
│   │   └── actors/          # Actor agent implementation + character card management
│   ├── blackboard/
│   │   ├── layers/          # Layer definitions (core, scenario, semantic, procedural)
│   │   ├── concurrency/     # Optimistic locking, version vectors, write queue
│   │   ├── memoryFolding/   # Fold/unfold logic, token counting
│   │   ├── accessControl/   # Namespace isolation, capability closure enforcement
│   │   ├── audit/           # Audit log writer, log entry schema
│   │   └── persistence/     # JSON file snapshots, in-memory store
│   ├── messaging/
│   │   ├── protocol/        # JSON message schema (Zod), message types
│   │   ├── routing/         # Socket.IO rooms, broadcast/p2p/multicast logic
│   │   └── heartbeat/       # Heartbeat signals, timeout wrappers
│   ├── llm/
│   │   └── providers/       # openai.ts, anthropic.ts, ollama.ts adapters
│   ├── cognitiveBoundary/
│   │   ├── inputFilter.ts   # Per-agent input scope restriction
│   │   ├── capabilityClosure.ts  # Write-layer enforcement
│   │   └── authorityIsolation.ts  # Decision authority boundaries
│   ├── drama/
│   │   ├── plotBackbone.ts  # Plot backbone data structures
│   │   ├── scene.ts         # Scene management
│   │   └── characterCard.ts # Character card schema
│   └── index.ts             # Entry point — spawns Director + Actors
├── tests/
│   ├── integration/         # End-to-end drama session tests
│   ├── chaos/               # Boundary violations, silent agents, deadlocks
│   └── unit/                # Layer folding, message routing, locking
├── .env.example             # API keys, ports, token budgets
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Structure Rationale

- **`agents/base/`**: All agent types inherit from `BaseAgent` — shared LLM client, message sending, blackboard read. Keeps Director and Actor implementations DRY.
- **`blackboard/`**: One directory per concern (layers, concurrency, folding, access, audit, persistence). Clear ownership, easy to test each in isolation.
- **`cognitiveBoundary/`**: Separate from `blackboard/` because boundary enforcement is policy, not storage. This separation makes it testable as its own subsystem.
- **`llm/providers/`**: Adapter pattern means swapping from OpenAI to Claude to Ollama requires only a new file in this directory.
- **`tests/chaos/`**: Dedicated chaos testing directory — makes it explicit that adversarial tests are part of the QA culture (Pitfall 15 mitigation).

---

## Architectural Patterns

### Pattern 1: Blackboard Pattern with Four-Layer Hierarchy

**What:** Shared mutable state store with four distinct layers, each with its own eviction policy.

**When to use:** Default for all inter-agent state sharing.

**Trade-offs:**
- Pros: Decouples agents from each other's internal context; prevents full-prompt re-injection; enables token-efficient long sessions
- Cons: Requires explicit concurrency control; layer boundary enforcement must be programmatic not conventional

**Example:**
```typescript
interface BlackboardEntry {
  layer: 'core' | 'scenario' | 'semantic' | 'procedural';
  content: string;
  tokenCount: number;
  authorAgentId: string;
  messageId: string;
  timestamp: number;
  version: number;
  hallucinationFlag?: boolean;
}

// Core layer: NEVER evicted, only explicitly updated
// Scenario layer: evicted when semantic layer folds
// Semantic layer: folded when >8K tokens; summary replaces entries
// Procedural layer: folded when >4K tokens; character voice constraints preserved
```

### Pattern 2: Cognitive Boundary Enforcement via Write-Layer Gating

**What:** Every blackboard write is intercepted by a boundary controller that enforces namespace isolation and capability closure before the write is accepted.

**When to use:** Every agent write operation — non-negotiable.

**Trade-offs:**
- Pros: Hard enforcement vs. LLM self-restraint; prevents boundary leakage (Pitfall 4); makes violations testable
- Cons: Adds latency to every write; requires careful namespace design upfront

**Example:**
```typescript
function canWrite(agent: Agent, entry: BlackboardEntry): boolean {
  const boundary = BOUNDARY_CONFIG[agent.role]; // e.g., director vs actor

  // Capability closure: actors cannot write to core layer
  if (entry.layer === 'core' && agent.role !== 'director') return false;

  // Namespace isolation: actors can only read their own character + current scene
  if (agent.role === 'actor') {
    const allowedLayers = ['semantic', 'procedural'];
    if (!allowedLayers.includes(entry.layer)) return false;
  }

  return true;
}
```

### Pattern 3: Message Routing with Delivery Guarantees

**What:** Socket.IO rooms implement broadcast, peer-to-peer, and multicast routing with explicit timeout/fallback for every wait operation.

**When to use:** All inter-agent communication.

**Trade-offs:**
- Pros: Built-in heartbeat prevents silent deadlock; rooms map cleanly to routing modes; reconnect on network drop
- Cons: Socket.IO overhead vs. raw WebSocket; requires server running; rooms are in-memory (no persistence)

**Example:**
```typescript
// Director broadcasts scene_start to all actors
io.to('scene-' + sceneId).emit('scene_start', {
  messageId: uuid(),
  speaker: 'director',
  sceneId,
  sceneContext: sceneLayerSnapshot,
  cognitiveState: { phase: 'scene_start', emotionalTone: 'neutral' },
  timeout: ms('30s'),
});

// Actor waits for response with explicit timeout
const response = await Promise.race([
  waitForMessage(socket, 'director_ack'),
  new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms('30s')))
]);
```

### Pattern 4: Optimistic Locking with Version Vectors

**What:** Every blackboard write includes a version number. Concurrent writes are detected and the writer must re-read and retry.

**When to use:** Blackboard write operations (especially scenario and core layers).

**Trade-offs:**
- Pros: Detects race conditions without requiring a lock manager; scene sequence integrity preserved
- Cons: Retry overhead under high contention; requires clients to implement retry logic

**Example:**
```typescript
async function writeWithOptimisticLock(
  entry: BlackboardEntry,
  expectedVersion: number
): Promise<WriteResult> {
  const current = await blackboard.getVersion(entry.layer);

  if (current.version !== expectedVersion) {
    return { success: false, conflict: true, currentVersion: current.version };
  }

  return blackboard.commit({ ...entry, version: current.version + 1 });
}
```

---

## Data Flow

### Vertical Control Flow (Director → Blackboard → Actors)

```
1. Director reads current blackboard state (core + scenario layers)
2. Director generates plot backbone update OR scene plan
3. Director writes to blackboard core/scenario layer (with optimistic lock)
4. Director emits 'scene_start' signal via Socket.IO (broadcast to relevant actors)
5. Actors receive signal, read their scoped blackboard view (character card + scene)
6. Actors generate dialogue, write to semantic layer
7. Director reads actor outputs, verifies consistency against core layer
8. Director emits 'scene_end' or 'continue' signal
```

### Horizontal Perception Flow (Actor → Actor)

```
1. Actor A writes dialogue to semantic layer
2. Blackboard emits 'updated' event via Socket.IO to all connected agents
3. Actor B receives notification, reads new semantic layer content
4. Actor B generates response constrained by their character card + Actor A's dialogue
5. Actor B writes response to semantic layer
6. Repeat until scene concludes
```

### Bidirectional Sync Flow (Periodic)

```
Every N messages OR every scene transition:
1. All agents call submit_state_summary() → writes summary to semantic layer
2. All agents call pull_latest_global_view() → reads all layers within their scope
3. Agents update internal mental model
4. Director checks for context drift (actor summaries vs. core layer consistency)
```

---

## Concurrency Control

The shared blackboard is the single source of truth for all agent state. Without explicit concurrency control, race conditions silently destroy narrative coherence.

### Strategy: Version Vectors + Serialized Write Queue

```
[Agent A] ──write(v3)──┐
                        ├──→ [Conflict Detection] ──→ [Blackboard Commit]
[Agent B] ──write(v3)──┘         │
                                 ▼
                    "Version mismatch: expected 3, got 3"
                    → Agent A + Agent B must re-read and retry
```

### Rules
1. **Reads are concurrent** — all agents can read simultaneously
2. **Writes are serialized** — one agent writes at a time per layer
3. **Optimistic locking** — writer declares expected version; if mismatch, retry
4. **Immutable committed snapshots** — once a scene is committed to core layer, it is immutable
5. **Audit log is append-only** — every write operation is logged with full attribution

---

## LLM Integration

### Provider Abstraction

```typescript
interface LLMProvider {
  complete(prompt: string, options: LLMOptions): Promise<LLMResponse>;
  stream(prompt: string, options: LLMOptions): AsyncIterable<LLMResponse>;
}

// Usage in Director: this.llm.complete(directorPrompt, { model: 'gpt-4o' })
// Usage in Actors: this.llm.complete(actorPrompt, { model: 'claude-sonnet-4-20250514' })
```

### Token Budget Integration

```typescript
// Before every blackboard write:
const tokenCount = await countTokens(entry.content);
if (tokenCount > LAYER_BUDGETS[entry.layer]) {
  throw new Error(`Layer ${entry.layer} budget exceeded: ${tokenCount} > ${LAYER_BUDGETS[entry.layer]}`);
}
```

### Per-Role Prompt Construction

```typescript
// Director prompt: includes full blackboard access + arbitration role contract
// Actor prompt: includes ONLY character card + current scene context
// Prompt construction enforces cognitive boundary at generation time
```

---

## Scaling Considerations

| Scale | Architecture |
|-------|-------------|
| 0–1 session | Single Node.js process, in-memory blackboard, direct LLM API calls |
| 1–10 sessions | In-memory blackboard with JSON snapshots; add process monitoring |
| 10–50 sessions | Redis-backed blackboard for persistence + atomic operations; Redis Streams for message delivery |
| 50–200 sessions | Horizontal actor scaling; dedicated Director per session; load balancer for Socket.IO |
| 200+ sessions | Kubernetes pods per session; Redis Cluster; CDN for static assets |

### Scaling Priorities

1. **First bottleneck:** Blackboard write serialization under concurrent actor load → Redis atomic ops
2. **Second bottleneck:** LLM API rate limits → request queuing + provider rotation

---

## Anti-Patterns

### Anti-Pattern 1: Full-Prompt Re-Injection

**What people do:** Pass the entire blackboard content into every agent's LLM prompt on every turn.

**Why it's wrong:** Causes context overflow (Pitfall 1); agents spend tokens re-reading content they already know; billing waste.

**Do this instead:** Agents request scoped reads from the blackboard. Only the Director sees the full core layer.

### Anti-Pattern 2: Soft Boundary Enforcement (LLM Prompts Only)

**What people do:** Rely on "you are an Actor agent, do not modify the plot backbone" in the prompt.

**Why it's wrong:** LLMs optimize for producing good output; they will overstep when given full context (Pitfall 4). The boundary must be enforced at the write layer.

**Do this instead:** Hard enforcement: the blackboard rejects actor writes to the core layer regardless of what the LLM was told.

### Anti-Pattern 3: Complete Plot Pre-Planning

**What people do:** Director writes a full scene-by-scene script before any Actor contributes.

**Why it's wrong:** The system becomes a single-agent writer with extra steps; all creative value is lost (Pitfall 5).

**Do this instead:** Director specifies beats and character arcs; "intentional holes" are mandated for Actor discretion.

### Anti-Pattern 4: YOLO Mode Persistence

**What people do:** Ship v1 without error handling, logging, or retry logic because "it's just for prototyping."

**Why it's wrong:** The system grows around its unvalidated foundation; technical debt compounds; "YOLO" never ends (Pitfall 10).

**Do this instead:** Define an explicit "YOLO ends here" milestone. Instrument YOLO mode from day one (log what would fail even if you don't handle it yet).

---

## Integration Points

### External Services

| Service | Integration | Notes |
|---------|-------------|-------|
| OpenAI API | `openai` SDK via `LLMProvider` adapter | Streaming, retry, rate limit handling |
| Anthropic API | `anthropic` SDK via `LLMProvider` adapter | Streaming, alpha/beta SDK stability risk |
| Ollama / LM Studio | OpenAI-compatible API endpoint via `openai` SDK | `baseURL` override; no streaming guarantees |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Agent ↔ Blackboard | REST API (HTTP) + WebSocket events | Agents never access blackboard directly; all access via API |
| Agent ↔ Message Hub | Socket.IO events | Hub is the network layer; blackboard is the state layer |
| Director ↔ Actors | Messages via Hub + shared blackboard reads | No direct peer-to-peer LLM calls |
| CognitiveBoundary ↔ Blackboard | Middleware intercept | Boundary controller is a middleware wrapping blackboard write path |

---

## Pitfall Coverage Summary

| Pitfall | Architecture Mitigation |
|---------|------------------------|
| 1. Blackboard Content Explosion | Hard token budgets per layer + automated folding triggers |
| 2. Director Monopolizing Authority | Explicit role contract in Director; "intentional holes" mandated |
| 3. Shared State Race Conditions | Optimistic locking with version vectors + serialized write queue |
| 4. Cognitive Boundary Leakage | Hard enforcement at blackboard write layer + strict input filtering |
| 5. Premature Plot Lock-In | Intentional holes in plot backbone mandated by Director role contract |
| 6. Message Routing Deadlock | Timeout + fallback on every wait; heartbeat signals; Director fallback |
| 7. Hallucination Amplification | Core layer as source of truth; Director fact-checks each scene |
| 8. Actor Character Voice Drift | Character voice in procedural layer; Director as consistency auditor |
| 9. Flat Memory Architecture | Programmatic layer enforcement; core layer NEVER evicted |
| 10. YOLO Mode Persistence | Explicit "YOLO ends here" milestone; phase gates for error handling |
| 11. Excessive Synchronization | Irreversible vs. reversible decision distinction; actors act first |
| 12. Under-Specifying JSON Protocol | JSON Schema before implementation; extensible cognitive_state field |
| 13. No Inter-Phase Validation Gates | Director validates Actor output at every phase transition |
| 14. Implicit Agent Identity | Audit log is first-class; every write attributed with agent ID + timestamp |
| 15. Happy-Path-Only Testing | Dedicated chaos/ test directory; adversarial tests required |

---

## Sources

- **MEDIUM**: AutoGen (Microsoft) multi-agent framework -- Director/Worker role confusion as primary failure mode. https://github.com/microsoft/autogen
- **MEDIUM**: CrewAI community patterns -- role boundary erosion in multi-actor systems. https://docs.crewai.com
- **MEDIUM**: LangGraph/LangChain multi-agent architecture guides -- state management failures. https://python.langchain.com/docs/concepts/agentic-systems
- **MEDIUM**: Blackboard pattern (Corkill 1991, Jennings et al. 1996) -- concurrency control failures in shared-blackboard architectures.
- **MEDIUM**: Socket.IO documentation -- rooms, namespaces, heartbeat for multi-agent routing. https://socket.io/docs/v4
- **Note**: Verify all SDK versions and Node.js compatibility against current documentation before Phase 2 implementation.

---

*Architecture research for: Multi-agent LLM-based collaborative drama creation*
*Researched: 2026-03-18*
