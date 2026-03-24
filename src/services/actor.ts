import type pino from 'pino';
import type { BlackboardService } from './blackboard.js';
import type { CapabilityService } from './capability.js';
import { type LlmProvider, buildActorSystemPrompt, buildActorUserPrompt } from './llm.js';
import { ActorMemoryService } from './actorMemory.js';
import type {
  CharacterCard,
  DialogueOutput,
  SceneContext,
  PerceptualBoundary,
  VisibilityMetadata,
} from '../types/actor.js';
import {
  ActorGenerationError,
  CharacterCardSchema,
  DialogueOutputSchema,
} from '../types/actor.js';
import type { EpisodicMemory, IntrospectiveMemory } from '../types/memory.js';

export interface ActorOptions {
  blackboard: BlackboardService;
  capabilityService: CapabilityService;
  llmProvider: LlmProvider;
  logger: pino.Logger;
  agentId: string;
  actorName?: string;
  characterCard?: CharacterCard;
}

export class Actor {
  private readonly blackboard: BlackboardService;
  private readonly capabilityService: CapabilityService;
  private readonly llmProvider: LlmProvider;
  private readonly logger: pino.Logger;
  private readonly agentId: string;
  private readonly memory: ActorMemoryService;

  constructor(options: ActorOptions) {
    if (!options.blackboard) throw new Error('Actor requires blackboard service');
    if (!options.capabilityService) throw new Error('Actor requires capability service');
    if (!options.llmProvider) throw new Error('Actor requires LLM provider');
    if (!options.logger) throw new Error('Actor requires logger');
    if (!options.agentId) throw new Error('Actor requires agentId');

    this.blackboard = options.blackboard;
    this.capabilityService = options.capabilityService;
    this.llmProvider = options.llmProvider;
    this.logger = options.logger;
    this.agentId = options.agentId;
    
    // Initialize personal memory system
    const memoryLogger = options.logger.child({ component: 'ActorMemory' });
    this.memory = new ActorMemoryService({
      actorId: options.agentId,
      actorName: options.actorName || options.agentId,
      logger: memoryLogger,
    });
  }

  /**
   * Get the actor's personal memory service
   */
  getMemory(): ActorMemoryService {
    return this.memory;
  }

  /**
   * Main public API: generate dialogue for a scene exchange.
   *
   * Flow:
   * 1. Generate exchangeId
   * 2. Build system + user prompts from SceneContext
   * 3. Call LLM via injected provider (no hardcoded SDK)
   * 4. Parse + validate JSON response with Zod
   * 5. Write dialogue entries to semantic layer
   * 6. Return DialogueOutput
   */
  async generate(context: SceneContext): Promise<DialogueOutput> {
    const exchangeId = crypto.randomUUID();

    this.logger.info({ exchangeId, agentId: this.agentId }, 'Actor.generate: starting');

    // Build perceptual boundary for this actor
    const perceptualBoundary = this.buildPerceptualBoundary();
    
    // Build fact context using visibility filtering
    const factContext = this.readFactContext();
    
    // Get personal memory summary
    const memorySummary = this.memory.getMemorySummary();

    // Build prompts with perceptual boundary and personal memory
    const system = buildActorSystemPrompt(context.characterCard);
    const user = buildActorUserPrompt({
      ...context,
      factContext,
      perceptualBoundary,
      memorySummary,
    });

    // Call LLM
    let rawContent: string;
    try {
      const response = await this.llmProvider.generate({ system, user });
      rawContent = response.content;
    } catch (err) {
      this.logger.error({ err, exchangeId }, 'Actor.generate: LLM call failed');
      throw this.handleLlmFailure(err);
    }

    // Parse JSON (handle both pure JSON and markdown-wrapped JSON)
    let parsed: unknown;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const contentToParse = jsonMatch?.[1] ? jsonMatch[1].trim() : rawContent.trim();
      parsed = JSON.parse(contentToParse);
    } catch {
      throw new ActorGenerationError('json_parse', 'LLM response is not valid JSON', rawContent);
    }

