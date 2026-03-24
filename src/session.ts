import type pino from 'pino';
import type { CharacterCard } from './types/actor.js';
import type { CharacterDefinition } from './types/director.js';
import type { BlackboardService } from './services/blackboard.js';
import type { RouterService } from './services/router.js';
import type { MemoryManagerService } from './services/memoryManager.js';
import type { LlmProvider } from './services/llm.js';
import type { CapabilityService } from './services/capability.js';
import { Actor } from './services/actor.js';
import { Director } from './services/director.js';
import { childLogger, sessionLogger } from './services/logger.js';

export interface SceneConfig {
  id: string;
  location: string;
  description: string;
  tone: string;
  actorIds: string[];
  durationMs?: number; // User-set scene duration in milliseconds
}

export interface SceneResult {
  sceneId: string;
  status: 'completed' | 'interrupted' | 'timeout';
  entryCount: number;
  conflicts: string[];
  beats: string[];
}

export interface DramaResult {
  dramaId: string;
  totalScenes: number;
  completedScenes: number;
  status: 'success' | 'partial' | 'failed';
  sceneResults: SceneResult[];
}

export interface ChaosHooks {
  beforeTurn?: (agentId: string) => Promise<void>;
  afterWrite?: () => Promise<void>;
}

export class DramaSession {
  public readonly dramaId: string;
  public readonly name: string;  // Session name as drama theme
  private readonly config: {
    sceneTimeoutMs: number;
    actorTimeoutMs: number;
  };
  private readonly blackboard: BlackboardService;
  private readonly router: RouterService;
  private readonly memoryManager: MemoryManagerService;
  private readonly llmProvider: LlmProvider;
  private readonly capabilityService: CapabilityService;
  private readonly baseLogger: pino.Logger;
  private readonly logger: pino.Logger;
  private readonly director: Director;
  private readonly actors: Map<string, Actor>;
  private readonly characterCards: Map<string, CharacterCard>;
  private chaosHooks: ChaosHooks;
  private isInitialized = false;

  constructor(options: {
    dramaId?: string;
    name?: string;  // Session name as drama theme/topic
    config: {
      sceneTimeoutMs: number;
      actorTimeoutMs: number;
    };
    blackboard: BlackboardService;
    router: RouterService;
    memoryManager: MemoryManagerService;
    llmProvider: LlmProvider;
    capabilityService: CapabilityService;
    logger: pino.Logger;
  }) {
    this.dramaId = options.dramaId ?? crypto.randomUUID();
    this.name = options.name ?? 'Untitled Drama';
    this.config = options.config;
    this.blackboard = options.blackboard;
    this.router = options.router;
    this.memoryManager = options.memoryManager;
    this.llmProvider = options.llmProvider;
    this.capabilityService = options.capabilityService;
    this.baseLogger = options.logger;
    this.logger = sessionLogger(this.dramaId);
    this.actors = new Map();
    this.characterCards = new Map();
    this.chaosHooks = {};

    // Create Director
    const directorId = `director-${this.dramaId}`;
    const directorLogger = childLogger(directorId);
    this.director = new Director({
      blackboard: this.blackboard,
      capabilityService: this.capabilityService,
      llmProvider: this.llmProvider,
      memoryManager: this.memoryManager,
      logger: directorLogger,
      agentId: directorId,
    });
  }

  /**
   * Initialize the drama session with character cards
   */
  async initialize(characterCards: CharacterCard[]): Promise<void> {
    this.logger.info({ dramaId: this.dramaId, characterCount: characterCards.length }, 'DramaSession.initialize: starting');

    // Store character cards
    for (const card of characterCards) {
      this.characterCards.set(card.id, card);

      // Write character card to semantic layer
      this.blackboard.writeEntry('semantic', 'system', {
        content: JSON.stringify(card),
        messageId: card.id,
        metadata: { characterCardFor: card.id },
      });
    }

    // Create Actor instances
    for (const card of characterCards) {
      const actorLogger = childLogger(card.id);
      const actor = new Actor({
        blackboard: this.blackboard,
        capabilityService: this.capabilityService,
        llmProvider: this.llmProvider,
        logger: actorLogger,
        agentId: card.id,
        actorName: card.name,
        characterCard: card,
      });
      this.actors.set(card.id, actor);
    }

    this.isInitialized = true;
    this.logger.info('DramaSession.initialize: complete');
  }

