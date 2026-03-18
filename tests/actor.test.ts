import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Actor } from '../src/services/actor.js';
import type { LlmProvider, LlmResponse } from '../src/services/llm.js';
import type { BlackboardService } from '../src/services/blackboard.js';
import type { CapabilityService } from '../src/services/capability.js';
import type { pino } from 'pino';
import type {
  CharacterCard,
  SceneContext,
  DialogueOutput,
  VoiceConstraints,
} from '../src/types/actor.js';

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

function makeVoice(variations: Partial<VoiceConstraints> = {}): VoiceConstraints {
  return {
    vocabularyRange: [],
    sentenceLength: 'medium',
    emotionalRange: [],
    speechPatterns: [],
    forbiddenTopics: [],
    forbiddenWords: [],
    ...variations,
  };
}

function makeVillainCard(): CharacterCard {
  return {
    id: 'card-villain-1',
    name: 'Lord Malachar',
    role: 'villain',
    backstory: 'A bitter noble who lost everything in the war.',
    objectives: ['seek revenge', 'acquire power'],
    voice: makeVoice({
      vocabularyRange: ['archaic', 'intimidating'],
      sentenceLength: 'long',
      emotionalRange: ['cold', 'calculating'],
      speechPatterns: ['rhetorical questions'],
      forbiddenTopics: ['peace treaties'],
      forbiddenWords: ['please', 'thank you'],
    }),
  };
}

function makeHeroCard(): CharacterCard {
  return {
    id: 'card-hero-1',
    name: 'Ser Aldric',
    role: 'hero',
    backstory: 'A knight sworn to protect the realm.',
    objectives: ['defend the innocent', 'uphold justice'],
    voice: makeVoice({
      vocabularyRange: ['formal', 'honorable'],
      sentenceLength: 'short',
      emotionalRange: ['warm', 'determined'],
      speechPatterns: ['declarative statements'],
      forbiddenTopics: ['betrayal'],
      forbiddenWords: ['never', 'forever'],
    }),
  };
}

function makeSceneContext(characterCard: CharacterCard, factContext = ''): SceneContext {
  return {
    characterCard,
    currentScene: {
      id: 'scene-1',
      description: 'A tense confrontation in the great hall.',
      location: 'Great Hall',
      tone: 'confrontational',
    },
    factContext,
    otherActors: [],
  };
}

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
      content: JSON.stringify({
        exchangeId: 'fallback-exchange',
        entries: [
          { speaker: 'fallback', text: 'fallback line', unverifiedFacts: false },
        ],
        tokenCount: 10,
      }),
    };
  }

  getCallLog() {
    return this.callLog;
  }
}

// ---------------------------------------------------------------------------
// Mock services
// ---------------------------------------------------------------------------

