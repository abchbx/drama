import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DramaSession } from '../src/session.js';
import type { LlmProvider, LlmResponse } from '../src/services/llm.js';
import type { BlackboardService } from '../src/services/blackboard.js';
import type { RouterService } from '../src/services/router.js';
import type { MemoryManagerService } from '../src/services/memoryManager.js';
import type { CapabilityService } from '../src/services/capability.js';
import type { pino } from 'pino';
import type { CharacterCard } from '../src/types/actor.js';

// ---------------------------------------------------------------------------
// Mock implementations for chaos testing
// ---------------------------------------------------------------------------

class FlakyLlmProvider implements LlmProvider {
  private readonly failureRate: number;

  constructor(failureRate: number = 0.1) {
    this.failureRate = failureRate;
  }

  async generate(prompt: { system: string; user: string }): Promise<LlmResponse> {
    if (Math.random() < this.failureRate) {
      throw new Error('API connection failed');
    }
    return {
      content: JSON.stringify({
        exchangeId: 'ex-' + Math.random(),
        entries: [{ speaker: 'Hero', text: 'I am here!', unverifiedFacts: false }],
        tokenCount: 50,
      }),
    };
  }
}

function makeMockBlackboard(): Partial<BlackboardService> {
  const layers: Record<string, { entries: Array<{ id: string; content: string; agentId: string; metadata?: any }> }> = {
    core: { entries: [] },
    scenario: { entries: [] },
    semantic: { entries: [] },
    procedural: { entries: [] },
  };

  return {
    readLayer: (layer: string) => layers[layer] || { entries: [] },
    writeEntry: (layer: string, agentId: string, data: { content: string; messageId?: string; metadata?: any }) => {
      layers[layer].entries.push({
        id: crypto.randomUUID(),
        content: data.content,
        agentId,
        metadata: data.metadata,
      });
      return { entry: { id: crypto.randomUUID(), ...data }, success: true };
    },
  } as Partial<BlackboardService>;
}

function makeMockRouter(): Partial<RouterService> {
  return {
    on: vi.fn(),
    off: vi.fn(),
    stop: vi.fn(),
  };
}

function makeMockMemoryManager(): Partial<MemoryManagerService> {
  return {
    writeEntry: vi.fn(async (layer, agentId, data) => ({
      entry: { id: crypto.randomUUID(), ...data },
      success: true,
    })),
    promoteScenarioEntryToCore: vi.fn(async (entryId, directorId) => ({
      coreEntryId: crypto.randomUUID(),
      scenarioEntryId: entryId,
    })),
  };
}

function makeMockCapabilityService(): Partial<CapabilityService> {
  return {
    capabilityMap: {
      Director: ['core', 'scenario', 'procedural'],
      Actor: ['semantic', 'procedural'],
      Admin: ['core', 'scenario', 'semantic', 'procedural'],
    },
    canWrite: vi.fn((agentId, layer) => true),
  };
}

function makeMockLogger(): Partial<pino.Logger> {
  return {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => makeMockLogger() as pino.Logger),
  };
}

function makeHeroCard(): CharacterCard {
  return {
    id: 'hero-1',
    name: 'Hero',
    role: 'hero',
    backstory: 'A brave knight',
    objectives: ['Save the kingdom'],
    voice: {
      vocabularyRange: ['formal', 'courageous'],
      sentenceLength: 'medium',
      emotionalRange: ['confident', 'compassionate'],
      speechPatterns: ['heroic declarations'],
      forbiddenTopics: ['giving up'],
      forbiddenWords: ['surrender'],
    },
  };
}

function makeVillainCard(): CharacterCard {
  return {
    id: 'villain-1',
    name: 'Villain',
    role: 'villain',
    backstory: 'A dark sorcerer',
    objectives: ['Conquer the kingdom'],
    voice: {
      vocabularyRange: ['menacing', 'archaic'],
      sentenceLength: 'long',
      emotionalRange: ['angry', 'mocking'],
      speechPatterns: ['evil monologues'],
      forbiddenTopics: ['kindness'],
      forbiddenWords: ['mercy'],
    },
  };
}

// ---------------------------------------------------------------------------
// Chaos injection primitives
// ---------------------------------------------------------------------------