  /**
   * Inject chaos hooks for testing
   */
  injectChaos(hooks: ChaosHooks): void {
    this.chaosHooks = hooks;
    this.logger.debug('DramaSession: chaos hooks injected');
  }

  /**
   * Simulate an actor disconnect for testing
   */
  simulateDisconnect(agentId: string): void {
    this.logger.warn({ agentId }, 'DramaSession: simulating actor disconnect');
    // Implementation would signal router to disconnect the actor
  }

  /**
   * Run a single scene
   */
  async runScene(sceneConfig: SceneConfig): Promise<SceneResult> {
    if (!this.isInitialized) {
      throw new Error('DramaSession not initialized. Call initialize() first.');
    }

    this.logger.info({ sceneId: sceneConfig.id }, 'DramaSession.runScene: starting');

    // Broadcast scene start to frontend FIRST - ensure users see scene started even if director fails
    this.logger.info({ actorCount: sceneConfig.actorIds.length, routerExists: !!this.router }, 'DramaSession: broadcasting scene_start message');
    try {
      const sceneStartMsg = {
        id: crypto.randomUUID(),
        type: 'scene_start' as const,
        from: `director-${this.dramaId}`,
        to: sceneConfig.actorIds,
        payload: {
          role: 'Director',
          text: `Scene started: ${sceneConfig.location}`,
          sceneId: sceneConfig.id,
          location: sceneConfig.location,
          description: sceneConfig.description,
        },
        timestamp: Date.now(),
      };
      this.logger.info({ msgId: sceneStartMsg.id, type: sceneStartMsg.type }, 'DramaSession: sending scene_start broadcast');
      this.router.sendBroadcast(sceneStartMsg);
      this.logger.info('DramaSession: scene_start broadcast sent successfully');
    } catch (broadcastErr) {
      this.logger.error({ err: broadcastErr }, 'DramaSession: FAILED to broadcast scene_start');
    }

    try {
      // Director plans backbone if first scene - and generates characters based on theme
      const firstScene = this.blackboard.readLayer('procedural').entries.length === 0;
      let generatedCharacters: CharacterDefinition[] | undefined;
      
      if (firstScene) {
        // Initialize director memory with theme and initial characters
        const initialCharacters = Array.from(this.characterCards.values()).map(card => ({
          name: card.name,
          role: card.role,
          objectives: card.objectives,
        }));
        this.director.initializeMemory(this.name, initialCharacters);
        
        // First, get director to generate characters based on theme
        // We pass empty characters array initially - director will generate them
        try {
          const result = await this.director.planBackbone({
            dramaId: this.dramaId,
            theme: this.name,
            characters: [],
            existingBackbone: '',
            previousScenes: [],
            newContentEstimate: 1000,
          });
          
          // Broadcast director's backbone prose (narration) to frontend
          if (result.backboneProse) {
            this.logger.info({ proseLength: result.backboneProse.length }, 'DramaSession: broadcasting director narration');
            try {
              this.router.sendBroadcast({
                id: crypto.randomUUID(),
                type: 'narration' as const,
                from: `director-${this.dramaId}`,
                to: sceneConfig.actorIds,
                payload: {
                  role: 'Director',
                  text: result.backboneProse,
                  sceneId: sceneConfig.id,
                },
                timestamp: Date.now(),
              });
            } catch (narrationErr) {
              this.logger.error({ err: narrationErr }, 'DramaSession: failed to broadcast narration');
            }
          }
          
          // Use the generated characters to recreate actors
          if (result.characters && result.characters.length > 0) {
            generatedCharacters = result.characters;
            this.logger.info({ characterCount: result.characters.length }, 'DramaSession: director generated characters based on theme');
            
            // Re-initialize director memory with new characters
            this.director.initializeMemory(this.name, result.characters.map(c => ({
              name: c.name,
              role: c.role,
              objectives: c.objectives,
            })));
            
            // Clear existing mock actors and recreate with generated characters
            this.actors.clear();
            this.characterCards.clear();
            
            for (let i = 0; i < result.characters.length; i++) {
              const charDef = result.characters[i];
              const actorId = `actor-${this.dramaId}-${i + 1}`;
              
              const characterCard: CharacterCard = {
                id: actorId,
                name: charDef.name,
                role: charDef.role,
                backstory: charDef.backstory,
                objectives: charDef.objectives,
                voice: {
                  vocabularyRange: charDef.voice.vocabularyRange,
                  sentenceLength: charDef.voice.sentenceLength,
                  emotionalRange: charDef.voice.emotionalRange,
                  speechPatterns: charDef.voice.speechPatterns,
                  forbiddenTopics: charDef.voice.forbiddenTopics,
                  forbiddenWords: charDef.voice.forbiddenWords,
                },
              };
              
              this.characterCards.set(actorId, characterCard);
              
              // Write character card to blackboard so Actor can retrieve it
              this.blackboard.writeEntry('semantic', 'system', {
                content: JSON.stringify(characterCard),
                messageId: actorId,
                metadata: { characterCardFor: actorId },
              });
              
              const actorLogger = childLogger(actorId);
              const actor = new Actor({
                blackboard: this.blackboard,
                capabilityService: this.capabilityService,
                llmProvider: this.llmProvider,
                logger: actorLogger,
                agentId: actorId,
                actorName: charDef.name,
                characterCard,
              });
              
              this.actors.set(actorId, actor);
              this.logger.info({ actorId, name: charDef.name, role: charDef.role }, 'DramaSession: created actor from generated character');
            }
            
            // Update scene config with new actor IDs
            sceneConfig.actorIds = Array.from(this.actors.keys());
            this.logger.info({ actorIds: sceneConfig.actorIds }, 'DramaSession: updated scene with generated actors');
          }
        } catch (backboneErr) {
          // Don't fail the scene if backbone generation fails - use a default
          this.logger.warn({ err: backboneErr }, 'DramaSession.runScene: Director backbone failed, using default');
          // Write a default backbone to core layer
          this.blackboard.writeEntry('core', `director-${this.dramaId}`, {
            content: `Scene ${sceneConfig.id}: ${sceneConfig.description}. [演员自主: 演员根据角色卡即兴发挥。]`,
            messageId: sceneConfig.id,
          });
        }
      }

      // Director signals scene start
      this.director.signalSceneStart(sceneConfig.id);

      // Start scene timer with user-set duration if available
      if (sceneConfig.durationMs) {
        this.logger.info({ sceneId: sceneConfig.id, durationMs: sceneConfig.durationMs }, 'DramaSession: starting scene with custom duration');
        this.router.startSceneWithDuration(sceneConfig.id, sceneConfig.durationMs);
      }

      // Round-robin actor turns
      const turnOrder = [...sceneConfig.actorIds];
      const beats: string[] = [];
      const conflicts: string[] = [];
      let entryCount = 0;

      this.logger.info({ turnCount: turnOrder.length * 3, actorCount: turnOrder.length }, 'DramaSession: starting actor turns');

      for (let turn = 0; turn < turnOrder.length * 3; turn++) {
        const actorId = turnOrder[turn % turnOrder.length] as string;
        const actor = this.actors.get(actorId);

        this.logger.info({ turn, actorId }, 'DramaSession: processing turn');

        // Add delay between turns to avoid rate limiting
        if (turn > 0) {
          const delayMs = 2000; // 2 seconds between actor turns
          this.logger.info({ turn, delayMs }, 'DramaSession: waiting between turns');
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        if (!actor) {
          this.logger.warn({ actorId }, 'DramaSession.runScene: actor not found');
          continue;
        }

        // Broadcast turn start message to frontend
        this.router.sendBroadcast({
          id: crypto.randomUUID(),
          type: 'your_turn',
          from: `director-${this.dramaId}`,
          to: [actorId],
          payload: {
            role: 'Director',
            text: `Turn ${turn + 1}: ${actorId}'s turn`,
            turnNumber: turn + 1,
            actorId: actorId,
          },
          timestamp: Date.now(),
        });

        // Chaos hook before turn
        if (this.chaosHooks.beforeTurn) {
          try {
            await this.chaosHooks.beforeTurn(actorId);
          } catch (err) {
            this.logger.error({ err, actorId }, 'DramaSession.runScene: chaos hook failed');
          }
        }

        try {
          // Build scene context for actor
          const card = this.characterCards.get(actorId);
          if (!card) {
            this.logger.warn({ actorId }, 'DramaSession.runScene: character card not found');
            continue;
          }

          const otherActors = Array.from(this.characterCards.values())
            .filter(c => c.id !== actorId)
            .map(c => ({
              agentId: c.id,
              name: c.name,
              role: c.role,
            }));

          // Get actor's personal memory summary (use compact format for token efficiency)
          const fullMemorySummary = actor.getMemory().getMemorySummary();
          const compactMemory = actor.getMemory().getCompactMemorySummary({
            maxTotalTokens: 250,  // Limit memory to ~250 tokens
            emotionTokens: 20,
            episodesTokens: 80,
            relationshipsTokens: 80,
            thoughtsTokens: 40,
            goalsTokens: 30,
          });
          
          const sceneContext = {
            characterCard: card,
            currentScene: {
              id: sceneConfig.id,
              location: sceneConfig.location,
              description: sceneConfig.description,
              tone: sceneConfig.tone,
            },
            otherActors,
            factContext: '',
            memorySummary: {
              // Include both formats - compact for main prompt, full for context
              recentEpisodes: fullMemorySummary.recentEpisodes.map(e => ({
                event: e.event,
                emotionalReaction: e.emotionalReaction,
              })),
              keyRelationships: fullMemorySummary.keyRelationships.map(r => ({
                targetName: r.targetName,
                trustLevel: r.currentAssessment.trustLevel,
                affinityLevel: r.currentAssessment.affinityLevel,
                dominantEmotion: r.currentAssessment.dominantEmotion,
              })),
              activeThoughts: fullMemorySummary.activeThoughts.map(t => ({
                type: t.type,
                content: t.content,
              })),
              currentEmotion: fullMemorySummary.currentEmotion,
              topGoals: fullMemorySummary.topGoals,
              // Compact format for token-efficient display
              compact: {
                emotion: compactMemory.emotion,
                recentEvents: compactMemory.recentEvents,
                relationships: compactMemory.relationships,
                thoughts: compactMemory.thoughts,
                goals: compactMemory.goals,
                estimatedTokens: compactMemory.estimatedTokens,
              },
            },
          };

          // Actor generates dialogue
          this.logger.info({ actorId, timeoutMs: this.config.actorTimeoutMs }, 'DramaSession: calling actor.generate');
          let output;
          const actorStartTime = Date.now();
          try {
            output = await Promise.race([
              actor.generate(sceneContext),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(`Actor timeout after ${this.config.actorTimeoutMs}ms`)), this.config.actorTimeoutMs)
              ),
            ]);
            const actorDuration = Date.now() - actorStartTime;
            this.logger.info({ actorId, entryCount: output.entries.length, durationMs: actorDuration }, 'DramaSession: actor.generate succeeded');
          } catch (genErr) {
            const actorDuration = Date.now() - actorStartTime;
            this.logger.error({ 
              actorId, 
              error: genErr instanceof Error ? genErr.message : String(genErr),
              durationMs: actorDuration,
              timeoutMs: this.config.actorTimeoutMs,
              promptTokensEstimate: JSON.stringify(sceneContext).length / 4,
            }, 'DramaSession: actor.generate failed');
            throw genErr;
          }

          const firstText = output.entries[0]?.text || '';
          beats.push(`${card.name}: ${firstText}`);
          entryCount += output.entries.length;

          // Broadcast dialogue messages to frontend via router
          this.logger.info({ entryCount: output.entries.length, actorId }, 'DramaSession: broadcasting dialogue messages');
          for (const entry of output.entries) {
            this.logger.info({ text: entry.text?.substring(0, 50), actorId }, 'DramaSession: sending dialogue message');
            try {
              // Determine target recipients based on perceptual boundaries
              // If entry.targetActors is specified, use it; otherwise fall back to all other actors
              const visibility = entry.visibility || 'public';
              let targetRecipients: string[];
              
              if (visibility === 'private') {
                // Private message - only sender "hears" themselves thinking or muttering
                targetRecipients = [actorId];
              } else if (entry.targetActors && entry.targetActors.length > 0) {
                // Selective visibility - only specified targets can hear
                targetRecipients = entry.targetActors.filter(id => sceneConfig.actorIds.includes(id));
              } else {
                // Public visibility - all other actors in scene can hear
                targetRecipients = sceneConfig.actorIds.filter(id => id !== actorId);
              }
              
              // Skip if no recipients (shouldn't happen, but safety check)
              if (targetRecipients.length === 0) {
                this.logger.info({ actorId, text: entry.text?.substring(0, 30) }, 'DramaSession: no recipients for dialogue, skipping broadcast');
                continue;
              }
              
              const dialogueMsg = {
                id: crypto.randomUUID(),
                type: 'dialogue' as const,
                from: actorId,
                to: targetRecipients,
                payload: {
                  role: card.name,
                  text: entry.text,
                  speaker: entry.speaker,
                  sceneId: sceneConfig.id,
                  visibility: visibility,
                  intendedTargets: entry.targetActors,
                },
                timestamp: Date.now(),
              };
              this.logger.info({ msgId: dialogueMsg.id, type: dialogueMsg.type, to: targetRecipients, text: entry.text?.substring(0, 30) }, 'DramaSession: sending broadcast');
              this.router.sendBroadcast(dialogueMsg);
              this.logger.info('DramaSession: dialogue broadcast sent successfully');
            } catch (dialogueErr) {
              this.logger.error({ err: dialogueErr, actorId }, 'DramaSession: FAILED to send dialogue broadcast');
            }
          }

          // Chaos hook after write
          if (this.chaosHooks.afterWrite) {
            try {
              await this.chaosHooks.afterWrite();
            } catch (err) {
              this.logger.error({ err }, 'DramaSession.runScene: chaos hook failed');
            }
          }
        } catch (err) {
          this.logger.error({ err, actorId }, 'DramaSession.runScene: actor failed, using director fallback');
          // Director fallback would go here
          const card = this.characterCards.get(actorId);
          const name = card?.name || actorId;
          beats.push(`[Director fallback for ${name}]`);
        }
      }

