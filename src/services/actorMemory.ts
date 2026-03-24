import type pino from 'pino';
import type {
  ActorMemoryState,
  EpisodicMemory,
  SocialMemory,
  IntrospectiveMemory,
  EmotionalState,
  GoalState,
} from '../types/memory.js';
import {
  EpisodicMemorySchema,
  SocialMemorySchema,
  IntrospectiveMemorySchema,
  EmotionalStateSchema,
  GoalStateSchema,
} from '../types/memory.js';

export interface ActorMemoryServiceOptions {
  actorId: string;
  actorName: string;
  logger: pino.Logger;
}

/**
 * Token budget configuration for memory retrieval
 */
export interface MemoryTokenBudget {
  maxTotalTokens: number;      // Total budget for all memory sections
  emotionTokens: number;       // Budget for emotional state
  episodesTokens: number;      // Budget for episodic memories
  relationshipsTokens: number; // Budget for social relationships
  thoughtsTokens: number;      // Budget for introspective thoughts
  goalsTokens: number;         // Budget for goals
}

/**
 * Compact memory summary for token-efficient prompts
 */
export interface CompactMemorySummary {
  // Ultra-compact emotional state: "紧张4/兴奋3"
  emotion: string;
  
  // Recent episodes as brief statements
  recentEvents: string[];
  
  // Relationships as compact codes: "周建国:信+2/好+1"
  relationships: string[];
  
  // Active thoughts (last 2)
  thoughts: string[];
  
  // Top goals only
  goals: string[];
  
  // Estimated token count
  estimatedTokens: number;
}

/**
 * ActorMemoryService manages an individual actor's personal memory space.
 * 
 * This includes:
 * - Episodic memory: Events they experienced
 * - Social memory: Relationships with other characters
 * - Introspective memory: Thoughts, plans, reflections
 * - Emotional state: Current emotional condition
 * - Goals: What they're trying to achieve
 */
export class ActorMemoryService {
  private readonly actorId: string;
  private readonly actorName: string;
  private readonly logger: pino.Logger;
  private state: ActorMemoryState;

  constructor(options: ActorMemoryServiceOptions) {
    this.actorId = options.actorId;
    this.actorName = options.actorName;
    this.logger = options.logger;

    // Initialize empty memory state
    this.state = this.createInitialState();
    
    this.logger.info({ actorId: this.actorId, actorName: this.actorName }, 'ActorMemoryService initialized');
  }

  private createInitialState(): ActorMemoryState {
    const now = Date.now();
    
    return {
      actorId: this.actorId,
      actorName: this.actorName,
      episodic: [],
      social: new Map(),
      introspective: [],
      emotional: {
        primary: { emotion: 'neutral', intensity: 2 },
        secondary: [],
        trajectory: 'stable',
        triggers: [],
        duration: 'start of scene',
        expressionStyle: 'controlled',
        lastUpdated: now,
      },
      goals: {
        activeGoals: [],
        abandonedGoals: [],
        currentPriorities: [],
      },
      lastUpdated: now,
      totalMemories: 0,
      memoryCapacity: {
        maxEpisodic: 20,
        maxIntrospective: 15,
        retentionPriority: 'balanced',
      },
    };
  }

  // ============================================================================
  // Episodic Memory Operations
  // ============================================================================

  /**
   * Record a new episodic memory (something that happened to the actor)
   */
  recordEpisode(memory: Omit<EpisodicMemory, 'id' | 'clarity'>): void {
    const episode: EpisodicMemory = {
      ...memory,
      id: crypto.randomUUID(),
      clarity: memory.significance >= 4 ? 'vivid' : memory.significance >= 3 ? 'clear' : 'fading',
    };

    // Validate
    const result = EpisodicMemorySchema.safeParse(episode);
    if (!result.success) {
      this.logger.warn({ error: result.error }, 'Invalid episodic memory, skipping');
      return;
    }

    this.state.episodic.push(episode);
    this.state.totalMemories++;
    this.state.lastUpdated = Date.now();

    // Prune if exceeding capacity
    this.pruneEpisodicMemory();

    this.logger.debug({ 
      episodeId: episode.id, 
      event: episode.event.substring(0, 50),
      significance: episode.significance,
    }, 'Episodic memory recorded');
  }