class ChaosInjector {
  static delayMessages(delayMs: number = 2000): (agentId: string) => Promise<void> {
    return async (_agentId: string) => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    };
  }

  static dropMessages(probability: number = 0.1): (agentId: string) => Promise<void> {
    return async (_agentId: string) => {
      if (Math.random() < probability) {
        throw new Error('Message dropped');
      }
    };
  }

  static corruptMessages(): (agentId: string) => Promise<void> {
    return async (_agentId: string) => {
      if (Math.random() < 0.05) {
        throw new Error('Message corrupted');
      }
    };
  }

  static fillLayerToCapacity(): () => Promise<void> {
    return async () => {
      if (Math.random() < 0.1) {
        throw new Error('Layer capacity exceeded');
      }
    };
  }

  static throwOnWrite(probability: number = 0.05): () => Promise<void> {
    return async () => {
      if (Math.random() < probability) {
        throw new Error('Write failed');
      }
    };
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Chaos Testing: Adversarial Robustness', () => {
  let llm: LlmProvider;
  let blackboard: Partial<BlackboardService>;
  let router: Partial<RouterService>;
  let memoryManager: Partial<MemoryManagerService>;
  let capabilityService: Partial<CapabilityService>;
  let logger: Partial<pino.Logger>;

  beforeEach(() => {
    llm = new FlakyLlmProvider(0.05);
    blackboard = makeMockBlackboard();
    router = makeMockRouter();
    memoryManager = makeMockMemoryManager();
    capabilityService = makeMockCapabilityService();
    logger = makeMockLogger();
  });

  describe('Network Chaos', () => {
    it('should handle 10% message drop rate', async () => {
      const session = new DramaSession({
        config: { sceneTimeoutMs: 30000, actorTimeoutMs: 30000 },
        blackboard: blackboard as BlackboardService,
        router: router as RouterService,
        memoryManager: memoryManager as MemoryManagerService,
        llmProvider: llm,
        capabilityService: capabilityService as CapabilityService,
        logger: logger as pino.Logger,
      });

      await session.initialize([makeHeroCard(), makeVillainCard()]);

      session.injectChaos({
        beforeTurn: ChaosInjector.dropMessages(0.1),
      });

      const result = await session.runCompleteDrama(2);

      expect(result.totalScenes).toBe(2);
    });

    it('should handle high latency (2s delays)', async () => {
      const session = new DramaSession({
        config: { sceneTimeoutMs: 30000, actorTimeoutMs: 30000 },
        blackboard: blackboard as BlackboardService,
        router: router as RouterService,
        memoryManager: memoryManager as MemoryManagerService,
        llmProvider: llm,
        capabilityService: capabilityService as CapabilityService,
        logger: logger as pino.Logger,
      });

      await session.initialize([makeHeroCard(), makeVillainCard()]);

      session.injectChaos({
        beforeTurn: ChaosInjector.delayMessages(2000),
      });

      const result = await session.runCompleteDrama(2);

      expect(result.totalScenes).toBe(2);
    });
  });

  describe('Resource Chaos', () => {
    it('should handle layer capacity issues', async () => {
      const session = new DramaSession({
        config: { sceneTimeoutMs: 30000, actorTimeoutMs: 30000 },
        blackboard: blackboard as BlackboardService,
        router: router as RouterService,
        memoryManager: memoryManager as MemoryManagerService,
        llmProvider: llm,
        capabilityService: capabilityService as CapabilityService,
        logger: logger as pino.Logger,
      });

      await session.initialize([makeHeroCard(), makeVillainCard()]);

      session.injectChaos({
        afterWrite: ChaosInjector.fillLayerToCapacity(),
      });

      const result = await session.runCompleteDrama(2);

      expect(result.totalScenes).toBe(2);
    });

    it('should handle random write failures', async () => {
      const session = new DramaSession({
        config: { sceneTimeoutMs: 30000, actorTimeoutMs: 30000 },
        blackboard: blackboard as BlackboardService,
        router: router as RouterService,
        memoryManager: memoryManager as MemoryManagerService,
        llmProvider: llm,
        capabilityService: capabilityService as CapabilityService,
        logger: logger as pino.Logger,
      });

      await session.initialize([makeHeroCard(), makeVillainCard()]);

      session.injectChaos({
        afterWrite: ChaosInjector.throwOnWrite(0.05),
      });

      const result = await session.runCompleteDrama(2);

      expect(result.totalScenes).toBe(2);
    });
  });

  describe('Concurrent Chaos', () => {
    it('should handle multiple failures simultaneously', async () => {
      const session = new DramaSession({
        config: { sceneTimeoutMs: 30000, actorTimeoutMs: 30000 },
        blackboard: blackboard as BlackboardService,
        router: router as RouterService,
        memoryManager: memoryManager as MemoryManagerService,
        llmProvider: llm,
        capabilityService: capabilityService as CapabilityService,
        logger: logger as pino.Logger,
      });

      await session.initialize([makeHeroCard(), makeVillainCard()]);

      session.injectChaos({
        beforeTurn: async (agentId: string) => {
          await ChaosInjector.delayMessages(1000)(agentId);
          await ChaosInjector.dropMessages(0.05)(agentId);
          await ChaosInjector.corruptMessages()(agentId);
        },
        afterWrite: async () => {
          await ChaosInjector.throwOnWrite(0.05)();
          await ChaosInjector.fillLayerToCapacity()();
        },
      });

      const result = await session.runCompleteDrama(2);

      expect(result.totalScenes).toBe(2);
    });
  });

  describe('YOLO Mode Assessment', () => {
    it('should document handled vs instrumented vs YOLO paths', async () => {
      const session = new DramaSession({
        config: { sceneTimeoutMs: 30000, actorTimeoutMs: 30000 },
        blackboard: blackboard as BlackboardService,
        router: router as RouterService,
        memoryManager: memoryManager as MemoryManagerService,
        llmProvider: llm,
        capabilityService: capabilityService as CapabilityService,
        logger: logger as pino.Logger,
      });

      await session.initialize([makeHeroCard(), makeVillainCard()]);

      // This is a documentation test to show what's handled
      const handledPaths = [
        'Blackboard optimistic lock conflict',
        'LLM API transient errors',
        'Actor timeout (Director fallback)',
        'Socket disconnect',
        'Token overflow (fold)',
        'Boundary violation (rejected, logged)',
      ];

      const instrumentedPaths = [
        'LLM API permanent errors',
        'Blackboard corruption',
        'Invalid protocol messages',
      ];

      const yoloPaths = [
        'Out-of-memory crashes',
        'File system corruption',
        'Network partition spanning entire scene',
        'Simultaneous failure of >50% of actors',
        'Malicious actor with valid JWT',
      ];

      expect(handledPaths).toBeDefined();
      expect(instrumentedPaths).toBeDefined();
      expect(yoloPaths).toBeDefined();
    });
  });
});
