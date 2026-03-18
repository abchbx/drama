import type { CharacterCard, SceneContext } from '../types/actor.js';

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