// Simple in-memory blackboard for testing
function createMockBlackboard() {
  const layers: Record<string, { entries: Array<{ id: string; agentId: string; content: string; metadata?: Record<string, unknown> }>; version: number }> = {
    core: { entries: [], version: 0 },
    scenario: { entries: [], version: 0 },
    semantic: { entries: [], version: 0 },
    procedural: { entries: [], version: 0 },
  };

  const readCalls: string[] = [];
  const writeCalls: { layer: string; content: string }[] = [];

  const blackboard = {
    readLayer(layer: string) {
      readCalls.push(layer);
      return {
        layer,
        currentVersion: layers[layer]?.version ?? 0,
        tokenCount: 0,
        tokenBudget: 8000,
        budgetUsedPct: 0,
        entries: layers[layer]?.entries ? [...layers[layer].entries] : [],
      };
    },
    writeEntry(layer: string, agentId: string, req: { content: string; messageId?: string }) {
      writeCalls.push({ layer, content: req.content });
      const ls = layers[layer];
      if (!ls) return { entry: { id: 'unknown', agentId, content: req.content }, layerVersion: 0 };
      ls.entries.push({ id: `entry-${writeCalls.length}`, agentId, content: req.content });
      ls.version++;
      return { entry: { id: `entry-${writeCalls.length}`, agentId, content: req.content }, layerVersion: ls.version };
    },
    _readCalls: readCalls,
    _writeCalls: writeCalls,
  };

  // Seed with character card entry for a specific agentId
  blackboard.seedCard = (agentId: string, card: CharacterCard) => {
    layers.semantic.entries.push({
      id: `card-${agentId}`,
      agentId,
      content: JSON.stringify(card),
      metadata: { characterCardFor: agentId },
    });
  };

  // Seed with fact context entries (inject directly into layers so readLayer picks them up)
  blackboard.seedFacts = (facts: string[], layer = 'core') => {
    facts.forEach((fact, i) => {
      layers[layer].entries.push({
        id: `${layer}-${i}`,
        agentId: 'director-1',
        content: fact,
      });
    });
  };

  return blackboard as unknown as BlackboardService & {
    _readCalls: string[];
    _writeCalls: { layer: string; content: string }[];
    seedCard: (agentId: string, card: CharacterCard) => void;
    seedFacts: (facts: string[], layer?: string) => void;
  };
}

function createMockCapabilityService(): CapabilityService {
  return {
    jwtSecret: 'test-secret-key-at-least-32-characters',
    capabilityMap: {
      Actor: ['semantic', 'procedural', 'core', 'scenario'],
      Director: ['core', 'scenario', 'semantic', 'procedural'],
      Admin: ['core', 'scenario', 'semantic', 'procedural'],
    },
    verify: vi.fn() as CapabilityService['verify'],
    check: vi.fn() as CapabilityService['check'],
  };
}

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
// createTestActor helper
// ---------------------------------------------------------------------------

function createTestActor(
  llmProvider: MockLlmProvider,
  mockBlackboard?: ReturnType<typeof createMockBlackboard>,
) {
  const blackboard = mockBlackboard ?? createMockBlackboard();
  const capabilityService = createMockCapabilityService();
  const logger = createMockLogger();

  const actor = new Actor({
    blackboard,
    capabilityService,
    llmProvider,
    logger,
    agentId: 'actor-001',
  });

  return { actor, blackboard, llmProvider };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Actor class — ACTR-01: Character card and voice constraints in prompts', () => {
  it('ACTR-01a: generate() with villain card includes name, role, and voice constraints in prompt', async () => {
    const mockLLM = new MockLlmProvider([{
      content: JSON.stringify({ exchangeId: 'ex-1', entries: [{ speaker: 'Lord Malachar', text: 'You dare challenge me?', unverifiedFacts: false }], tokenCount: 20 }),
    }]);
    const { actor } = createTestActor(mockLLM);

    await actor.generate(makeSceneContext(makeVillainCard(), 'The kingdom is at peace.'));

    const [call] = mockLLM.getCallLog();
    expect(call.system).toContain('Lord Malachar');
    expect(call.system).toContain('villain');
    expect(call.system).toContain('archaic');
    expect(call.system).toContain('intimidating');
    expect(call.system).toContain('cold');
    expect(call.system).toContain('calculating');
    expect(call.system).toContain('please'); // forbidden words appear in prompt
  });

  it('ACTR-01b: generate() with hero card includes different voice constraints from villain', async () => {
    const mockLLM = new MockLlmProvider([{
      content: JSON.stringify({ exchangeId: 'ex-2', entries: [{ speaker: 'Ser Aldric', text: 'Stand down!', unverifiedFacts: false }], tokenCount: 20 }),
    }]);
    const { actor } = createTestActor(mockLLM);

    await actor.generate(makeSceneContext(makeHeroCard(), 'The kingdom is at peace.'));

    const [call] = mockLLM.getCallLog();
    // Hero constraints should NOT contain villain-specific attributes
    expect(call.system).toContain('Ser Aldric');
    expect(call.system).toContain('hero');
    expect(call.system).toContain('formal');
    expect(call.system).toContain('honorable');
    expect(call.system).not.toContain('archaic');
    expect(call.system).not.toContain('intimidating');
    expect(call.system).not.toContain('cold');
    expect(call.system).not.toContain('calculating');
  });
});

