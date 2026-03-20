import type { CharacterCard, SceneContext } from '../types/actor.js';
import type { PlanningContext } from '../types/director.js';
import type pino from 'pino';
import { config } from '../config.js';

/**
 * Abstract LLM Provider interface.
 * Concrete implementations (OpenAI, Anthropic, etc.) come in Phase 7.
 * Actor class uses ONLY this interface — no LLM SDK imports in actor.ts.
 */
export interface LlmProvider {
  generate(prompt: LlmPrompt): Promise<LlmResponse>;
}

export interface LlmPrompt {
  system: string;   // system prompt with character card + voice constraints
  user: string;     // scene context as structured text
}

export interface LlmResponse {
  content: string;  // raw LLM text (usually JSON string)
}

/**
 * Build a system prompt for an Actor from its character card.
 * Extracted here so it can be tested independently of the Actor class.
 */
export function buildActorSystemPrompt(card: CharacterCard): string {
  const lines: string[] = [
    `You are ${card.name}, a ${card.role}.`,
    'You must respond with valid JSON only — no prose, no markdown, no explanation.',
    'Your response must match this exact schema:',
    '{"exchangeId": "...", "entries": [{"speaker": "...", "text": "...", "unverifiedFacts": boolean, "unverifiedClaims": ["..."]}]}',
    '',
    'Your speech style constraints:',
    `- Vocabulary range: ${card.voice.vocabularyRange.length > 0 ? card.voice.vocabularyRange.join(', ') : 'neutral'}`,
    `- Sentence length: ${card.voice.sentenceLength}`,
    `- Emotional range: ${card.voice.emotionalRange.join(', ') || 'neutral'}`,
    `- Speech patterns: ${card.voice.speechPatterns.join(', ') || 'standard'}`,
    `- Never discuss: ${card.voice.forbiddenTopics.join(', ') || 'none'}`,
    `- Never use these words: ${card.voice.forbiddenWords.join(', ') || 'none'}`,
    '',
    'Hallucination detection rules:',
    '- Only mark unverifiedFacts: true if your dialogue contains a FACTUAL CLAIM that directly contradicts the [Fact Context] provided in the user message.',
    '- Character opinions, emotional reactions, rhetorical questions, and dramatic statements are NOT facts — do not flag them.',
    '- If you are uncertain whether a claim is factual, do not flag it.',
    '- When unverifiedFacts is true, optionally list specific contradictory claims in unverifiedClaims.',
    '',
    'Respond with JSON only.',
  ];
  return lines.join('\n');
}

/**
 * Build a user prompt for an Actor from the scene context.
 */
export function buildActorUserPrompt(context: SceneContext): string {
  const lines: string[] = [
    '[Character Identity]',
    `You are ${context.characterCard.name}.`,
    `Your role: ${context.characterCard.role}.`,
    `Your objectives: ${context.characterCard.objectives.join('; ')} or create dramatic tension.`,
    '',
    '[Current Scene]',
    `Scene ID: ${context.currentScene.id}`,
    `Location: ${context.currentScene.location}`,
    `Description: ${context.currentScene.description}`,
    `Tone: ${context.currentScene.tone}`,
  ];

  if (context.otherActors.length > 0) {
    lines.push('', '[Other Characters in Scene]');
    for (const actor of context.otherActors) {
      lines.push(`- ${actor.name} (${actor.role})`);
    }
  }

  if (context.factContext.trim().length > 0) {
    lines.push('', '[Fact Context — these are established facts, do not contradict them]');
    lines.push(context.factContext);
  } else {
    lines.push('', '[Fact Context — no established facts yet in this session]');
  }

  lines.push('', '[Your Task]', 'Generate 1-3 dialogue lines as your character. Respond with JSON only.');

  return lines.join('\n');
}

/**
 * Build a system prompt for the Director.
 * Encodes the role contract: plan, arbitrate, fact-check — never write dialogue.
 */
export function buildDirectorSystemPrompt(): string {
  const lines: string[] = [
    'You are the Director of this multi-agent drama session.',
    'Your role is to plan the plot backbone, coordinate actors, arbitrate conflicts, and fact-check.',
    "You MUST NOT write dialogue for any character. That is the actors' exclusive role.",
    'You MUST respond with valid JSON only — no prose, no markdown, no explanation.',
    '',
    'Core responsibilities:',
    '- Write plot backbone prose to the core layer. Use [ACTOR DISCRETION] markers for scenes where actors control the outcome.',
    '- When writing the backbone, preserve all existing [ACTOR DISCRETION: ...] markers from prior versions.',
    '- Arbitrate conflicting actor outputs: write the canonical outcome to the scenario layer.',
    '- Fact-check actor outputs against established core layer facts. Only flag contradictions of objective world state.',
    '- Do NOT flag character opinions, emotional reactions, or dramatic statements as contradictions.',
    '',
    'Token budget: The core layer has a 2K token budget. Monitor usage and prune/summarize when approaching capacity.',
    '',
    'Respond with JSON only.',
  ];
  return lines.join('\n');
}

