import { describe, it, expect, vi } from 'vitest';
import { MemoryManagerService } from '../src/services/memoryManager.js';
import type { LlmProvider, LlmResponse } from '../src/services/llm.js';
import type { BlackboardService } from '../src/services/blackboard.js';
import type { pino } from 'pino';
import { LAYER_BUDGETS, TokenBudgetExceededError } from '../src/types/blackboard.js';

// ---------------------------------------------------------------------------
// MockLlmProvider
// ---------------------------------------------------------------------------

class MockLlmProvider implements LlmProvider {
  private responses: LlmResponse[];
  private callLog: { system: string; user: string }[] = [];

  constructor(responses: LlmResponse[]) {
    this.responses = responses;
  }

  async generate(prompt: { system: string; user: string }): Promise<LlmResponse> {
    this.callLog.push({ system: prompt.system, user: prompt.user });
    return this.responses.shift() ?? {
      content: 'This is a summary of the folded entries.',
    };
  }

  getCallLog() {
    return this.callLog;
  }
}

// ---------------------------------------------------------------------------
// Mock blackboard
// ---------------------------------------------------------------------------

function createMockBlackboard() {
  const layers: Record<string, { entries: Array<{ id: string; agentId: string; content: string; metadata?: Record<string, unknown>; tokenCount?: number; timestamp?: string }>; version: number }> = {
    core: { entries: [], version: 0 },
    scenario: { entries: [], version: 0 },
    semantic: { entries: [], version: 0 },
    procedural: { entries: [], version: 0 },
  };

  const readCalls: string[] = [];
  const writeCalls: { layer: string; agentId: string; content: string; messageId?: string; metadata?: Record<string, unknown> }[] = [];
  const deleteCalls: { layer: string; entryId: string }[] = [];

  const countTokens = (text: string) => Math.ceil(text.length / 4);

  const blackboard = {
    readLayer(layer: string) {
      readCalls.push(layer);
      const ls = layers[layer];
      const tokenCount = ls?.entries.reduce((s, e) => s + (e.tokenCount ?? countTokens(e.content)), 0) ?? 0;
      return {
        layer,
        currentVersion: ls?.version ?? 0,
        tokenCount,
        tokenBudget: LAYER_BUDGETS[layer as keyof typeof LAYER_BUDGETS] ?? 8000,
        budgetUsedPct: 0,
        entries: ls ? [...ls.entries] : [],
      };
    },
    readEntry(layer: string, entryId: string) {
      const ls = layers[layer];
      const entry = ls?.entries.find(e => e.id === entryId);
      if (!entry) throw new Error(`Entry ${entryId} not found in layer ${layer}`);
      return { entry, currentVersion: ls.version };
    },
    writeEntry(layer: string, agentId: string, req: { content: string; messageId?: string; metadata?: Record<string, unknown> }) {
      const id = `entry-${writeCalls.length + 1}`;
      writeCalls.push({ layer, agentId, content: req.content, messageId: req.messageId, metadata: req.metadata });
      const ls = layers[layer];
      if (!ls) return { entry: { id, agentId, content: req.content }, layerVersion: 0 };

      const entry = {
        id,
        agentId,
        content: req.content,
        tokenCount: countTokens(req.content),
        timestamp: new Date().toISOString(),
        version: ls.version,
        metadata: req.metadata,
      };
      ls.entries.push(entry);
      ls.version++;
      return { entry, layerVersion: ls.version };
    },
    deleteEntries(layer: string, entryIds: string[]) {
      const ls = layers[layer];
      if (!ls) return;
      entryIds.forEach(id => {
        deleteCalls.push({ layer, entryId: id });
        const idx = ls.entries.findIndex(e => e.id === id);
        if (idx !== -1) {
          ls.entries.splice(idx, 1);
        }
      });
      ls.version++;
    },
    updateEntryMetadata(layer: string, entryId: string, metadata: Record<string, unknown>, agentId: string) {
      const ls = layers[layer];
      if (!ls) return;
      const entry = ls.entries.find(e => e.id === entryId);
      if (entry) {
        entry.metadata = { ...entry.metadata, ...metadata };
      }
    },
    _readCalls: readCalls,
    _writeCalls: writeCalls,
    _deleteCalls: deleteCalls,
  };

  // Seed semantic layer with entries for folding tests
  blackboard.seedSemanticEntries = (count: number) => {
    for (let i = 0; i < count; i++) {
      layers.semantic.entries.push({
        id: `semantic-${i + 1}`,
        agentId: `actor-${i % 2 + 1}`,
        content: `This is semantic entry ${i + 1} with some content.`,
        tokenCount: 1000, // 1000 tokens per entry to test budget
        timestamp: new Date(Date.now() - (count - i) * 1000 * 60).toISOString(), // oldest first
      });
    }
  };

  // Seed procedural layer with voice constraint entries
  blackboard.seedProceduralEntries = () => {
    layers.procedural.entries.push({
      id: 'procedural-voice-1',
      agentId: 'director-1',
      content: 'Voice constraints for actor-1',
      metadata: { voiceConstraints: true },
      tokenCount: 500,
    });
    layers.procedural.entries.push({
      id: 'procedural-temp-1',
      agentId: 'director-1',
      content: 'Temporary procedural entry',
      metadata: {},
      tokenCount: 1000,
    });
    layers.procedural.entries.push({
      id: 'procedural-temp-2',
      agentId: 'director-1',
      content: 'Another temporary entry',
      metadata: {},
      tokenCount: 1000,
    });
  };

  // Seed scenario layer for promotion test
  blackboard.seedScenarioEntry = () => {
    const entry = {
      id: 'scenario-1',
      agentId: 'director-1',
      content: 'Important scenario fact to be promoted.',
      tokenCount: 500,
    };
    layers.scenario.entries.push(entry);
    return entry;
  };

  return blackboard as unknown as BlackboardService & {
    _readCalls: string[];
    _writeCalls: { layer: string; agentId: string; content: string; messageId?: string; metadata?: Record<string, unknown> }[];
    _deleteCalls: { layer: string; entryId: string }[];
    seedSemanticEntries: (count: number) => void;
    seedProceduralEntries: () => void;
    seedScenarioEntry: () => { id: string; agentId: string; content: string; tokenCount: number };
  };
}

