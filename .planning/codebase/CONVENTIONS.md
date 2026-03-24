# Conventions

## Code Style

### TypeScript Configuration
- **Target**: ES2022
- **Module**: NodeNext with NodeNext resolution
- **Strict Mode**: Enabled with `noUncheckedIndexedAccess`
- **ESM**: All files use ES Modules (`"type": "module"` in package.json)

### Import/Export Conventions

#### Import Order
```typescript
// 1. External dependencies
import type pino from 'pino';
import { z } from 'zod';
import { Server as SocketIOServer } from 'socket.io';

// 2. Internal types
import type { BlackboardService } from '../types/blackboard.js';
import type { LlmProvider } from './llm.js';

// 3. Internal implementations
import { DirectorMemoryService } from './directorMemory.js';
import { config } from '../config.js';
```

#### File Extensions
- **CRITICAL**: All imports MUST include `.js` extension for ESM compatibility
- Correct: `import { X } from './file.js'`
- Incorrect: `import { X } from './file'`

#### Type-Only Imports
Use `import type` for type-only imports to avoid circular dependency issues:
```typescript
import type { BlackboardService } from './blackboard.js';
import type { CharacterCard } from '../types/actor.js';
```

### Naming Conventions

| Category | Pattern | Example |
|----------|---------|---------|
| Services | PascalCase | `BlackboardService`, `Director`, `Actor` |
| Interfaces | PascalCase | `LlmProvider`, `SceneConfig` |
| Types | PascalCase | `BlackboardLayer`, `DialogueOutput` |
| Zod Schemas | PascalCase + Schema | `CharacterCardSchema`, `RoutingMessageSchema` |
| Functions | camelCase | `buildActorSystemPrompt()`, `countTokens()` |
| Variables | camelCase | `blackboardService`, `entryCount` |
| Constants | UPPER_SNAKE_CASE | `LAYER_BUDGETS`, `BUDGET_ALERT_THRESHOLD` |
| Error Classes | PascalCase + Error | `VersionConflictError`, `ActorGenerationError` |
| Private Members | Leading underscore | `_encoder`, `_io` |

### Class Structure

#### Service Classes
```typescript
export class ServiceName {
  // Private readonly dependencies first
  private readonly dependency: DependencyType;
  private readonly logger: pino.Logger;
  
  // Private mutable state
  private currentState: StateType;
  
  constructor(options: ServiceOptions) {
    // Validation first
    if (!options.required) throw new Error('Service requires X');
    
    // Assignment
    this.dependency = options.dependency;
    this.logger = options.logger;
    this.currentState = initialState;
  }
  
  // Public methods
  public async doSomething(): Promise<Result> { }
  
  // Private methods
  private helper(): void { }
}
```

## Type Patterns

### Zod Schema Definition Pattern
```typescript
// 1. Define raw interface (for documentation)
export interface CharacterCard {
  name: string;
  role: string;
  voice: VoiceProfile;
}

// 2. Define Zod schema with runtime validation
export const CharacterCardSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  voice: VoiceProfileSchema,
});

// 3. Infer and export type from schema
export type CharacterCard = z.infer<typeof CharacterCardSchema>;

// 4. Custom error class
export class CharacterCardError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'CharacterCardError';
  }
}
```

### Discriminated Union Pattern
```typescript
export type RoutingMessage = 
  | { type: 'scene:start'; sceneId: string; directorId: string; }
  | { type: 'scene:end'; sceneId: string; directorId: string; }
  | { type: 'dialogue'; agentId: string; content: string; };
```

### Readonly Pattern
Use `readonly` for immutable properties:
```typescript
export interface BlackboardEntry {
  readonly id: string;
  readonly agentId: string;
  readonly timestamp: string;
  readonly content: string;
  readonly tokenCount: number;
  readonly version: number;
}
```

## Error Handling

### Custom Error Classes
All service errors extend Error with additional context:

```typescript
// src/types/blackboard.ts
export class VersionConflictError extends Error {
  readonly currentVersion: number;
  readonly expectedVersion: number;
  
  constructor(currentVersion: number, expectedVersion: number) {
    super(`Version conflict: expected ${expectedVersion}, current ${currentVersion}`);
    this.name = 'VersionConflictError';
    this.currentVersion = currentVersion;
    this.expectedVersion = expectedVersion;
  }
}

export class TokenBudgetExceededError extends Error {
  readonly layer: BlackboardLayer;
  readonly budget: number;
  
  constructor(layer: BlackboardLayer, budget: number, currentCount: number, attemptedCount: number) {
    super(`Token budget exceeded for layer '${layer}': budget=${budget}...`);
    this.name = 'TokenBudgetExceededError';
    this.layer = layer;
    this.budget = budget;
    this.currentCount = currentCount;
    this.attemptedCount = attemptedCount;
  }
}
```

