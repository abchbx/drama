import { z } from 'zod';

// ============================================================================
// Actor Personal Memory System
// Each actor has their own memory space for episodic, social, and introspective memory
// ============================================================================

/**
 * Episodic Memory: "I experienced this"
 * Specific events the actor witnessed or participated in
 */
export interface EpisodicMemory {
  id: string;
  timestamp: number;
  sceneId: string;
  
  // What happened
  event: string;
  
  // Who was involved
  participants: string[];
  
  // Where it happened
  location: string;
  
  // Actor's emotional reaction at the time
  emotionalReaction: {
    emotion: string;
    intensity: 1 | 2 | 3 | 4 | 5;  // 1=slight, 5=overwhelming
    reason: string;
  };
  
  // How important/memorable this is (affects retention)
  significance: 1 | 2 | 3 | 4 | 5;  // 1=forgettable, 5=unforgettable
  
  // Sensory details (what the actor noticed)
  sensoryDetails: {
    visual?: string;
    auditory?: string;
    tactile?: string;
    olfactory?: string;
  };
  
  // Whether this memory is clear or fading
  clarity: 'vivid' | 'clear' | 'fading' | 'fragmented';
}

/**
 * Social Memory: "I think/feel this about them"
 * Actor's relationships and impressions of other characters
 */
export interface SocialMemory {
  // Who this is about
  targetActorId: string;
  targetName: string;
  
  // First impression (formed when first met)
  firstImpression: {
    formed: boolean;
    content?: string;
    timestamp?: number;
  };
  
  // Current relationship assessment
  currentAssessment: {
    trustLevel: -5 | -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5;  // -5=deep distrust, 5=complete trust
    affinityLevel: -5 | -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5;  // -5=hatred, 5=love/admiration
    respectLevel: -5 | -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5;  // -5=contempt, 5=deep respect
    dominantEmotion: string;  // e.g., "suspicion", "gratitude", "fear"
  };
  
  // Key interactions that shaped this relationship
  keyInteractions: Array<{
    timestamp: number;
    event: string;
    impact: 'positive' | 'negative' | 'neutral';
    magnitude: 1 | 2 | 3;  // How much it changed the relationship
  }>;
  
  // Outstanding obligations or unresolved issues
  unresolvedIssues: string[];
  
  // What the actor believes about this person (may be wrong!)
  beliefs: Array<{
    content: string;
    confidence: 'certain' | 'likely' | 'suspected' | 'uncertain';
    formedAt: number;
  }>;
  
  // Last updated
  lastUpdated: number;
}

/**
 * Introspective Memory: "I thought/felt/planned this"
 * Actor's inner world - thoughts, plans, reflections
 */
export interface IntrospectiveMemory {
  id: string;
  timestamp: number;
  sceneId: string;
  
  // Type of introspection
  type: 'thought' | 'plan' | 'reflection' | 'realization' | 'conflict';
  
  // The content (what they were thinking)
  content: string;
  
  // What triggered this thought
  trigger: {
    type: 'event' | 'dialogue' | 'observation' | 'memory' | 'spontaneous';
    description: string;
  };
  
  // Emotional context when thinking this
  emotionalContext: {
    primary: string;
    intensity: 1 | 2 | 3 | 4 | 5;
  };
  
  // Whether this is a secret they keep from others
  isSecret: boolean;
  
  // Whether this thought led to any action/decision
  ledToAction: boolean;
  resultingAction?: string;
}

/**
 * Emotional State: Current emotional condition
 * Dynamic state that changes throughout the scene
 */
export interface EmotionalState {
  // Primary emotion (the dominant one)
  primary: {
    emotion: string;  // e.g., "anger", "fear", "joy", "sadness", "surprise", "disgust", "anticipation", "trust"
    intensity: 1 | 2 | 3 | 4 | 5;
  };
  
  // Secondary emotions (mixing in)
  secondary: Array<{
    emotion: string;
    intensity: 1 | 2 | 3;
  }>;
  
  // Emotional trajectory (how it's changing)
  trajectory: 'intensifying' | 'stable' | 'diminishing' | 'shifting';
  
  // What's causing this emotion
  triggers: string[];
  
  // How long they've been feeling this way (in scene time)
  duration: string;  // e.g., "moments", "minutes", "since the revelation"
  
  // How they might express this (their typical expression style)
  expressionStyle: 'restrained' | 'controlled' | 'visible' | 'explosive';
  
  // Last updated
  lastUpdated: number;
}

/**
 * Goal/Objective Tracking
 * What the actor is trying to achieve
 */
export interface GoalState {
  // Active goals the actor is pursuing
  activeGoals: Array<{
    id: string;
    description: string;
    importance: 1 | 2 | 3 | 4 | 5;
    urgency: 1 | 2 | 3 | 4 | 5;
    progress: 0 | 1 | 2 | 3 | 4 | 5;  // 0=not started, 5=achieved
    obstacles: string[];
    formedAt: number;
  }>;
  
