import { z } from 'zod';

// === Voice constraints ===
export interface VoiceConstraints {
  vocabularyRange: string[];       // e.g., ['archaic', 'formal', 'intimidating']
  sentenceLength: 'short' | 'medium' | 'long' | 'variable';
  emotionalRange: string[];         // e.g., ['cold', 'distant', 'sarcastic']
  speechPatterns: string[];         // e.g., ['rhetorical questions', 'declarative statements']
  forbiddenTopics: string[];        // topics the character never discusses
  forbiddenWords: string[];         // explicit words the character never uses
}

// === Character card ===
export interface CharacterCard {
  id: string;
  name: string;
  role: string;           // e.g., 'villain', 'hero', 'mentor'
  backstory: string;
  objectives: string[];
  voice: VoiceConstraints;
}

// === Other actor summary ===
export interface OtherActorSummary {
  agentId: string;
  name: string;
  role: string;
}

// === Scene data ===
export interface CurrentSceneData {
  id: string;
  description: string;
  location: string;
  tone: string;   // e.g., 'tense', 'intimate', 'confrontational'
}

// === Scene context — passed to Actor.generate() ===
export interface SceneContext {
  characterCard: CharacterCard;
  currentScene: CurrentSceneData;
  factContext: string;   // core + scenario layer entries as text
  otherActors: OtherActorSummary[];
}

// === Dialogue entry — written to blackboard by Actor ===
export interface DialogueEntry {
  speaker: string;
  text: string;
  unverifiedFacts: boolean;
  unverifiedClaims?: string[];
}

// === Full dialogue output from Actor.generate() ===
export interface DialogueOutput {
  exchangeId: string;
  entries: DialogueEntry[];
  tokenCount: number;
  modelUsed?: string;
}

// === Zod schemas for runtime validation ===
export const VoiceConstraintsSchema = z.object({
  vocabularyRange: z.array(z.string()),
  sentenceLength: z.enum(['short', 'medium', 'long', 'variable']),
  emotionalRange: z.array(z.string()),
  speechPatterns: z.array(z.string()),
  forbiddenTopics: z.array(z.string()),
  forbiddenWords: z.array(z.string()),
});

export const CharacterCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  backstory: z.string(),
  objectives: z.array(z.string()),
  voice: VoiceConstraintsSchema,
});

export const DialogueEntrySchema = z.object({
  speaker: z.string(),
  text: z.string().min(1),
  unverifiedFacts: z.boolean(),
  unverifiedClaims: z.array(z.string()).optional(),
});

export const DialogueOutputSchema = z.object({
  exchangeId: z.string(),
  entries: z.array(DialogueEntrySchema),
  tokenCount: z.number(),
  modelUsed: z.string().optional(),
});

// === Actor generation error ===
export class ActorGenerationError extends Error {
  readonly cause: unknown;
  readonly phase: 'llm_call' | 'json_parse' | 'validation' | 'blackboard_write';
  constructor(phase: ActorGenerationError['phase'], message: string, cause?: unknown) {
    super(`Actor generation failed (${phase}): ${message}`);
    this.name = 'ActorGenerationError';
    this.phase = phase;
    this.cause = cause;
  }
}
