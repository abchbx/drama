import { encoding_for_model } from 'tiktoken';

import type {
  BlackboardLayer,
  BlackboardEntry,
  WriteEntryRequest,
  WriteEntryResponse,
  LayerReadResponse,
  EntryReadResponse,
  BlackboardState,
} from '../types/blackboard.js';

import {
  LAYER_BUDGETS,
  LAYER_NAMES,
  VersionConflictError,
  TokenBudgetExceededError,
  NotFoundError,
  ValidationError,
} from '../types/blackboard.js';

export {
  VersionConflictError,
  TokenBudgetExceededError,
  NotFoundError,
  ValidationError,
};
export type { WriteEntryResponse };

// Cached tiktoken encoder — created once, reused for all token counting
let _encoder: ReturnType<typeof encoding_for_model> | null = null;

function getEncoder(): ReturnType<typeof encoding_for_model> {
  if (!_encoder) {
    // encoding_for_model('gpt-4') uses cl100k_base encoding (same as GPT-4)
    _encoder = encoding_for_model('gpt-4');
  }
  return _encoder;
}

function createInitialState(): BlackboardState {
  return {
    core: { entries: [], version: 0 },
    scenario: { entries: [], version: 0 },
    semantic: { entries: [], version: 0 },
    procedural: { entries: [], version: 0 },
  };
}

export class BlackboardService {
  private state: BlackboardState;

  constructor(initialState?: BlackboardState) {
    this.state = initialState ?? createInitialState();
  }

  /**
   * Count tokens using tiktoken (cl100k_base encoding).
   * Synchronous — encoder is pre-initialized as a module-level singleton.
   */
  countTokens(text: string): number {
    return getEncoder().encode(text).length;
  }

  private sumTokenCount(entries: BlackboardEntry[]): number {
    return entries.reduce((sum, e) => sum + e.tokenCount, 0);
  }

  readLayer(layer: BlackboardLayer): LayerReadResponse {
    if (!LAYER_NAMES.includes(layer)) {
      throw new ValidationError(`Invalid layer: ${String(layer)}`);
    }
    const ls = this.state[layer];
    const tokenCount = this.sumTokenCount(ls.entries);
    const budget = LAYER_BUDGETS[layer];
    return {
      layer,
      currentVersion: ls.version,
      tokenCount,
      tokenBudget: budget,
      budgetUsedPct: budget > 0 ? Math.round((tokenCount / budget) * 100) : 0,
      entries: ls.entries.slice(), // return copy to preserve insertion order
    };
  }

  readEntry(layer: BlackboardLayer, entryId: string): EntryReadResponse {
    if (!LAYER_NAMES.includes(layer)) {
      throw new ValidationError(`Invalid layer: ${String(layer)}`);
    }
    const ls = this.state[layer];
    const entry = ls.entries.find(e => e.id === entryId);
    if (!entry) {
      throw new NotFoundError(layer, entryId);
    }
    return { entry, currentVersion: ls.version };
  }

  writeEntry(layer: BlackboardLayer, agentId: string, req: WriteEntryRequest): WriteEntryResponse {
    if (!LAYER_NAMES.includes(layer)) {
      throw new ValidationError(`Invalid layer: ${String(layer)}`);
    }
    if (typeof req.content !== 'string' || req.content.trim().length === 0) {
      throw new ValidationError('content must be a non-empty string');
    }

    const tokenCount = this.countTokens(req.content);
    const ls = this.state[layer];

    // Optimistic locking check
    if (req.expectedVersion !== undefined && req.expectedVersion !== ls.version) {
      throw new VersionConflictError(ls.version, req.expectedVersion);
    }

    // Token budget check
    const currentTotal = this.sumTokenCount(ls.entries);
    const budget = LAYER_BUDGETS[layer];
    if (currentTotal + tokenCount > budget) {
      throw new TokenBudgetExceededError(layer, budget, currentTotal, tokenCount);
    }

    // Create entry — merge caller-supplied metadata (Phase 6 fold/promotion fields)
    const entry: BlackboardEntry = {
      id: crypto.randomUUID(),
      agentId,
      messageId: req.messageId,
      timestamp: new Date().toISOString(),
      content: req.content,
      tokenCount,
      version: ls.version + 1,
      metadata: req.metadata ? { ...req.metadata } : undefined,
    };

    ls.entries.push(entry);
    ls.version = ls.version + 1;

    return { entry, layerVersion: ls.version };
  }