      // Director fact-check
      const actorOutputs = Array.from(this.actors.entries())
        .map(([id, _]) => {
          const card = this.characterCards.get(id);
          return {
            agentId: id,
            name: card?.name || id,
            entries: [],
          };
        });

      await this.director.factCheck(sceneConfig.id, actorOutputs);

      // Process scene in director's memory (for context compression)
      const characterActions: Record<string, string> = {};
      for (const actorId of sceneConfig.actorIds) {
        const card = this.characterCards.get(actorId);
        if (card) {
          characterActions[card.name] = beats.find(b => b.startsWith(card.name)) || '参与了场景';
        }
      }
      this.director.getMemory().processScene(
        sceneConfig.id,
        `场景在${sceneConfig.location}完成`,
        beats,
        characterActions
      );

      // Check if compression is needed
      const health = this.director.getMemory().getHealth();
      if (health.scenesSinceCompression >= 3) {
        this.logger.info({ tokenEstimate: health.tokenEstimate }, 'Compressing director context...');
        this.director.getMemory().compressContext();
      }

      // Director signals scene end
      this.director.signalSceneEnd({
        sceneId: sceneConfig.id,
        status: 'completed',
        beats,
        conflicts,
        plotAdvancement: 'Scene completed without major plot advancement',
      });

