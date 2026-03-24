import type pino from 'pino';

// ============================================================================
// Director Memory System - Context Compression & Drift Prevention
// ============================================================================

/**
 * Story anchor - Key plot points that must be preserved
 */
export interface StoryAnchor {
  id: string;
  type: 'theme' | 'conflict' | 'revelation' | 'decision' | 'consequence';
  content: string;
  importance: 1 | 2 | 3 | 4 | 5;  // 5 = absolutely critical
  sceneId: string;
  timestamp: number;
  relatedAnchors: string[];  // IDs of related anchors
}

/**
 * Plot thread - A narrative strand that needs resolution
 */
export interface PlotThread {
  id: string;
  description: string;
  status: 'active' | 'dormant' | 'resolved' | 'abandoned';
  introducedAt: string;  // sceneId
  lastMentionedAt: string;  // sceneId
  participants: string[];  // character names
  urgency: 1 | 2 | 3 | 4 | 5;
  expectedResolution?: string;  // How this should resolve
}

/**
 * Character arc snapshot - Track character development
 */
export interface CharacterArc {
  characterName: string;
  initialState: {
    goal: string;
    emotionalState: string;
    keyRelationships: Record<string, number>;  // name -> affinity score
  };
  currentState: {
    goal: string;
    emotionalState: string;
    keyRelationships: Record<string, number>;
  };
  pivotalMoments: Array<{
    sceneId: string;
    event: string;
    impact: 'minor' | 'moderate' | 'major' | 'transformative';
  }>;
  consistencyScore: number;  // 0-100, how consistent the arc is
}

/**
 * Compressed context for token-efficient prompts
 */
export interface CompressedContext {
  // Ultra-compact story summary
  storyDigest: string;  // "周建国中奖→彩票站危机→逃离现场"
  
  // Active plot threads (max 5)
  activeThreads: string[];
  
  // Critical anchors (max 5)
  criticalAnchors: string[];
  
  // Character positions/goals
  characterStatuses: string[];  // "周建国:恐慌/想逃跑; 老板:贪婪/想分赃"
  
  // Unresolved tensions
  pendingConflicts: string[];
  
  // Drift warnings
  driftAlerts: string[];
  
  // Token estimate
  estimatedTokens: number;
}

/**
 * Context health metrics
 */
export interface ContextHealth {
  totalAnchorCount: number;
  activeThreadCount: number;
  driftRiskScore: number;  // 0-100, higher = more drift risk
  lastCompressionAt: number;
  scenesSinceCompression: number;
  tokenEstimate: number;
  consistencyScore: number;  // 0-100
}

export interface DirectorMemoryOptions {
  logger: pino.Logger;
  maxAnchors?: number;
  maxThreads?: number;
  compressionThreshold?: number;  // Scenes before forced compression
}

/**
 * DirectorMemoryService manages the director's understanding of the story
 * and provides context compression to prevent token explosion and plot drift
 */
export class DirectorMemoryService {
  private readonly logger: pino.Logger;
  private readonly maxAnchors: number;
  private readonly maxThreads: number;
  private readonly compressionThreshold: number;
  
  // Core memory stores
  private anchors: Map<string, StoryAnchor> = new Map();
  private threads: Map<string, PlotThread> = new Map();
  private characterArcs: Map<string, CharacterArc> = new Map();
  
  // Context tracking
  private scenesSinceCompression = 0;
  private lastCompressionAt = Date.now();
  private storyTheme: string = '';
  private sceneSummaries: Array<{ sceneId: string; summary: string; keyEvents: string[] }> = [];