  /**
   * Get episodic memories, optionally filtered
   */
  getEpisodes(options?: {
    about?: string;  // Filter by participant
    since?: number;  // Filter by timestamp
    minSignificance?: number;
    limit?: number;
  }): EpisodicMemory[] {
    let episodes = [...this.state.episodic];

    if (options?.about) {
      episodes = episodes.filter(e => 
        e.participants.some(p => p.toLowerCase().includes(options.about!.toLowerCase()))
      );
    }

    if (options?.since) {
      episodes = episodes.filter(e => e.timestamp >= options.since!);
    }

    if (options?.minSignificance) {
      episodes = episodes.filter(e => e.significance >= options.minSignificance!);
    }

    // Sort by significance (high first) then by time (recent first)
    episodes.sort((a, b) => {
      if (b.significance !== a.significance) {
        return b.significance - a.significance;
      }
      return b.timestamp - a.timestamp;
    });

    if (options?.limit) {
      episodes = episodes.slice(0, options.limit);
    }

    return episodes;
  }

  private pruneEpisodicMemory(): void {
    const { maxEpisodic, retentionPriority } = this.state.memoryCapacity;
    
    if (this.state.episodic.length <= maxEpisodic) return;

    // Sort based on retention priority
    this.state.episodic.sort((a, b) => {
      let scoreA = 0, scoreB = 0;
      
      switch (retentionPriority) {
        case 'recent':
          scoreA = a.timestamp;
          scoreB = b.timestamp;
          return scoreB - scoreA;  // Recent first
          
        case 'significant':
          return b.significance - a.significance;  // Significant first
          
        case 'emotional':
          scoreA = a.emotionalReaction.intensity;
          scoreB = b.emotionalReaction.intensity;
          return scoreB - scoreA;  // Emotional first
          
        case 'balanced':
        default:
          // Weighted combination
          scoreA = a.significance * 2 + a.emotionalReaction.intensity + (a.timestamp / 1000000000);
          scoreB = b.significance * 2 + b.emotionalReaction.intensity + (b.timestamp / 1000000000);
          return scoreB - scoreA;
      }
    });

    // Remove excess
    const removed = this.state.episodic.splice(maxEpisodic);
    this.state.totalMemories -= removed.length;
    
    this.logger.debug({ removed: removed.length, remaining: this.state.episodic.length }, 'Pruned episodic memories');
  }

  // ============================================================================
  // Social Memory Operations
  // ============================================================================

  /**
   * Get or create social memory for a target actor
   */
  getSocialMemory(targetActorId: string, targetName?: string): SocialMemory {
    let social = this.state.social.get(targetActorId);
    
    if (!social) {
      const now = Date.now();
      social = {
        targetActorId,
        targetName: targetName || targetActorId,
        firstImpression: { formed: false },
        currentAssessment: {
          trustLevel: 0,
          affinityLevel: 0,
          respectLevel: 0,
          dominantEmotion: 'neutral',
        },
        keyInteractions: [],
        unresolvedIssues: [],
        beliefs: [],
        lastUpdated: now,
      };
      this.state.social.set(targetActorId, social);
    }

    return social;
  }

  /**
   * Record first impression of another actor
   */
  recordFirstImpression(targetActorId: string, targetName: string, impression: string): void {
    const social = this.getSocialMemory(targetActorId, targetName);
    
    if (!social.firstImpression.formed) {
      social.firstImpression = {
        formed: true,
        content: impression,
        timestamp: Date.now(),
      };
      social.lastUpdated = Date.now();
      
      this.logger.debug({ targetActorId, impression: impression.substring(0, 50) }, 'First impression recorded');
    }
  }