describe('Actor class — ACTR-02: Scoped blackboard reads', () => {
  it('Actor reads core and scenario layers via readFactContext(), not procedural', async () => {
    const mockBlackboard = createMockBlackboard();
    const mockLLM = new MockLlmProvider([{
      content: JSON.stringify({ exchangeId: 'ex-3', entries: [{ speaker: 'Lord Malachar', text: 'Silence!', unverifiedFacts: false }], tokenCount: 20 }),
    }]);
    const { actor } = createTestActor(mockLLM, mockBlackboard);

    await actor.generate(makeSceneContext(makeVillainCard()));

    const readLayers = mockBlackboard._readCalls;
    expect(readLayers).toContain('core');
    expect(readLayers).toContain('scenario');
    expect(readLayers).not.toContain('procedural');
  });

  it('Actor does NOT read procedural layer on generate()', async () => {
    const mockBlackboard = createMockBlackboard();
    const mockLLM = new MockLlmProvider([{
      content: JSON.stringify({ exchangeId: 'ex-4', entries: [{ speaker: 'Lord Malachar', text: 'Silence!', unverifiedFacts: false }], tokenCount: 20 }),
    }]);
    const { actor } = createTestActor(mockLLM, mockBlackboard);

    await actor.generate(makeSceneContext(makeVillainCard()));

    const readLayers = mockBlackboard._readCalls;
    // The only layers read should be core and scenario
    expect(readLayers.every(l => ['core', 'scenario'].includes(l))).toBe(true);
  });
});

describe('Actor class — ACTR-03: Hallucination flag handling', () => {
  it('ACTR-03a: unverifiedFacts: true when LLM marks claim as unverified', async () => {
    const mockLLM = new MockLlmProvider([{
      content: JSON.stringify({
        exchangeId: 'ex-5',
        entries: [
          { speaker: 'Lord Malachar', text: 'The treaty was signed in 1200.', unverifiedFacts: true, unverifiedClaims: ['treaty was signed in 1200'] },
        ],
        tokenCount: 25,
      }),
    }]);
    const { actor } = createTestActor(mockLLM);

    const result = await actor.generate(makeSceneContext(makeVillainCard(), 'Fact: The treaty was signed in 1400.'));

    expect(result.entries[0].unverifiedFacts).toBe(true);
    expect(result.entries[0].unverifiedClaims).toContain('treaty was signed in 1200');
  });

  it('ACTR-03b: unverifiedFacts: false when LLM returns clean output', async () => {
    const mockLLM = new MockLlmProvider([{
      content: JSON.stringify({
        exchangeId: 'ex-6',
        entries: [
          { speaker: 'Ser Aldric', text: 'I shall protect the realm.', unverifiedFacts: false },
        ],
        tokenCount: 15,
      }),
    }]);
    const { actor } = createTestActor(mockLLM);

    const result = await actor.generate(makeSceneContext(makeHeroCard(), 'The kingdom is at peace.'));

    expect(result.entries[0].unverifiedFacts).toBe(false);
    expect(result.entries[0].unverifiedClaims).toBeUndefined();
  });
});

