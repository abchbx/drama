# Components

This section documents the core components of the Multi-Agent Drama System.

## Blackboard Service

**Source:** [src/services/blackboard.ts](../../src/services/blackboard.ts)

**Purpose:** Central state store for narrative data with four-layer memory model

**Responsibilities:**
- Manage layer storage (core, scenario, semantic, procedural)
- Enforce token budgets per layer
- Handle optimistic locking for concurrent writes
- Generate layer snapshots
- Maintain audit log

**Key Interfaces:**
```typescript
interface BlackboardService {
  readLayer(layer: string): Promise<LayerSnapshot>;
  writeEntry(layer: string, entry: LayerEntry, expectedVersion?: number): Promise<WriteResult>;
  deleteEntry(layer: string, entryId: string): Promise<void>;
  getSnapshot(): Promise<BlackboardSnapshot>;
}
```

**Key Operations:**
- `readLayer()` - Read full layer or single entry by ID
- `writeEntry()` - Write new entry with version checking
- `deleteEntry()` - Remove entry from layer
- `getSnapshot()` - Generate complete blackboard state

## Capability Service

**Source:** [src/services/capability.ts](../../src/services/capability.ts)

**Purpose:** Enforce role-based layer permissions programmatically

**Responsibilities:**
- Validate agent roles against layer access patterns
- Provide capability closure (hard boundary enforcement)
- Generate JWT tokens with role encoding

**Key Interfaces:**
```typescript
interface CapabilityService {
  canRead(role: string, layer: string): boolean;
  canWrite(role: string, layer: string): boolean;
  registerAgent(agentId: string, role: string): Promise<string>; // Returns JWT
  validateToken(token: string): Promise<AgentInfo>;
}
```

**Role Permissions:**

| Role | Can Read | Can Write |
|-------|-----------|------------|
| Actor | semantic, procedural | semantic, procedural |
| Director | All | core, scenario, procedural |
| Admin | All | All |

## Router Service

**Source:** [src/services/router.ts](../../src/services/router.ts)

**Purpose:** Real-time message distribution between agents and server

**Responsibilities:**
- Manage Socket.IO connections
- Handle heartbeat mechanism
- Support broadcast, multicast, and peer-to-peer messaging
- Track connected agents and their status

**Key Interfaces:**
```typescript
interface RouterService {
  broadcast(message: any): void;
  multicast(agentIds: string[], message: any): void;
  send(agentId: string, message: any): void;
  onAgentConnect(agentId: string): void;
  onAgentDisconnect(agentId: string): void;
}
```

**Message Types:**
- `broadcast` - Send to all connected agents
- `multicast` - Send to specific agent group
- `peer` - Send to specific agent
- `heartbeat` - Keep-alive signals

## Memory Manager

**Source:** [src/services/memoryManager.ts](../../src/services/memoryManager.ts)

**Purpose:** Token-budget-aware memory folding and content management

**Responsibilities:**
- Monitor layer token usage
- Trigger automatic memory folding at budget limits
- Preserve core layer content (never folds)
- Summarize and compress during folds

**Key Interfaces:**
```typescript
interface MemoryManager {
  checkBudget(layer: string): BudgetStatus;
  foldLayer(layer: string): Promise<FoldResult>;
  promoteToCore(content: string): Promise<void>;
  getLayerStats(layer: string): LayerStats;
}
```

**Budget Thresholds:**
- **60%:** Warning logged (not blocking)
- **100%:** Automatic fold triggered

**Layer Budgets:**
- Core: 2000 tokens (no eviction)
- Scenario: 4000 tokens
- Semantic: 8000 tokens
- Procedural: 1000 tokens

## LLM Providers

**Sources:**
- [src/services/llmProvider.ts](../../src/services/llmProvider.ts) (Base interface)
- [src/providers/openai.ts](../../src/providers/openai.ts)
- [src/providers/anthropic.ts](../../src/providers/anthropic.ts)
- [src/providers/mock.ts](../../src/providers/mock.ts)

**Purpose:** Unified interface for multiple LLM providers

**Responsibilities:**
- Abstract LLM API differences
- Handle authentication and rate limiting
- Provide consistent streaming response format

**Key Interface:**
```typescript
interface LLMProvider {
  generateText(prompt: string, options?: GenerateOptions): Promise<string>;
  generateTextStream(prompt: string, options?: GenerateOptions): AsyncIterable<string>;
}
```

**Provider Types:**

### OpenAI Provider
- Supports: GPT-3.5, GPT-4, GPT-4o models
- Features: Streaming, custom baseURL support
- Configuration: `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL`

### Anthropic Provider
- Supports: Claude 3 Haiku, Sonnet, Opus models
- Features: Streaming, context window management
- Configuration: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`

### Mock Provider
- Purpose: Testing without real API calls
- Returns deterministic responses
- Used by all integration tests

## HTTP API Layer

**Source:** [src/app.ts](../../src/app.ts)

**Purpose:** Expose REST endpoints for external clients

**Responsibilities:**
- Route composition and middleware setup
- Request validation with Zod schemas
- Error handling and response formatting

**Key Routes:**
- `/health` - System health check
- `/session` - Session management
- `/blackboard/agents/*` - Agent registration and scope
- `/blackboard/layers/*` - Blackboard operations
- `/blackboard/audit` - Audit log queries
- `/export/*` - Script export functionality

## Drama Session Orchestrator

**Source:** [src/session.ts](../../src/session.ts)

**Purpose:** End-to-end drama execution management

**Responsibilities:**
- Coordinate Director and Agent interactions
- Manage scene lifecycle (start/end)
- Handle scene timeouts
- Integrate with blackboard and router services

**Key Methods:**
- `startScene()` - Initialize scene and notify agents
- `endScene()` - Finalize scene and generate summary
- `handleTimeout()` - Process scene timeout scenarios

## Next Steps

- [Data Flow](/architecture/data-flow.md) - Request/response flow diagrams
- [API Reference](/api/index.md) - HTTP API documentation
- [Architecture Overview](/architecture/overview.md) - System design
