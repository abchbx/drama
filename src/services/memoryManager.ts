import type pino from 'pino';
import type { BlackboardService, WriteEntryResponse } from './blackboard.js';
import type { LlmProvider } from './llm.js';
import type {
  BlackboardLayer,
  WriteEntryRequest,
  AlertAuditMetadata,
  FoldAuditMetadata,
  PromoteAuditMetadata,
} from '../types/blackboard.js';
import {
  LAYER_BUDGETS,
  BUDGET_ALERT_THRESHOLD,
  TokenBudgetExceededError,
  NotFoundError,
} from '../types/blackboard.js';

// Number of recent verbatim entries to preserve after a fold
const RECENT_TAIL_SIZE = 3;

export interface MemoryManagerOptions {
  blackboard: BlackboardService;
  llmProvider: LlmProvider;
  logger: pino.Logger;
  alertCallback?: (layer: BlackboardLayer, metadata: AlertAuditMetadata) => void;
  foldCallback?: (layer: BlackboardLayer, metadata: FoldAuditMetadata) => void;
  promoteCallback?: (metadata: PromoteAuditMetadata) => void;
}

/**
 * MemoryManagerService orchestrates token-budget-aware memory management.
 *
 * Responsibilities:
 * - Write with automatic fold on semantic/procedural overflow
 * - Emit 60% budget alerts per layer
 * - LLM-based summarization for semantic/procedural folding
 * - Director-only promotion from scenario to core
 * - Core layer is NEVER auto-evicted (MEM-04)
 */
export class MemoryManagerService {
  private readonly blackboard: BlackboardService;
  private readonly llmProvider: LlmProvider;
  private readonly logger: pino.Logger;
  private readonly alertCallback?: MemoryManagerOptions['alertCallback'];
  private readonly foldCallback?: MemoryManagerOptions['foldCallback'];
  private readonly promoteCallback?: MemoryManagerOptions['promoteCallback'];

  constructor(options: MemoryManagerOptions) {
    if (!options.blackboard) throw new Error('MemoryManager requires blackboard service');
    if (!options.llmProvider) throw new Error('MemoryManager requires LLM provider');
    if (!options.logger) throw new Error('MemoryManager requires logger');

    this.blackboard = options.blackboard;
    this.llmProvider = options.llmProvider;
    this.logger = options.logger;
    this.alertCallback = options.alertCallback;
    this.foldCallback = options.foldCallback;
    this.promoteCallback = options.promoteCallback;
  }

  /**
   * Managed write with memory awareness.
   *
   * - Core: hard fail on overflow (MEM-04)
   * - Semantic: auto-fold on overflow (MEM-02)
   * - Procedural: auto-fold preserving voice constraints (MEM-03)
   * - Emits alert at 60% usage (MEM-01)
   */
  async writeEntryWithMemoryManagement(
    layer: BlackboardLayer,
    agentId: string,
    req: WriteEntryRequest,
  ): Promise<WriteEntryResponse> {
    const attemptId = crypto.randomUUID();
    this.logger.debug({ attemptId, layer, agentId }, 'MemoryManager.writeEntry: starting');

    // Try writing first
    try {
      const result = this.blackboard.writeEntry(layer, agentId, req);
      this.checkAndEmitAlert(layer);
      return result;
    } catch (err) {
      if (err instanceof TokenBudgetExceededError && (layer === 'semantic' || layer === 'procedural')) {
        this.logger.debug({ attemptId, layer }, 'MemoryManager: overflow detected, attempting fold');
        await this.performFold(layer);
        // Retry after fold
        const result = this.blackboard.writeEntry(layer, agentId, req);
        this.checkAndEmitAlert(layer);
        return result;
      }
      throw err;
    }
  }

  /**
   * Explicit Director-only promotion: copy scenario content to core, leave original in place.
   * MEM-05: Only the Director should call this.
   */
  async promoteScenarioEntryToCore(
    scenarioEntryId: string,
    directorAgentId: string,
  ): Promise<{ coreEntryId: string; scenarioEntryId: string }> {
    this.logger.debug({ scenarioEntryId, directorAgentId }, 'MemoryManager.promote: starting');

    // Read scenario entry
    const scenarioRead = this.blackboard.readEntry('scenario', scenarioEntryId);

    // Write copy to core
    const coreResult = this.blackboard.writeEntry('core', directorAgentId, {
      content: scenarioRead.entry.content,
      messageId: scenarioRead.entry.messageId,
      metadata: {
        promotedFromScenarioId: scenarioEntryId,
      },
    });

    // Update scenario entry metadata with link to core
    this.blackboard.updateEntryMetadata('scenario', scenarioEntryId, {
      promotedToCore: coreResult.entry.id,
    }, directorAgentId);

    // Emit promotion event
    const promoteMeta: PromoteAuditMetadata = {
      sourceScenarioEntryId: scenarioEntryId,
      targetCoreEntryId: coreResult.entry.id,
      promotedBy: directorAgentId,
    };

    if (this.promoteCallback) {
      this.promoteCallback(promoteMeta);
    }

    this.logger.debug({ coreEntryId: coreResult.entry.id, scenarioEntryId }, 'MemoryManager.promote: complete');
    return { coreEntryId: coreResult.entry.id, scenarioEntryId };
  }

