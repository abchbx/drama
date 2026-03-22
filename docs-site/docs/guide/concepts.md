# Core Concepts

## Shared Blackboard Architecture

The Multi-Agent Drama System uses a **shared blackboard** pattern where all agents write to a central state store instead of exchanging messages directly. This design:

- **Prevents context drift** - Agents don't need full conversation history
- **Enforces consistency** - Single source of truth for narrative state
- **Enables recovery** - Audit log tracks all operations

## Four-Layer Memory Model

The blackboard organizes information into four semantic layers:

### Core Layer
- **Purpose:** Durable high-value narrative facts
- **Who can write:** Director, Admin
- **Examples:** Plot backbone, character relationships, immutable facts
- **Token budget:** 2000 tokens
- **Eviction:** Never (hard guarantee)

### Scenario Layer
- **Purpose:** Current scene state and story progression
- **Who can write:** Director, Admin
- **Examples:** Scene transitions, plot advancement, scene summaries
- **Token budget:** 4000 tokens
- **Eviction:** When budget exceeded

### Semantic Layer
- **Purpose:** Character cards, memories, and interpretations
- **Who can write:** Actors
- **Examples:** Dialogue, character thoughts, role-based interpretations
- **Token budget:** 8000 tokens
- **Eviction:** When budget exceeded

### Procedural Layer
- **Purpose:** Execution state, workflow traces, and control data
- **Who can write:** All agents
- **Examples:** Scene start/end signals, actor status, workflow metadata
- **Token budget:** 1000 tokens
- **Eviction:** When budget exceeded

## Role-Based Boundaries

### Director Agent
- **Role:** Orchestrates plot planning, arbitrates key decisions, verifies context consistency
- **Can Read:** All layers
- **Can Write:** core, scenario, procedural layers
- **Cannot:** Write to semantic layer (actor domain)

### Actor Agents
- **Role:** Play specific roles, generate dialogue based on character settings
- **Can Read:** semantic, procedural layers
- **Can Write:** semantic, procedural layers
- **Cannot:** Read/write core, scenario layers

### Admin
- **Role:** Full system access for debugging and administration
- **Can Read:** All layers
- **Can Write:** All layers

## Memory Folding

When a layer exceeds its token budget, the system automatically folds content:

1. **Summarize** - Generate compressed representation of current entries
2. **Preserve Core** - Core layer never folds (hard guarantee)
3. **Update Scenario** - Write summary to scenario layer during fold
4. **Free Space** - Old entries removed after fold completes

**Budget thresholds:**
- 60% of budget triggers warning (logged, not blocking)
- 100% of budget triggers automatic fold
- Failed writes return 413 error with budget details

## Agent Types

### Director
- **Purpose:** Orchestrate scene progression
- **Workflow:**
  1. Write plot backbone to core layer
  2. Send scene start signal (procedural)
  3. Monitor actor progress
  4. Send scene end signal (procedural)
- **Decision Authority:** Can override or veto actor decisions

### Actors
- **Purpose:** Generate character dialogue
- **Workflow:**
  1. Read character card from semantic layer
  2. Read current scene from scenario layer (if available)
  3. Generate dialogue in character voice
  4. Write to semantic layer
- **Cognitive Boundaries:** Cannot see or modify plot facts directly

## Communication Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP/WebSocket
       ▼
┌─────────────────────────────────────┐
│   Express Server                 │
│  ┌──────────────────────────────┐  │
│  │  Blackboard Service         │  │
│  │  (4 layers)               │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │  Capability Service        │  │
│  │  (role enforcement)        │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │  Router Service           │  │
│  │  (Socket.IO)              │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Next Steps

- [Quick Start](/guide/quick-start.md) - Hands-on example
- [User Guide](/user-guide/sessions.md) - Session management
- [API Reference](/api/index.md) - Technical details