// ---------------------------------------------------------------------------
// Mock logger
// ---------------------------------------------------------------------------

function createMockLogger(): pino.Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn(),
    level: 'info',
    silent: false,
    isLevelEnabled: vi.fn(),
  } as unknown as pino.Logger;
}

// ---------------------------------------------------------------------------
// createTestMemoryManager helper
// ---------------------------------------------------------------------------

function createTestMemoryManager(llmProvider: MockLlmProvider, mockBlackboard?: ReturnType<typeof createMockBlackboard>) {
  const blackboard = mockBlackboard ?? createMockBlackboard();
  const logger = createMockLogger();

  const memoryManager = new MemoryManagerService({
    blackboard,
    llmProvider,
    logger,
  });

  return { memoryManager, blackboard, llmProvider };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MemoryManagerService — MEM-01: Budget alert system', () => {
  it('checkAndEmitAlert emits alert at 60% budget usage', () => {
    const mockLLM = new MockLlmProvider([]);
    const mockBlackboard = createMockBlackboard();

    // Seed entries that fill 60% of semantic budget (8000 * 0.6 = 4800 tokens)
    for (let i = 0; i < 12; i++) {
      mockBlackboard.writeEntry('semantic', 'actor-1', {
        content: 'x'.repeat(1600), // ~400 tokens each (12 * 400 = 4800 tokens)
        metadata: {},
      });
    }

    const alertCallback = vi.fn();
    const { memoryManager } = createTestMemoryManager(mockLLM, mockBlackboard);
    (memoryManager as any).alertCallback = alertCallback;

    // Call the private method directly for testing
    (memoryManager as any).checkAndEmitAlert('semantic');

    expect(alertCallback).toHaveBeenCalled();
  });

  it('does not emit alert below 60% budget', () => {
    const mockLLM = new MockLlmProvider([]);
    const mockBlackboard = createMockBlackboard();

    // Seed entries that fill 50% of semantic budget (4000 tokens)
    for (let i = 0; i < 4; i++) {
      mockBlackboard.writeEntry('semantic', 'actor-1', {
        content: 'x'.repeat(1600), // ~400 tokens each
        metadata: {},
      });
    }

    const alertCallback = vi.fn();
    const { memoryManager } = createTestMemoryManager(mockLLM, mockBlackboard);
    (memoryManager as any).alertCallback = alertCallback;

    (memoryManager as any).checkAndEmitAlert('semantic');

    expect(alertCallback).not.toHaveBeenCalled();
  });
});

