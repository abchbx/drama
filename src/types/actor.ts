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

// === Memory summary for Actor prompt ===
export interface ActorMemorySummary {
  // Full format for detailed prompts
  recentEpisodes: Array<{
    event: string;
    emotionalReaction: { emotion: string; intensity: number };
  }>;
  keyRelationships: Array<{
    targetName: string;
    trustLevel: number;
    affinityLevel: number;
    dominantEmotion: string;
  }>;
  activeThoughts: Array<{
    type: string;
    content: string;
  }>;
  currentEmotion: {
    primary: { emotion: string; intensity: number };
    secondary: Array<{ emotion: string; intensity: number }>;
  };
  topGoals: string[];
  
  // Compact format for token-efficient prompts
  compact?: {
    emotion: string;           // "紧张4/兴奋3"
    recentEvents: string[];    // Brief event descriptions
    relationships: string[];   // "周建国:信+2/好+1"
    thoughts: string[];        // "[plan]我要离开"
    goals: string[];           // Brief goal descriptions
    estimatedTokens: number;
  };
}

// === Scene context — passed to Actor.generate() ===
export interface SceneContext {
  characterCard: CharacterCard;
  currentScene: CurrentSceneData;
  factContext: string;   // core + scenario layer entries as text
  otherActors: OtherActorSummary[];
  // NEW: Perceptual boundary for this specific actor
  perceptualBoundary?: PerceptualBoundary;
  // NEW: Personal memory summary
  memorySummary?: ActorMemorySummary;
}

// === Dialogue entry — written to blackboard by Actor ===
export interface DialogueEntry {
  speaker: string;
  text: string;
  unverifiedFacts: boolean;
  unverifiedClaims?: string[];
  // NEW: Target recipients for this dialogue (perceptual boundary)
  // If not specified, defaults to all actors in scene
  targetActors?: string[];
  // NEW: Visibility scope for this dialogue
  visibility?: 'public' | 'private' | 'selective';
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
  targetActors: z.array(z.string()).optional(),
  visibility: z.enum(['public', 'private', 'selective']).optional(),
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

// === Perceptual boundary for cognitive limits ===

export interface PerceptualBoundary {
  // What this actor can perceive (their "cognitive window")
  visibleFacts: string[];
  // What this actor knows but others don't (secrets)
  privateKnowledge: string[];
  // What this actor suspects but isn't sure (uncertain beliefs)
  suspicions: Array<{
    content: string;
    confidence: 'high' | 'medium' | 'low';
    source?: string;
  }>;
  // What this actor witnessed directly (first-hand experience)
  eyewitnessEvents: string[];
  // What this actor was told by others (second-hand information)
  hearsay: Array<{
    content: string;
    source: string;
    reliability: 'trusted' | 'neutral' | 'doubted';
  }>;
}

// === Visibility scope when writing to blackboard ===

export type VisibilityScope = 
  | 'public'           // All actors can see
  | 'private'          // Only the writer can see
  | 'selective'        // Only specific actors can see
  | 'faction'          // Only actors with same faction/tag
  | 'overheard';       // May be partially visible to nearby actors

export interface VisibilityMetadata {
  scope: VisibilityScope;
  // For 'selective' scope: list of actorIds who can see
  visibleTo?: string[];
  // For 'overheard' scope: actors who might have overheard partially
  overheardBy?: string[];
  // Faction/tag for 'faction' scope
  faction?: string;
}

// === Zod schemas for perceptual boundary ===

export const PerceptualBoundarySchema = z.object({
  visibleFacts: z.array(z.string()),
  privateKnowledge: z.array(z.string()),
  suspicions: z.array(z.object({
    content: z.string(),
    confidence: z.enum(['high', 'medium', 'low']),
    source: z.string().optional(),
  })),
  eyewitnessEvents: z.array(z.string()),
  hearsay: z.array(z.object({
    content: z.string(),
    source: z.string(),
    reliability: z.enum(['trusted', 'neutral', 'doubted']),
  })),
});

export const VisibilityMetadataSchema = z.object({
  scope: z.enum(['public', 'private', 'selective', 'faction', 'overheard']),
  visibleTo: z.array(z.string()).optional(),
  overheardBy: z.array(z.string()).optional(),
  faction: z.string().optional(),
});
