import type pino from 'pino';
import type { CharacterCard } from './types/actor.js';
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

    try {
      // Director plans backbone if first scene
      const firstScene = this.blackboard.readLayer('procedural').entries.length === 0;
      if (firstScene) {
        const characters = Array.from(this.characterCards.values()).map(card => ({
          agentId: card.id,
          name: card.name,
          role: card.role,
          objectives: card.objectives,
        }));
        await this.director.planBackbone({
          dramaId: this.dramaId,
          characters,
          existingBackbone: '',
          previousScenes: [],
          newContentEstimate: 1000,
        });
      }

      // Director signals scene start
      this.director.signalSceneStart(sceneConfig.id);

      // Round-robin actor turns
      const turnOrder = [...sceneConfig.actorIds];
      const beats: string[] = [];
      const conflicts: string[] = [];
      let entryCount = 0;

      for (let turn = 0; turn < turnOrder.length * 3; turn++) {
        const actorId = turnOrder[turn % turnOrder.length] as string;
        const actor = this.actors.get(actorId);

        if (!actor) {
          this.logger.warn({ actorId }, 'DramaSession.runScene: actor not found');
          continue;
        }

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
          };

          // Actor generates dialogue
          const output = await Promise.race([
            actor.generate(sceneContext),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Actor timeout')), this.config.actorTimeoutMs)
            ),
          ]);

          const firstText = output.entries[0]?.text || '';
          beats.push(`${card.name}: ${firstText}`);
          entryCount += output.entries.length;

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

      // Director signals scene end
      this.director.signalSceneEnd({
        sceneId: sceneConfig.id,
        status: 'completed',
        beats,
        conflicts,
        plotAdvancement: 'Scene completed without major plot advancement',
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
      this.logger.error({ err, sceneId: sceneConfig.id }, 'DramaSession.runScene: failed');

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