  /**
   * Update relationship after an interaction
   */
  recordInteraction(
    targetActorId: string,
    targetName: string,
    event: string,
    impact: 'positive' | 'negative' | 'neutral',
    magnitude: 1 | 2 | 3,
    emotionalImpact?: string,
  ): void {
    const social = this.getSocialMemory(targetActorId, targetName);
    
    // Add interaction
    social.keyInteractions.push({
      timestamp: Date.now(),
      event: event.substring(0, 200),
      impact,
      magnitude,
    });

    // Update assessment based on impact
    const current = social.currentAssessment;
    const delta = impact === 'positive' ? magnitude : impact === 'negative' ? -magnitude : 0;
    
    current.trustLevel = Math.max(-5, Math.min(5, current.trustLevel + delta));
    current.affinityLevel = Math.max(-5, Math.min(5, current.affinityLevel + delta));
    
    if (emotionalImpact) {
      current.dominantEmotion = emotionalImpact;
    }

    // Keep only last 10 interactions
    if (social.keyInteractions.length > 10) {
      social.keyInteractions = social.keyInteractions.slice(-10);
    }

    social.lastUpdated = Date.now();
    
    this.logger.debug({ targetActorId, impact, magnitude }, 'Interaction recorded');
  }

  /**
   * Form or update a belief about another actor
   */
  updateBelief(
    targetActorId: string,
    targetName: string,
    belief: string,
    confidence: 'certain' | 'likely' | 'suspected' | 'uncertain',
  ): void {
    const social = this.getSocialMemory(targetActorId, targetName);
    
    // Check if belief already exists
    const existingIndex = social.beliefs.findIndex(b => b.content === belief);
    
    if (existingIndex >= 0) {
      // Update confidence
      social.beliefs[existingIndex].confidence = confidence;
    } else {
      // Add new belief
      social.beliefs.push({
        content: belief,
        confidence,
        formedAt: Date.now(),
      });
    }

    // Keep only last 10 beliefs
    if (social.beliefs.length > 10) {
      social.beliefs = social.beliefs.slice(-10);
    }

    social.lastUpdated = Date.now();
  }

  // ============================================================================
  // Introspective Memory Operations
  // ============================================================================

  /**
   * Record an introspective memory (thought, plan, realization)
   */
  recordIntrospection(memory: Omit<IntrospectiveMemory, 'id'>): void {
    const introspection: IntrospectiveMemory = {
      ...memory,
      id: crypto.randomUUID(),
    };

    const result = IntrospectiveMemorySchema.safeParse(introspection);
    if (!result.success) {
      this.logger.warn({ error: result.error }, 'Invalid introspective memory, skipping');
      return;
    }

    this.state.introspective.push(introspection);
    this.state.totalMemories++;
    this.state.lastUpdated = Date.now();

    this.pruneIntrospectiveMemory();

    this.logger.debug({ 
      introspectionId: introspection.id,
      type: introspection.type,
      isSecret: introspection.isSecret,
    }, 'Introspection recorded');
  }

  /**
   * Get introspective memories, optionally filtered
   */
  getIntrospections(options?: {
    type?: IntrospectiveMemory['type'];
    isSecret?: boolean;
    since?: number;
    limit?: number;
  }): IntrospectiveMemory[] {
    let introspections = [...this.state.introspective];

    if (options?.type) {
      introspections = introspections.filter(i => i.type === options.type);
    }

    if (options?.isSecret !== undefined) {
      introspections = introspections.filter(i => i.isSecret === options.isSecret);
    }

    if (options?.since) {
      introspections = introspections.filter(i => i.timestamp >= options.since!);
    }

    // Sort by timestamp (recent first)
    introspections.sort((a, b) => b.timestamp - a.timestamp);

    if (options?.limit) {
      introspections = introspections.slice(0, options.limit);
    }

    return introspections;
  }

  private pruneIntrospectiveMemory(): void {
    const { maxIntrospective } = this.state.memoryCapacity;
    
    if (this.state.introspective.length <= maxIntrospective) return;

    // Sort by: secrets first, then by timestamp
    this.state.introspective.sort((a, b) => {
      if (a.isSecret !== b.isSecret) {
        return a.isSecret ? -1 : 1;  // Secrets first
      }
      return b.timestamp - a.timestamp;  // Recent first
    });

    const removed = this.state.introspective.splice(maxIntrospective);
    this.state.totalMemories -= removed.length;
  }

  // ============================================================================
  // Emotional State Operations
  // ============================================================================

