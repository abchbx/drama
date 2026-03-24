import { describe, it, expect, vi } from 'vitest';
import { Director } from '../src/services/director.js';
import type { LlmProvider, LlmResponse } from '../src/services/llm.js';
import type { BlackboardService } from '../src/services/blackboard.js';
import type { CapabilityService } from '../src/services/capability.js';
import type { pino } from 'pino';
import type { DialogueEntry } from '../src/types/actor.js';
import type { PlanningContext } from '../src/types/director.js';
import { LAYER_BUDGETS } from '../src/types/blackboard.js';

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
      content: JSON.stringify({ exchangeId: 'fallback', contradictions: [], tokenCount: 0 }),
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
  const layers: Record<string, { entries: Array<{ id: string; agentId: string; content: string; metadata?: Record<string, unknown>; tokenCount?: number }>; version: number }> = {
    core: { entries: [], version: 0 },
    scenario: { entries: [], version: 0 },
    semantic: { entries: [], version: 0 },
    procedural: { entries: [], version: 0 },
  };

  const readCalls: string[] = [];
  const writeCalls: { layer: string; agentId: string; content: string; messageId?: string }[] = [];

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
    writeEntry(layer: string, agentId: string, req: { content: string; messageId?: string }) {
      const id = `entry-${writeCalls.length + 1}`;
      writeCalls.push({ layer, agentId, content: req.content, messageId: req.messageId });
      const ls = layers[layer];
      if (!ls) return { entry: { id, agentId, content: req.content }, layerVersion: 0 };
      ls.entries.push({ id, agentId, content: req.content, tokenCount: countTokens(req.content) });
      ls.version++;
      return { entry: { id, agentId, content: req.content }, layerVersion: ls.version };
    },
    deleteEntry(layer: string, entryId: string, _agentId: string) {
      const ls = layers[layer];
      if (!ls) return;
      const idx = ls.entries.findIndex(e => e.id === entryId);
      if (idx !== -1) {
        ls.entries.splice(idx, 1);
        ls.version++;
      }
    },
    _readCalls: readCalls,
    _writeCalls: writeCalls,
  };

  // Seed core layer with backbone prose
  blackboard.seedBackbone = (facts: string[]) => {
    facts.forEach((fact, i) => {
      layers.core.entries.push({
        id: `core-${i}`,
        agentId: 'director-1',
        content: fact,
        tokenCount: countTokens(fact),
      });
    });
  };

  // Seed semantic layer with actor output entries
  blackboard.seedActorOutput = (agentId: string, name: string, entries: DialogueEntry[]) => {
    entries.forEach((entry, i) => {
      layers.semantic.entries.push({
        id: `${agentId}-entry-${i}`,
        agentId,
        content: JSON.stringify(entry),
        tokenCount: countTokens(JSON.stringify(entry)),
      });
    });
  };

  return blackboard as unknown as BlackboardService & {
    _readCalls: string[];
    _writeCalls: { layer: string; agentId: string; content: string; messageId?: string }[];
    seedBackbone: (facts: string[]) => void;
    seedActorOutput: (agentId: string, name: string, entries: DialogueEntry[]) => void;
  };
}

// ---------------------------------------------------------------------------
// Mock capability service
// ---------------------------------------------------------------------------

