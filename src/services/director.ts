import type pino from 'pino';
import { LAYER_BUDGETS } from '../types/blackboard.js';
import type { BlackboardService } from './blackboard.js';
import type { CapabilityService } from './capability.js';
import { type LlmProvider } from './llm.js';
import {
  buildDirectorSystemPrompt,
  buildDirectorUserPrompt,
  buildFactCheckUserPrompt,
} from './llm.js';
import type {
  PlanningContext,
  DirectorBackboneOutput,
  ArbitrationOutput,
  FactCheckOutput,
  SceneStartSignal,
  SceneEndSignal,
} from '../types/director.js';
import {
  DirectorBackboneOutputSchema,
  ArbitrationOutputSchema,
  FactCheckOutputSchema,
  DirectorGenerationError,
} from '../types/director.js';

export interface DirectorOptions {
  blackboard: BlackboardService;
  capabilityService: CapabilityService;
  llmProvider: LlmProvider;
  logger: pino.Logger;
  agentId: string;
}

export class Director {
  private readonly blackboard: BlackboardService;
  private readonly capabilityService: CapabilityService;
  private readonly llmProvider: LlmProvider;
  private readonly logger: pino.Logger;
  private readonly agentId: string;

  constructor(options: DirectorOptions) {
    if (!options.blackboard) throw new Error('Director requires blackboard service');
    if (!options.capabilityService) throw new Error('Director requires capability service');
    if (!options.llmProvider) throw new Error('Director requires LLM provider');
    if (!options.logger) throw new Error('Director requires logger');
    if (!options.agentId) throw new Error('Director requires agentId');

    this.blackboard = options.blackboard;
    this.capabilityService = options.capabilityService;
    this.llmProvider = options.llmProvider;
    this.logger = options.logger;
    this.agentId = options.agentId;

    // Hard assertion: Director MUST NOT write to semantic layer (role contract — DIR-03)
    const allowedLayers = this.capabilityService.capabilityMap['Director'];
    if ((allowedLayers as string[]).includes('semantic')) {
      throw new Error('Director capability configuration error: semantic layer write must be denied for Director role');
    }
  }

  /**
   * Read all four blackboard layers as concatenated labeled text for LLM context.
   */
  private readAllLayerContext(): string {
    const core = this.blackboard.readLayer('core');
    const scenario = this.blackboard.readLayer('scenario');
    const semantic = this.blackboard.readLayer('semantic');
    const procedural = this.blackboard.readLayer('procedural');

    const parts: string[] = [];

    if (core.entries.length > 0) {
      parts.push('## Core Facts\n' + core.entries.map(e => e.content).join('\n'));
    }
    if (scenario.entries.length > 0) {
      parts.push('## Scenario\n' + scenario.entries.map(e => e.content).join('\n'));
    }
    if (semantic.entries.length > 0) {
      parts.push('## Semantic\n' + semantic.entries.map(e => e.content).join('\n'));
    }
    if (procedural.entries.length > 0) {
      parts.push('## Procedural\n' + procedural.entries.map(e => e.content).join('\n'));
    }

    return parts.join('\n\n');
  }

  /**
   * Plan or update the plot backbone prose.
   * Writes backbone to core layer and scene markers to procedural layer.
   * Returns the validated DirectorBackboneOutput.
   */
  async planBackbone(context: PlanningContext): Promise<DirectorBackboneOutput> {
    const exchangeId = crypto.randomUUID();
    this.logger.debug({ exchangeId, agentId: this.agentId }, 'Director.planBackbone: starting');

    // Read fact context from all layers
    const factContext = this.readAllLayerContext();

    // Check core budget — prune if approaching 75%
    const core = this.blackboard.readLayer('core');
    const threshold = LAYER_BUDGETS.core * 0.75;
    if (core.tokenCount > threshold) {
      await this.ensureCoreBudget(0);
    }

    // Build prompts
    const system = buildDirectorSystemPrompt();
    const user = buildDirectorUserPrompt(context, factContext);

    // Call LLM
    let rawContent: string;
    try {
      const response = await this.llmProvider.generate({ system, user });
      rawContent = response.content;
    } catch (err) {
      this.logger.error({ err, exchangeId }, 'Director.planBackbone: LLM call failed');
      throw this.handleLlmFailure(err);
    }

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new DirectorGenerationError('json_parse', 'LLM response is not valid JSON', rawContent);
    }