/**
 * Build a user prompt for the Director to plan or update the plot backbone.
 */
export function buildDirectorUserPrompt(context: PlanningContext, factContext: string): string {
  const lines: string[] = [
    '[Session]',
    `Drama ID: ${context.dramaId}`,
    '',
    '[Characters]',
    ...context.characters.map(c => `- ${c.name} (${c.role}): ${c.objectives.join('; ')}`),
    '',
    '[Existing Backbone — preserve all [ACTOR DISCRETION: ...] markers]',
    context.existingBackbone || '(new session — no existing backbone)',
    '',
    '[Previous Scenes]',
  ];

  if (context.previousScenes.length > 0) {
    for (const scene of context.previousScenes) {
      lines.push(`Scene ${scene.sceneId}: ${scene.outcome}`);
      if (scene.conflicts.length > 0) {
        lines.push(`  Unresolved conflicts: ${scene.conflicts.join(', ')}`);
      }
      lines.push(`  Plot advancement: ${scene.plotAdvancement}`);
    }
  } else {
    lines.push('(no previous scenes — this is the first scene)');
  }

  if (factContext.trim().length > 0) {
    lines.push('', '[Fact Context — established facts, do not contradict]', factContext);
  } else {
    lines.push('', '[Fact Context — no established facts yet]');
  }

  lines.push('', '[Your Task]', 'Write or update the plot backbone prose. Include at least one [ACTOR DISCRETION] scene. Respond with JSON only.');

  return lines.join('\n');
}

/**
 * Build a user prompt for the Director to fact-check actor outputs.
 */
/**
 * Create LLM provider based on configuration
 * @param logger Logger instance for provider
 * @returns LlmProvider implementation
 */
export async function createLlmProvider(logger: pino.Logger): Promise<LlmProvider> {
  switch (config.LLM_PROVIDER) {
    case 'openai': {
      const { OpenAiLlmProvider } = await import('./llm/openai.js');
      return new OpenAiLlmProvider({
        apiKey: config.OPENAI_API_KEY!,
        model: config.OPENAI_MODEL,
        baseUrl: config.OPENAI_BASE_URL,
      }, logger);
    }
    case 'anthropic': {
      const { AnthropicLlmProvider } = await import('./llm/anthropic.js');
      return new AnthropicLlmProvider({
        apiKey: config.ANTHROPIC_API_KEY!,
        model: config.ANTHROPIC_MODEL,
      }, logger);
    }
    default:
      throw new Error(`Unsupported LLM provider: ${config.LLM_PROVIDER}`);
  }
}

export function buildFactCheckUserPrompt(params: {
  sceneId: string;
  actorOutputs: Array<{ agentId: string; name: string; entries: Array<{ speaker: string; text: string; unverifiedFacts: boolean }> }>;
  coreFacts: string;
  scenarioFacts: string;
}): string {
  const lines: string[] = [
    '[Task]',
    `Fact-check the following actor outputs for Scene ${params.sceneId}.`,
    '',
    '[Established Facts — Core Layer]',
    params.coreFacts || '(no core facts established)',
    '',
    '[Established Facts — Scenario Layer]',
    params.scenarioFacts || '(no scenario facts established)',
    '',
    '[Actor Outputs]',
  ];

  for (const actor of params.actorOutputs) {
    lines.push(`\n${actor.name} (${actor.agentId}):`);
    for (const entry of actor.entries) {
      lines.push(`  [${entry.speaker}]: ${entry.text}`);
    }
  }

  lines.push(
    '',
    '[Instructions]',
    "Compare each actor's claims against the established facts above.",
    'Only flag contradictions of objective world state (who did what, when, where).',
    'Do NOT flag character opinions, emotional reactions, dramatic statements, or rhetorical choices.',
    'Return a JSON array of contradiction entries with severity: high (core contradiction), medium (scenario contradiction), low (minor detail).',
  );

  return lines.join('\n');
}