describe('Actor class — ACTR-04: Voice consistency over multiple generate() calls', () => {
  it('Voice constraints are included in LLM prompt on all 10 consecutive calls', async () => {
    const responses = Array.from({ length: 10 }, (_, i) => ({
      content: JSON.stringify({
        exchangeId: `ex-${i}`,
        entries: [{ speaker: 'Lord Malachar', text: `Line ${i}`, unverifiedFacts: false }],
        tokenCount: 10,
      }),
    }));
    const mockLLM = new MockLlmProvider(responses);
    const { actor } = createTestActor(mockLLM);
    const villainCard = makeVillainCard();

    for (let i = 0; i < 10; i++) {
      await actor.generate(makeSceneContext(villainCard));
    }

    const calls = mockLLM.getCallLog();
    expect(calls).toHaveLength(10);
    for (const [i, call] of calls.entries()) {
      expect(call.system).toContain('Lord Malachar', `Call ${i + 1}: missing character name`);
      expect(call.system).toContain('archaic', `Call ${i + 1}: missing vocabulary constraint`);
      expect(call.system).toContain('intimidating', `Call ${i + 1}: missing emotional constraint`);
      expect(call.system).toContain('cold', `Call ${i + 1}: missing emotional range`);
      expect(call.system).toContain('calculating', `Call ${i + 1}: missing emotional range`);
    }
  });
});

describe('Actor class — ACTR-05: Fact context from core layer in user prompt', () => {
  it('Core layer entries appear in the user prompt sent to LLM', async () => {
    const mockBlackboard = createMockBlackboard();
    mockBlackboard.seedFacts(['The treaty was signed in 1400.', 'The capital city is called Veradia.']);

    const mockLLM = new MockLlmProvider([{
      content: JSON.stringify({ exchangeId: 'ex-7', entries: [{ speaker: 'Lord Malachar', text: 'Ah yes, the treaty.', unverifiedFacts: false }], tokenCount: 20 }),
    }]);
    const { actor } = createTestActor(mockLLM, mockBlackboard);

    await actor.generate(makeSceneContext(makeVillainCard()));

    const [call] = mockLLM.getCallLog();
    expect(call.user).toContain('The treaty was signed in 1400.');
    expect(call.user).toContain('The capital city is called Veradia.');
    expect(call.user).toContain('## Core Facts');
  });

  it('Scenario layer entries also appear in user prompt', async () => {
    const mockBlackboard = createMockBlackboard();
    mockBlackboard.seedFacts(['The war ended last year.'], 'scenario');

    const mockLLM = new MockLlmProvider([{
      content: JSON.stringify({ exchangeId: 'ex-8', entries: [{ speaker: 'Lord Malachar', text: 'The war... yes.', unverifiedFacts: false }], tokenCount: 20 }),
    }]);
    const { actor } = createTestActor(mockLLM, mockBlackboard);

    await actor.generate(makeSceneContext(makeVillainCard()));

    const [call] = mockLLM.getCallLog();
    expect(call.user).toContain('The war ended last year.');
    expect(call.user).toContain('## Scenario');
  });
});

describe('Actor class — ERROR-01: Malformed JSON from LLM', () => {
  it('ActorGenerationError thrown with phase json_parse when LLM returns invalid JSON', async () => {
    const mockLLM = new MockLlmProvider([{
      content: 'this is not json {{{',
    }]);
    const { actor } = createTestActor(mockLLM);

    await expect(actor.generate(makeSceneContext(makeVillainCard())))
      .rejects.toThrow('Actor generation failed (json_parse)');
  });

  it('Error preserves the raw content as cause', async () => {
    const mockLLM = new MockLlmProvider([{ content: 'not json' }]);
    const { actor } = createTestActor(mockLLM);

    try {
      await actor.generate(makeSceneContext(makeVillainCard()));
      expect.fail('Should have thrown');
    } catch (err: unknown) {
      expect((err as { phase: string }).phase).toBe('json_parse');
    }
  });
});

