import { z } from 'zod';

// === Planning context ===

/**
 * Context for plot backbone planning.
 * Passed to Director.planBackbone().
 */
export interface PlanningContext {
  dramaId: string;
  characters: CharacterSummary[];
  existingBackbone: string;        // current backbone prose (empty if new session)
  previousScenes: SceneSummary[];   // previous scene outcomes for continuity
  newContentEstimate: number;        // estimated token count of new content
}

/**
 * Name + role of a character in the drama.
 * Passed in PlanningContext for Director's system prompt.
 */
export interface CharacterSummary {
  agentId: string;
  name: string;
  role: string;
  objectives: string[];
}

/**
 * One-line summary of a scene outcome for Director continuity.
 */
export interface SceneSummary {
  sceneId: string;
  outcome: string;         // one-line description of what happened
  conflicts: string[];     // any unresolved conflicts
  plotAdvancement: string;
}

// === DirectorBackboneOutput — written to core layer ===

export interface DirectorBackboneOutput {
  exchangeId: string;
  backboneProse: string;    // prose narrative with [ACTOR DISCRETION] markers
  scenes: SceneMarker[];     // structured scene markers embedded in prose
  tokenCount: number;
  modelUsed?: string;
}

export interface SceneMarker {
  sceneId: string;
  description: string;
  type: 'directed' | 'actor_discretion';
  characters: string[];     // character names participating
}

// === ArbitrationOutput — written to scenario layer ===

export interface ArbitrationOutput {
  exchangeId: string;
  sceneId: string;
  conflicts: ConflictDecision[];
  tokenCount: number;
  modelUsed?: string;
}

export interface ConflictDecision {
  conflictId: string;
  conflictingClaims: string[];   // what each actor claimed
  canonicalOutcome: string;       // prose describing what actually happened
  severity: 'high' | 'medium' | 'low';
}

// === FactCheckOutput — flagged to procedural layer ===

export interface FactCheckOutput {
  exchangeId: string;
  sceneId: string;
  contradictions: ContradictionEntry[];
  tokenCount: number;
  modelUsed?: string;
}

export interface ContradictionEntry {
  conflictingClaim: string;
  coreFact: string;          // what the core layer says
  scenarioFact?: string;     // what the scenario layer says (if applicable)
  severity: 'high' | 'medium' | 'low';
  sourceAgentId: string;
}

// === Scene signals — written to procedural layer ===

export interface SceneStartSignal {
  type: 'scene_start';
  sceneId: string;
  directorId: string;
  timestamp: string;        // ISO 8601
}

export interface SceneEndSignal {
  type: 'scene_end';
  sceneId: string;
  directorId: string;
  timestamp: string;         // ISO 8601
  beats: string[];
  conflicts: string[];
  plotAdvancement: string;
  status: 'completed' | 'interrupted' | 'timeout';
}

// === Zod schemas for runtime validation ===

export const SceneMarkerSchema = z.object({
  sceneId: z.string(),
  description: z.string(),
  type: z.enum(['directed', 'actor_discretion']),
  characters: z.array(z.string()),
});

export const DirectorBackboneOutputSchema = z.object({
  exchangeId: z.string(),
  backboneProse: z.string(),
  scenes: z.array(SceneMarkerSchema),
  tokenCount: z.number(),
  modelUsed: z.string().optional(),
});

export const ConflictDecisionSchema = z.object({
  conflictId: z.string(),
  conflictingClaims: z.array(z.string()),
  canonicalOutcome: z.string(),
  severity: z.enum(['high', 'medium', 'low']),
});

export const ArbitrationOutputSchema = z.object({
  exchangeId: z.string(),
  sceneId: z.string(),
  conflicts: z.array(ConflictDecisionSchema),
  tokenCount: z.number(),
  modelUsed: z.string().optional(),
});

export const ContradictionEntrySchema = z.object({
  conflictingClaim: z.string(),
  coreFact: z.string(),
  scenarioFact: z.string().optional(),
  severity: z.enum(['high', 'medium', 'low']),
  sourceAgentId: z.string(),
});

export const FactCheckOutputSchema = z.object({
  exchangeId: z.string(),
  sceneId: z.string(),
  contradictions: z.array(ContradictionEntrySchema),
  tokenCount: z.number(),
  modelUsed: z.string().optional(),
});

// === Error ===

export class DirectorGenerationError extends Error {
  readonly cause: unknown;
  readonly phase: 'llm_call' | 'json_parse' | 'validation' | 'blackboard_write';
  constructor(phase: DirectorGenerationError['phase'], message: string, cause?: unknown) {
    super(`Director generation failed (${phase}): ${message}`);
    this.name = 'DirectorGenerationError';
    this.phase = phase;
    this.cause = cause;
  }
}