  /**
   * Update current emotional state
   */
  updateEmotionalState(update: Partial<EmotionalState>): void {
    this.state.emotional = {
      ...this.state.emotional,
      ...update,
      lastUpdated: Date.now(),
    };

    const result = EmotionalStateSchema.safeParse(this.state.emotional);
    if (!result.success) {
      this.logger.warn({ error: result.error }, 'Invalid emotional state');
    }

    this.logger.debug({ 
      emotion: this.state.emotional.primary.emotion,
      intensity: this.state.emotional.primary.intensity,
    }, 'Emotional state updated');
  }

  /**
   * Get current emotional state
   */
  getEmotionalState(): EmotionalState {
    return { ...this.state.emotional };
  }

  /**
   * Add a secondary emotion
   */
  addSecondaryEmotion(emotion: string, intensity: 1 | 2 | 3): void {
    // Remove if already exists
    this.state.emotional.secondary = this.state.emotional.secondary.filter(e => e.emotion !== emotion);
    
    // Add new
    this.state.emotional.secondary.push({ emotion, intensity });
    
    // Keep max 3 secondary emotions
    if (this.state.emotional.secondary.length > 3) {
      this.state.emotional.secondary = this.state.emotional.secondary.slice(-3);
    }

    this.state.emotional.lastUpdated = Date.now();
  }

  // ============================================================================
  // Goal Operations
  // ============================================================================

  /**
   * Add a new goal
   */
  addGoal(description: string, importance: 1 | 2 | 3 | 4 | 5, urgency: 1 | 2 | 3 | 4 | 5): string {
    const goalId = crypto.randomUUID();
    
    this.state.goals.activeGoals.push({
      id: goalId,
      description,
      importance,
      urgency,
      progress: 0,
      obstacles: [],
      formedAt: Date.now(),
    });

    this.updatePriorities();
    
    this.logger.debug({ goalId, description: description.substring(0, 50) }, 'Goal added');
    
    return goalId;
  }

  /**
   * Update goal progress
   */
  updateGoalProgress(goalId: string, progress: 0 | 1 | 2 | 3 | 4 | 5): void {
    const goal = this.state.goals.activeGoals.find(g => g.id === goalId);
    if (goal) {
      goal.progress = progress;
      
      if (progress === 5) {
        // Goal achieved - could move to a "completed" list
        this.logger.info({ goalId, description: goal.description }, 'Goal achieved');
      }
    }
  }

  /**
   * Abandon a goal
   */
  abandonGoal(goalId: string, reason: string): void {
    const index = this.state.goals.activeGoals.findIndex(g => g.id === goalId);
    if (index >= 0) {
      const goal = this.state.goals.activeGoals[index];
      this.state.goals.activeGoals.splice(index, 1);
      
      this.state.goals.abandonedGoals.push({
        description: goal.description,
        reason,
        abandonedAt: Date.now(),
      });

      this.updatePriorities();
      
      this.logger.debug({ goalId, reason }, 'Goal abandoned');
    }
  }

  /**
   * Update current priorities based on goal importance and urgency
   */
  private updatePriorities(): void {
    const sorted = [...this.state.goals.activeGoals].sort((a, b) => {
      const scoreA = a.importance * 2 + a.urgency;
      const scoreB = b.importance * 2 + b.urgency;
      return scoreB - scoreA;
    });

    this.state.goals.currentPriorities = sorted.map(g => g.description).slice(0, 3);
  }

  // ============================================================================
  // Summary & Export
  // ============================================================================

  /**
   * Get a summary of memories for LLM prompt context
   */
  getMemorySummary(): {
    recentEpisodes: EpisodicMemory[];
    keyRelationships: SocialMemory[];
    activeThoughts: IntrospectiveMemory[];
    currentEmotion: EmotionalState;
    topGoals: string[];
  } {
    return {
      recentEpisodes: this.getEpisodes({ limit: 5, minSignificance: 3 }),
      keyRelationships: Array.from(this.state.social.values())
        .sort((a, b) => b.lastUpdated - a.lastUpdated)
        .slice(0, 5),
      activeThoughts: this.getIntrospections({ limit: 3, since: Date.now() - 3600000 }), // Last hour
      currentEmotion: this.getEmotionalState(),
      topGoals: this.state.goals.currentPriorities,
    };
  }