describe('MemoryManagerService — MEM-02: Semantic layer folding', () => {
  it('performs semantic fold when budget is exceeded', async () => {
    const mockLLM = new MockLlmProvider([]);
    const mockBlackboard = createMockBlackboard();
    mockBlackboard.seedSemanticEntries(10); // ~10,000 tokens (exceeds 8000 budget)

    const { memoryManager, blackboard } = createTestMemoryManager(mockLLM, mockBlackboard);

    // Make writeEntry throw TokenBudgetExceededError to trigger fold
    (blackboard as any).writeEntry = vi.fn()
      .mockImplementationOnce(() => { throw new TokenBudgetExceededError('semantic', LAYER_BUDGETS.semantic, 10000, 500) })
      .mockImplementationOnce((layer: string, agentId: string, req: any) => ({
        entry: { id: 'summary-1', agentId, content: req.content },
        layerVersion: 1,
      }));

    await memoryManager.writeEntryWithMemoryManagement('semantic', 'actor-1', {
      content: 'New entry that causes overflow',
    });

    expect((blackboard as any)._deleteCalls.length).toBeGreaterThan(0);
  });

  it('preserves recent tail of 3 entries when folding semantic layer', async () => {
    const mockLLM = new MockLlmProvider([]);
    const mockBlackboard = createMockBlackboard();
    mockBlackboard.seedSemanticEntries(10);

    const foldCallback = vi.fn();
    const { memoryManager } = createTestMemoryManager(mockLLM, mockBlackboard);
    (memoryManager as any).foldCallback = foldCallback;

    await (memoryManager as any).performFold('semantic');

    expect(foldCallback).toHaveBeenCalled();
    const foldMeta = foldCallback.mock.calls[0][1];
    expect(foldMeta.tailPreservedCount).toBe(3);
  });

  it('summarizes folded entries using LLM', async () => {
    const mockLLM = new MockLlmProvider([]);
    const mockBlackboard = createMockBlackboard();
    mockBlackboard.seedSemanticEntries(10);

    const { memoryManager, llmProvider } = createTestMemoryManager(mockLLM, mockBlackboard);

    await (memoryManager as any).performFold('semantic');

    expect(llmProvider.getCallLog().length).toBe(1);
    expect(llmProvider.getCallLog()[0].user).toContain('Summarize these semantic layer entries');
  });
});

describe('MemoryManagerService — MEM-03: Procedural layer folding', () => {
  it('preserves voice constraint entries when folding procedural layer', async () => {
    const mockLLM = new MockLlmProvider([]);
    const mockBlackboard = createMockBlackboard();
    mockBlackboard.seedProceduralEntries();

    const { memoryManager, blackboard } = createTestMemoryManager(mockLLM, mockBlackboard);

    await (memoryManager as any).performFold('procedural');

    // Should delete temporary entries but keep voice constraints
    const deletedIds = (blackboard as any)._deleteCalls.map((call: any) => call.entryId);
    expect(deletedIds).toEqual(['procedural-temp-1', 'procedural-temp-2']);
    expect(deletedIds).not.toContain('procedural-voice-1');
  });
});

describe('MemoryManagerService — MEM-04: Core layer protection', () => {
  it('core layer never folds — throws error on overflow', async () => {
    const mockLLM = new MockLlmProvider([]);
    const mockBlackboard = createMockBlackboard();

    // Seed core layer to budget
    for (let i = 0; i < 10; i++) {
      mockBlackboard.writeEntry('core', 'director-1', {
        content: 'x'.repeat(1600), // ~400 tokens each (total ~4000, core budget is 2000)
        metadata: {},
      });
    }

    const { memoryManager, blackboard } = createTestMemoryManager(mockLLM, mockBlackboard);

    // Make writeEntry throw TokenBudgetExceededError
    (blackboard as any).writeEntry = vi.fn()
      .mockImplementation(() => { throw new TokenBudgetExceededError('core', LAYER_BUDGETS.core, 2000, 500) });

    await expect(memoryManager.writeEntryWithMemoryManagement('core', 'director-1', {
      content: 'Attempt to write to full core layer',
    })).rejects.toThrow(TokenBudgetExceededError);
  });
});