  /**
   * Check layer usage and emit alert if crossing 60% threshold.
   * MEM-01: Alert is advisory only, does not block writes.
   */
  private checkAndEmitAlert(layer: BlackboardLayer): void {
    const layerRead = this.blackboard.readLayer(layer);
    const usagePct = layerRead.tokenCount / layerRead.tokenBudget;

    if (usagePct >= BUDGET_ALERT_THRESHOLD) {
      const alertMeta: AlertAuditMetadata = {
        alertType: 'layer_threshold',
        layer,
        tokenCount: layerRead.tokenCount,
        tokenBudget: layerRead.tokenBudget,
        usagePct: usagePct * 100,
        thresholdPct: BUDGET_ALERT_THRESHOLD * 100,
      };

      this.logger.warn(alertMeta, 'MemoryManager: layer budget alert');

      if (this.alertCallback) {
        this.alertCallback(layer, alertMeta);
      }
    }
  }

  /**
   * Perform layer folding.
   * - Semantic: fold older entries, keep recent tail (MEM-02)
   * - Procedural: fold only non-voice entries (MEM-03)
   */
  private async performFold(layer: 'semantic' | 'procedural'): Promise<void> {
    const layerRead = this.blackboard.readLayer(layer);
    const foldVersion = (layerRead.entries[0]?.metadata?.foldVersion ?? 0) + 1;

    let entriesToFold: Array<{ id: string; content: string; timestamp: string }> = [];
    let entriesToPreserve: Array<{ id: string; content: string; timestamp: string }> = [];

    if (layer === 'semantic') {
      // Semantic: preserve recent tail verbatim, fold older
      const sorted = [...layerRead.entries].sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
      entriesToPreserve = sorted.slice(-RECENT_TAIL_SIZE);
      entriesToFold = sorted.slice(0, -RECENT_TAIL_SIZE);
    } else if (layer === 'procedural') {
      // Procedural: protect voice-constraint entries, fold older transient
      for (const entry of layerRead.entries) {
        if (entry.metadata?.voiceConstraints === true) {
          entriesToPreserve.push(entry);
        } else {
          entriesToFold.push(entry);
        }
      }
      // Sort fold candidates by timestamp, oldest first
      entriesToFold.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
    }

    if (entriesToFold.length === 0) {
      this.logger.debug({ layer }, 'MemoryManager.fold: no entries to fold');
      return;
    }

    // Summarize via LLM
    const summary = await this.summarizeEntries(layer, entriesToFold);

    // Delete old entries
    const foldIds = entriesToFold.map(e => e.id);
    this.blackboard.deleteEntries(layer, foldIds);

    // Write summary entry
    const beforeCount = layerRead.tokenCount;
    const summaryWrite = this.blackboard.writeEntry(layer, 'memory-manager', {
      content: summary,
      messageId: crypto.randomUUID(),
      metadata: {
        foldSummary: true,
        foldVersion,
        foldedEntryIds: foldIds,
      },
    });

    const afterRead = this.blackboard.readLayer(layer);
    const foldMeta: FoldAuditMetadata = {
      foldType: layer,
      layer,
      foldedEntryIds: foldIds,
      foldedEntryCount: foldIds.length,
      beforeTokenCount: beforeCount,
      afterTokenCount: afterRead.tokenCount,
      summaryEntryId: summaryWrite.entry.id,
      tailPreservedCount: entriesToPreserve.length,
    };

    this.logger.info(foldMeta, 'MemoryManager.fold: complete');

    if (this.foldCallback) {
      this.foldCallback(layer, foldMeta);
    }
  }

  /**
   * Summarize entries using LLM.
   * Preserves plot developments, scene order/context, and emotional arc (CONTEXT.md requirement).
   */
  private async summarizeEntries(
    layer: 'semantic' | 'procedural',
    entries: Array<{ id: string; content: string }>,
  ): Promise<string> {
    const entryTexts = entries.map((e, i) => `--- Entry ${i + 1} ---\n${e.content}`).join('\n\n');

    const system = `You are a narrative continuity specialist. Summarize the provided ${layer} layer entries.

CRITICAL REQUIREMENTS:
1. Preserve the ORDER of events (time sequence matters)
2. Preserve PLOT DEVELOPMENTS (what actually happened)
3. Preserve SCENE CONTEXT (locations, characters present)
4. Preserve EMOTIONAL ARC (how the scene felt, tensions built/resolved)

Do NOT invent new information. Do NOT omit critical plot details.
Be concise but thorough.`;

    const user = `Summarize these ${layer} layer entries:\n\n${entryTexts}`;

    const response = await this.llmProvider.generate({ system, user });
    return response.content;
  }

  /**
   * Helper to get actor-readable semantic context (includes folded summaries).
   * Called by Actor.readFactContext().
   */
  getActorSemanticContinuity(): string {
    const semantic = this.blackboard.readLayer('semantic');
    const summaryEntries = semantic.entries.filter(e => e.metadata?.foldSummary === true);

    if (summaryEntries.length === 0) {
      return '';
    }

    const parts: string[] = [];
    for (const entry of summaryEntries) {
      parts.push(entry.content);
    }

    return parts.join('\n\n');
  }
}
