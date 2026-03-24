# Architecture

## System Pattern

DramaFlow implements a **Shared Blackboard Architecture** with a Director-Agent collaboration pattern. This is a multi-agent system where autonomous agents (Director and Actors) communicate through a central shared memory space (Blackboard) rather than direct message passing.

## Architectural Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ React UI    │  │ Dashboard   │  │ Visualization (ReactFlow)│  │
│  │ Components  │  │ Components  │  │                         │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                      │                │
│         └────────────────┼──────────────────────┘                │
│                          │                                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │ HTTP / WebSocket
┌──────────────────────────┼───────────────────────────────────────┐
│                      API LAYER                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Express Routes                                          │   │
│  │  /sessions  /blackboard  /agents  /config  /templates   │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Socket.IO Router (Real-time messaging)                  │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬───────────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────────┐
│                   SERVICE LAYER (Domain Logic)                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Director   │  │   Actor     │  │   BlackboardService     │  │
│  │  Service    │  │  Service    │  │   (Shared Memory)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Router    │  │   Memory    │  │   Capability            │  │
│  │  Service    │  │  Manager    │  │   Service               │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Session   │  │   LLM       │  │   SessionRegistry       │  │
│  │  Manager    │  │ Provider    │  │   (In-memory store)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────────┐
│                  DATA LAYER (Persistence)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   File      │  │   Audit     │  │   Snapshot              │  │
│  │   System    │  │   Log       │  │   Service               │  │
│  │  (data/)    │  │   Service   │  │   (State persistence)   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. DramaSession (`src/session.ts`)

The orchestrator that manages a complete drama generation workflow.

**Responsibilities:**
- Scene lifecycle management (initialize → start → run → complete)
- Director and Actor instantiation
- Turn coordination and conflict resolution
- Integration with RouterService for real-time messaging

**Key Methods:**
- `initialize()` - Set up characters and initial state
- `startScene()` - Begin a new scene with Director planning
- `runExchange()` - Execute one dialogue exchange between actors
- `pause/resume/stop()` - Scene flow control

### 2. Director (`src/services/director.ts`)

Responsible for overall script planning, scene orchestration, and quality control.

**Responsibilities:**
- **Backbone Planning**: Generate scene structure, character arcs, plot beats
- **Conflict Arbitration**: Resolve contradictions between actor outputs
- **Fact Checking**: Verify consistency against established facts
- **Scene Management**: Start/end signals for scene boundaries

**Memory:** Uses `DirectorMemoryService` for thematic anchors and thread tracking

**Capabilities:** core, scenario, procedural (NO semantic layer write access)

### 3. Actor (`src/services/actor.ts`)

Represents a character in the drama, generates dialogue based on character card.

**Responsibilities:**
- Dialogue generation based on SceneContext
- Character voice consistency maintenance
- Personal memory management (perceptual boundaries)
- Introspective reasoning about character state

**Memory:** Uses `ActorMemoryService` for episodic and introspective memory

**Capabilities:** semantic, procedural (NO core/scenario layer write access)

### 4. BlackboardService (`src/services/blackboard.ts`)

The shared memory space with four distinct layers.

**Layers:**
| Layer | Purpose | Persistence | Token Budget |
|-------|---------|-------------|--------------|
| **core** | Immutable facts, character definitions, plot backbone | Permanent | 2K |
| **scenario** | Scene planning, current state, location info | Scene-level | 8K |
| **semantic** | Actor-generated dialogue, natural language | Session-level | 8K |
| **procedural** | Technical signals, routing metadata | Temporary | 4K |

**Features:**
- Optimistic locking with version numbers
- Token counting via tiktoken
- Budget enforcement per layer
- Metadata support for folding/promotion tracking

### 5. RouterService (`src/services/router.ts`)

Socket.IO-based message routing and agent connection management.

**Responsibilities:**
- Agent registration and authentication
- Room-based message routing (per session)
- Heartbeat monitoring for agent health
- Timeout and retry logic for actor responses
- Message sequencing and delivery guarantees

**Integration:** Emits events consumed by DramaSession

### 6. MemoryManagerService (`src/services/memoryManager.ts`)

Automated memory maintenance and optimization.

