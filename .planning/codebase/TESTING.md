# Testing

## Testing Framework

- **Runner**: Vitest v2.0.0
- **Environment**: Node.js
- **HTTP Testing**: Supertest v7.0.0
- **Mocking**: Vitest built-in mocks (`vi.fn()`)
- **Timeout**: 30 seconds default (`testTimeout: 30000`)

## Test Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
  },
});
```

## Test File Structure

```
tests/
├── actor.test.ts              # Actor service unit tests
├── blackboard.test.ts         # Blackboard API integration tests
├── boundary.test.ts           # Perceptual boundary tests
├── chaos.test.ts              # Chaos/resilience testing
├── director.test.ts           # Director service unit tests
├── e2e.test.ts                # End-to-end workflow tests
├── llm.test.ts                # LLM provider tests
├── memoryManager.test.ts      # Memory management tests
├── protocol.test.ts           # Message protocol tests
├── routing.test.ts            # Socket.IO routing tests
├── session.test.ts            # Session orchestration tests
├── snapshot.test.ts           # Snapshot persistence tests
├── timeout.test.ts            # Timeout handling tests
├── sessionRegistry.test.ts    # Session registry tests
└── routes/
    └── sessions.test.ts       # Session route tests
```

## Testing Patterns

### Service Unit Test Pattern

```typescript
import { describe, it, expect, vi } from 'vitest';
import { Director } from '../src/services/director.js';

// Mock LLM Provider for deterministic testing
class MockLlmProvider implements LlmProvider {
  private responses: LlmResponse[];
  private callLog: { system: string; user: string }[] = [];

  constructor(responses: LlmResponse[]) {
    this.responses = responses;
  }

  async generate(prompt: LlmPrompt): Promise<LlmResponse> {
    this.callLog.push({ system: prompt.system, user: prompt.user });
    return this.responses.shift() ?? {
      content: JSON.stringify({ exchangeId: 'fallback', contradictions: [] }),
    };
  }

  getCallLog() { return this.callLog; }
}

// Mock Blackboard
defunction createMockBlackboard() {
  const layers = {
    core: { entries: [], version: 0 },
    scenario: { entries: [], version: 0 },
    semantic: { entries: [], version: 0 },
    procedural: { entries: [], version: 0 },
  };

  return {
    readLayer: (layer: string) => ({ layer, entries: [...layers[layer].entries], /* ... */ }),
    writeEntry: (layer: string, agentId: string, req: { content: string }) => {
      // Mock implementation
      return { entry: { id: 'test-id', agentId, content: req.content }, layerVersion: 1 };
    },
    // Track calls for assertions
    readCalls: [] as string[],
    writeCalls: [] as Array<{ layer: string; agentId: string; content: string }>,
  };
}