  /**
   * Get a token-efficient compact memory summary
   * Uses aggressive compression to minimize token usage while preserving key information
   */
  getCompactMemorySummary(budget?: Partial<MemoryTokenBudget>): CompactMemorySummary {
    const defaultBudget: MemoryTokenBudget = {
      maxTotalTokens: 300,
      emotionTokens: 30,
      episodesTokens: 100,
      relationshipsTokens: 100,
      thoughtsTokens: 50,
      goalsTokens: 20,
      ...budget,
    };

    const summary: CompactMemorySummary = {
      emotion: '',
      recentEvents: [],
      relationships: [],
      thoughts: [],
      goals: [],
      estimatedTokens: 0,
    };

    // 1. Compact emotional state: "紧张4/兴奋3"
    const emotion = this.state.emotional;
    const emotionParts = [`${emotion.primary.emotion}${emotion.primary.intensity}`];
    for (const sec of emotion.secondary.slice(0, 2)) {
      emotionParts.push(`${sec.emotion}${sec.intensity}`);
    }
    summary.emotion = emotionParts.join('/');
    summary.estimatedTokens += Math.ceil(summary.emotion.length / 4);

    // 2. Compact recent episodes (most significant only)
    const episodes = this.getEpisodes({ limit: 3, minSignificance: 4 });
    for (const ep of episodes) {
      // Truncate to ~30 chars per episode
      let text = ep.event.replace(/我说：|我/g, '').trim();
      if (text.length > 35) text = text.substring(0, 32) + '...';
      summary.recentEvents.push(text);
      summary.estimatedTokens += Math.ceil(text.length / 4) + 5;
      if (summary.estimatedTokens > defaultBudget.episodesTokens) break;
    }

    // 3. Compact relationships: "周建国:信+2/好+1/尊+0"
    const socials = Array.from(this.state.social.values())
      .sort((a, b) => b.lastUpdated - a.lastUpdated)
      .slice(0, 4);
    
    for (const soc of socials) {
      const trust = soc.currentAssessment.trustLevel >= 0 ? `+${soc.currentAssessment.trustLevel}` : soc.currentAssessment.trustLevel;
      const affinity = soc.currentAssessment.affinityLevel >= 0 ? `+${soc.currentAssessment.affinityLevel}` : soc.currentAssessment.affinityLevel;
      const respect = soc.currentAssessment.respectLevel >= 0 ? `+${soc.currentAssessment.respectLevel}` : soc.currentAssessment.respectLevel;
      const rel = `${soc.targetName}:信${trust}/好${affinity}/尊${respect}`;
      summary.relationships.push(rel);
      summary.estimatedTokens += Math.ceil(rel.length / 4) + 3;
      if (summary.estimatedTokens > defaultBudget.relationshipsTokens + defaultBudget.episodesTokens) break;
    }

    // 4. Compact thoughts (only last 2, truncated)
    const thoughts = this.getIntrospections({ limit: 2 });
    for (const t of thoughts) {
      let text = t.content;
      if (text.length > 40) text = text.substring(0, 37) + '...';
      summary.thoughts.push(`[${t.type}]${text}`);
      summary.estimatedTokens += Math.ceil(text.length / 4) + 8;
    }

    // 5. Goals (just the descriptions, truncated)
    for (const goal of this.state.goals.currentPriorities.slice(0, 2)) {
      let text = goal;
      if (text.length > 30) text = text.substring(0, 27) + '...';
      summary.goals.push(text);
      summary.estimatedTokens += Math.ceil(text.length / 4) + 3;
    }

    this.logger.debug({ 
      estimatedTokens: summary.estimatedTokens,
      maxTokens: defaultBudget.maxTotalTokens,
    }, 'Compact memory summary generated');

    return summary;
  }

  /**
   * Export full memory state
   */
  exportState(): ActorMemoryState {
    return {
      ...this.state,
      social: new Map(this.state.social),  // Convert Map to plain object for serialization
    } as ActorMemoryState;
  }

  /**
   * Import memory state (for restoring from save)
   */
  importState(state: ActorMemoryState): void {
    this.state = {
      ...state,
      social: new Map(Object.entries(state.social)),
    };
    this.logger.info({ totalMemories: state.totalMemories }, 'Memory state imported');
  }
}