  // Failed/abandoned goals
  abandonedGoals: Array<{
    description: string;
    reason: string;
    abandonedAt: number;
  }>;
  
  // Current priorities (ranked)
  currentPriorities: string[];
}

/**
 * Complete Actor Memory State
 */
export interface ActorMemoryState {
  actorId: string;
  actorName: string;
  
  // Different memory types
  episodic: EpisodicMemory[];
  social: Map<string, SocialMemory>;  // Keyed by targetActorId
  introspective: IntrospectiveMemory[];
  
  // Current states
  emotional: EmotionalState;
  goals: GoalState;
  
  // Memory metadata
  lastUpdated: number;
  totalMemories: number;
  
  // Memory capacity (forgetting old/insignificant memories)
  memoryCapacity: {
    maxEpisodic: number;
    maxIntrospective: number;
    retentionPriority: 'recent' | 'significant' | 'emotional' | 'balanced';
  };
}

// ============================================================================
// Zod Schemas for validation
// ============================================================================

export const EpisodicMemorySchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  sceneId: z.string(),
  event: z.string(),
  participants: z.array(z.string()),
  location: z.string(),
  emotionalReaction: z.object({
    emotion: z.string(),
    intensity: z.number().min(1).max(5),
    reason: z.string(),
  }),
  significance: z.number().min(1).max(5),
  sensoryDetails: z.object({
    visual: z.string().optional(),
    auditory: z.string().optional(),
    tactile: z.string().optional(),
    olfactory: z.string().optional(),
  }),
  clarity: z.enum(['vivid', 'clear', 'fading', 'fragmented']),
});

export const SocialMemorySchema = z.object({
  targetActorId: z.string(),
  targetName: z.string(),
  firstImpression: z.object({
    formed: z.boolean(),
    content: z.string().optional(),
    timestamp: z.number().optional(),
  }),
  currentAssessment: z.object({
    trustLevel: z.number().min(-5).max(5),
    affinityLevel: z.number().min(-5).max(5),
    respectLevel: z.number().min(-5).max(5),
    dominantEmotion: z.string(),
  }),
  keyInteractions: z.array(z.object({
    timestamp: z.number(),
    event: z.string(),
    impact: z.enum(['positive', 'negative', 'neutral']),
    magnitude: z.number().min(1).max(3),
  })),
  unresolvedIssues: z.array(z.string()),
  beliefs: z.array(z.object({
    content: z.string(),
    confidence: z.enum(['certain', 'likely', 'suspected', 'uncertain']),
    formedAt: z.number(),
  })),
  lastUpdated: z.number(),
});

export const IntrospectiveMemorySchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  sceneId: z.string(),
  type: z.enum(['thought', 'plan', 'reflection', 'realization', 'conflict']),
  content: z.string(),
  trigger: z.object({
    type: z.enum(['event', 'dialogue', 'observation', 'memory', 'spontaneous']),
    description: z.string(),
  }),
  emotionalContext: z.object({
    primary: z.string(),
    intensity: z.number().min(1).max(5),
  }),
  isSecret: z.boolean(),
  ledToAction: z.boolean(),
  resultingAction: z.string().optional(),
});

export const EmotionalStateSchema = z.object({
  primary: z.object({
    emotion: z.string(),
    intensity: z.number().min(1).max(5),
  }),
  secondary: z.array(z.object({
    emotion: z.string(),
    intensity: z.number().min(1).max(3),
  })),
  trajectory: z.enum(['intensifying', 'stable', 'diminishing', 'shifting']),
  triggers: z.array(z.string()),
  duration: z.string(),
  expressionStyle: z.enum(['restrained', 'controlled', 'visible', 'explosive']),
  lastUpdated: z.number(),
});

export const GoalStateSchema = z.object({
  activeGoals: z.array(z.object({
    id: z.string(),
    description: z.string(),
    importance: z.number().min(1).max(5),
    urgency: z.number().min(1).max(5),
    progress: z.number().min(0).max(5),
    obstacles: z.array(z.string()),
    formedAt: z.number(),
  })),
  abandonedGoals: z.array(z.object({
    description: z.string(),
    reason: z.string(),
    abandonedAt: z.number(),
  })),
  currentPriorities: z.array(z.string()),
});

export const ActorMemoryStateSchema = z.object({
  actorId: z.string(),
  actorName: z.string(),
  episodic: z.array(EpisodicMemorySchema),
  social: z.record(SocialMemorySchema),
  introspective: z.array(IntrospectiveMemorySchema),
  emotional: EmotionalStateSchema,
  goals: GoalStateSchema,
  lastUpdated: z.number(),
  totalMemories: z.number(),
  memoryCapacity: z.object({
    maxEpisodic: z.number(),
    maxIntrospective: z.number(),
    retentionPriority: z.enum(['recent', 'significant', 'emotional', 'balanced']),
  }),
});
