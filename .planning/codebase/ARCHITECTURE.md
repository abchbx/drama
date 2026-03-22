# Architecture Documentation

**Project:** Multi-Agent Drama System  
**Version:** v1.1  
**Last Updated:** 2026-03-22  

## Table of Contents
- [Overview](#overview)
- [Design Patterns](#design-patterns)
- [Architectural Layers](#architectural-layers)
- [Data Flow](#data-flow)
- [Key Abstractions](#key-abstractions)
- [Entry Points](#entry-points)

---

## Overview

The Multi-Agent Drama System implements a shared-blackboard multi-agent runtime for collaborative drama generation. The architecture follows a hybrid pattern combining:

- **Centralized State**: Shared blackboard service manages global narrative state
- **Decentralized Communication**: Socket.IO routing enables peer-to-peer, broadcast, and multicast messaging
- **Explicit Boundaries**: Capability-based access control enforces cognitive boundaries between roles
- **Layered Memory**: Four-tier memory system with token-budget-aware folding

### Core Architectural Principles

1. **Separation of Concerns**: Services are single-responsibility, loosely coupled
2. **Type Safety**: Comprehensive TypeScript types with Zod runtime validation
3. **Provider Abstraction**: LLM providers (OpenAI, Anthropic) are swappable via interface
4. **Observability**: Structured logging (pino) with agent attribution throughout
5. **Resilience**: Heartbeat monitoring, timeout management, and graceful degradation

---

## Design Patterns

### 1. Shared Blackboard Pattern

**Location**: `src/services/blackboard.ts`

The blackboard is the single source of truth for all narrative state. It implements:

- **Four Memory Layers**: core, scenario, semantic, procedural
- **Token Budgeting**: Per-layer token limits with tiktoken counting
- **Optimistic Locking**: Version-based concurrency control
- **Metadata Enrichment**: Fold/promotion tracking for memory management

**Key Benefits**:
- Eliminates LLM context drift by avoiding full-prompt re-injection
- Enables fine-grained access control via layer permissions
- Supports memory folding without losing critical information

### 2. Capability-Based Access Control (CBAC)

**Location**: `src/services/capability.ts`

Role-based permissions define which layers each agent type can read/write:

```typescript
Actor:      [semantic, procedural]
Director:   [core, scenario, semantic, procedural]
Admin:      [core, scenario, semantic, procedural]
```

**Enforcement Points**:
- Route handlers check capabilities before blackboard operations
- Service constructors validate capability maps at startup
- Boundary violations are logged to audit trail

**Key Benefits**:
- Programmatic enforcement (not just prompt-based constraints)
- Fine-grained control over information flow
- Audit trail for all permission checks

### 3. Memory Layering Pattern

**Location**: `src/services/memoryManager.ts`

Four-tier memory architecture simulates human cognition:

| Layer | Purpose | Budget | Eviction |
|-------|---------|--------|----------|
| **core** | Permanent narrative facts | 2K tokens | Never (MEM-04) |
| **scenario** | Current scene state | 8K tokens | Manual promotion |
| **semantic** | Dialogue, interpretations | 8K tokens | Auto-fold (MEM-02) |
| **procedural** | Execution signals, voice constraints | 4K tokens | Auto-fold (MEM-03) |

**Folding Behavior**:
- **Semantic**: Oldest entries folded, recent tail preserved (3 entries)
- **Procedural**: Voice-constraint entries protected, transient entries folded
- **Core**: Never folded (hard guarantee)
- **Alert**: 60% budget threshold triggers advisory warning (MEM-01)

### 4. Provider Abstraction Pattern

**Location**: `src/services/llm.ts` and `src/services/llm/*.ts`

Unified LLM interface enables provider switching:

```typescript
interface LlmProvider {
  generate(request: { system: string; user: string }): Promise<{ content: string }>;
}
```

**Implementations**:
- `OpenAiLlmProvider`: OpenAI integration
- `AnthropicLlmProvider`: Anthropic integration
- `MockLlmProvider`: Test-only mock with configurable responses

**Key Benefits**:
- Zero code changes when switching providers
- Consistent error handling across providers
- Test isolation via mock provider

### 5. Event-Driven Routing Pattern

**Location**: `src/services/router.ts`

Socket.IO-based message routing with three modes:

- **Broadcast**: Send to all actors (`to('actors')`)
- **Multicast**: Send to specific actor IDs array
- **Peer-to-Peer**: Send to single recipient with message buffering

**Message Schema**:
```typescript
{
  id: string,              // UUID
  type: MessageType,       // 'scene_start', 'your_turn', 'dialogue', etc.
  from: string,            // Agent ID
  to: string[],           // Recipient IDs
  payload: unknown,        // Type-safe per message type
  timestamp: number,      // Epoch ms
  sequenceNum: number     // FIFO sequence per sender
}
```

**Resilience Features**:
- Heartbeat monitoring (missed threshold = 3)
- Grace period for reconnection (10s default)
- Message buffering for disconnected agents
- Scene-level and actor-level timeouts

### 6. Director-Actor Orchestration Pattern

**Location**: `src/session.ts`, `src/services/director.ts`, `src/services/actor.ts`

Role-based collaboration:

**Director**:
- Plans plot backbone (writes to core layer)
- Signals scene start/end (writes to procedural layer)
- Arbitrates conflicts (writes to scenario layer)
- Fact-checks actor outputs (flags to procedural layer)

**Actor**:
- Generates dialogue (writes to semantic layer)
- Reads character card (from semantic layer)
- Reads fact context (from core + scenario + folded semantic)

**Key Constraints**:
- Director CANNOT write to semantic layer (DIR-03)
- Actors CANNOT write to core or scenario layers
- Only Director can promote scenario→core (MEM-05)

---

## Architectural Layers

### Layer 1: API Layer

**Location**: `src/routes/`, `src/app.ts`

**Responsibilities**:
- HTTP endpoint definition and mounting
- Request validation (Zod schemas)
- Authentication (JWT token verification)
- Response formatting
- CORS handling (via Socket.IO)

**Key Routes**:
- `GET /health` - Health check (public)
- `POST /session` - Create drama session (public)
- `POST /blackboard/agents/register` - Agent registration (public)
- `GET/POST /blackboard/layers/:layer/entries` - Layer CRUD (authenticated)
- `GET /blackboard/audit` - Audit log (authenticated)
- `GET /blackboard/agents/me/scope` - Agent capability scope (authenticated)
- `GET /sessions` - List sessions (authenticated)
- `GET /config` - Get configuration (authenticated)
- `GET /templates` - List templates (authenticated)
- `POST /templates/apply` - Apply template to session (authenticated)

### Layer 2: Service Layer

**Location**: `src/services/`

**Responsibilities**:
- Business logic implementation
- State management
- External integration (LLM providers)
- Inter-service coordination

**Core Services**:

| Service | Purpose | Dependencies |
|---------|---------|--------------|
| `BlackboardService` | State storage, token counting | None |
| `CapabilityService` | Permission checking | JWT secret |
| `RouterService` | Socket.IO routing, heartbeat | Socket.IO server |
| `MemoryManagerService` | Memory folding, promotion | Blackboard, LLM provider |
| `Actor` | Dialogue generation | Blackboard, LLM provider |
| `Director` | Plot planning, arbitration | Blackboard, LLM provider, MemoryManager |
| `AuditLogService` | Audit trail logging | File system |
| `SnapshotService` | State persistence | File system |
| `SessionRegistry` | Session metadata storage | In-memory |
| `ExportService` | Script export formatting | None |

**Supporting Services**:
- `HeartbeatService` - Agent liveness monitoring
- `TimeoutManager` - Scene/actor timeout tracking
- `MessageBuffer` - Buffering for disconnected agents

### Layer 3: Domain Layer

**Location**: `src/types/`, `src/session.ts`

**Responsibilities**:
- Type definitions and schemas
- Domain models
- Business rules
- Validation contracts

**Key Types**:
- `BlackboardEntry` - Core data structure
- `CharacterCard` - Actor personality/role definition
- `RoutingMessage` - Inter-agent communication
- `SceneContext` - Scene execution context
- `DialogueOutput` - Generated dialogue structure

**Validation**:
- Zod schemas for runtime validation
- Custom error classes for domain-specific failures
- TypeScript types for compile-time safety

### Layer 4: Infrastructure Layer

**Location**: `src/config.ts`, `src/index.ts`, `src/services/logger.ts`

**Responsibilities**:
- Configuration management
- Bootstrap and service initialization
- Logging infrastructure
- External service integration

**Configuration**:
- Environment variable validation (Zod schemas)
- Typed config object
- Default values with override support

**Bootstrap Sequence**:
1. Load configuration
2. Initialize snapshot service
3. Initialize audit log service
4. Create blackboard service (with optional state restoration)
5. Create capability service
6. Initialize session registry
7. Create Express app with routes
8. Start HTTP server
9. Initialize Socket.IO router
10. Create LLM provider
11. Initialize memory manager
12. Register drama session endpoint

---

## Data Flow

### 1. Request Processing Flow

```
HTTP Request
    ↓
Express Middleware (JSON parsing, logging)
    ↓
Route Handler
    ↓
Authentication (JWT verification)
    ↓
Capability Check
    ↓
Service Layer
    ↓
Domain Logic (validation, transformation)
    ↓
Blackboard Service
    ↓
Audit Logging
    ↓
HTTP Response
```

### 2. Message Routing Flow

```
Director.sendBroadcast()
    ↓
RouterService.sendBroadcast()
    ↓
Socket.IO emit to 'actors' room
    ↓
All Actor clients receive
    ↓
Actor.generate()
    ↓
LLM Provider API call
    ↓
DialogueOutput (Zod validated)
    ↓
RouterService.sendPeerToPeer(to: [directorId])
    ↓
Director receives
    ↓
Director.factCheck()
```

### 3. Memory Management Flow

```
Service.writeEntryWithMemoryManagement()
    ↓
Blackboard.writeEntry()
    ↓
Token budget check
    ↓
[If budget exceeded]
    ↓
MemoryManager.performFold()
    ↓
Select entries to fold (preserve tail)
    ↓
LLM summarization call
    ↓
Write summary entry
    ↓
Delete folded entries
    ↓
Retry original write
    ↓
[If 60% threshold crossed]
    ↓
Emit alert (non-blocking)
```

### 4. Session Orchestration Flow

```
DramaSession.initialize()
    ↓
Write character cards to semantic
    ↓
Create Actor instances
    ↓
Create Director instance
    ↓
DramaSession.runScene()
    ↓
Director.signalSceneStart()
    ↓
Round-robin actor turns
    ↓
Actor.generate(sceneContext)
    ↓
Director.factCheck()
    ↓
Director.signalSceneEnd()
    ↓
[If multiple scenes]
    ↓
Repeat runScene()
    ↓
DramaSession.runCompleteDrama()
    ↓
Return DramaResult
```

---

## Key Abstractions

### BlackboardEntry

```typescript
interface BlackboardEntry {
  id: string;              // UUID
  agentId: string;         // Writer's agent ID
  messageId?: string;      // Correlation ID
  timestamp: string;       // ISO 8601
  content: string;         // Entry content
  tokenCount: number;      // Tiktoken count
  version: number;        // Layer version
  metadata?: {
    characterCardFor?: string;
    dialogueFor?: string;
    unverifiedFacts?: boolean;
    foldPriority?: number;
    foldVersion?: number;
    foldSummary?: boolean;
    foldedEntryIds?: string[];
    promotedToCore?: string;
    promotedFromScenarioId?: string;
  };
}
```

### LlmProvider

```typescript
interface LlmProvider {
  generate(request: {
    system: string;
    user: string;
  }): Promise<{ content: string }>;
}
```

### RoutingMessage

```typescript
interface RoutingMessage {
  id: string;
  type: MessageType;
  from: string;
  to: string[];
  payload: unknown;
  scenePhase?: ScenePhase;
  cognitiveState?: { tokensUsed: number };
  timestamp: number;
  sequenceNum: number;
}
```

### CharacterCard

```typescript
interface CharacterCard {
  id: string;
  name: string;
  role: string;
  backstory: string;
  objectives: string[];
  voice: VoiceConstraints;
}

interface VoiceConstraints {
  vocabularyRange: string[];
  sentenceLength: 'short' | 'medium' | 'long' | 'variable';
  emotionalRange: string[];
  speechPatterns: string[];
  forbiddenTopics: string[];
  forbiddenWords: string[];
}
```

### DramaSession

```typescript
class DramaSession {
  readonly dramaId: string;
  
  initialize(characterCards: CharacterCard[]): Promise<void>;
  runScene(sceneConfig: SceneConfig): Promise<SceneResult>;
  runCompleteDrama(totalScenes: number): Promise<DramaResult>;
  injectChaos(hooks: ChaosHooks): void;
  simulateDisconnect(agentId: string): void;
}
```

---

## Entry Points

### Bootstrap Entry Point

**File**: `src/index.ts`

**Execution Flow**:
1. Load environment configuration
2. Initialize services in dependency order
3. Create Express app with route composition
4. Start HTTP server
5. Initialize Socket.IO router
6. Register drama session endpoint
7. Listen for shutdown signals

**CLI Usage**:
```bash
npm run dev     # Development mode (tsx watch)
npm run build   # Compile TypeScript
npm start       # Production mode (node dist/index.js)
```

### HTTP API Endpoints

| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/health` | Health check | No |
| POST | `/session` | Create drama session | No |
| POST | `/blackboard/agents/register` | Register agent, get JWT | No |
| GET | `/blackboard/agents/me/scope` | Get agent's layer permissions | Yes |
| GET | `/blackboard/audit` | Get audit log | Yes |
| GET | `/blackboard/layers/:layer` | List layer entries | Yes |
| GET | `/blackboard/layers/:layer/entries/:id` | Get specific entry | Yes |
| POST | `/blackboard/layers/:layer/entries` | Write entry | Yes |
| DELETE | `/blackboard/layers/:layer/entries/:id` | Delete entry | Yes |
| GET | `/sessions` | List all sessions | Yes |
| GET | `/config` | Get current configuration | Yes |
| GET | `/templates` | List available templates | Yes |
| POST | `/templates/apply` | Apply template to session | Yes |

### Socket.IO Events

**Server Emits**:
- `agent_connected` - Agent connected
- `agent_disconnected` - Agent disconnected
- `agent_updated` - Agent status update (periodic)
- `message:received` - Routing message received
- `scene:started` - Scene started
- `scene:ended` - Scene ended
- `actor:skipped` - Actor skipped (timeout)

**Server Handles**:
- `connection` - New socket connection
- `disconnect` - Socket disconnection
- `heartbeat:pong` - Heartbeat response
- `routing:message` - Incoming routing message

### Test Entry Points

**File**: `tests/*.test.ts`

**Test Categories**:
- `actor.test.ts` - Actor dialogue generation
- `director.test.ts` - Director planning and arbitration
- `blackboard.test.ts` - Blackboard state management
- `memoryManager.test.ts` - Memory folding logic
- `boundary.test.ts` - Capability enforcement
- `chaos.test.ts` - Resilience under failure
- `protocol.test.ts` - Message routing validation
- `e2e.test.ts` - End-to-end session orchestration
- `sessionRegistry.test.ts` - Session metadata management

**Run Tests**:
```bash
npm test           # Run all tests
npm run test:watch # Watch mode
```

---

## Cross-Cutting Concerns

### Logging

**Implementation**: `src/services/logger.ts` (pino)

**Convention**:
```typescript
logger.info({ dramaId, agentId }, 'message');
logger.warn({ layer, usagePct }, 'warning message');
logger.error({ err }, 'error message');
```

### Error Handling

**Custom Error Classes**:
- `VersionConflictError` - Optimistic lock violation
- `TokenBudgetExceededError` - Layer budget exceeded
- `NotFoundError` - Entry not found
- `ValidationError` - Input validation failure
- `BoundaryViolationError` - Permission violation
- `ActorGenerationError` - Actor generation failure
- `DirectorGenerationError` - Director generation failure

**HTTP Status Codes**:
- 200 - Success
- 400 - Validation error
- 401 - Unauthorized (missing/invalid token)
- 403 - Forbidden (capability violation)
- 404 - Not found
- 409 - Version conflict
- 500 - Internal server error

### Configuration

**Environment Variables** (see `.env.example`):
- Server: `PORT`, `SOCKET_PORT`, `LOG_LEVEL`
- JWT: `JWT_SECRET`, `JWT_EXPIRES_IN`
- LLM: `LLM_PROVIDER`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `*_MODEL`, `*_BASE_URL`
- Blackboard: `BLACKBOARD_DATA_DIR`, `*_LAYER_TOKEN_BUDGET`
- Routing: `HEARTBEAT_INTERVAL_MS`, `ACTOR_TIMEOUT_MS`, `SCENE_TIMEOUT_MS`
- Capabilities: `CAPABILITY_ACTOR`, `CAPABILITY_DIRECTOR`, `CAPABILITY_ADMIN`

---

## Technology Stack

- **Runtime**: Node.js 22 LTS
- **Language**: TypeScript 5.5
- **Web Framework**: Express 4.19
- **Real-time**: Socket.IO 4.8
- **LLM SDKs**: openai 6.32, @anthropic-ai/sdk 0.80
- **Validation**: Zod 3.23
- **Token Counting**: tiktoken 1.0
- **Logging**: pino 9.0
- **Testing**: Vitest 2.0, supertest 7.0
- **Build**: tsc, tsx (dev)

---

**End of Architecture Documentation**