describe('Actor class — ERROR-02: Invalid schema from LLM', () => {
  it('ActorGenerationError thrown with phase validation when schema is wrong', async () => {
    const mockLLM = new MockLlmProvider([{
      content: JSON.stringify({
        exchangeId: 'ex-9',
        // entries is a string instead of array — invalid schema
        entries: 'not an array',
        tokenCount: 10,
      }),
    }]);
    const { actor } = createTestActor(mockLLM);

    await expect(actor.generate(makeSceneContext(makeVillainCard())))
      .rejects.toThrow('Actor generation failed (validation)');
  });

  it('Error preserves the validation error as cause', async () => {
    const mockLLM = new MockLlmProvider([{ content: JSON.stringify({ entries: 'bad' }) }]);
    const { actor } = createTestActor(mockLLM);

    try {
      await actor.generate(makeSceneContext(makeVillainCard()));
      expect.fail('Should have thrown');
    } catch (err: unknown) {
      expect((err as { phase: string }).phase).toBe('validation');
    }
  });
});

describe('Actor class — getCharacterCard() and readFactContext()', () => {
  it('getCharacterCard() returns the character card from the semantic layer by agentId', () => {
    const mockBlackboard = createMockBlackboard();
    const villainCard = makeVillainCard();
    mockBlackboard.seedCard('actor-001', villainCard);

    const mockLLM = new MockLlmProvider([{
      content: JSON.stringify({ exchangeId: 'ex-10', entries: [{ speaker: 'x', text: 'y', unverifiedFacts: false }], tokenCount: 5 }),
    }]);
    const { actor } = createTestActor(mockLLM, mockBlackboard);

    const card = actor.getCharacterCard();
    expect(card).not.toBeNull();
    expect(card?.id).toBe('card-villain-1');
    expect(card?.name).toBe('Lord Malachar');
  });

  it('getCharacterCard() returns null when no character card entry exists', () => {
    const mockBlackboard = createMockBlackboard();
    const mockLLM = new MockLlmProvider([{
      content: JSON.stringify({ exchangeId: 'ex-11', entries: [{ speaker: 'x', text: 'y', unverifiedFacts: false }], tokenCount: 5 }),
    }]);
    const { actor } = createTestActor(mockLLM, mockBlackboard);

    const card = actor.getCharacterCard();
    expect(card).toBeNull();
  });

  it('readFactContext() concatenates core and scenario layer entries', () => {
    const mockBlackboard = createMockBlackboard();
    mockBlackboard.seedFacts(['Fact A', 'Fact B']);
    // Add scenario entry
    mockBlackboard.readLayer('scenario');

    const mockLLM = new MockLlmProvider([{
      content: JSON.stringify({ exchangeId: 'ex-12', entries: [{ speaker: 'x', text: 'y', unverifiedFacts: false }], tokenCount: 5 }),
    }]);
    const { actor } = createTestActor(mockLLM, mockBlackboard);

    const factCtx = actor.readFactContext();
    expect(factCtx).toContain('Fact A');
    expect(factCtx).toContain('Fact B');
    expect(factCtx).toContain('## Core Facts');
  });
});

describe('Actor class — Dialogue entries written to blackboard', () => {
  it('Each dialogue entry is written to the semantic layer with messageId = sceneId', async () => {
    const mockBlackboard = createMockBlackboard();
    const mockLLM = new MockLlmProvider([{
      content: JSON.stringify({
        exchangeId: 'ex-13',
        entries: [
          { speaker: 'Lord Malachar', text: 'First line.', unverifiedFacts: false },
          { speaker: 'Lord Malachar', text: 'Second line.', unverifiedFacts: false },
        ],
        tokenCount: 30,
      }),
    }]);
    const { actor } = createTestActor(mockLLM, mockBlackboard);
    const sceneId = 'scene-1';

    await actor.generate(makeSceneContext(makeVillainCard()));

    const writeCalls = mockBlackboard._writeCalls;
    expect(writeCalls).toHaveLength(2);
    for (const call of writeCalls) {
      expect(call.layer).toBe('semantic');
      const parsed = JSON.parse(call.content);
      expect(parsed.speaker).toBe('Lord Malachar');
      expect(parsed.text).toBeDefined();
    }
  });
});
