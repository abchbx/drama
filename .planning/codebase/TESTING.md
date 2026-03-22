# Testing Documentation

**Project:** Multi-Agent Drama System  
**Version:** v1.1  
**Last Updated:** 2026-03-22  

## Table of Contents
- [Testing Framework](#testing-framework)
- [Test Organization](#test-organization)
- [Test Structure](#test-structure)
- [Mock Patterns](#mock-patterns)
- [Integration Testing](#integration-testing)
- [Chaos Testing](#chaos-testing)
- [Test Commands](#test-commands)

---

## Testing Framework

### Vitest Configuration

**File**: `vitest.config.ts`

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
  },
});
```

**Key Settings**:
- **globals**: `true` - Use `describe`, `it`, `expect` without imports
- **environment**: `node` - Server-side testing environment
- **testTimeout**: `30000` - 30 second timeout for each test

### Dependencies

- **vitest 2.0.0** - Testing framework
- **supertest 7.0.0** - HTTP assertion library
- **tsx 4.16.0** - TypeScript execution (for test setup)

---

## Test Organization

### Test File Structure

**Directory**: `tests/`

```
tests/
├── actor.test.ts              # Actor service tests
├── blackboard.test.ts         # Blackboard service tests
├── boundary.test.ts           # Capability enforcement tests
├── chaos.test.ts              # Resilience and failure tests
├── director.test.ts           # Director service tests
├── e2e.test.ts               # End-to-end orchestration tests
├── memoryManager.test.ts      # Memory management tests
├── protocol.test.ts           # Message routing tests
├── sessionRegistry.test.ts    # Session registry tests
└── routes/                    # Route handler tests
    ├── blackboard.test.ts
    ├── sessions.test.ts
    └── ...
```

### Test Naming Convention

**Pattern**: `featureName.test.ts` or `serviceName.test.ts`

**Examples**:
- `actor.test.ts` - Actor service unit tests
- `blackboard.test.ts` - Blackboard service unit tests
- `boundary.test.ts` - Cognitive boundary enforcement tests
- `chaos.test.ts` - Chaos and resilience tests
- `e2e.test.ts` - End-to-end workflow tests

### Test Categories

1. **Unit Tests** - Individual service methods
2. **Integration Tests** - Service interactions
3. **E2E Tests** - Complete workflows
4. **Chaos Tests** - Resilience under failure

---

## Test Structure

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BlackboardService } from '../src/services/blackboard.js';
import { createTestEntry, createMockBlackboard } from './test-helpers.js';

describe('BlackboardService', () => {
  let blackboard: BlackboardService;

  beforeEach(() => {
    // Set up fresh instance for each test
    blackboard = createMockBlackboard();
  });

  afterEach(() => {
    // Cleanup if needed
    vi.clearAllMocks();
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

    it('should increment layer version on write', () => {
      const versionBefore = blackboard.getVersion('semantic');
      blackboard.writeEntry('semantic', createTestEntry('semantic', 'content'));
      
      expect(blackboard.getVersion('semantic')).toBe(versionBefore + 1);
    });
  });
});
```

### Describe Blocks

**Organize tests by feature**:

```typescript
describe('BlackboardService', () => {
  describe('writeEntry', () => {
    // All writeEntry tests
  });

  describe('readLayer', () => {
    // All readLayer tests
  });

  describe('token counting', () => {
    // Token-related tests
  });
});
```

### Test Descriptions

**Pattern**: `should <expected behavior> when <condition>`

```typescript
it('should write entry to correct layer');
it('should throw error when budget exceeded');
it('should preserve order of entries');
it('should fold semantic layer when 60% threshold reached');
```

---

## Mock Patterns

### Factory Functions

**File**: `tests/test-helpers.ts`

```typescript
import { Actor } from '../src/services/actor.js';
import { Director } from '../src/services/director.js';
import { BlackboardService } from '../src/services/blackboard.js';
import { CapabilityService } from '../src/services/capability.js';
import { MockLlmProvider } from './mocks/mockLlmProvider.js';
import pino from 'pino';

const logger = pino({ level: 'silent' });

// Factory: Create test actor with optional overrides
export function createTestActor(overrides?: Partial<ActorOptions>): Actor {
  return new Actor(
    overrides?.llmProvider ?? new MockLlmProvider(),
    overrides?.blackboard ?? createMockBlackboard(),
    overrides?.capability ?? createMockCapabilityService(),
    logger,
    overrides?.agentId ?? 'test-actor-1',
    overrides?.role ?? 'Actor',
  );
}

// Factory: Create test director
export function createTestDirector(overrides?: Partial<DirectorOptions>): Director {
  return new Director(
    overrides?.llmProvider ?? new MockLlmProvider(),
    overrides?.blackboard ?? createMockBlackboard(),
    overrides?.memoryManager ?? undefined,
    logger,
    overrides?.agentId ?? 'test-director-1',
  );
}

// Factory: Create mock blackboard with minimal setup
export function createMockBlackboard(): BlackboardService {
  return new BlackboardService(
    logger,
    undefined, // no snapshot service
    undefined, // no audit log service
  );
}

// Factory: Create mock capability service
export function createMockCapabilityService(): CapabilityService {
  return new CapabilityService('test-jwt-secret-32-chars-long!');
}
```

### Mock LLM Provider

**File**: `tests/mocks/mockLlmProvider.ts`

```typescript
import type { LlmProvider } from '../../src/services/llm.js';

export class MockLlmProvider implements LlmProvider {
  constructor(
    private readonly response: string = 'Mock response',
    private readonly delay: number = 0,
    private readonly throwError?: Error,
  ) {}

  async generate(_request: { system: string; user: string }): Promise<{ content: string }> {
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }
    
    if (this.throwError) {
      throw this.throwError;
    }
    
    return { content: this.response };
  }
}
```

### Flaky LLM Provider (for chaos testing)

**File**: `tests/mocks/flakyLlmProvider.ts`

```typescript
import type { LlmProvider } from '../../src/services/llm.js';

export class FlakyLlmProvider implements LlmProvider {
  private callCount = 0;

  constructor(
    private readonly failureRate: number = 0.3, // 30% failure rate
    private readonly timeoutAfter?: number, // timeout after N calls
  ) {}

  async generate(request: { system: string; user: string }): Promise<{ content: string }> {
    this.callCount++;

    // Simulate timeout
    if (this.timeoutAfter && this.callCount >= this.timeoutAfter) {
      await new Promise(() => {}); // Never resolves
    }

    // Simulate random failure
    if (Math.random() < this.failureRate) {
      throw new Error('Simulated LLM failure');
    }

    return { content: `Flaky response #${this.callCount}` };
  }
}
```

### Data Factory Functions

**File**: `tests/test-data.ts`

```typescript
import type { BlackboardEntry, CharacterCard } from '../../src/types/index.js';

export function createTestEntry(
  layer: 'core' | 'scenario' | 'semantic' | 'procedural',
  content: string,
  overrides?: Partial<BlackboardEntry>
): BlackboardEntry {
  return {
    id: crypto.randomUUID(),
    agentId: 'test-agent-1',
    timestamp: new Date().toISOString(),
    content,
    tokenCount: content.length, // Simplified for tests
    version: 1,
    ...overrides,
  };
}

export function createTestCharacterCard(overrides?: Partial<CharacterCard>): CharacterCard {
  return {
    id: 'character-1',
    name: 'Test Character',
    role: 'Protagonist',
    backstory: 'A test character for unit tests',
    objectives: ['Complete objective 1', 'Complete objective 2'],
    voice: {
      vocabularyRange: ['simple', 'clear'],
      sentenceLength: 'medium',
      emotionalRange: ['neutral'],
      speechPatterns: [],
      forbiddenTopics: [],
      forbiddenWords: [],
    },
    ...overrides,
  };
}
```

---

## Integration Testing

### Service Interaction Tests

```typescript
describe('Actor-Blackboard Integration', () => {
  it('should write dialogue to semantic layer', async () => {
    const blackboard = createMockBlackboard();
    const actor = createTestActor({ blackboard });
    
    await actor.generateDialogue(createTestSceneContext());
    
    const semanticLayer = blackboard.readLayer('semantic');
    expect(semanticLayer).toHaveLength(1);
    expect(semanticLayer[0].metadata?.dialogueFor).toBe(actor.agentId);
  });

  it('should read from correct layers based on capability', async () => {
    const blackboard = createMockBlackboard();
    const capability = createMockCapabilityService();
    const actor = createTestActor({ blackboard, capability });
    
    // Write to different layers
    blackboard.writeEntry('core', createTestEntry('core', 'core fact'));
    blackboard.writeEntry('semantic', createTestEntry('semantic', 'dialogue'));
    
    const context = await actor.getFactContext();
    
    // Actor should read semantic but not core (boundary enforced)
    expect(context.semantic).toHaveLength(1);
    expect(context.core).toBeUndefined();
  });
});
```

### HTTP API Integration Tests

```typescript
import request from 'supertest';
import { app } from '../src/app.js';

describe('HTTP API Integration', () => {
  let authToken: string;

  beforeEach(async () => {
    // Register agent and get JWT
    const response = await request(app)
      .post('/blackboard/agents/register')
      .send({ agentId: 'test-agent-1', role: 'Actor' });
    
    authToken = response.body.token;
  });

  it('should create entry with valid JWT', async () => {
    const response = await request(app)
      .post('/blackboard/layers/semantic/entries')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ content: 'test content' });
    
    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();
  });

  it('should reject entry creation without JWT', async () => {
    const response = await request(app)
      .post('/blackboard/layers/semantic/entries')
      .send({ content: 'test content' });
    
    expect(response.status).toBe(401);
  });
});
```

---

## Chaos Testing

### Actor Timeout Tests

```typescript
describe('Chaos: Actor Timeout', () => {
  it('should skip actor when timeout exceeded', async () => {
    const session = new DramaSession(/* ... */);
    
    // Inject slow LLM provider
    session.injectChaos({
      simulateTimeout: 'actor-1',
      timeoutMs: 100,
    });
    
    const result = await session.runScene({
      actors: ['actor-1', 'actor-2'],
      duration: 30000,
    });
    
    expect(result.skippedActors).toContain('actor-1');
    expect(result.dialogues).toHaveLength(1); // Only actor-2 completed
  });
});
```

### Network Failure Simulation

```typescript
describe('Chaos: Network Failures', () => {
  it('should recover from temporary disconnection', async () => {
    const router = new RouterService(/* ... */);
    const actor = createTestActor();
    
    // Simulate disconnection
    await router.disconnectAgent('actor-1');
    
    // Message should be buffered
    router.sendPeerToPeer('actor-1', { type: 'your_turn', payload: {} });
    
    // Reconnect
    await router.reconnectAgent('actor-1');
    
    // Buffered message should be delivered
    const received = await actor.receiveMessage();
    expect(received?.type).toBe('your_turn');
  });
});
```

### Memory Pressure Tests

```typescript
describe('Chaos: Memory Pressure', () => {
  it('should fold semantic layer when budget exceeded', async () => {
    const blackboard = createMockBlackboard({ 
      semanticBudget: 100, // Very small budget
    });
    
    // Write many entries
    for (let i = 0; i < 20; i++) {
      blackboard.writeEntry('semantic', createTestEntry('semantic', `entry ${i}`));
    }
    
    const layer = blackboard.readLayer('semantic');
    
    // Should have folded and kept only recent entries
    expect(layer.length).toBeLessThan(20);
    expect(layer.some(e => e.metadata?.foldSummary)).toBe(true);
  });
});
```

---

## Error Testing

### Throwing Expected Errors

```typescript
it('should throw BoundaryViolationError when actor writes to core', async () => {
  const blackboard = createMockBlackboard();
  const actor = createTestActor({ blackboard });
  
  const entry = createTestEntry('core', 'should fail');
  
  await expect(
    actor.writeToBlackboard(entry)
  ).rejects.toThrow(BoundaryViolationError);
});
```

### Testing Error Properties

```typescript
it('should include error metadata in BoundaryViolationError', async () => {
  const blackboard = createMockBlackboard();
  const actor = createTestActor({ blackboard, agentId: 'actor-123', role: 'Actor' });
  
  try {
    await actor.writeToBlackboard(createTestEntry('core', 'fail'));
    expect.fail('Should have thrown');
  } catch (error) {
    expect(error).toBeInstanceOf(BoundaryViolationError);
    expect((error as BoundaryViolationError).agentId).toBe('actor-123');
    expect((error as BoundaryViolationError).layer).toBe('core');
    expect((error as BoundaryViolationError).operation).toBe('write');
  }
});
```

---

## Test Commands

### Run All Tests

```bash
npm test
```

**Output**: All tests run once, results displayed in terminal

### Watch Mode

```bash
npm run test:watch
```

**Behavior**: Tests re-run on file changes, useful for TDD

### Run Specific Test File

```bash
npm test actor.test.ts
```

### Run Tests Matching Pattern

```bash
npm test -- --grep "should write"
```

### Coverage Report

```bash
npm test -- --coverage
```

**Note**: Coverage is tracked but no minimum enforced

---

## Best Practices

### Test Independence

**Each test should be isolated**:

```typescript
describe('Feature', () => {
  beforeEach(() => {
    // Fresh state for each test
  });

  it('test 1', () => {
    // No assumptions about other tests
  });

  it('test 2', () => {
    // No assumptions about other tests
  });
});
```

### Clear Assertions

**Use specific assertions**:

```typescript
// Good - Specific assertion
expect(layer).toHaveLength(5);
expect(layer[0].content).toBe('expected content');

// Avoid - Generic assertions
expect(layer).toBeTruthy();
```

### Test Edge Cases

**Test boundary conditions**:

```typescript
it('should handle empty content', () => {
  blackboard.writeEntry('semantic', createTestEntry('semantic', ''));
  expect(blackboard.readLayer('semantic')).toHaveLength(1);
});

it('should handle maximum budget exactly', () => {
  const blackboard = createMockBlackboard({ semanticBudget: 100 });
  blackboard.writeEntry('semantic', createTestEntry('semantic', 'x'.repeat(100)));
  expect(blackboard.readLayer('semantic')).toHaveLength(1);
});

it('should exceed budget by one token', () => {
  const blackboard = createMockBlackboard({ semanticBudget: 100 });
  expect(() => {
    blackboard.writeEntry('semantic', createTestEntry('semantic', 'x'.repeat(101)));
  }).toThrow(TokenBudgetExceededError);
});
```

---

**End of Testing Documentation**