**Responsibilities:**
- Budget monitoring with alert thresholds (60%)
- Memory folding (summarization) when budget exceeded
- Layer promotion (scenario → core for important facts)
- Token optimization for LLM context windows

**Triggers:** Alert callback at 60%, Fold callback at 100% budget

## Data Flow

### Scene Initialization Flow

```
1. Frontend → POST /sessions/:id/start
2. DramaSession.initialize()
3. Director.initializeMemory(theme, characters)
4. Director.createBackbone() → writes to core layer
5. Director.startScene() → writes to scenario layer
6. Router broadcasts scene:start to all actors
```

### Dialogue Exchange Flow

```
1. DramaSession selects next actor (round-robin)
2. Actor.generate(context)
   a. Build prompts from blackboard layers
   b. Call LLM provider
   c. Validate response with Zod
   d. Write dialogue to semantic layer
3. Router broadcasts to all agents
4. Director.factCheck() (optional)
5. If conflict detected → Director.arbitrate()
6. MemoryManager.checkBudget() → fold if needed
```

### Memory Management Flow

```
1. Blackboard.writeEntry() triggers token counting
2. If budget_used > 60% → alert callback
3. If budget_used >= 100% → fold callback
4. MemoryManager.foldLayer()
   a. Select entries to fold (oldest/lowest priority)
   b. Call LLM to summarize
   c. Create summary entry
   d. Mark folded entries
5. MemoryManager.promoteToCore() (for important facts)
```

## Key Abstractions

### Agent Roles & Capability Model

Agents are authenticated via JWT tokens with capability claims:

```typescript
interface AgentJwtPayload {
  agentId: string;
  role: 'Director' | 'Actor' | 'Admin';
  capabilities: string[]; // Layer access permissions
}
```

**Role Contracts:**
- Director: Can write to core, scenario, procedural (read-only semantic)
- Actor: Can write to semantic, procedural (read-only core/scenario)
- Admin: Full access to all layers

### LLM Provider Abstraction

```typescript
interface LlmProvider {
  complete(prompt: LlmPrompt): Promise<LlmResponse>;
}
```

**Implementations:**
- `OpenAiLlmProvider` - OpenAI GPT models
- `AnthropicLlmProvider` - Claude models
- `MockLlmProvider` - Deterministic test responses

### Message Types

**RoutingMessage** (`src/types/routing.ts`):
- `scene:start` / `scene:end` - Scene boundary signals
- `dialogue` - Actor-generated dialogue
- `fact_check` - Director verification request
- `arbitration` - Conflict resolution directive

## Design Patterns

### 1. Service Locator / Dependency Injection
Services are created in `index.ts` and wired together explicitly:
```typescript
const blackboard = new BlackboardService(initialState);
const router = new RouterService(httpServer, logger, options);
const memoryManager = new MemoryManagerService({ blackboard, llmProvider, ... });
```

### 2. Event-Driven Communication
RouterService uses EventEmitter for loose coupling:
```typescript
router.on('actor:completed', ({ agentId, output }) => {
  // Handle actor completion
});
```

### 3. Repository Pattern
BlackboardService encapsulates data access with version control:
```typescript
readLayer(layer: BlackboardLayer): LayerReadResponse
writeEntry(layer, agentId, request): WriteEntryResponse
```

### 4. Strategy Pattern
LLM providers implement common interface for different backends:
```typescript
const llmProvider = await createLlmProvider(logger); // Returns appropriate provider
```

### 5. State Machine
Session lifecycle with explicit states:
```typescript
type SessionStatus = 'pending' | 'running' | 'paused' | 'completed';
```

## Entry Points

### Server Entry
`src/index.ts` - Service initialization and startup sequence

### Application Entry
`src/app.ts` - Express app configuration and route mounting

### Frontend Entry
`frontend/src/main.tsx` - React application bootstrap

## External Interfaces

### REST API
- `/api/sessions` - Session CRUD and lifecycle
- `/api/blackboard/:layer` - Layer read/write operations
- `/api/agents/token` - JWT token generation
- `/api/config/llm` - LLM configuration

### WebSocket Events
- `agent:register` - Agent connection and auth
- `agent:message` - Message routing
- `scene:start`, `scene:end` - Scene signals
- `heartbeat` - Health monitoring