  constructor(options: DirectorMemoryOptions) {
    this.logger = options.logger;
    this.maxAnchors = options.maxAnchors ?? 20;
    this.maxThreads = options.maxThreads ?? 10;
    this.compressionThreshold = options.compressionThreshold ?? 5;
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  initialize(theme: string, characters: Array<{ name: string; role: string; objectives: string[] }>): void {
    this.storyTheme = theme;
    
    // Create initial character arcs
    for (const char of characters) {
      this.characterArcs.set(char.name, {
        characterName: char.name,
        initialState: {
          goal: char.objectives[0] || 'survive',
          emotionalState: 'neutral',
          keyRelationships: {},
        },
        currentState: {
          goal: char.objectives[0] || 'survive',
          emotionalState: 'neutral',
          keyRelationships: {},
        },
        pivotalMoments: [],
        consistencyScore: 100,
      });
    }

    // Create theme anchor
    this.addAnchor({
      type: 'theme',
      content: `主题：${theme}`,
      importance: 5,
      sceneId: 'init',
    });

    this.logger.info({ theme, characterCount: characters.length }, 'DirectorMemory initialized');
  }

  // ============================================================================
  // Anchor Management
  // ============================================================================

  addAnchor(anchor: Omit<StoryAnchor, 'id' | 'timestamp' | 'relatedAnchors'> & { relatedAnchors?: string[] }): string {
    const id = `anchor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const fullAnchor: StoryAnchor = {
      ...anchor,
      id,
      timestamp: Date.now(),
      relatedAnchors: anchor.relatedAnchors || [],
    };

    this.anchors.set(id, fullAnchor);
    
    // Prune if exceeding max
    this.pruneAnchors();
    
    this.logger.debug({ anchorId: id, type: anchor.type, importance: anchor.importance }, 'Anchor added');
    
    return id;
  }

  getCriticalAnchors(limit = 5): StoryAnchor[] {
    return Array.from(this.anchors.values())
      .filter(a => a.importance >= 4)
      .sort((a, b) => b.importance - a.importance || b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  private pruneAnchors(): void {
    if (this.anchors.size <= this.maxAnchors) return;

    // Sort by importance (keep high), then by time (keep recent)
    const sorted = Array.from(this.anchors.values()).sort((a, b) => {
      if (a.importance !== b.importance) {
        return b.importance - a.importance;
      }
      return b.timestamp - a.timestamp;
    });

    // Remove lowest importance oldest anchors
    const toRemove = sorted.slice(this.maxAnchors);
    for (const anchor of toRemove) {
      this.anchors.delete(anchor.id);
    }

    this.logger.debug({ removed: toRemove.length, remaining: this.anchors.size }, 'Anchors pruned');
  }

  // ============================================================================
  // Plot Thread Management
  // ============================================================================

  addThread(description: string, participants: string[], urgency: 1 | 2 | 3 | 4 | 5 = 3, sceneId: string): string {
    const id = `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const thread: PlotThread = {
      id,
      description,
      status: 'active',
      introducedAt: sceneId,
      lastMentionedAt: sceneId,
      participants,
      urgency,
    };

    this.threads.set(id, thread);
    this.pruneThreads();
    
    this.logger.debug({ threadId: id, description: description.substring(0, 50) }, 'Thread added');
    
    return id;
  }

  updateThread(threadId: string, updates: Partial<PlotThread>): void {
    const thread = this.threads.get(threadId);
    if (thread) {
      Object.assign(thread, updates);
      this.logger.debug({ threadId, updates }, 'Thread updated');
    }
  }

  getActiveThreads(): PlotThread[] {
    return Array.from(this.threads.values())
      .filter(t => t.status === 'active')
      .sort((a, b) => b.urgency - a.urgency);
  }

  private pruneThreads(): void {
    // Mark old resolved/abandoned threads for removal
    const now = Date.now();
    const toRemove: string[] = [];
    
    for (const [id, thread] of this.threads) {
      if (thread.status === 'resolved' || thread.status === 'abandoned') {
        // Remove resolved threads after 3 scenes
        if (this.scenesSinceCompression > 3) {
          toRemove.push(id);
        }
      }
    }

    for (const id of toRemove) {
      this.threads.delete(id);
    }

    // If still too many, remove lowest urgency dormant threads
    if (this.threads.size > this.maxThreads) {
      const sorted = Array.from(this.threads.values())
        .sort((a, b) => a.urgency - b.urgency);
      
      const excess = sorted.slice(0, this.threads.size - this.maxThreads);
      for (const thread of excess) {
        this.threads.delete(thread.id);
      }
    }
  }

  // ============================================================================
  // Character Arc Tracking
  // ============================================================================

  updateCharacterArc(
    characterName: string, 
    updates: Partial<CharacterArc['currentState']>,
    pivotalMoment?: { sceneId: string; event: string; impact: CharacterArc['pivotalMoments'][0]['impact'] }
  ): void {
    const arc = this.characterArcs.get(characterName);
    if (!arc) return;

    // Update current state
    Object.assign(arc.currentState, updates);

    // Add pivotal moment if significant
    if (pivotalMoment && ['major', 'transformative'].includes(pivotalMoment.impact)) {
      arc.pivotalMoments.push(pivotalMoment);
    }

    // Recalculate consistency score
    this.calculateConsistencyScore(arc);

    this.logger.debug({ characterName, updates }, 'Character arc updated');
  }

  private calculateConsistencyScore(arc: CharacterArc): void {
    // Simple heuristic: how much has changed from initial state
    const goalChanged = arc.initialState.goal !== arc.currentState.goal ? 20 : 0;
    const emotionChanged = arc.initialState.emotionalState !== arc.currentState.emotionalState ? 10 : 0;
    
    // Relationship changes
    let relationshipDrift = 0;
    for (const [name, initialAffinity] of Object.entries(arc.initialState.keyRelationships)) {
      const currentAffinity = arc.currentState.keyRelationships[name];
      if (currentAffinity !== undefined) {
        const diff = Math.abs(currentAffinity - initialAffinity);
        relationshipDrift += diff * 5;  // 5 points per affinity level change
      }
    }

    // Pivotal moments increase consistency if they explain changes
    const pivotalBonus = Math.min(arc.pivotalMoments.length * 10, 30);

    arc.consistencyScore = Math.max(0, 100 - goalChanged - emotionChanged - relationshipDrift + pivotalBonus);
  }

  // ============================================================================
  // Scene Processing
  // ============================================================================

  processScene(sceneId: string, sceneSummary: string, keyEvents: string[], characterActions: Record<string, string>): void {
    this.sceneSummaries.push({ sceneId, summary: sceneSummary, keyEvents });
    this.scenesSinceCompression++;

    // Update thread last mentioned
    for (const thread of this.threads.values()) {
      if (thread.status === 'active') {
        // Check if any key event relates to this thread
        const related = keyEvents.some(e => 
          thread.participants.some(p => e.includes(p)) ||
          e.includes(thread.description.substring(0, 20))
        );
        if (related) {
          thread.lastMentionedAt = sceneId;
        }
      }
    }

    // Update character arcs
    for (const [charName, action] of Object.entries(characterActions)) {
      this.updateCharacterArc(charName, {}, { sceneId, event: action, impact: 'minor' });
    }

    this.logger.debug({ sceneId, events: keyEvents.length }, 'Scene processed');

    // Check if compression needed
    if (this.scenesSinceCompression >= this.compressionThreshold) {
      this.compressContext();
    }
  }

  // ============================================================================
  // Context Compression
  // ============================================================================

  compressContext(): CompressedContext {
    this.logger.info('Starting context compression...');

    // 1. Generate story digest from recent scenes
    const recentScenes = this.sceneSummaries.slice(-5);
    const storyDigest = this.generateStoryDigest(recentScenes);

    // 2. Identify critical anchors
    const criticalAnchors = this.getCriticalAnchors(5).map(a => {
      const prefix = a.type === 'theme' ? '【主题】' : 
                     a.type === 'conflict' ? '【冲突】' :
                     a.type === 'revelation' ? '【揭示】' :
                     a.type === 'decision' ? '【决定】' : '【后果】';
      return `${prefix}${a.content}`;
    });

    // 3. List active threads
    const activeThreads = this.getActiveThreads().slice(0, 5).map(t => 
      `[${t.urgency}级]${t.description.substring(0, 40)}`
    );

    // 4. Character statuses
    const characterStatuses = Array.from(this.characterArcs.values()).map(arc => {
      const rels = Object.entries(arc.currentState.keyRelationships)
        .slice(0, 2)
        .map(([name, val]) => `${name}${val >= 0 ? '+' : ''}${val}`)
        .join('/');
      return `${arc.characterName}:${arc.currentState.emotionalState}/${arc.currentState.goal.substring(0, 15)}${rels ? '/' + rels : ''}`;
    });

    // 5. Detect drift
    const driftAlerts = this.detectDrift();

    // 6. Find unresolved conflicts
    const pendingConflicts = Array.from(this.threads.values())
      .filter(t => t.status === 'active' && t.urgency >= 4)
      .map(t => t.description.substring(0, 50));

    const compressed: CompressedContext = {
      storyDigest,
      activeThreads,
      criticalAnchors,
      characterStatuses,
      pendingConflicts,
      driftAlerts,
      estimatedTokens: 0,  // Will calculate below
    };

    // Calculate token estimate (rough approximation)
    const allText = [
      storyDigest,
      ...activeThreads,
      ...criticalAnchors,
      ...characterStatuses,
      ...pendingConflicts,
      ...driftAlerts,
    ].join('');
    compressed.estimatedTokens = Math.ceil(allText.length / 4);

    // Update tracking
    this.lastCompressionAt = Date.now();
    this.scenesSinceCompression = 0;

    // Clear old scene summaries (keep last 3)
    this.sceneSummaries = this.sceneSummaries.slice(-3);

    this.logger.info({ 
      estimatedTokens: compressed.estimatedTokens,
      anchors: criticalAnchors.length,
      threads: activeThreads.length,
      driftAlerts: driftAlerts.length,
    }, 'Context compressed');

    return compressed;
  }

  private generateStoryDigest(scenes: Array<{ summary: string; keyEvents: string[] }>): string {
    // Extract key narrative beats
    const beats: string[] = [];
    
    for (const scene of scenes) {
      // Take most significant event from each scene
      const topEvent = scene.keyEvents[0];
      if (topEvent) {
        // Compress to essence
        const compressed = topEvent
          .replace(/，/g, '')
          .replace(/。/g, '')
          .replace(/我/g, '')
          .substring(0, 15);
        beats.push(compressed);
      }
    }

    return beats.join('→');
  }

  private detectDrift(): string[] {
    const alerts: string[] = [];

    // Check theme drift
    const themeAnchors = Array.from(this.anchors.values()).filter(a => a.type === 'theme');
    if (themeAnchors.length > 1) {
      alerts.push('主题出现多重方向，需要明确');
    }

    // Check character consistency
    for (const arc of this.characterArcs.values()) {
      if (arc.consistencyScore < 50) {
        alerts.push(`${arc.characterName}的行为一致性低(${arc.consistencyScore})`);
      }
    }

    // Check abandoned threads
    const abandoned = Array.from(this.threads.values()).filter(t => t.status === 'abandoned');
    if (abandoned.length > 3) {
      alerts.push(`有${abandoned.length}条线索未收尾`);
    }

    // Check thread stagnation
    const stagnantThreads = Array.from(this.threads.values())
      .filter(t => t.status === 'active' && this.scenesSinceCompression > 3);
    if (stagnantThreads.length > 0) {
      alerts.push(`${stagnantThreads.length}条线索推进缓慢`);
    }

    return alerts.slice(0, 3);  // Max 3 alerts
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  getHealth(): ContextHealth {
    // Calculate drift risk
    const characterDrift = Array.from(this.characterArcs.values())
      .reduce((sum, arc) => sum + (100 - arc.consistencyScore), 0) / Math.max(1, this.characterArcs.size);
    
    const threadChaos = Array.from(this.threads.values())
      .filter(t => t.status === 'active').length > this.maxThreads * 0.8 ? 20 : 0;
    
    const anchorOverload = this.anchors.size > this.maxAnchors * 0.9 ? 15 : 0;

    const driftRiskScore = Math.min(100, characterDrift + threadChaos + anchorOverload);

    // Calculate average consistency
    const avgConsistency = Array.from(this.characterArcs.values())
      .reduce((sum, arc) => sum + arc.consistencyScore, 0) / Math.max(1, this.characterArcs.size);

    return {
      totalAnchorCount: this.anchors.size,
      activeThreadCount: Array.from(this.threads.values()).filter(t => t.status === 'active').length,
      driftRiskScore: Math.round(driftRiskScore),
      lastCompressionAt: this.lastCompressionAt,
      scenesSinceCompression: this.scenesSinceCompression,
      tokenEstimate: this.estimateTotalContextSize(),
      consistencyScore: Math.round(avgConsistency),
    };
  }

  private estimateTotalContextSize(): number {
    // Rough estimate of total context size in tokens
    const anchorText = Array.from(this.anchors.values())
      .map(a => a.content).join('');
    const threadText = Array.from(this.threads.values())
      .map(t => t.description).join('');
    const sceneText = this.sceneSummaries
      .map(s => s.summary + s.keyEvents.join('')).join('');
    
    return Math.ceil((anchorText.length + threadText.length + sceneText.length) / 4);
  }

  // ============================================================================
  // Export for LLM Prompt
  // ============================================================================

  getContextForPrompt(): string {
    const compressed = this.compressContext();
    const health = this.getHealth();

    const lines: string[] = [
      '【故事脉络】',
      compressed.storyDigest,
      '',
      '【核心锚点】',
      ...compressed.criticalAnchors.map(a => `• ${a}`),
      '',
      '【活跃线索】',
      ...compressed.activeThreads.map(t => `• ${t}`),
      '',
      '【角色状态】',
      ...compressed.characterStatuses.map(c => `• ${c}`),
    ];

    if (compressed.pendingConflicts.length > 0) {
      lines.push('', '【待解冲突】', ...compressed.pendingConflicts.map(c => `• ${c}`));
    }

    if (compressed.driftAlerts.length > 0) {
      lines.push('', '【漂移警告】', ...compressed.driftAlerts.map(a => `⚠️ ${a}`));
    }

    lines.push(
      '',
      `【系统状态】一致性${health.consistencyScore}/100 | 风险${health.driftRiskScore}/100 | 约${health.tokenEstimate}tokens`
    );

    return lines.join('\n');
  }
}