### Error Handling Pattern
```typescript
// In services: throw typed errors
try {
  const result = riskyOperation();
  return result;
} catch (error) {
  this.logger.error({ error }, 'operation failed');
  throw new SpecificServiceError('context', error);
}

// In routes: convert to HTTP responses
try {
  const result = await service.operation();
  res.json(result);
} catch (error) {
  if (error instanceof VersionConflictError) {
    return res.status(409).json({ error: 'Conflict', currentVersion: error.currentVersion });
  }
  next(error);
}
```

## Logging Conventions

### Logger Usage
```typescript
// Child loggers for components
const logger = pino({ level: config.LOG_LEVEL });
const childLogger = logger.child({ component: 'Director' });
const sessionLogger = (sessionId: string) => logger.child({ sessionId });

// Structured logging
logger.info({ sessionId, actorCount: 3 }, 'session initialized');
logger.error({ error, agentId }, 'agent generation failed');
logger.debug({ layer, tokenCount }, 'blackboard write');
```

### Log Levels
- `fatal` - System cannot continue
- `error` - Operation failed, may retry
- `warn` - Unexpected but handled condition
- `info` - Normal operation milestones
- `debug` - Detailed flow tracing (dev only)

## Code Organization Patterns

### Service Dependencies
Dependencies are explicitly declared and validated:

```typescript
export interface DirectorOptions {
  blackboard: BlackboardService;
  capabilityService: CapabilityService;
  llmProvider: LlmProvider;
  memoryManager: MemoryManagerService;
  logger: pino.Logger;
  agentId: string;
}

export class Director {
  constructor(options: DirectorOptions) {
    if (!options.blackboard) throw new Error('Director requires blackboard service');
    if (!options.capabilityService) throw new Error('Director requires capability service');
    // ... validation for all required dependencies
    
    this.blackboard = options.blackboard;
    // ... assignment
  }
}
```

### Interface Segregation
LLM providers implement a common interface:

```typescript
export interface LlmProvider {
  generate(prompt: LlmPrompt): Promise<LlmResponse>;
}

// Implementations in separate files
export class OpenAiLlmProvider implements LlmProvider { }
export class AnthropicLlmProvider implements LlmProvider { }
export class MockLlmProvider implements LlmProvider { }
```

### Factory Pattern
```typescript
export async function createLlmProvider(logger: pino.Logger): Promise<LlmProvider> {
  const config = await getLLMConfig();
  
  if (config.provider === 'openai' && config.openaiApiKey) {
    return new OpenAiLlmProvider(config, logger);
  }
  if (config.provider === 'anthropic' && config.anthropicApiKey) {
    return new AnthropicLlmProvider(config, logger);
  }
  
  logger.warn('No valid LLM config, using mock provider');
  return new MockLlmProvider(logger);
}
```

## Documentation Conventions

### JSDoc for Public APIs
```typescript
/**
 * Main public API: generate dialogue for a scene exchange.
 *
 * Flow:
 * 1. Generate exchangeId
 * 2. Build system + user prompts from SceneContext
 * 3. Call LLM via injected provider (no hardcoded SDK)
 * 4. Parse + validate JSON response with Zod
 * 5. Write dialogue entries to semantic layer
 * 6. Return DialogueOutput
 */
public async generate(context: SceneContext): Promise<DialogueOutput> {
  // Implementation
}
```

### Comments for Complex Logic
```typescript
// Hard assertion: Director MUST NOT write to semantic layer
// (role contract — DIR-03)
const allowedLayers = this.capabilityService.capabilityMap['Director'];
if ((allowedLayers as string[]).includes('semantic')) {
  throw new Error('Director capability configuration error: semantic layer write must be denied');
}
```

## Configuration Patterns

### Environment Validation with Zod
```typescript
const ConfigSchema = z.object({
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  OPENAI_API_KEY: z.string().optional(),
});

export function loadConfig(): Config {
  try {
    return ConfigSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Configuration validation failed:', error);
    process.exit(1);
  }
}
```

## File Organization

### Service File Template
```typescript
// 1. Imports
import type { Dependency } from './dependency.js';

// 2. Type exports (if any)
export interface ServiceOptions { }
export type ServiceResult = { };

// 3. Error classes
export class ServiceError extends Error { }

// 4. Main class
export class ServiceName {
  // Implementation
}

// 5. Helper functions (private or exported)
function helper(): void { }
```

## Testing Patterns

See [TESTING.md](./TESTING.md) for detailed testing conventions.

### Key Testing Principles
- Use `MockLlmProvider` for deterministic LLM responses
- Create fresh test apps with isolated data directories
- Clean up resources in `afterEach`
- Use JWT tokens for authenticated routes
- Mock time for timeout-related tests