    // Validate with Zod schema
    let output: DirectorBackboneOutput;
    try {
      output = DirectorBackboneOutputSchema.parse(parsed) as DirectorBackboneOutput;
    } catch (err) {
      throw new DirectorGenerationError('validation', 'LLM response does not match DirectorBackboneOutputSchema', err);
    }

    // Ensure exchangeId is set
    if (!output.exchangeId) {
      output.exchangeId = exchangeId;
    }

    // Write backbone prose to core layer
    try {
      this.blackboard.writeEntry('core', this.agentId, {
        content: output.backboneProse,
        messageId: output.exchangeId,
      });
    } catch (err) {
      throw new DirectorGenerationError('blackboard_write', 'Failed to write backbone to core layer', err);
    }

    // Write scene markers to procedural layer
    for (const scene of output.scenes) {
      try {
        this.blackboard.writeEntry('procedural', this.agentId, {
          content: JSON.stringify(scene),
          messageId: scene.sceneId,
        });
      } catch (err) {
        this.logger.warn({ err, sceneId: scene.sceneId }, 'Director.planBackbone: failed to write scene marker to procedural');
      }
    }

    this.logger.debug({ exchangeId, scenes: output.scenes.length }, 'Director.planBackbone: done');
    return output;
  }

  /**
   * Ensure core layer has enough budget for additionalTokens.
   * Prunes the oldest half of entries by moving a summary to scenario layer.
   */
  private async ensureCoreBudget(additionalTokens: number): Promise<void> {
    const core = this.blackboard.readLayer('core');
    if (core.tokenCount + additionalTokens <= LAYER_BUDGETS.core) {
      return;
    }

    this.logger.debug({ tokenCount: core.tokenCount, budget: LAYER_BUDGETS.core }, 'Director.ensureCoreBudget: pruning core layer');

    if (core.entries.length === 0) return;

    // Summarize the first half of entries
    const half = Math.floor(core.entries.length / 2);
    const toPrune = core.entries.slice(0, half);
    const summaryText = toPrune.map(e => e.content).join('\n\n');

    // Write summary to scenario layer
    this.blackboard.writeEntry('scenario', this.agentId, {
      content: 'Summary of pruned core: ' + summaryText,
      messageId: crypto.randomUUID(),
    });

    // Delete pruned entries from core
    for (const entry of toPrune) {
      try {
        this.blackboard.deleteEntry('core', entry.id, this.agentId);
      } catch (err) {
        this.logger.warn({ err, entryId: entry.id }, 'Director.ensureCoreBudget: failed to delete entry');
      }
    }
  }

  /**
   * Arbitrate conflicting actor outputs and write canonical outcome to scenario layer.
   * Returns the validated ArbitrationOutput.
   */
  async arbitrate(
    sceneId: string,
    conflicts: Array<{ actorA: string; actorB: string; claimA: string; claimB: string }>,
  ): Promise<ArbitrationOutput> {
    const exchangeId = crypto.randomUUID();
    this.logger.debug({ exchangeId, sceneId, conflicts: conflicts.length }, 'Director.arbitrate: starting');

    const factContext = this.readAllLayerContext();

    // Build arbitration prompt
    const lines: string[] = [
      '[Task]',
      `Arbitrate the following conflicts for Scene ${sceneId}.`,
      '',
      '[Conflicting Claims]',
    ];

    for (const [i, conflict] of conflicts.entries()) {
      lines.push(`Conflict ${i + 1}:`);
      lines.push(`  Actor A (${conflict.actorA}): ${conflict.claimA}`);
      lines.push(`  Actor B (${conflict.actorB}): ${conflict.claimB}`);
    }

    if (factContext.trim().length > 0) {
      lines.push('', '[Fact Context]', factContext);
    }

    lines.push(
      '',
      '[Instructions]',
      'Determine the canonical outcome for each conflict.',
      'Write a prose description of what actually happened.',
      'Respond with JSON in the format: { exchangeId, sceneId, conflicts: [{ conflictId, conflictingClaims, canonicalOutcome, severity }] }',
    );

    const user = lines.join('\n');

    let rawContent: string;
    try {
      const response = await this.llmProvider.generate({
        system: buildDirectorSystemPrompt(),
        user,
      });
      rawContent = response.content;
    } catch (err) {
      this.logger.error({ err, exchangeId }, 'Director.arbitrate: LLM call failed');
      throw this.handleLlmFailure(err);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new DirectorGenerationError('json_parse', 'LLM response is not valid JSON', rawContent);
    }

    let output: ArbitrationOutput;
    try {
      output = ArbitrationOutputSchema.parse(parsed) as ArbitrationOutput;
    } catch (err) {
      throw new DirectorGenerationError('validation', 'LLM response does not match ArbitrationOutputSchema', err);
    }

    if (!output.exchangeId) output.exchangeId = exchangeId;

    // Write each conflict's canonical outcome to scenario layer
    for (const decision of output.conflicts) {
      try {
        this.blackboard.writeEntry('scenario', this.agentId, {
          content: decision.canonicalOutcome,
          messageId: decision.conflictId,
        });
      } catch (err) {
        this.logger.warn({ err, conflictId: decision.conflictId }, 'Director.arbitrate: failed to write canonical outcome');
      }
    }

    this.logger.debug({ exchangeId, decisions: output.conflicts.length }, 'Director.arbitrate: done');
    return output;
  }

  /**
   * Fact-check actor outputs against core and scenario layer facts.
   * Flags contradictions to the procedural layer.
   * Returns the validated FactCheckOutput.
   */
  async factCheck(
    sceneId: string,
    actorOutputs: Array<{ agentId: string; name: string; entries: Array<{ speaker: string; text: string; unverifiedFacts: boolean }> }>,
  ): Promise<FactCheckOutput> {
    const exchangeId = crypto.randomUUID();
    this.logger.debug({ exchangeId, sceneId, actors: actorOutputs.length }, 'Director.factCheck: starting');

    const coreFacts = this.blackboard.readLayer('core').entries.map(e => e.content).join('\n');
    const scenarioFacts = this.blackboard.readLayer('scenario').entries.map(e => e.content).join('\n');

    const system = buildDirectorSystemPrompt();
    const user = buildFactCheckUserPrompt({ sceneId, actorOutputs, coreFacts, scenarioFacts });

    let rawContent: string;
    try {
      const response = await this.llmProvider.generate({ system, user });
      rawContent = response.content;
    } catch (err) {
      this.logger.error({ err, exchangeId }, 'Director.factCheck: LLM call failed');
      throw this.handleLlmFailure(err);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new DirectorGenerationError('json_parse', 'LLM response is not valid JSON', rawContent);
    }

    let output: FactCheckOutput;
    try {
      output = FactCheckOutputSchema.parse(parsed) as FactCheckOutput;
    } catch (err) {
      throw new DirectorGenerationError('validation', 'LLM response does not match FactCheckOutputSchema', err);
    }

    if (!output.exchangeId) output.exchangeId = exchangeId;

    // Write each contradiction entry to procedural layer
    for (const contradiction of output.contradictions) {
      try {
        this.blackboard.writeEntry('procedural', this.agentId, {
          content: JSON.stringify(contradiction),
          messageId: contradiction.sourceAgentId,
        });
      } catch (err) {
        this.logger.warn({ err, sourceAgentId: contradiction.sourceAgentId }, 'Director.factCheck: failed to write contradiction to procedural');
      }
    }

    this.logger.debug({ exchangeId, contradictions: output.contradictions.length }, 'Director.factCheck: done');
    return output;
  }

  /**
   * Signal the start of a scene by writing a scene_start signal to procedural layer.
   */
  signalSceneStart(sceneId: string): void {
    const signal: SceneStartSignal = {
      type: 'scene_start',
      sceneId,
      directorId: this.agentId,
      timestamp: new Date().toISOString(),
    };
    this.blackboard.writeEntry('procedural', this.agentId, {
      content: JSON.stringify(signal),
      messageId: sceneId,
    });
    this.logger.debug({ sceneId, directorId: this.agentId }, 'Director.signalSceneStart');
  }

  /**
   * Signal the end of a scene by writing a scene_end signal to procedural layer.
   */
  signalSceneEnd(params: Omit<SceneEndSignal, 'type' | 'timestamp' | 'directorId'>): void {
    const signal: SceneEndSignal = {
      type: 'scene_end',
      directorId: this.agentId,
      timestamp: new Date().toISOString(),
      ...params,
    };
    this.blackboard.writeEntry('procedural', this.agentId, {
      content: JSON.stringify(signal),
      messageId: params.sceneId,
    });
    this.logger.debug({ sceneId: params.sceneId, directorId: this.agentId, status: params.status }, 'Director.signalSceneEnd');
  }

  /**
   * Returns the Director's allowed write layers from the capability service.
   * Used by tests to verify the capability configuration.
   */
  getAllowedLayers(): string[] {
    return this.capabilityService.capabilityMap['Director'] as string[];
  }

  private handleLlmFailure(err: unknown): DirectorGenerationError {
    return new DirectorGenerationError('llm_call', String(err), err);
  }
}