      // Broadcast scene end to frontend
      this.router.sendBroadcast({
        id: crypto.randomUUID(),
        type: 'scene_end',
        from: `director-${this.dramaId}`,
        to: sceneConfig.actorIds,
        payload: {
          role: 'Director',
          text: `Scene completed: ${sceneConfig.location}`,
          sceneId: sceneConfig.id,
          status: 'completed',
          entryCount,
        },
        timestamp: Date.now(),
      });

      const result: SceneResult = {
        sceneId: sceneConfig.id,
        status: 'completed',
        entryCount,
        conflicts,
        beats,
      };

      this.logger.info({ sceneId: sceneConfig.id, status: 'completed' }, 'DramaSession.runScene: complete');
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const isTimeout = errorMessage.includes('timeout');
      const isRateLimit = errorMessage.includes('429') || errorMessage.includes('rate limit');
      
      this.logger.error({ 
        err, 
        sceneId: sceneConfig.id,
        errorType: isTimeout ? 'timeout' : isRateLimit ? 'rate_limit' : 'unknown',
        completedTurns: turn,
        totalTurns: turnOrder.length * 3,
      }, 'DramaSession.runScene: failed');

      // Provide more specific error message
      let userErrorMessage = errorMessage;
      if (isTimeout) {
        userErrorMessage = `演员响应超时 (${this.config.actorTimeoutMs}ms)。提示词可能太长或API响应慢。`;
      } else if (isRateLimit) {
        userErrorMessage = 'API 速率限制，请稍后重试。';
      }

