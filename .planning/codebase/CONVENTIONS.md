# Code Conventions

**Project:** Multi-Agent Drama System  
**Version:** v1.1  
**Last Updated:** 2026-03-22  

## Table of Contents
- [Language and Compiler](#language-and-compiler)
- [Code Organization](#code-organization)
- [Naming Conventions](#naming-conventions)
- [Type Safety](#type-safety)
- [Error Handling](#error-handling)
- [Logging](#logging)
- [Service Patterns](#service-patterns)
- [Testing Patterns](#testing-patterns)
- [Configuration](#configuration)

---

## Language and Compiler

### TypeScript Configuration

**File**: `tsconfig.json`

**Key Settings**:
- **Target**: `ES2022` - Modern JavaScript features
- **Module**: `NodeNext` - Node.js ES modules
- **Module Resolution**: `NodeNext`
- **Strict Mode**: `true` - Strict type checking enabled
- **Declaration**: `true` - Generate `.d.ts` files
- **OutDir**: `dist/` - Compiled output directory
- **RootDir**: `src/` - Source root

**Implications**:
- All files must use `.js` extensions in imports (ES modules)
- Type checking is strict (no implicit `any`, null checks enabled)
- Decorators are not used (not in tsconfig)
- Source maps are generated for debugging

### Development Mode

**Tool**: `tsx 4.16.0`

- Executes TypeScript directly without compilation
- Watch mode for hot reload (`tsx watch src/index.ts`)
- Used in development workflow (`npm run dev`)

---

## Code Organization

### File Structure

**Backend** (`src/`):
```
src/
├── types/          # Type definitions and Zod schemas
├── services/       # Business logic implementations
├── routes/         # Express route handlers
├── config.ts       # Configuration (lowercase for entry point)
├── index.ts        # Bootstrap entry point (lowercase)
├── app.ts          # Express app composition (lowercase)
└── session.ts      # Session orchestration
```

**Frontend** (`frontend/src/`):
```
frontend/src/
├── components/     # React components
├── lib/            # Third-party wrappers
├── store/          # Zustand stores
├── types/          # Frontend types
├── utils/          # Utility functions
├── App.tsx         # Root component
└── main.tsx        # Entry point
```

### Import Order

1. **Node.js built-in modules** (with `node:` prefix)
2. **External dependencies** (npm packages)
3. **Internal modules** (relative imports with `.js` extension)

**Example**:
```typescript
import { createHash } from 'node:crypto';
import { Router } from 'express';
import type pino from 'pino';
import { z } from 'zod';

import type { BlackboardLayer } from '../types/blackboard.js';
import { BlackboardService } from '../services/blackboard.js';
```

---

## Naming Conventions

### Files

- **Type definitions**: `PascalCase.ts` (e.g., `actor.ts`, `blackboard.ts`)
- **Services**: `PascalCase.ts` (e.g., `actor.ts`, `director.ts`)
- **Routes**: `PascalCase.ts` (e.g., `blackboard.ts`, `health.ts`)
- **Entry points**: `lowercase.ts` (e.g., `index.ts`, `app.ts`, `config.ts`)
- **Test files**: `*.test.ts` (e.g., `actor.test.ts`, `blackboard.test.ts`)

### Classes

**Pattern**: `PascalCase`

```typescript
class BlackboardService { }
class CapabilityService { }
class Actor { }
class Director { }
class DramaSession { }
```

**Suffixes**:
- `*Service` - Stateless service classes
- `*Manager` - Stateful management classes
- `*Provider` - External integration classes
- `*Error` - Custom error classes

### Functions and Methods

**Pattern**: `camelCase`

```typescript
function writeEntry() { }
function getCharacterCard() { }
function checkCapability() { }
function factCheck() { }
```

**Private methods**:
- Use TypeScript `private` keyword
- No underscore prefix convention (use TypeScript visibility modifiers)

### Interfaces and Types

**Pattern**: `PascalCase`

```typescript
interface BlackboardEntry { }
interface CharacterCard { }
interface RoutingMessage { }
```

**Type aliases**:
```typescript
type BlackboardLayer = 'core' | 'scenario' | 'semantic' | 'procedural';
type AgentRole = 'Actor' | 'Director' | 'Admin';
```

### Variables and Constants

**Pattern**: `camelCase`

```typescript
const agentId = 'actor-123';
const layer: BlackboardLayer = 'semantic';
const message = routingMessage;
```

**Constants** (module-level):
```typescript
const RECENT_TAIL_SIZE = 3;
const BUDGET_ALERT_THRESHOLD = 0.6;
const DEFAULT_TIMEOUT_MS = 30000;
```

### Enums

**Pattern**: `PascalCase` for enum, `UPPER_SNAKE_CASE` for values

```typescript
enum SessionStatus {
  CREATED = 'created',
  IDLE = 'idle',
  RUNNING = 'running',
  COMPLETED = 'completed',
}
```

### Environment Variables

**Pattern**: `UPPER_SNAKE_CASE`

```typescript
process.env.PORT
process.env.JWT_SECRET
process.env.LLM_PROVIDER
process.env.OPENAI_API_KEY
```

---

## Type Safety

### TypeScript Strict Mode

**Enabled**: All strict checks are enabled in `tsconfig.json`

**Key implications**:
- No implicit `any` types
- Null/undefined checks required
- Explicit return types encouraged (optional)
- `this` context must be typed

### Type Definitions

**Organized by domain**: `src/types/`

Each type file contains:
1. TypeScript type definitions
2. Zod validation schemas
3. Custom error classes (if applicable)

**Example** (`src/types/blackboard.ts`):
```typescript
// TypeScript types
export type BlackboardLayer = 'core' | 'scenario' | 'semantic' | 'procedural';

export interface BlackboardEntry {
  id: string;
  agentId: string;
  timestamp: string;
  content: string;
  tokenCount: number;
  version: number;
  metadata?: EntryMetadata;
}

// Zod schemas
export const BlackboardLayerSchema = z.enum(['core', 'scenario', 'semantic', 'procedural']);

export const BlackboardEntrySchema = z.object({
  id: z.string().uuid(),
  agentId: z.string(),
  timestamp: z.string().datetime(),
  content: z.string(),
  tokenCount: z.number().int().nonnegative(),
  version: z.number().int().nonnegative(),
  metadata: EntryMetadataSchema.optional(),
});

// Custom error types
export class TokenBudgetExceededError extends Error {
  constructor(
    public readonly layer: BlackboardLayer,
    public readonly budget: number,
    public readonly requested: number,
  ) {
    super(`Token budget exceeded for layer ${layer}`);
  }
}
```

### Type Assertions and Guards

**Prefer type guards over type assertions**:

```typescript
// Good - Type guard
function isRoutingMessage(msg: unknown): msg is RoutingMessage {
  return RoutingMessageSchema.safeParse(msg).success;
}

if (isRoutingMessage(data)) {
  // data is typed as RoutingMessage
}

// Acceptable - Zod parsing
const result = RoutingMessageSchema.safeParse(data);
if (result.success) {
  // result.data is typed
}
```

**Avoid `any` type**:
- Use `unknown` for truly untyped data
- Parse with Zod schemas before use
- Create union types where appropriate

---

## Error Handling

### Custom Error Classes

**Location**: `src/types/*.ts` (domain-specific)

**Pattern**: Extend `Error` with typed properties

```typescript
export class VersionConflictError extends Error {
  constructor(
    public readonly layer: BlackboardLayer,
    public readonly expectedVersion: number,
    public readonly actualVersion: number,
  ) {
    super(`Version conflict in layer ${layer}`);
    this.name = 'VersionConflictError';
  }
}

export class BoundaryViolationError extends Error {
  constructor(
    public readonly agentId: string,
    public readonly role: AgentRole,
    public readonly layer: BlackboardLayer,
    public readonly operation: 'read' | 'write',
  ) {
    super(`Agent ${agentId} (${role}) cannot ${operation} layer ${layer}`);
    this.name = 'BoundaryViolationError';
  }
}
```

### Error Throwing

**Throw domain-specific errors**:

```typescript
// Service layer
export class BlackboardService {
  writeEntry(layer: BlackboardLayer, entry: BlackboardEntry): void {
    if (layer === 'core' && !this.canWriteCore(agent.role)) {
      throw new BoundaryViolationError(agentId, agent.role, layer, 'write');
    }
    // ...
  }
}
```

### Error Catching and Logging

**Always log errors with context**:

```typescript
try {
  await this.llmProvider.generate(prompt);
} catch (error) {
  logger.error(
    { err: error, agentId, promptLength: prompt.user.length },
    'LLM generation failed'
  );
  throw new ActorGenerationError(agentId, error);
}
```

### Route-Level Error Handling

**Express error middleware**:

```typescript
// Custom error types map to HTTP status codes
const errorStatusMap: Record<string, number> = {
  VersionConflictError: 409,
  TokenBudgetExceededError: 413,
  BoundaryViolationError: 403,
  NotFoundError: 404,
  ValidationError: 400,
};

router.use((err: Error, _req, res, _next) => {
  const statusCode = errorStatusMap[err.constructor.name] || 500;
  res.status(statusCode).json({
    error: err.constructor.name,
    message: err.message,
  });
});
```

---

## Logging

### Logger Setup

**File**: `src/services/logger.ts`

**Library**: `pino 9.0.0`

**Configuration**:
```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined,
});
```

### Logging Patterns

**Structured logging with context**:

```typescript
// Info level - Normal operations
logger.info({ dramaId, agentId, layer }, 'Entry written to blackboard');

// Warn level - Warnings that don't stop execution
logger.warn({ layer, usagePct: 0.75 }, 'Token budget approaching limit');

// Error level - Errors that are handled
logger.error({ err, agentId, role }, 'Failed to generate dialogue');

// Fatal level - Errors that crash the process
logger.fatal({ err }, 'Fatal error during server startup');
```

### Log Context

**Always include relevant context**:

```typescript
// Good - Contextual logging
logger.info(
  { dramaId, sceneNumber, turnIndex, actorId },
  'Actor generated dialogue'
);

// Bad - Insufficient context
logger.info('Dialogue generated');
```

### Agent Attribution

**Include agent information in logs**:

```typescript
logger.info(
  { agentId, agentType: 'Actor' | 'Director', dramaId },
  'Agent action'
);
```

---

## Service Patterns

### Constructor Injection

**Services receive dependencies via constructor**:

```typescript
export class Actor {
  constructor(
    private readonly llmProvider: LlmProvider,
    private readonly blackboard: BlackboardService,
    private readonly capability: CapabilityService,
    private readonly logger: pino.Logger,
  ) {}
}
```

### Readonly Properties

**Use `readonly` for immutable dependencies**:

```typescript
export class BlackboardService {
  constructor(
    private readonly logger: pino.Logger,
    private readonly layerBudgets: Map<BlackboardLayer, number>,
  ) {
    // logger and layerBudgets cannot be reassigned
  }
}
```

### Service Options Pattern

**Optional services can be null**:

```typescript
export class Director {
  constructor(
    private readonly llmProvider: LlmProvider,
    private readonly blackboard: BlackboardService,
    private readonly memoryManager?: MemoryManagerService,
  ) {}
}
```

### Service Factory Pattern

**Services are instantiated in bootstrap order**:

```typescript
// src/index.ts
const snapshotService = new SnapshotService(config.blackboard.dataDir);
const auditLogService = new AuditLogService(config.blackboard.dataDir);
const blackboardService = new BlackboardService(logger, snapshotService, auditLogService);
const capabilityService = new CapabilityService(config.jwt.secret);
// ...
```

---

## Testing Patterns

### Test File Organization

**Structure**: `tests/*.test.ts`

**Naming**: `serviceName.test.ts` or `featureName.test.ts`

**Categories**:
- Unit tests - Individual service methods
- Integration tests - Service interactions
- E2E tests - Complete workflows
- Chaos tests - Resilience testing

### Test Structure

**Vitest test structure**:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BlackboardService } from '../src/services/blackboard.js';
import { createTestActor, createMockBlackboard } from './test-helpers.js';

describe('BlackboardService', () => {
  let blackboard: BlackboardService;

  beforeEach(() => {
    blackboard = createMockBlackboard();
  });

  describe('writeEntry', () => {
    it('should write entry to correct layer', () => {
      const entry = createTestEntry('semantic', 'test content');
      blackboard.writeEntry('semantic', entry);
      
      const layer = blackboard.readLayer('semantic');
      expect(layer).toHaveLength(1);
      expect(layer[0].content).toBe('test content');
    });

    it('should throw TokenBudgetExceededError when budget exceeded', () => {
      const entry = createTestEntry('semantic', 'x'.repeat(10000));
      
      expect(() => {
        blackboard.writeEntry('semantic', entry);
      }).toThrow(TokenBudgetExceededError);
    });
  });
});
```

### Mock Patterns

**Factory functions for test doubles**:

```typescript
// tests/test-helpers.ts
export function createTestActor(overrides?: Partial<ActorOptions>): Actor {
  return new Actor(
    overrides?.llmProvider ?? new MockLlmProvider(),
    overrides?.blackboard ?? createMockBlackboard(),
    overrides?.capability ?? createMockCapabilityService(),
    logger,
  );
}

export function createMockBlackboard(): BlackboardService {
  return new BlackboardService(
    logger,
    undefined, // no snapshot
    undefined, // no audit log
  );
}
```

**Mock implementations**:

```typescript
// tests/mocks/mockLlmProvider.ts
export class MockLlmProvider implements LlmProvider {
  constructor(
    private readonly response: string = 'Mock response',
    private readonly delay: number = 0,
  ) {}

  async generate(_request: { system: string; user: string }): Promise<{ content: string }> {
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }
    return { content: this.response };
  }
}
```

### Error Testing

**Test error conditions**:

```typescript
it('should throw BoundaryViolationError when actor writes to core layer', async () => {
  const actor = createTestActor({ role: 'Actor' });
  const entry = createTestEntry('core', 'should fail');

  await expect(
    actor.generateDialogue(entry)
  ).rejects.toThrow(BoundaryViolationError);
});
```

### Integration Testing

**Test service interactions**:

```typescript
describe('Session Orchestration', () => {
  it('should complete full session with director and actors', async () => {
    const session = new DramaSession(/* ... */);
    
    const result = await session.runCompleteDrama(3);
    
    expect(result.scenes).toHaveLength(3);
    expect(result.dialogues).toHaveLength(9); // 3 actors × 3 scenes
  });
});
```

### Chaos Testing

**Test resilience**:

```typescript
describe('Chaos Resilience', () => {
  it('should recover from actor timeout', async () => {
    const session = new DramaSession(/* ... */);
    const flakyActor = new FlakyLlmProvider({ timeoutAfter: 100 });
    
    session.injectChaos({ simulateTimeout: 'actor-1' });
    
    const result = await session.runScene(/* ... */);
    
    expect(result.skippedActors).toContain('actor-1');
  });
});
```

---

## Configuration

### Environment Variable Validation

**File**: `src/config.ts`

**Pattern**: Zod schema + typed config object

```typescript
const ConfigSchema = z.object({
  server: z.object({
    port: z.coerce.number().int().min(1).max(65535).default(3000),
    socketPort: z.coerce.number().int().min(1).max(65535).default(3001),
    logLevel: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  }),
  jwt: z.object({
    secret: z.string().min(32),
    expiresIn: z.string().default('24h'),
  }),
  llm: z.object({
    provider: z.enum(['openai', 'anthropic']),
    openaiApiKey: z.string().optional(),
    anthropicApiKey: z.string().optional(),
  }),
  // ...
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  const rawConfig = ConfigSchema.parse({
    server: {
      port: process.env.PORT,
      socketPort: process.env.SOCKET_PORT,
      logLevel: process.env.LOG_LEVEL,
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN,
    },
    llm: {
      provider: process.env.LLM_PROVIDER,
      openaiApiKey: process.env.OPENAI_API_KEY,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    },
  });

  return rawConfig;
}
```

### Constants

**Define constants in appropriate files**:

```typescript
// src/services/blackboard.ts
export const RECENT_TAIL_SIZE = 3;
export const BUDGET_ALERT_THRESHOLD = 0.6;
export const LAYER_NAMES: BlackboardLayer[] = ['core', 'scenario', 'semantic', 'procedural'];

// src/services/router.ts
export const DEFAULT_HEARTBEAT_INTERVAL_MS = 5000;
export const DEFAULT_ACTOR_TIMEOUT_MS = 30000;
export const DEFAULT_GRACE_PERIOD_MS = 10000;
```

---

## Frontend Conventions

### React Component Structure

```typescript
// frontend/src/components/SessionPanel.tsx
import { useState, useEffect } from 'react';

export function SessionPanel({ dramaId }: SessionPanelProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSession() {
      try {
        const data = await api.getSession(dramaId);
        setSession(data);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSession();
  }, [dramaId]);

  if (isLoading) return <div>Loading...</div>;
  if (!session) return <div>Session not found</div>;

  return (
    <div className="session-panel">
      {/* JSX */}
    </div>
  );
}
```

### Zustand Store Pattern

```typescript
// frontend/src/store/appStore.ts
import { create } from 'zustand';

interface AppState {
  sessions: Session[];
  config: Config;
  addSession: (session: Session) => void;
  updateConfig: (config: Partial<Config>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sessions: [],
  config: defaultConfig,
  addSession: (session) => set((state) => ({ 
    sessions: [...state.sessions, session] 
  })),
  updateConfig: (config) => set((state) => ({ 
    config: { ...state.config, ...config } 
  })),
}));
```

---

**End of Code Conventions**