    // Validate with Zod schema - but be lenient with missing fields
    let output: DialogueOutput;
    try {
      output = DialogueOutputSchema.parse(parsed) as DialogueOutput;
    } catch (err) {
      // Try to extract what we can and fill in defaults
      this.logger.warn({ err, rawContent: rawContent.substring(0, 200) }, 'Actor.generate: Schema validation failed, applying defaults');
      
      const parsedAny = parsed as any;
      const characterName = context.characterCard?.name || 'Actor';
      output = {
        exchangeId: parsedAny?.exchangeId || exchangeId,
        entries: parsedAny?.entries || [],
        tokenCount: parsedAny?.tokenCount || 100,
        modelUsed: parsedAny?.modelUsed || 'unknown',
      };
      
      // Ensure each entry has required fields
      output.entries = output.entries.map((entry: any) => ({
        speaker: entry?.speaker || characterName,
        text: entry?.text || '',
        unverifiedFacts: entry?.unverifiedFacts || false,
        unverifiedClaims: entry?.unverifiedClaims || [],
        targetActors: entry?.targetActors,
        visibility: entry?.visibility,
      }));
    }

    // Ensure exchangeId is set
    if (!output.exchangeId) {
      output.exchangeId = exchangeId;
    }

    // Write dialogue entries to semantic layer
    try {
      this.writeDialogueEntries(output, context.currentScene.id);
    } catch (err) {
      throw new ActorGenerationError('blackboard_write', 'Failed to write dialogue entries', err);
    }
    
    // Record this interaction in personal memory
    this.recordInteractionInMemory(context, output);