      // Broadcast scene end even on failure
      this.router.sendBroadcast({
        id: crypto.randomUUID(),
        type: 'scene_end',
        from: `director-${this.dramaId}`,
        to: sceneConfig.actorIds,
        payload: {
          role: 'Director',
          text: `Scene failed: ${sceneConfig.location}`,
          sceneId: sceneConfig.id,
          status: 'interrupted',
          error: userErrorMessage,
          errorType: isTimeout ? 'timeout' : isRateLimit ? 'rate_limit' : 'error',
          completedTurns: turn,
        },
        timestamp: Date.now(),
      });

      this.director.signalSceneEnd({
        sceneId: sceneConfig.id,
        status: 'interrupted',
        beats: [],
        conflicts: ['Scene interrupted'],
        plotAdvancement: 'Scene interrupted before plot advancement',
      });

      return {
        sceneId: sceneConfig.id,
        status: 'interrupted',
        entryCount: 0,
        conflicts: ['Scene interrupted'],
        beats: [],
      };
    }
  }

  /**
   * Run a complete drama with multiple scenes
   */
  async runCompleteDrama(totalScenes: number): Promise<DramaResult> {
    if (!this.isInitialized) {
      throw new Error('DramaSession not initialized. Call initialize() first.');
    }

    this.logger.info({ dramaId: this.dramaId, totalScenes }, 'DramaSession.runCompleteDrama: starting');

    const sceneResults: SceneResult[] = [];
    let completedScenes = 0;

    for (let i = 0; i < totalScenes; i++) {
      const sceneConfig: SceneConfig = {
        id: `scene-${i + 1}`,
        location: `Location ${i + 1}`,
        description: `Scene ${i + 1} description`,
        tone: 'dramatic',
        actorIds: Array.from(this.characterCards.keys()),
      };

      const result = await this.runScene(sceneConfig);
      sceneResults.push(result);

      if (result.status === 'completed') {
        completedScenes++;
      }
    }

    const dramaStatus = completedScenes === totalScenes
      ? 'success'
      : completedScenes > 0
      ? 'partial'
      : 'failed';

    const result: DramaResult = {
      dramaId: this.dramaId,
      totalScenes,
      completedScenes,
      status: dramaStatus,
      sceneResults,
    };

    this.logger.info({ dramaId: this.dramaId, status: dramaStatus }, 'DramaSession.runCompleteDrama: complete');
    return result;
  }
}
