// === Layer constants ===
export const LAYER_NAMES = ['core', 'scenario', 'semantic', 'procedural'] as const;
export type BlackboardLayer = typeof LAYER_NAMES[number];

export const LAYER_BUDGETS: Record<BlackboardLayer, number> = {
  core: 2000,        // 2K tokens
  scenario: 8000,    // 8K tokens
  semantic: 8000,    // 8K tokens
  procedural: 4000,  // 4K tokens
} as const;

// 60% alert threshold
export const BUDGET_ALERT_THRESHOLD = 0.6;

// === Entry ===
export interface BlackboardEntry {
  id: string;
  agentId: string;
  messageId?: string;
  timestamp: string; // ISO 8601
  content: string;
  tokenCount: number;
  version: number;
  // Actor-specific metadata (optional)
  metadata?: {
    characterCardFor?: string;  // agentId — marks entry as a character card for this actor
    dialogueFor?: string;       // sceneId — marks entry as dialogue for this scene
    unverifiedFacts?: boolean;  // hallucination flag from actor generation
    unverifiedClaims?: string[]; // specific claims flagged as unverified
    voiceConstraints?: boolean; // true if this entry stores voice constraints in procedural layer
    // --- Phase 6: Memory management ---
    promotedToCore?: string;    // ID of the core entry this was promoted to (scenario layer)
    promotedFromScenarioId?: string; // ID of the scenario entry that was promoted to core (core layer)
    foldPriority?: number;      // higher = less likely to be folded; default 0
    foldVersion?: number;       // iteration number of fold; incremented each time entries are folded
    foldSummary?: boolean;      // true if this entry is itself a summary of folded entries
    foldedEntryIds?: string[];  // IDs of entries that were collapsed into this summary entry
  };
}

// === Write request/response ===
export interface WriteEntryRequest {
  content: string;
  expectedVersion?: number; // optimistic locking
  messageId?: string;
  metadata?: Partial<BlackboardEntry['metadata']>; // Phase 6: attach fold/promotion metadata at creation time
}

export interface WriteEntryResponse {
  entry: BlackboardEntry;
  layerVersion: number;
}

// === Read responses ===
export interface LayerReadResponse {
  layer: BlackboardLayer;
  currentVersion: number;
  tokenCount: number;
  tokenBudget: number;
  budgetUsedPct: number;
  entries: BlackboardEntry[];
}

export interface EntryReadResponse {
  entry: BlackboardEntry;
  currentVersion: number;
}

// === Error shapes ===
export interface ErrorResponse {
  error: string;
  message: string;
  [key: string]: unknown;
}

// === Service errors (thrown by BlackboardService) ===
export class VersionConflictError extends Error {
  readonly currentVersion: number;
  readonly expectedVersion: number;
  constructor(currentVersion: number, expectedVersion: number) {
    super(`Version conflict: expected ${expectedVersion}, current ${currentVersion}`);
    this.name = 'VersionConflictError';
    this.currentVersion = currentVersion;
    this.expectedVersion = expectedVersion;
  }
}

export class TokenBudgetExceededError extends Error {
  readonly layer: BlackboardLayer;
  readonly budget: number;
  readonly currentCount: number;
  readonly attemptedCount: number;
  constructor(layer: BlackboardLayer, budget: number, currentCount: number, attemptedCount: number) {
    super(`Token budget exceeded for layer '${layer}': budget=${budget}, current=${currentCount}, attempted=${attemptedCount}`);
    this.name = 'TokenBudgetExceededError';
    this.layer = layer;
    this.budget = budget;
    this.currentCount = currentCount;
    this.attemptedCount = attemptedCount;
  }
}

export class NotFoundError extends Error {
  readonly layer: BlackboardLayer;
  readonly entryId: string;
  constructor(layer: BlackboardLayer, entryId: string) {
    super(`Entry '${entryId}' not found in layer '${layer}'`);
    this.name = 'NotFoundError';
    this.layer = layer;
    this.entryId = entryId;
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// === Agent roles & boundary types ===
export type AgentRole = 'Actor' | 'Director' | 'Admin';
export type ViolationType = 'CAPABILITY_CLOSED' | 'NAMESPACE_VIOLATION' | 'INPUT_SCOPE_VIOLATION';
export type BoundaryOperation = 'read' | 'write';

export class BoundaryViolationError extends Error {
  readonly violationType: ViolationType;
  readonly targetLayer: BlackboardLayer;
  readonly operation: BoundaryOperation;
  readonly allowedLayers: BlackboardLayer[];
  constructor(
    violationType: ViolationType,
    targetLayer: BlackboardLayer,
    operation: BoundaryOperation,
    allowedLayers: BlackboardLayer[],
  ) {
    super(`Boundary violation: ${operation} on '${targetLayer}' denied — ${violationType}`);
    this.name = 'BoundaryViolationError';
    this.violationType = violationType;
    this.targetLayer = targetLayer;
    this.operation = operation;
    this.allowedLayers = allowedLayers;
  }
}

// === Board state (for snapshot + service) ===
export interface LayerState {
  entries: BlackboardEntry[];
  version: number;
}

export interface BlackboardState {
  core: LayerState;
  scenario: LayerState;
  semantic: LayerState;
  procedural: LayerState;
}

// === Audit log (written by routes, consumed by audit service) ===
export type AuditOperation = 'write' | 'reject' | 'violation' | 'alert' | 'fold' | 'promote';

// --- Phase 6: Memory event metadata ---

/** Metadata recorded when a 60% layer alert fires (MEM-01) */
export interface AlertAuditMetadata {
  alertType: 'layer_threshold';
  layer: BlackboardLayer;
  tokenCount: number;
  tokenBudget: number;
  usagePct: number;
  thresholdPct: number; // always 60 for MEM-01
}

/** Metadata recorded when entries are folded (MEM-02 / MEM-03) */
export interface FoldAuditMetadata {
  foldType: 'semantic' | 'procedural';
  layer: BlackboardLayer;
  foldedEntryIds: string[];
  foldedEntryCount: number;
  beforeTokenCount: number;
  afterTokenCount: number;
  summaryEntryId: string; // ID of the inserted summary entry
  tailPreservedCount: number; // number of recent entries kept verbatim
}

/** Metadata recorded when a scenario entry is promoted to core (MEM-05) */
export interface PromoteAuditMetadata {
  sourceScenarioEntryId: string;
  targetCoreEntryId: string;
  promotedBy: string; // agentId of the Director
}

/** Union of all Phase 6 audit metadata shapes */
export type MemoryAuditMetadata = AlertAuditMetadata | FoldAuditMetadata | PromoteAuditMetadata;

// === Audit log (written by routes, consumed by audit service) ===
export interface AuditLogEntry {
  timestamp: string; // ISO 8601
  agentId: string;
  layer: BlackboardLayer;
  messageId?: string;
  entryId?: string;
  operation: AuditOperation;
  rejectionReason?: string;
  entryContentHash?: string; // SHA-256 of entry content
  role?: AgentRole;
  violationType?: ViolationType;
  metadata?: Record<string, unknown>; // actor-specific tracking | Phase 6 memory audit metadata
}