describe('Director Service', () => {
  it('should generate backbone with scene structure', async () => {
    // Arrange
    const mockBlackboard = createMockBlackboard();
    const mockProvider = new MockLlmProvider([{
      content: JSON.stringify({
        scenes: [{ sceneId: 'scene-1', description: 'Opening' }],
        characterArcs: [],
        plotPoints: [],
      }),
    }]);

    const director = new Director({
      blackboard: mockBlackboard as any,
      llmProvider: mockProvider,
      // ... other dependencies
    });

    // Act
    const result = await director.createBackbone({ theme: 'Test', characters: [] });

    // Assert
    expect(result.scenes).toHaveLength(1);
    expect(mockProvider.getCallLog()).toHaveLength(1);
    expect(mockBlackboard.writeCalls.some(c => c.layer === 'core')).toBe(true);
  });
});
```

### HTTP Integration Test Pattern

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import jwt from 'jsonwebtoken';
import express = require('express');

// Helper: create fully wired test app
function createTestApp(dataDir: string) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  const snapshotService = new SnapshotService(dataDir);
  const auditLogService = new AuditLogService(dataDir);
  const blackboardService = new BlackboardService(snapshotService.tryRestore());
  const capabilityService = createCapabilityService();

  // Wire services (same pattern as production)
  setBlackboardAuditLog(auditLogService);
  setSnapshotService(snapshotService);
  setBlackboardCapabilityService(capabilityService);

  app.locals.blackboard = blackboardService;
  app.locals.capabilityService = capabilityService;

  app.use('/blackboard', blackboardRouter);
  app.use('/health', healthRouter);

  return { app, snapshotService, auditLogService, blackboardService, capabilityService };
}

// Helper: generate test JWT
function issueToken(capabilityService: ReturnType<typeof createCapabilityService>, 
                   agentId: string, 
                   role: string): string {
  return jwt.sign(
    { agentId, role },
    capabilityService.jwtSecret,
    { expiresIn: '1h', algorithm: 'HS256' } as jwt.SignOptions,
  );
}

describe('Blackboard REST API', () => {
  let dataDir: string;
  let base: ReturnType<typeof request.Supertest.prototype>;
  let snapshotService: SnapshotService;
  let capabilityService: ReturnType<typeof createCapabilityService>;

  beforeEach(() => {
    // Create isolated temp directory for each test
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'blackboard-test-'));
    const result = createTestApp(dataDir);
    base = request(result.app);
    snapshotService = result.snapshotService;
    capabilityService = result.capabilityService;
  });

  afterEach(() => {
    // Clean up resources
    try { snapshotService.stopTimer(); } catch {}
    try { fs.rmSync(dataDir, { recursive: true }); } catch {}
  });

  it('SC1: write then read returns the same entry', async () => {
    const token = issueToken(capabilityService, 'test-agent', 'Director');
    const payload = { content: 'Hello world', messageId: 'msg-001' };

    // Write
    const postRes = await base
      .post('/blackboard/core?agentId=test-agent')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);
    expect(postRes.status).toBe(201);

    // Read
    const getRes = await base
      .get(`/blackboard/core/${postRes.body.entry.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.entry.content).toBe(payload.content);
  });
});
```

### Chaos Testing Pattern

```typescript
describe('Chaos Tests', () => {
  it('should handle actor timeout gracefully', async () => {
    const session = createTestSession();
    
    // Inject chaos: actor that never responds
    session.setChaosHooks({
      beforeTurn: async (agentId) => {
        if (agentId === 'slow-actor') {
          await sleep(10000); // Exceeds timeout
        }
      },
    });

    const result = await session.runExchange();
    
    // Should skip actor, not crash
    expect(result.skippedActors).toContain('slow-actor');
    expect(result.completedActors).toHaveLength(2);
  });

  it('should handle concurrent scene starts', async () => {
    const promises = [
      session.startScene(scene1),
      session.startScene(scene2), // Should be rejected or queued
    ];
    
    const results = await Promise.allSettled(promises);
    expect(results.filter(r => r.status === 'rejected')).toHaveLength(1);
  });
});
```

### Mock Time for Timeout Tests

```typescript
describe('TimeoutManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should trigger timeout callback after delay', () => {
    const onTimeout = vi.fn();
    const manager = new TimeoutManager(logger, {
      actorTimeoutMs: 5000,
      onActorTimeout: onTimeout,
    });

    manager.startActorTimer('actor-1', 'scene-1', 0);
    
    // Fast-forward time
    vi.advanceTimersByTime(5000);
    
    expect(onTimeout).toHaveBeenCalledWith('actor-1', 'scene-1', 0);
  });
});
```

## Test Categories

### Unit Tests
- **Location**: Adjacent to source or in `tests/`
- **Scope**: Single class/function
- **Dependencies**: Mocked
- **Examples**:
  - `director.test.ts` - Director service logic
  - `actor.test.ts` - Actor dialogue generation
  - `memoryManager.test.ts` - Folding/promotion logic

### Integration Tests
- **Location**: `tests/*.test.ts`
- **Scope**: Multiple services + API
- **Dependencies**: Real services, temp directories
- **Examples**:
  - `blackboard.test.ts` - Full blackboard API
  - `sessionRegistry.test.ts` - Session CRUD

### E2E Tests
- **Location**: `tests/e2e.test.ts`
- **Scope**: Full workflow from HTTP to LLM to response
- **Dependencies**: Complete service stack
- **Pattern**: Create session → start scene → run exchanges → verify output

### Chaos/Resilience Tests
- **Location**: `tests/chaos.test.ts`
- **Scope**: Error handling and recovery
- **Pattern**: Inject failures, verify graceful degradation

## Testing Utilities

### Common Helpers

```typescript
// tests/helpers.ts

export function createTestLogger(): pino.Logger {
  return pino({ level: 'silent' }); // Suppress logs in tests
}

export async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
  try {
    return await fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export function createMockLlmResponse(content: object): LlmResponse {
  return {
    content: JSON.stringify(content),
  };
}
```

## Best Practices

### 1. Isolated Test Data
```typescript
// Good: Each test gets its own temp directory
beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
});
afterEach(() => {
  fs.rmSync(dataDir, { recursive: true });
});
```

### 2. Resource Cleanup
```typescript
// Always clean up timers, connections, files
afterEach(() => {
  snapshotService.stopTimer();
  routerService.stop();
  auditLogService.close();
});
```

### 3. Deterministic Tests
```typescript
// Use mock LLM with predefined responses
const mockProvider = new MockLlmProvider([
  { content: JSON.stringify({ scenes: [] }) },
  { content: JSON.stringify({ dialogue: 'Hello' }) },
]);
```

### 4. Clear Test Names
```typescript
// Pattern: [Component] should [behavior] when [condition]
it('Director should arbitrate conflicts when actors contradict', async () => {
  // ...
});
```

### 5. Arrange-Act-Assert
```typescript
it('should fold layer when budget exceeded', async () => {
  // Arrange
  const blackboard = createBlackboardWithEntries(100);
  const manager = new MemoryManagerService({ blackboard, ...deps });
  
  // Act
  await manager.checkBudget('semantic');
  
  // Assert
  expect(blackboard.readLayer('semantic').entries).toHaveLength(1);
  expect(blackboard.readLayer('semantic').entries[0].metadata?.foldSummary).toBe(true);
});
```

## Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Run specific test file
npx vitest run tests/director.test.ts

# Run with coverage (requires config)
npx vitest run --coverage
```

## Coverage Areas

| Component | Coverage Focus |
|-----------|----------------|
| Blackboard | CRUD, versioning, budget enforcement, error handling |
| Director | Planning, arbitration, fact-checking, prompt building |
| Actor | Dialogue generation, voice constraints, memory integration |
| Router | Message routing, heartbeat, timeout handling |
| Memory Manager | Folding, promotion, budget alerts |
| Sessions | Lifecycle, state transitions, cleanup |