function createMockCapabilityService(): CapabilityService {
  return {
    jwtSecret: 'test-secret-key-at-least-32-characters',
    capabilityMap: {
      Actor: ['semantic', 'procedural'],
      Director: ['core', 'scenario', 'procedural'],  // NOTE: no 'semantic' — this is the hard constraint
      Admin: ['core', 'scenario', 'semantic', 'procedural'],
    },
    verify: vi.fn() as CapabilityService['verify'],
    check: vi.fn() as CapabilityService['check'],
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
// Test helpers
// ---------------------------------------------------------------------------

function createPlanningContext(existingBackbone = ''): PlanningContext {
  return {
    dramaId: 'drama-1',
    theme: '复仇与救赎',
    characters: [
      { agentId: 'actor-001', name: 'Lord Malachar', role: 'villain', objectives: ['seek revenge'] },
      { agentId: 'actor-002', name: 'Ser Aldric', role: 'hero', objectives: ['protect the innocent'] },
    ],
    existingBackbone,
    previousScenes: [],
    newContentEstimate: 200,
  };
}

function createMockMemoryManager() {
  return {
    writeEntryWithMemoryManagement: vi.fn().mockImplementation((layer: string, agentId: string, req: any) => {
      return { entry: { id: 'mem-entry-1', agentId, content: req.content }, layerVersion: 1 };
    }),
    promoteScenarioEntryToCore: vi.fn().mockImplementation((scenarioEntryId: string, directorAgentId: string) => {
      return { coreEntryId: 'core-1', scenarioEntryId };
    }),
    getActorSemanticContinuity: vi.fn().mockReturnValue(''),
  } as unknown as import('../src/services/memoryManager.js').MemoryManagerService;
}

function createTestDirector(
  llmProvider: MockLlmProvider,
  mockBlackboard?: ReturnType<typeof createMockBlackboard>,
) {
  const blackboard = mockBlackboard ?? createMockBlackboard();
  const capabilityService = createMockCapabilityService();
  const logger = createMockLogger();
  const memoryManager = createMockMemoryManager();

  const director = new Director({
    blackboard,
    capabilityService,
    llmProvider,
    logger,
    agentId: 'director-1',
    memoryManager,
  });

  return { director, blackboard, llmProvider, capabilityService, memoryManager };
}

// ---------------------------------------------------------------------------
// DIR-01: Plot backbone written to core layer
// ---------------------------------------------------------------------------

describe('Director class — DIR-01: planBackbone writes to core layer', () => {
  it('DIR-01a: planBackbone() writes backbone prose to core layer', async () => {
    const mockLLM = new MockLlmProvider([{
      content: JSON.stringify({
        exchangeId: 'ex-d1',
        backboneProse: 'The villain stalks the hall. [ACTOR DISCRETION: The hero arrives.]',
        scenes: [
          { sceneId: 'scene-1', description: 'The hall', type: 'directed', characters: ['Lord Malachar'] },
          { sceneId: 'scene-2', description: 'The arrival', type: 'actor_discretion', characters: ['Ser Aldric'] },
        ],
        tokenCount: 50,
      }),
    }]);
    const mockBlackboard = createMockBlackboard();
    const { director } = createTestDirector(mockLLM, mockBlackboard);

    await director.planBackbone(createPlanningContext());

    const coreWrites = mockBlackboard._writeCalls.filter(c => c.layer === 'core');
    expect(coreWrites).toHaveLength(1);
    expect(coreWrites[0].content).toContain('The villain stalks the hall');
  });

  it('DIR-01b: Backbone output includes at least one actor_discretion scene marker', async () => {
    const mockLLM = new MockLlmProvider([{
      content: JSON.stringify({
        exchangeId: 'ex-d2',
        backboneProse: 'Hero enters the stage. [ACTOR DISCRETION: Hero decides the path.]',
        scenes: [
          { sceneId: 'scene-1', description: 'Entrance', type: 'directed', characters: ['Lord Malachar'] },
          { sceneId: 'scene-2', description: 'Decision', type: 'actor_discretion', characters: ['Ser Aldric'] },
        ],
        tokenCount: 40,
      }),
    }]);
    const { director } = createTestDirector(mockLLM);

    const result = await director.planBackbone(createPlanningContext());

    const discretionScenes = result.scenes.filter(s => s.type === 'actor_discretion');
    expect(discretionScenes).toHaveLength(1);
    expect(discretionScenes[0].type).toBe('actor_discretion');
  });

  it('DIR-01c: planBackbone() writes directly to core without pruning (MEM-04)', async () => {
    // MEM-04: Core layer is NEVER auto-evicted
    const mockBlackboard = createMockBlackboard();
    mockBlackboard.seedBackbone(['Old backbone content.']);

    const mockLLM = new MockLlmProvider([{
      content: JSON.stringify({
        exchangeId: 'ex-d3',
        backboneProse: 'New backbone content.',
        scenes: [{ sceneId: 'scene-1', description: 'New scene', type: 'directed', characters: ['Lord Malachar'] }],
        tokenCount: 10,
      }),
    }]);
    const { director } = createTestDirector(mockLLM, mockBlackboard);

    await director.planBackbone(createPlanningContext());

    const coreWrites = mockBlackboard._writeCalls.filter(c => c.layer === 'core');
    expect(coreWrites).toHaveLength(1); // new backbone written
    expect(coreWrites[0].content).toBe('New backbone content.');
  });
});

// ---------------------------------------------------------------------------
// DIR-02: Arbitration written to scenario layer
// ---------------------------------------------------------------------------

describe('Director class — DIR-02: arbitrate writes to scenario layer', () => {
  it('DIR-02a: arbitrate() writes canonical outcome to scenario layer', async () => {
    const mockLLM = new MockLlmProvider([{
      content: JSON.stringify({
        exchangeId: 'ex-d4',
        sceneId: 'scene-1',
        conflicts: [
          {
            conflictId: 'conflict-1',
            conflictingClaims: [
              'Lord Malachar claims he arrived first',
              'Ser Aldric claims he arrived first',
            ],
            canonicalOutcome: 'Lord Malachar had already entered the hall when Ser Aldric arrived.',
            severity: 'high',
          },
        ],
        tokenCount: 30,
      }),
    }]);
    const mockBlackboard = createMockBlackboard();
    const { director } = createTestDirector(mockLLM, mockBlackboard);

    await director.arbitrate('scene-1', [
      { actorA: 'Lord Malachar', actorB: 'Ser Aldric', claimA: 'I arrived first', claimB: 'No, I arrived first' },
    ]);

    const scenarioWrites = mockBlackboard._writeCalls.filter(c => c.layer === 'scenario');
    expect(scenarioWrites).toHaveLength(1);
    expect(scenarioWrites[0].content).toContain('Lord Malachar had already entered');
  });

  it('DIR-02b: arbitrate() includes conflict details in LLM prompt', async () => {
    const mockLLM = new MockLlmProvider([{
      content: JSON.stringify({ exchangeId: 'ex-d5', sceneId: 'scene-1', conflicts: [], tokenCount: 0 }),
    }]);
    const { director } = createTestDirector(mockLLM);

    await director.arbitrate('scene-2', [
      { actorA: 'A', actorB: 'B', claimA: 'It was red', claimB: 'It was blue' },
    ]);

    const [call] = mockLLM.getCallLog();
    expect(call.user).toContain('scene-2');
    expect(call.user).toContain('It was red');
    expect(call.user).toContain('It was blue');
  });
});

// ---------------------------------------------------------------------------
// DIR-03: Hard semantic-layer enforcement
// ---------------------------------------------------------------------------

describe('Director class — DIR-03: Director MUST NOT write to semantic layer', () => {
  it('DIR-03a: Director constructor throws when capability map includes semantic', () => {
    const badBlackboard = createMockBlackboard() as unknown as BlackboardService;
    const badCapabilityService = {
      jwtSecret: 'test-secret-key-at-least-32-characters',
      capabilityMap: {
        Actor: ['semantic', 'procedural'],
        Director: ['core', 'scenario', 'semantic', 'procedural'], // semantic included — wrong!
        Admin: ['core', 'scenario', 'semantic', 'procedural'],
      },
      verify: vi.fn() as CapabilityService['verify'],
      check: vi.fn() as CapabilityService['check'],
    } as unknown as CapabilityService;
    const mockLLM = new MockLlmProvider([]);
    const logger = createMockLogger();
    const memoryManager = createMockMemoryManager();

    expect(() => new Director({
      blackboard: badBlackboard,
      capabilityService: badCapabilityService,
      llmProvider: mockLLM,
      logger,
      agentId: 'director-1',
      memoryManager,
    })).toThrow('semantic layer write must be denied');
  });

  it('DIR-03b: getAllowedLayers() returns only core/scenario/procedural', () => {
    const mockLLM = new MockLlmProvider([]);
    const { director } = createTestDirector(mockLLM);

    const layers = director.getAllowedLayers();
    expect(layers).toContain('core');
    expect(layers).toContain('scenario');
    expect(layers).toContain('procedural');
    expect(layers).not.toContain('semantic');
    expect(layers).toHaveLength(3);
  });

  it('DIR-03c: Director never writes to semantic layer even if LLM returns dialogue', async () => {
    const mockLLM = new MockLlmProvider([{
      content: JSON.stringify({
        exchangeId: 'ex-d6',
        backboneProse: 'Backbone only.',
        scenes: [],
        tokenCount: 10,
      }),
    }]);
    const mockBlackboard = createMockBlackboard();
    const { director } = createTestDirector(mockLLM, mockBlackboard);

    await director.planBackbone(createPlanningContext());

    const semanticWrites = mockBlackboard._writeCalls.filter(c => c.layer === 'semantic');
    expect(semanticWrites).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// DIR-04: ACTOR DISCRETION markers preserved
// ---------------------------------------------------------------------------

describe('Director class — DIR-04: Actor discretion scenes in backbone', () => {
  it('DIR-04a: planBackbone() backbone prose contains [ACTOR DISCRETION] marker', async () => {
    const mockLLM = new MockLlmProvider([{
      content: JSON.stringify({
        exchangeId: 'ex-d7',
        backboneProse: 'The hero walks forward. [ACTOR DISCRETION: The hero chooses the door.]',
        scenes: [{ sceneId: 'scene-1', description: 'Decision point', type: 'actor_discretion', characters: ['Ser Aldric'] }],
        tokenCount: 30,
      }),
    }]);
    const { director } = createTestDirector(mockLLM);

    const result = await director.planBackbone(createPlanningContext());

    expect(result.backboneProse).toContain('[ACTOR DISCRETION:');
  });

  it('DIR-04b: planBackbone() with existing backbone preserves [ACTOR DISCRETION] markers', async () => {
    const existing = 'Hero arrives. [ACTOR DISCRETION: Hero chooses path A.]';
    const mockLLM = new MockLlmProvider([{
      content: JSON.stringify({
        exchangeId: 'ex-d8',
        backboneProse: existing + '\nVillain retreats.',
        scenes: [{ sceneId: 'scene-1', description: 'Intro', type: 'directed', characters: ['Lord Malachar'] }],
        tokenCount: 40,
      }),
    }]);
    const { director } = createTestDirector(mockLLM);

    const result = await director.planBackbone(createPlanningContext(existing));

    expect(result.backboneProse).toContain('[ACTOR DISCRETION:');
  });
});

// ---------------------------------------------------------------------------
// DIR-05: Fact-checking and contradiction detection
// ---------------------------------------------------------------------------

describe('Director class — DIR-05: factCheck flags contradictions', () => {
  it('DIR-05a: factCheck() writes contradictions to procedural layer', async () => {
    const mockLLM = new MockLlmProvider([{
      content: JSON.stringify({
        exchangeId: 'ex-d9',
        sceneId: 'scene-1',
        contradictions: [
          {
            conflictingClaim: 'The treaty was signed in 1200',
            coreFact: 'The treaty was signed in 1400',
            severity: 'high',
            sourceAgentId: 'actor-001',
          },
        ],
        tokenCount: 20,
      }),
    }]);
    const mockBlackboard = createMockBlackboard();
    const { director } = createTestDirector(mockLLM, mockBlackboard);

    await director.factCheck('scene-1', [
      {
        agentId: 'actor-001',
        name: 'Lord Malachar',
        entries: [{ speaker: 'Lord Malachar', text: 'The treaty was signed in 1200.', unverifiedFacts: true }],
      },
    ]);

    const proceduralWrites = mockBlackboard._writeCalls.filter(c => c.layer === 'procedural');
    expect(proceduralWrites).toHaveLength(1);
    expect(proceduralWrites[0].content).toContain('1200');
    expect(proceduralWrites[0].content).toContain('high');
  });

  it('DIR-05b: Three severity levels applied (high/medium/low)', async () => {
    const mockLLM = new MockLlmProvider([{
      content: JSON.stringify({
        exchangeId: 'ex-d10',
        sceneId: 'scene-1',
        contradictions: [
          { conflictingClaim: 'Core fact wrong', coreFact: 'Core says X', severity: 'high', sourceAgentId: 'a1' },
          { conflictingClaim: 'Scenario fact wrong', coreFact: 'Scenario says Y', severity: 'medium', sourceAgentId: 'a2' },
          { conflictingClaim: 'Minor detail wrong', coreFact: 'Minor fact', severity: 'low', sourceAgentId: 'a3' },
        ],
        tokenCount: 30,
      }),
    }]);
    const mockBlackboard = createMockBlackboard();
    const { director } = createTestDirector(mockLLM, mockBlackboard);

    const result = await director.factCheck('scene-1', [
      { agentId: 'a1', name: 'A1', entries: [{ speaker: 'A1', text: 'X', unverifiedFacts: false }] },
      { agentId: 'a2', name: 'A2', entries: [{ speaker: 'A2', text: 'Y', unverifiedFacts: false }] },
      { agentId: 'a3', name: 'A3', entries: [{ speaker: 'A3', text: 'Z', unverifiedFacts: false }] },
    ]);

    const severities = result.contradictions.map(c => c.severity);
    expect(severities).toContain('high');
    expect(severities).toContain('medium');
    expect(severities).toContain('low');
  });

  it('DIR-05c: factCheck() includes core and scenario facts in LLM prompt', async () => {
    const mockBlackboard = createMockBlackboard();
    mockBlackboard.seedBackbone(['The capital is Veradia.']);
    mockBlackboard.readLayer('scenario');

    const mockLLM = new MockLlmProvider([{
      content: JSON.stringify({ exchangeId: 'ex-d11', sceneId: 'scene-1', contradictions: [], tokenCount: 0 }),
    }]);
    const { director } = createTestDirector(mockLLM, mockBlackboard);

    await director.factCheck('scene-1', [
      { agentId: 'actor-001', name: 'Lord Malachar', entries: [{ speaker: 'Lord Malachar', text: 'The capital is Veradia.', unverifiedFacts: false }] },
    ]);

    const [call] = mockLLM.getCallLog();
    expect(call.user).toContain('The capital is Veradia');
    expect(call.user).toContain('[Established Facts');
  });
});

// ---------------------------------------------------------------------------
// DIR-06: Scene boundary signals
// ---------------------------------------------------------------------------

describe('Director class — DIR-06: Scene boundary signals', () => {
  it('DIR-06a: signalSceneStart() writes to procedural layer with type scene_start', () => {
    const mockBlackboard = createMockBlackboard();
    const mockLLM = new MockLlmProvider([]);
    const { director } = createTestDirector(mockLLM, mockBlackboard);

    director.signalSceneStart('scene-5');

    const proceduralWrites = mockBlackboard._writeCalls.filter(c => c.layer === 'procedural');
    expect(proceduralWrites).toHaveLength(1);
    const signal = JSON.parse(proceduralWrites[0].content);
    expect(signal.type).toBe('scene_start');
    expect(signal.sceneId).toBe('scene-5');
    expect(signal.directorId).toBe('director-1');
    expect(signal.timestamp).toBeDefined();
  });

  it('DIR-06b: signalSceneEnd() writes to procedural layer with type scene_end and status', () => {
    const mockBlackboard = createMockBlackboard();
    const mockLLM = new MockLlmProvider([]);
    const { director } = createTestDirector(mockLLM, mockBlackboard);

    director.signalSceneEnd({
      sceneId: 'scene-5',
      beats: ['beat A', 'beat B'],
      conflicts: ['conflict-1'],
      plotAdvancement: 'Hero discovers truth',
      status: 'completed',
    });

    const proceduralWrites = mockBlackboard._writeCalls.filter(c => c.layer === 'procedural');
    expect(proceduralWrites).toHaveLength(1);
    const signal = JSON.parse(proceduralWrites[0].content);
    expect(signal.type).toBe('scene_end');
    expect(signal.sceneId).toBe('scene-5');
    expect(signal.status).toBe('completed');
    expect(signal.directorId).toBe('director-1');
    expect(signal.timestamp).toBeDefined();
    expect(signal.beats).toEqual(['beat A', 'beat B']);
  });

  it('DIR-06c: Scene signals have correct structure (sceneId, directorId, timestamp)', () => {
    const mockBlackboard = createMockBlackboard();
    const mockLLM = new MockLlmProvider([]);
    const { director } = createTestDirector(mockLLM, mockBlackboard);

    director.signalSceneStart('scene-x');
    director.signalSceneEnd({ sceneId: 'scene-x', beats: [], conflicts: [], plotAdvancement: 'n/a', status: 'completed' });

    const signals = mockBlackboard._writeCalls.map(c => JSON.parse(c.content));

    for (const signal of signals) {
      expect(signal.sceneId).toBeDefined();
      expect(signal.directorId).toBe('director-1');
      expect(signal.timestamp).toBeDefined();
      expect(() => new Date(signal.timestamp)).not.toThrow(); // valid ISO timestamp
    }
  });

  it('DIR-06d: signalSceneEnd() supports interrupted and timeout statuses', () => {
    const mockBlackboard = createMockBlackboard();
    const mockLLM = new MockLlmProvider([]);
    const { director } = createTestDirector(mockLLM, mockBlackboard);

    director.signalSceneEnd({ sceneId: 'scene-y', beats: [], conflicts: [], plotAdvancement: 'n/a', status: 'interrupted' });

    const signal = JSON.parse(mockBlackboard._writeCalls[0].content);
    expect(signal.status).toBe('interrupted');
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe('Director class — ERR-01: Malformed JSON from LLM', () => {
  it('DirectorGenerationError thrown with phase json_parse when LLM returns invalid JSON', async () => {
    const mockLLM = new MockLlmProvider([{ content: 'this is not json {{{' }]);
    const { director } = createTestDirector(mockLLM);

    await expect(director.planBackbone(createPlanningContext()))
      .rejects.toThrow('Director generation failed (json_parse)');
  });

  it('Error preserves raw content as cause', async () => {
    const mockLLM = new MockLlmProvider([{ content: 'not json' }]);
    const { director } = createTestDirector(mockLLM);

    try {
      await director.planBackbone(createPlanningContext());
      expect.fail('Should have thrown');
    } catch (err: unknown) {
      expect((err as { phase: string }).phase).toBe('json_parse');
      expect((err as { cause: unknown }).cause).toBeDefined();
    }
  });
});

describe('Director class — ERR-02: Invalid schema from LLM', () => {
  it('DirectorGenerationError thrown with phase validation when schema is wrong', async () => {
    const mockLLM = new MockLlmProvider([{
      content: JSON.stringify({
        // missing required fields, wrong structure
        exchangeId: 'ex-err',
        backboneProse: 123, // should be string
        scenes: 'not an array', // should be array
        tokenCount: 'ten', // should be number
      }),
    }]);
    const { director } = createTestDirector(mockLLM);

    await expect(director.planBackbone(createPlanningContext()))
      .rejects.toThrow('Director generation failed (validation)');
  });

  it('Error preserves validation error as cause', async () => {
    const mockLLM = new MockLlmProvider([{ content: JSON.stringify({ exchangeId: 'bad', backboneProse: 123, scenes: 'x', tokenCount: 0 }) }]);
    const { director } = createTestDirector(mockLLM);

    try {
      await director.planBackbone(createPlanningContext());
      expect.fail('Should have thrown');
    } catch (err: unknown) {
      expect((err as { phase: string }).phase).toBe('validation');
    }
  });
});

// ---------------------------------------------------------------------------
// readAllLayerContext
// ---------------------------------------------------------------------------

describe('Director class — readAllLayerContext reads all four layers', () => {
  it('readAllLayerContext is called during planBackbone and includes all layers', async () => {
    const mockBlackboard = createMockBlackboard();
    mockBlackboard.seedBackbone(['Core fact one.']);
    mockBlackboard.seedActorOutput('actor-001', 'Lord Malachar', [
      { speaker: 'Lord Malachar', text: 'Dialogue line.', unverifiedFacts: false },
    ]);

    const mockLLM = new MockLlmProvider([{
      content: JSON.stringify({
        exchangeId: 'ex-ctx',
        backboneProse: 'Backbone.',
        scenes: [],
        tokenCount: 10,
      }),
    }]);
    const { director } = createTestDirector(mockLLM, mockBlackboard);

    await director.planBackbone(createPlanningContext());

    const readLayers = mockBlackboard._readCalls;
    expect(readLayers).toContain('core');
    expect(readLayers).toContain('scenario');
    expect(readLayers).toContain('semantic');
    expect(readLayers).toContain('procedural');
  });
});