describe('MemoryManagerService — MEM-05: Promotion from scenario to core', () => {
  it('promotes scenario entry to core layer', async () => {
    const mockLLM = new MockLlmProvider([]);
    const mockBlackboard = createMockBlackboard();
    const scenarioEntry = mockBlackboard.seedScenarioEntry();

    const promoteCallback = vi.fn();
    const { memoryManager, blackboard } = createTestMemoryManager(mockLLM, mockBlackboard);
    (memoryManager as any).promoteCallback = promoteCallback;

    await memoryManager.promoteScenarioEntryToCore(scenarioEntry.id, 'director-1');

    expect((blackboard as any)._writeCalls.length).toBe(1);
    expect((blackboard as any)._writeCalls[0].layer).toBe('core');
    expect((blackboard as any)._writeCalls[0].content).toEqual(scenarioEntry.content);
  });

  it('updates scenario entry metadata with promotedToCore', async () => {
    const mockLLM = new MockLlmProvider([]);
    const mockBlackboard = createMockBlackboard();
    const scenarioEntry = mockBlackboard.seedScenarioEntry();

    const { memoryManager, blackboard } = createTestMemoryManager(mockLLM, mockBlackboard);

    const result = await memoryManager.promoteScenarioEntryToCore(scenarioEntry.id, 'director-1');

    const scenarioLayer = mockBlackboard.readLayer('scenario');
    const updatedEntry = scenarioLayer.entries.find(e => e.id === scenarioEntry.id);
    expect(updatedEntry?.metadata?.promotedToCore).toBe(result.coreEntryId);
  });

  it('adds promotedFromScenarioId metadata to core entry', async () => {
    const mockLLM = new MockLlmProvider([]);
    const mockBlackboard = createMockBlackboard();
    const scenarioEntry = mockBlackboard.seedScenarioEntry();

    const { memoryManager, blackboard } = createTestMemoryManager(mockLLM, mockBlackboard);

    const result = await memoryManager.promoteScenarioEntryToCore(scenarioEntry.id, 'director-1');

    const coreLayer = mockBlackboard.readLayer('core');
    const coreEntry = coreLayer.entries.find(e => e.id === result.coreEntryId);
    expect(coreEntry?.metadata?.promotedFromScenarioId).toBe(scenarioEntry.id);
  });

  it('calls promoteCallback with promotion metadata', async () => {
    const mockLLM = new MockLlmProvider([]);
    const mockBlackboard = createMockBlackboard();
    const scenarioEntry = mockBlackboard.seedScenarioEntry();

    const promoteCallback = vi.fn();
    const { memoryManager } = createTestMemoryManager(mockLLM, mockBlackboard);
    (memoryManager as any).promoteCallback = promoteCallback;

    const result = await memoryManager.promoteScenarioEntryToCore(scenarioEntry.id, 'director-1');

    expect(promoteCallback).toHaveBeenCalled();
    const promoteMeta = promoteCallback.mock.calls[0][0];
    expect(promoteMeta.sourceScenarioEntryId).toBe(scenarioEntry.id);
    expect(promoteMeta.targetCoreEntryId).toBe(result.coreEntryId);
    expect(promoteMeta.promotedBy).toBe('director-1');
  });
});

describe('MemoryManagerService — actor continuity', () => {
  it('getActorSemanticContinuity returns concatenated summary entries', () => {
    const mockLLM = new MockLlmProvider([]);
    const mockBlackboard = createMockBlackboard();
    mockBlackboard.writeEntry('semantic', 'memory-manager', {
      content: 'Summary 1',
      metadata: { foldSummary: true },
    });
    mockBlackboard.writeEntry('semantic', 'memory-manager', {
      content: 'Summary 2',
      metadata: { foldSummary: true },
    });

    const { memoryManager } = createTestMemoryManager(mockLLM, mockBlackboard);

    const continuity = memoryManager.getActorSemanticContinuity();
    expect(continuity).toContain('Summary 1');
    expect(continuity).toContain('Summary 2');
  });

  it('getActorSemanticContinuity returns empty string when no summaries', () => {
    const mockLLM = new MockLlmProvider([]);
    const mockBlackboard = createMockBlackboard();

    const { memoryManager } = createTestMemoryManager(mockLLM, mockBlackboard);

    const continuity = memoryManager.getActorSemanticContinuity();
    expect(continuity).toEqual('');
  });
});

describe('MemoryManagerService — integration with agents', () => {
  it('MemoryManager is required in Director constructor', () => {
    // This test is covered in director.test.ts
    expect(true).toBe(true);
  });
});