  /**
   * Patch metadata on an existing entry.
   * Used by MemoryManagerService for fold/promotion updates.
   */
  updateEntryMetadata(
    layer: BlackboardLayer,
    entryId: string,
    metadataPatch: Partial<BlackboardEntry['metadata']>,
    _agentId: string,
  ): void {
    if (!LAYER_NAMES.includes(layer)) {
      throw new ValidationError(`Invalid layer: ${String(layer)}`);
    }
    const ls = this.state[layer];
    const entry = ls.entries.find(e => e.id === entryId);
    if (!entry) {
      throw new NotFoundError(layer, entryId);
    }
    entry.metadata = { ...entry.metadata, ...metadataPatch };
    ls.version = ls.version + 1;
  }

  /**
   * Delete multiple entries by ID from a layer.
   * Used by MemoryManagerService when folding older entries into a summary.
   */
  deleteEntries(layer: BlackboardLayer, entryIds: string[]): void {
    if (!LAYER_NAMES.includes(layer)) {
      throw new ValidationError(`Invalid layer: ${String(layer)}`);
    }
    const ls = this.state[layer];
    for (const id of entryIds) {
      const idx = ls.entries.findIndex(e => e.id === id);
      if (idx !== -1) {
        ls.entries.splice(idx, 1);
      }
    }
    ls.version = ls.version + 1;
  }

  deleteEntry(layer: BlackboardLayer, entryId: string, _agentId: string): void {
    if (!LAYER_NAMES.includes(layer)) {
      throw new ValidationError(`Invalid layer: ${String(layer)}`);
    }
    const ls = this.state[layer];
    const idx = ls.entries.findIndex(e => e.id === entryId);
    if (idx === -1) {
      throw new NotFoundError(layer, entryId);
    }
    ls.entries.splice(idx, 1);
    ls.version = ls.version + 1;
  }

  exportState(): BlackboardState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Read layer entries filtered by visibility for a specific actor.
   * Implements perceptual boundaries - actors only see what they're allowed to see.
   */
  readLayerForActor(layer: BlackboardLayer, actorId: string): LayerReadResponse {
    if (!LAYER_NAMES.includes(layer)) {
      throw new ValidationError(`Invalid layer: ${String(layer)}`);
    }
    const ls = this.state[layer];
    
    // Filter entries based on visibility metadata
    const visibleEntries = ls.entries.filter(entry => {
      const metadata = entry.metadata as { 
        visibility?: { 
          scope?: string; 
          visibleTo?: string[]; 
          faction?: string;
          overheardBy?: string[];
        };
        faction?: string;
      } | undefined;
      
      // No visibility metadata = public by default
      if (!metadata?.visibility) {
        return true;
      }
      
      const scope = metadata.visibility.scope || 'public';
      
      switch (scope) {
        case 'public':
          return true;
        case 'private':
          // Only visible to the writer
          return entry.agentId === actorId;
        case 'selective':
          // Visible to specific actors
          return metadata.visibility.visibleTo?.includes(actorId) || entry.agentId === actorId;
        case 'faction':
          // Visible to actors with same faction
          const entryFaction = metadata.visibility.faction || metadata?.faction;
          // For now, faction matching is simplified - would need actor faction info
          return true; // TODO: Implement faction matching
        case 'overheard':
          // Visible to intended recipients + those who overheard
          return metadata.visibility.visibleTo?.includes(actorId) || 
                 metadata.visibility.overheardBy?.includes(actorId) ||
                 entry.agentId === actorId;
        default:
          return true;
      }
    });
    
    const tokenCount = this.sumTokenCount(visibleEntries);
    const budget = LAYER_BUDGETS[layer];
    
    return {
      layer,
      currentVersion: ls.version,
      tokenCount,
      tokenBudget: budget,
      budgetUsedPct: budget > 0 ? Math.round((tokenCount / budget) * 100) : 0,
      entries: visibleEntries,
    };
  }
}
