# Codebase Structure Documentation

**Project:** Multi-Agent Drama System  
**Version:** v1.1  
**Last Updated:** 2026-03-22  

## Table of Contents
- [Directory Layout](#directory-layout)
- [Key Locations](#key-locations)
- [Naming Conventions](#naming-conventions)
- [Module Organization](#module-organization)
- [Build and Test Structure](#build-and-test-structure)

---

## Directory Layout

```
workspace/
├── .claude/                    # Claude AI tooling configuration
│   ├── agents/                 # Agent personalities and workflows
│   ├── commands/               # GSD command definitions
│   ├── get-shit-done/          # GSD tool binaries and references
│   └── hooks/                  # Custom hooks for GSD workflow
├── .codebuddy/                 # CodeBuddy tooling
│   ├── commands/               # Custom commands
│   └── skills/                 # AI skill definitions
├── .planning/                  # Project planning and documentation
│   ├── codebase/               # Architecture and structure docs (this directory)
│   ├── milestones/             # Milestone-specific requirements
│   ├── phases/                 # Phase planning artifacts
│   ├── quick/                  # Quick reference docs
│   └── research/               # Research and analysis documents
├── data/                       # Runtime data directory (blackboard snapshots, audit logs)
├── docs/                       # User-facing documentation
│   ├── API.md                  # API reference
│   └── architecture/           # Architecture diagrams and explanations
├── examples/                   # Usage examples and demos
│   ├── API_USAGE_GUIDE.md      # Step-by-step API usage guide
│   └── demo-session.ts        # Example session orchestration
├── frontend/                   # Frontend web interface (v1.2)
│   ├── src/                   # React TypeScript source
│   │   ├── components/         # Reusable UI components
│   │   ├── lib/                # Utility libraries
│   │   ├── store/              # Zustand state stores
│   │   ├── types/              # Frontend type definitions
│   │   └── utils/              # Helper functions
│   ├── ui-ux-spec/            # UI/UX specifications
│   └── package.json           # Frontend dependencies
├── src/                        # Backend source code
│   ├── routes/                 # Express route handlers
│   ├── services/               # Business logic and state management
│   │   └── llm/               # LLM provider implementations
│   ├── types/                  # TypeScript type definitions and Zod schemas
│   ├── app.ts                  # Express app composition
│   ├── config.ts               # Environment configuration and validation
│   ├── index.ts                # Bootstrap entry point
│   └── session.ts              # Drama session orchestration
├── tests/                      # Test suite
│   ├── routes/                 # Route handler tests
│   ├── actor.test.ts           # Actor service tests
│   ├── blackboard.test.ts      # Blackboard service tests
│   ├── boundary.test.ts        # Capability enforcement tests
│   ├── chaos.test.ts           # Resilience tests
│   ├── director.test.ts        # Director service tests
│   ├── e2e.test.ts             # End-to-end orchestration tests
│   ├── memoryManager.test.ts   # Memory management tests
│   ├── protocol.test.ts        # Message protocol tests
│   └── sessionRegistry.test.ts # Session registry tests
├── .env                        # Local environment variables (not committed)
├── .env.example                # Environment variable template
├── .gitignore                  # Git ignore rules
├── package.json                # Backend dependencies and scripts
├── package-lock.json          # Dependency lock file
├── tsconfig.json              # TypeScript compiler configuration
└── vitest.config.ts           # Test runner configuration
```

---

## Key Locations

### Bootstrap and Configuration

| File | Purpose | Key Contents |
|------|---------|-------------|
| `src/index.ts` | Runtime bootstrap | Service initialization, server startup, graceful shutdown |
| `src/config.ts` | Configuration management | Zod schemas for env vars, typed config object |
| `src/app.ts` | Express app composition | Middleware, route mounting, service injection |

### Core Services

| File | Purpose | Key Classes/Functions |
|------|---------|---------------------|
| `src/services/blackboard.ts` | Shared state storage | `BlackboardService`, `countTokens()`, `writeEntry()`, `readLayer()` |
| `src/services/capability.ts` | Permission enforcement | `CapabilityService`, `checkCapability()`, `verifyAgentToken()` |
| `src/services/router.ts` | Message routing | `RouterService`, `sendBroadcast()`, `sendPeerToPeer()`, `routeMessage()` |
| `src/services/memoryManager.ts` | Memory folding | `MemoryManagerService`, `writeEntryWithMemoryManagement()`, `performFold()` |
| `src/services/actor.ts` | Dialogue generation | `Actor`, `generate()`, `getCharacterCard()`, `readFactContext()` |
| `src/services/director.ts` | Plot orchestration | `Director`, `planBackbone()`, `arbitrate()`, `factCheck()` |
| `src/services/sessionRegistry.ts` | Session metadata | `SessionRegistry`, `create()`, `get()`, `list()` |
| `src/services/exportService.ts` | Script export | `ExportService`, `exportSession()` |

### Supporting Services

| File | Purpose | Key Classes/Functions |
|------|---------|---------------------|
| `src/services/auditLog.ts` | Audit trail | `AuditLogService`, `write()`, `close()` |
| `src/services/snapshot.ts` | State persistence | `SnapshotService`, `tryRestore()`, `markDirty()` |
| `src/services/heartbeat.ts` | Liveness monitoring | `HeartbeatService`, `attach()`, `recordPong()` |
| `src/services/timeoutManager.ts` | Timeout handling | `TimeoutManager`, `startActorTimer()`, `cancelSceneTimer()` |
| `src/services/messageBuffer.ts` | Disconnected agent buffering | `MessageBuffer`, `push()`, `drain()` |

### LLM Providers

| File | Purpose | Key Classes |
|------|---------|-------------|
| `src/services/llm.ts` | Provider interface | `LlmProvider`, `createLlmProvider()` |
| `src/services/llm/openai.ts` | OpenAI integration | `OpenAiLlmProvider` |
| `src/services/llm/anthropic.ts` | Anthropic integration | `AnthropicLlmProvider` |
| `src/services/llm/mock.ts` | Test mock | `MockLlmProvider` |

### Type Definitions

| File | Purpose | Key Types |
|------|---------|-----------|
| `src/types/blackboard.ts` | Blackboard types | `BlackboardEntry`, `BlackboardLayer`, `WriteEntryRequest` |
| `src/types/actor.ts` | Actor types | `CharacterCard`, `DialogueOutput`, `SceneContext` |
| `src/types/director.ts` | Director types | `DirectorBackboneOutput`, `ArbitrationOutput`, `FactCheckOutput` |
| `src/types/routing.ts` | Routing types | `RoutingMessage`, `ConnectedAgent`, `RouterEventMap` |
| `src/types/session.ts` | Session types | `Session`, `SessionStatus`, `CreateSessionInput` |

### Route Handlers

| File | Purpose | Endpoints |
|------|---------|-----------|
| `src/routes/health.ts` | Health check | `GET /health` |
| `src/routes/agents.ts` | Agent management | `POST /blackboard/agents/register`, `GET /blackboard/agents/me/scope` |
| `src/routes/blackboard.ts` | Layer CRUD | `GET/POST/DELETE /blackboard/layers/:layer/entries*` |
| `src/routes/audit.ts` | Audit log | `GET /blackboard/audit` |
| `src/routes/sessions.ts` | Session management | `GET /sessions`, `GET /sessions/:dramaId` |
| `src/routes/config.ts` | Configuration | `GET /config` |
| `src/routes/templates.ts` | Templates | `GET /templates`, `POST /templates/apply` |

### Documentation

| File | Purpose | Audience |
|------|---------|----------|
| `README.md` | Project overview and quick start | Developers, users |
| `docs/API.md` | HTTP API reference | API consumers |
| `examples/API_USAGE_GUIDE.md` | Step-by-step API usage | API consumers |
| `examples/demo-session.ts` | Example session code | Developers |

---

## Naming Conventions

### File Naming

**Source Files** (`src/`):
- **Type definitions**: `PascalCase.ts` (e.g., `actor.ts`, `blackboard.ts`)
- **Services**: `PascalCase.ts` (e.g., `actor.ts`, `director.ts`)
- **Routes**: `PascalCase.ts` (e.g., `blackboard.ts`, `health.ts`)
- **Entry points**: `lowercase.ts` (e.g., `index.ts`, `app.ts`, `config.ts`)

**Test Files** (`tests/`):
- **Service tests**: `serviceName.test.ts` (e.g., `actor.test.ts`)
- **Feature tests**: `featureName.test.ts` (e.g., `boundary.test.ts`, `chaos.test.ts`)
- **Route tests**: `routes/routeName.test.ts` (e.g., `routes/sessions.test.ts`)

**Documentation Files**:
- **Markdown**: `UPPER_SNAKE_CASE.md` (e.g., `API.md`, `ARCHITECTURE.md`)
- **Examples**: `kebab-case.md` or `kebab-case.ts` (e.g., `API_USAGE_GUIDE.md`, `demo-session.ts`)

### Class Naming

**Pattern**: `PascalCase`

**Examples**:
- `BlackboardService`
- `CapabilityService`
- `RouterService`
- `MemoryManagerService`
- `Actor`
- `Director`
- `DramaSession`

**Suffixes**:
- `*Service` - Stateless service classes
- `*Manager` - Stateful management classes
- `*Provider` - External integration classes
- `*Error` - Custom error classes

### Function/Method Naming

**Pattern**: `camelCase`

**Public Methods**:
- **Actions**: Verb-first (e.g., `generate()`, `writeEntry()`, `readLayer()`)
- **Getters**: `get*` or `read*` (e.g., `getCharacterCard()`, `readLayer()`)
- **Setters**: `set*` (e.g., `setAuditLog()`, `setSnapshotService()`)
- **Checks**: `check*` or `*Check` (e.g., `checkCapability()`, `factCheck()`)

**Private Methods**:
- Underscore prefix or private keyword (e.g., `_validateToken()`, `private performFold()`)

**Callbacks/Handlers**:
- `on*` (e.g., `onAgentConnected()`, `handleDisconnect()`)

### Interface Naming

**Pattern**: `PascalCase`

**Examples**:
- `BlackboardEntry`
- `CharacterCard`
- `RoutingMessage`
- `SceneContext`
- `WriteEntryRequest`
- `LayerReadResponse`

**Response Types**: `*Response` suffix
**Request Types**: `*Request` suffix
**Config Types**: `*Config` suffix
**Option Types**: `*Options` suffix

### Type Alias Naming

**Pattern**: `PascalCase`

**Examples**:
- `BlackboardLayer`
- `AgentRole`
- `MessageType`
- `AuditOperation`
- `ViolationType`

**Unions**: Prefix with common noun (e.g., `MemoryAuditMetadata` = `AlertAuditMetadata | FoldAuditMetadata | PromoteAuditMetadata`)

### Variable Naming

**Pattern**: `camelCase`

**Local Variables**:
```typescript
const agentId = 'actor-123';
const layer: BlackboardLayer = 'semantic';
const message = routingMessage;
```

**Parameters**:
```typescript
function writeEntry(layer: BlackboardLayer, agentId: string, req: WriteEntryRequest) { }
```

**Constants**:
```typescript
const RECENT_TAIL_SIZE = 3;
const BUDGET_ALERT_THRESHOLD = 0.6;
```

### Enum Naming

**Pattern**: `PascalCase` for enum, `UPPER_SNAKE_CASE` for values

**Examples**:
```typescript
enum SessionStatus {
  CREATED = 'created',
  IDLE = 'idle',
  RUNNING = 'running',
  // ...
}

enum ExportFormat {
  JSON = 'json',
  MARKDOWN = 'markdown',
}
```

### Environment Variable Naming

**Pattern**: `UPPER_SNAKE_CASE`

**Categories**:
- **Server**: `PORT`, `SOCKET_PORT`, `LOG_LEVEL`
- **JWT**: `JWT_SECRET`, `JWT_EXPIRES_IN`
- **LLM**: `LLM_PROVIDER`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `*_MODEL`, `*_BASE_URL`
- **Blackboard**: `BLACKBOARD_DATA_DIR`, `*_LAYER_TOKEN_BUDGET`
- **Routing**: `HEARTBEAT_INTERVAL_MS`, `ACTOR_TIMEOUT_MS`, `SCENE_TIMEOUT_MS`
- **Capabilities**: `CAPABILITY_ACTOR`, `CAPABILITY_DIRECTOR`, `CAPABILITY_ADMIN`

### Schema Naming

**Pattern**: `PascalCase` + `Schema` suffix

**Examples**:
```typescript
const CharacterCardSchema = z.object({ /* ... */ });
const DialogueOutputSchema = z.object({ /* ... */ });
const RoutingMessageSchema = z.object({ /* ... */ });
```

---

## Module Organization

### Principles

1. **Single Responsibility**: Each module has one clear purpose
2. **Dependency Injection**: Services receive dependencies via constructor
3. **Interface Segregation**: Use specific interfaces, not general ones
4. **Layer Separation**: Clear boundaries between API, Service, Domain, Infrastructure

### Service Organization

**Core Services**: `src/services/`
- Independent business logic
- Minimal dependencies (mostly type definitions)
- Testable via dependency injection

**Provider Implementations**: `src/services/llm/`
- External API integrations
- Shared interface (`LlmProvider`)
- Swappable implementations

**Supporting Services**: `src/services/`
- Cross-cutting concerns (logging, auditing, snapshots)
- Used by multiple core services
- No circular dependencies

### Type Organization

**By Domain**: `src/types/`
- `blackboard.ts` - Blackboard-related types
- `actor.ts` - Actor-related types
- `director.ts` - Director-related types
- `routing.ts` - Routing-related types
- `session.ts` - Session-related types

**Each file contains**:
- Type definitions
- Zod validation schemas
- Custom error classes (if any)

### Route Organization

**By Resource**: `src/routes/`
- Each file handles one resource
- Routes follow REST conventions
- Middleware for auth, validation, error handling

**Example structure**:
```typescript
// src/routes/blackboard.ts
router.get('/layers/:layer', getLayerHandler);
router.get('/layers/:layer/entries/:id', getEntryHandler);
router.post('/layers/:layer/entries', createEntryHandler);
router.delete('/layers/:layer/entries/:id', deleteEntryHandler);
```

### Import Organization

**Order**:
1. Node.js built-in modules
2. External dependencies (npm packages)
3. Internal modules (relative imports)

**Example**:
```typescript
import { createHash } from 'node:crypto';
import { Router } from 'express';
import type pino from 'pino';
import { z } from 'zod';

import type { BlackboardLayer } from '../types/blackboard.js';
import { BlackboardService } from '../services/blackboard.js';
```

**Always use `.js` extensions** for ES modules (TypeScript `module: NodeNext`).

---

## Build and Test Structure

### Build Configuration

**TypeScript**: `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "declaration": true
  }
}
```

**Output Directory**: `dist/` (not in source control)

### Test Configuration

**Vitest**: `vitest.config.ts`
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
  },
});
```

**Test Organization**:
- Unit tests for individual services
- Integration tests for service interactions
- E2E tests for complete workflows
- Chaos tests for resilience verification

### Scripts

**Development**:
- `npm run dev` - Start with tsx watch (hot reload)
- `npm run build` - Compile TypeScript to `dist/`
- `npm start` - Run compiled code from `dist/`

**Testing**:
- `npm test` - Run all tests once
- `npm run test:watch` - Run tests in watch mode

### Data Persistence

**Runtime Data**: `data/`
- `blackboard.json` - Blackboard state snapshots
- `audit.log` - Audit trail entries
- Created automatically by services
- Not in source control

---

## Frontend Structure (v1.2)

**React + TypeScript + Vite**

```
frontend/
├── src/
│   ├── components/           # Reusable UI components
│   ├── lib/                  # Third-party library wrappers
│   ├── store/                # Zustand state stores
│   ├── types/                # Frontend-specific types
│   ├── utils/                # Helper functions
│   ├── App.tsx               # Root component
│   └── main.tsx              # Entry point
├── ui-ux-spec/              # UI/UX specifications
└── package.json              # Frontend dependencies
```

**Key Technologies**:
- React 18
- TypeScript 5.5
- Vite (build tool)
- Socket.IO client (real-time)
- Zustand (state management)
- Tailwind CSS (styling)

---

**End of Structure Documentation**
