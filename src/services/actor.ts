import type pino from 'pino';
import type { BlackboardService } from './blackboard.js';
import type { CapabilityService } from './capability.js';
import { type LlmProvider, buildActorSystemPrompt, buildActorUserPrompt } from './llm.js';
import type {
  CharacterCard,
  DialogueOutput,
  SceneContext,
} from '../types/actor.js';
import {
  ActorGenerationError,
  CharacterCardSchema,
  DialogueOutputSchema,
} from '../types/actor.js';

export interface ActorOptions {
  blackboard: BlackboardService;
  capabilityService: CapabilityService;
  llmProvider: LlmProvider;
  logger: pino.Logger;
  agentId: string;
}

export class Actor {
  private readonly blackboard: BlackboardService;
  private readonly capabilityService: CapabilityService;
  private readonly llmProvider: LlmProvider;
  private readonly logger: pino.Logger;
  private readonly agentId: string;

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

    this.logger.debug({ exchangeId, agentId: this.agentId }, 'Actor.generate: starting');

    // Build fact context from core, scenario, and semantic folded summaries
    const factContext = this.readFactContext();

    // Build prompts
    const system = buildActorSystemPrompt(context.characterCard);
    const user = buildActorUserPrompt({
      ...context,
      factContext,
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

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new ActorGenerationError('json_parse', 'LLM response is not valid JSON', rawContent);
    }

    // Validate with Zod schema
    let output: DialogueOutput;
    try {
      output = DialogueOutputSchema.parse(parsed) as DialogueOutput;
    } catch (err) {
      throw new ActorGenerationError('validation', 'LLM response does not match DialogueOutputSchema', err);
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

    this.logger.debug({ exchangeId, entries: output.entries.length }, 'Actor.generate: done');
    return output;
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
   * Read fact context from core + scenario layers + folded semantic continuity.
   * Concatenates entries as plain text for the LLM user prompt.
   */
  readFactContext(): string {
    const core = this.blackboard.readLayer('core');
    const scenario = this.blackboard.readLayer('scenario');

    const coreText = core.entries.length > 0
      ? '## Core Facts\n' + core.entries.map(e => e.content).join('\n')
      : '';

    const scenarioText = scenario.entries.length > 0
      ? '## Scenario\n' + scenario.entries.map(e => e.content).join('\n')
      : '';

    // Include folded semantic summaries for continuity (from MemoryManager)
    // TODO: Integrate with MemoryManager.getActorSemanticContinuity()
    const semanticText = '';

    return [coreText, scenarioText, semanticText].filter(Boolean).join('\n\n');
  }

  /**
   * Write each dialogue entry to the semantic layer.
   * Content is the stringified JSON of the entry.
   * messageId is set to the sceneId for traceability.
   */
  private writeDialogueEntries(output: DialogueOutput, sceneId: string): void {
    for (const entry of output.entries) {
      this.blackboard.writeEntry('semantic', this.agentId, {
        content: JSON.stringify(entry),
        messageId: sceneId,
      });
    }
  }

  private handleLlmFailure(err: unknown): ActorGenerationError {
    return new ActorGenerationError('llm_call', String(err), err);
  }
}