    this.logger.debug({ exchangeId, entries: output.entries.length }, 'Actor.generate: done');
    return output;
  }
  
  /**
   * Record the interaction in the actor's personal memory
   */
  private recordInteractionInMemory(context: SceneContext, output: DialogueOutput): void {
    const now = Date.now();
    const sceneId = context.currentScene.id;
    
    // Record episodic memory of speaking
    for (const entry of output.entries) {
      // Record what I said
      this.memory.recordEpisode({
        timestamp: now,
        sceneId,
        event: `我说："${entry.text.substring(0, 100)}${entry.text.length > 100 ? '...' : ''}"`,
        participants: [this.actorId, ...context.otherActors.map(a => a.agentId)],
        location: context.currentScene.location,
        emotionalReaction: {
          emotion: this.memory.getEmotionalState().primary.emotion,
          intensity: this.memory.getEmotionalState().primary.intensity as 1 | 2 | 3 | 4 | 5,
          reason: '表演时的自然反应',
        },
        significance: entry.text.length > 50 ? 3 : 2,
        sensoryDetails: {
          auditory: '自己说话的声音',
        },
      });
      
      // Record introspective memory (thought process)
      this.memory.recordIntrospection({
        timestamp: now,
        sceneId,
        type: 'thought',
        content: `我选择了说："${entry.text.substring(0, 80)}..."`,
        trigger: {
          type: 'dialogue',
          description: '轮到我发言',
        },
        emotionalContext: {
          primary: this.memory.getEmotionalState().primary.emotion,
          intensity: this.memory.getEmotionalState().primary.intensity as 1 | 2 | 3 | 4 | 5,
        },
        isSecret: false,
        ledToAction: true,
        resultingAction: entry.text.substring(0, 50),
      });
    }
    
    // Update emotional state slightly (decay or shift)
    const currentEmotion = this.memory.getEmotionalState();
    if (currentEmotion.primary.intensity > 1) {
      this.memory.updateEmotionalState({
        primary: {
          emotion: currentEmotion.primary.emotion,
          intensity: (currentEmotion.primary.intensity - 1) as 1 | 2 | 3 | 4 | 5,
        },
      });
    }
    
    this.logger.debug({ entriesRecorded: output.entries.length }, 'Recorded in personal memory');
  }

  /**
   * Read the character card from the semantic layer.
   * Finds entry where metadata?.characterCardFor === this.agentId.
   * Returns null if no entry found.
   */
  getCharacterCard(): CharacterCard | null {
    try {
      const layer = this.blackboard.readLayer('semantic');
      const entry = layer.entries.find(e => e.metadata?.characterCardFor === this.agentId);
      if (!entry) return null;

      const parsed = JSON.parse(entry.content);
      return CharacterCardSchema.parse(parsed) as CharacterCard;
    } catch {
      // If parsing or validation fails, treat as not found
      return null;
    }
  }

  /**
   * Build perceptual boundary for this actor based on what they can perceive.
   * This creates a "cognitive window" showing what this specific actor knows.
   */
  private buildPerceptualBoundary(): PerceptualBoundary {
    // Read semantic layer with visibility filtering
    const semantic = this.blackboard.readLayerForActor('semantic', this.agentId);
    
    const visibleFacts: string[] = [];
    const privateKnowledge: string[] = [];
    const eyewitnessEvents: string[] = [];
    const hearsay: PerceptualBoundary['hearsay'] = [];
    const suspicions: PerceptualBoundary['suspicions'] = [];

    for (const entry of semantic.entries) {
      const metadata = entry.metadata as {
        visibility?: {
          scope?: string;
          visibleTo?: string[];
        };
        isFirstHand?: boolean;
        source?: string;
        reliability?: 'trusted' | 'neutral' | 'doubted';
      } | undefined;

      // Parse dialogue content
      let content = entry.content;
      try {
        const parsed = JSON.parse(entry.content);
        content = parsed.text || entry.content;
      } catch {
        // Not JSON, use raw content
      }

      const scope = metadata?.visibility?.scope || 'public';

      if (scope === 'private' && entry.agentId === this.agentId) {
        // This actor's own private knowledge
        privateKnowledge.push(content);
      } else if (metadata?.isFirstHand && entry.agentId === this.agentId) {
        // This actor witnessed directly
        eyewitnessEvents.push(content);
      } else if (metadata?.source) {
        // This actor heard it from someone else
        hearsay.push({
          content,
          source: metadata.source,
          reliability: metadata.reliability || 'neutral',
        });
      } else {
        // General visible facts
        visibleFacts.push(content);
      }
    }

    // Add suspicions based on partial information
    // This is where the actor might suspect something without knowing for sure
    if (hearsay.length > 0) {
      for (const rumor of hearsay) {
        if (rumor.reliability === 'doubted') {
          suspicions.push({
            content: `可能对"${rumor.content.substring(0, 50)}..."有所怀疑`,
            confidence: 'low',
            source: rumor.source,
          });
        }
      }
    }

    return {
      visibleFacts,
      privateKnowledge,
      eyewitnessEvents,
      hearsay,
      suspicions,
    };
  }

  /**
   * Read fact context from core + scenario layers with visibility filtering.
   * Concatenates entries as plain text for the LLM user prompt.
   */
  readFactContext(): string {
    // Use readLayerForActor to filter by visibility
    const core = this.blackboard.readLayerForActor('core', this.agentId);
    const scenario = this.blackboard.readLayerForActor('scenario', this.agentId);

    const coreText = core.entries.length > 0
      ? '## 核心事实\n' + core.entries.map(e => e.content).join('\n')
      : '';

    const scenarioText = scenario.entries.length > 0
      ? '## 场景设定\n' + scenario.entries.map(e => e.content).join('\n')
      : '';

    return [coreText, scenarioText].filter(Boolean).join('\n\n');
  }

  /**
   * Write each dialogue entry to the semantic layer.
   * Content is the stringified JSON of the entry.
   * messageId is set to the sceneId for traceability.
   * 
   * Dialogue is public by default, but can be made private based on context.
   */
  private writeDialogueEntries(output: DialogueOutput, sceneId: string): void {
    for (const entry of output.entries) {
      // Determine visibility based on content
      // For now, dialogue is public but marked as first-hand from this actor
      const visibility: VisibilityMetadata = {
        scope: 'public',
      };

      // If the actor is thinking/speaking to themselves, make it private
      if (entry.text.includes('（内心') || entry.text.includes('（心想')) {
        visibility.scope = 'private';
      }

      this.blackboard.writeEntry('semantic', this.agentId, {
        content: JSON.stringify(entry),
        messageId: sceneId,
        metadata: {
          visibility,
          isFirstHand: true,
          speaker: entry.speaker,
        },
      });
    }
  }

  private handleLlmFailure(err: unknown): ActorGenerationError {
    return new ActorGenerationError('llm_call', String(err), err);
  }
}
