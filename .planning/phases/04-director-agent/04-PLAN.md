---
name: "04-director-agent"
wave: 1
phase: 4
plan: "04-01"
type: implementation
depends_on: []
requirements: [DIR-01, DIR-02, DIR-03, DIR-04, DIR-05, DIR-06]
files_modified:
  - src/services/llm.ts
  - src/services/index.ts
  - tests/actor.test.ts
new_files:
  - src/types/director.ts
  - src/services/director.ts
  - tests/director.test.ts
autonomous: false
must_haves:
  truths:
    - "Director class mirrors Actor class pattern with generate() method"
    - "Director writes plot backbone prose to core layer"
    - "Director MUST NOT write to semantic layer (hard capability enforcement)"
    - "Director arbitrates conflicting Actor outputs, writes resolution to scenario layer"
    - "Director mandates [ACTOR DISCRETION] scenes in backbone"
    - "Director fact-checks Actor outputs against core layer, flags contradictions to procedural"
    - "Director signals scene boundaries via procedural layer entries"
    - "Director uses same LlmProvider interface as Actor"
  artifacts:
    - path: src/types/director.ts
      provides: DirectorOutput schemas, DirectorGenerationError, scene signal schemas
      min_lines: 80
    - path: src/services/llm.ts
      provides: buildDirectorSystemPrompt, buildDirectorUserPrompt, buildFactCheckUserPrompt
      min_lines: 20
    - path: src/services/director.ts
      provides: Director class with planBackbone, arbitrate, factCheck, signalSceneStart, signalSceneEnd
      min_lines: 150
    - path: tests/director.test.ts
      provides: Director class unit tests covering all 6 requirements + error cases
      min_lines: 200
  key_links:
    - from: src/services/director.ts
      to: src/services/llm.ts
      via: LlmProvider interface + buildDirectorSystemPrompt/buildDirectorUserPrompt
    - from: src/services/director.ts
      to: src/services/blackboard.ts
      via: BlackboardService injected via constructor; writes to core/scenario/procedural only
    - from: src/services/director.ts
      to: src/types/director.ts
      via: DirectorOutput schemas, DirectorGenerationError
    - from: src/types/director.ts
      to: src/types/blackboard.ts
      via: Reuses LAYER_BUDGETS, BlackboardLayer, BoundaryViolationError
    - from: tests/director.test.ts
      to: src/services/llm.ts
      via: MockLlmProvider injected in tests
---

# Phase 4 Plan: Director Agent

## Wave Map

| Wave | Tasks | Parallel? | Blocked by |
|------|-------|-----------|------------|
| 1 | T1 (director types) + T2 (llm prompt builders) | Yes | None |
| 2 | T3 (Director class) | No | T1, T2 |
| 3 | T4 (service index export) | No | T3 |
| 4 | T5 (unit tests) | No | T3 |

All tasks are in one conceptual wave executed sequentially by /gsd:execute-phase with explicit dependency ordering.

---

## Tasks

<task>
<name>Define Director types and schemas</name>
<files>src/types/director.ts</files>
<action>
Create `src/types/director.ts` (NEW FILE) with all Director-specific types, Zod validation schemas, and error classes. This mirrors `src/types/actor.ts` exactly.
Specific steps:
1. Create `src/types/director.ts` with these exports:

   **Director context types:**
   ```typescript
   // Context for plot backbone planning
   export interface PlanningContext {
     dramaId: string;
     characters: CharacterSummary[];   // names + roles of all characters
     existingBackbone: string;         // current backbone prose (empty if new session)
     previousScenes: SceneSummary[];    // previous scene outcomes for continuity
     newContentEstimate: number;        // estimated token count of new content
   }

   export interface CharacterSummary {
     agentId: string;
     name: string;
     role: string;
     objectives: string[];
   }

   export interface SceneSummary {
     sceneId: string;
     outcome: string;       // one-line description of what happened
     conflicts: string[];    // any unresolved conflicts
     plotAdvancement: string;
   }
   ```

   **DirectorOutput — plot backbone (written to core layer):**
   ```typescript
   export interface DirectorBackboneOutput {
     exchangeId: string;
     backboneProse: string;    // prose narrative with [ACTOR DISCRETION] markers
     scenes: SceneMarker[];    // structured scene markers embedded in prose
     tokenCount: number;
     modelUsed?: string;
   }

   export interface SceneMarker {
     sceneId: string;
     description: string;
     type: 'directed' | 'actor_discretion';
     characters: string[];     // character names participating
   }
   ```

   **ArbitrationOutput — conflict resolution (written to scenario layer):**
   ```typescript
   export interface ArbitrationOutput {
     exchangeId: string;
     sceneId: string;
     conflicts: ConflictDecision[];
     tokenCount: number;
     modelUsed?: string;
   }

   export interface ConflictDecision {
     conflictId: string;
     conflictingClaims: string[];  // what each actor claimed
     canonicalOutcome: string;    // prose describing what actually happened
     severity: 'high' | 'medium' | 'low';
   }
   ```

   **FactCheckOutput — contradiction flags (written to procedural layer):**
   ```typescript
   export interface FactCheckOutput {
     exchangeId: string;
     sceneId: string;
     contradictions: ContradictionEntry[];
     tokenCount: number;
     modelUsed?: string;
   }

   export interface ContradictionEntry {
     conflictingClaim: string;
     coreFact: string;         // what the core layer says
     scenarioFact?: string;    // what the scenario layer says (if applicable)
     severity: 'high' | 'medium' | 'low';
     sourceAgentId: string;
   }
   ```

   **Scene signal types (written to procedural layer):**
   ```typescript
   export interface SceneStartSignal {
     type: 'scene_start';
     sceneId: string;
     directorId: string;
     timestamp: string;
   }

   export interface SceneEndSignal {
     type: 'scene_end';
     sceneId: string;
     directorId: string;
     timestamp: string;
     beats: string[];
     conflicts: string[];
     plotAdvancement: string;
     status: 'completed' | 'interrupted' | 'timeout';
   }
   ```

   **Zod schemas:**
   ```typescript
   import { z } from 'zod';

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
   ```

   **DirectorGenerationError:**
   ```typescript
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
   ```

2. Import `CharacterSummary` and `SceneSummary` from `./director.js` type section (defined above in the same file).
3. Re-export nothing from other files (no cross-imports needed).
4. Verify build: `npm run build` should complete without errors.

</action>
<verify>npm run build 2>&1 | tail -5 | grep -v "Starting" | grep -v "Build at" | tail -3</verify>
<done>src/types/director.ts exists with all interfaces, Zod schemas, and DirectorGenerationError exported</done>
</task>

<task>
<name>Add Director prompt builders</name>
<files>src/services/llm.ts</files>
<action>
Add Director-specific prompt builder functions to `src/services/llm.ts`, following the same pattern as `buildActorSystemPrompt` and `buildActorUserPrompt`.
Specific steps:
1. Open `src/services/llm.ts` and add these three exported functions at the end of the file:

   ```typescript
   /**
    * Build a system prompt for the Director.
    * Encodes the role contract: plan, arbitrate, fact-check — never write dialogue.
    */
   export function buildDirectorSystemPrompt(): string {
     const lines: string[] = [
       'You are the Director of this multi-agent drama session.',
       'Your role is to plan the plot backbone, coordinate actors, arbitrate conflicts, and fact-check.',
       'You MUST NOT write dialogue for any character. That is the actors\' exclusive role.',
       'You MUST respond with valid JSON only — no prose, no markdown, no explanation.',
       '',
       'Core responsibilities:',
       '- Write plot backbone prose to the core layer. Use [ACTOR DISCRETION] markers for scenes where actors control the outcome.',
       '- When writing the backbone, preserve all existing [ACTOR DISCRETION: ...] markers from prior versions.',
       '- Arbitrate conflicting actor outputs: write the canonical outcome to the scenario layer.',
       '- Fact-check actor outputs against established core layer facts. Only flag contradictions of objective world state.',
       '- Do NOT flag character opinions, emotional reactions, or dramatic statements as contradictions.',
       '',
       'Token budget: The core layer has a 2K token budget. Monitor usage and prune/summarize when approaching capacity.',
       '',
       'Respond with JSON only.',
     ];
     return lines.join('\n');
   }

   /**
    * Build a user prompt for the Director to plan or update the plot backbone.
    */
   export function buildDirectorUserPrompt(context: import('../types/director.js').PlanningContext, factContext: string): string {
     const lines: string[] = [
       '[Session]',
       `Drama ID: ${context.dramaId}`,
       '',
       '[Characters]',
       ...context.characters.map(c => `- ${c.name} (${c.role}): ${c.objectives.join('; ')}`),
       '',
       '[Existing Backbone — preserve all [ACTOR DISCRETION: ...] markers]',
       context.existingBackbone || '(new session — no existing backbone)',
       '',
       '[Previous Scenes]',
     ];

     if (context.previousScenes.length > 0) {
       for (const scene of context.previousScenes) {
         lines.push(`Scene ${scene.sceneId}: ${scene.outcome}`);
         if (scene.conflicts.length > 0) {
           lines.push(`  Unresolved conflicts: ${scene.conflicts.join(', ')}`);
         }
         lines.push(`  Plot advancement: ${scene.plotAdvancement}`);
       }
     } else {
       lines.push('(no previous scenes — this is the first scene)');
     }

     if (factContext.trim().length > 0) {
       lines.push('', '[Fact Context — established facts, do not contradict]', factContext);
     } else {
       lines.push('', '[Fact Context — no established facts yet]');
     }

     lines.push('', '[Your Task]', 'Write or update the plot backbone prose. Include at least one [ACTOR DISCRETION] scene. Respond with JSON only.');

     return lines.join('\n');
   }

   /**
    * Build a user prompt for the Director to fact-check actor outputs.
    */
   export function buildFactCheckUserPrompt(params: {
     sceneId: string;
     actorOutputs: Array<{ agentId: string; name: string; entries: Array<{ speaker: string; text: string; unverifiedFacts: boolean }> }>;
     coreFacts: string;
     scenarioFacts: string;
   }): string {
     const lines: string[] = [
       '[Task]',
       `Fact-check the following actor outputs for Scene ${params.sceneId}.`,
       '',
       '[Established Facts — Core Layer]',
       params.coreFacts || '(no core facts established)',
       '',
       '[Established Facts — Scenario Layer]',
       params.scenarioFacts || '(no scenario facts established)',
       '',
       '[Actor Outputs]',
     ];

     for (const actor of params.actorOutputs) {
       lines.push(`\n${actor.name} (${actor.agentId}):`);
       for (const entry of actor.entries) {
         lines.push(`  [${entry.speaker}]: ${entry.text}`);
       }
     }

     lines.push(
       '',
       '[Instructions]',
       'Compare each actor\'s claims against the established facts above.',
       'Only flag contradictions of objective world state (who did what, when, where).',
       'Do NOT flag character opinions, emotional reactions, dramatic statements, or rhetorical choices.',
       'Return a JSON array of contradiction entries with severity: high (core contradiction), medium (scenario contradiction), low (minor detail).',
     );

     return lines.join('\n');
   }
   ```

2. Verify build: `npm run build` should complete without errors.

</action>
<verify>npm run build 2>&1 | tail -5 | grep -v "Starting" | grep -v "Build at" | tail -3</verify>
<done>src/services/llm.ts has buildDirectorSystemPrompt, buildDirectorUserPrompt, buildFactCheckUserPrompt functions added</done>
</task>

<task>
<name>Implement Director class</name>
<files>src/services/director.ts</files>
<action>
Create `src/services/director.ts` (NEW FILE) implementing the Director class — in-process TypeScript class mirroring the Actor class pattern. The Director plans the plot backbone, arbitrates conflicts, fact-checks scenes, and signals scene boundaries. It writes to core/scenario/procedural layers only and MUST NOT write to the semantic layer.
Specific steps:
1. Create `src/services/director.ts`:

   **Imports:**
   ```typescript
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
   ```

   **DirectorOptions interface:**
   ```typescript
   export interface DirectorOptions {
     blackboard: BlackboardService;
     capabilityService: CapabilityService;
     llmProvider: LlmProvider;
     logger: pino.Logger;
     agentId: string;
   }
   ```

   **Director class:**
   ```typescript
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
       const allowedLayers = this.capabilityService.getAllowedLayers?.(this.agentId) ??
         this.capabilityService.capabilityMap['Director'];
       if ((allowedLayers as string[]).includes('semantic')) {
         throw new Error('Director capability configuration error: semantic layer write must be denied for Director role');
       }
     }
   ```

   **Method 1: `readAllLayerContext()`** (private) — reads all 4 layers as text for LLM context:
   ```
   1. Call blackboard.readLayer('core')
   2. Call blackboard.readLayer('scenario')
   3. Call blackboard.readLayer('semantic')
   4. Call blackboard.readLayer('procedural')
   5. Concatenate as labeled sections: "## Core Facts\n" + entries + "\n## Scenario\n" + entries + etc.
   ```

   **Method 2: `planBackbone(context: PlanningContext): Promise<DirectorBackboneOutput>`** (public) — writes plot backbone to core layer:
   ```
   1. exchangeId = crypto.randomUUID()
   2. factContext = this.readAllLayerContext()
   3. Check core budget: readLayer('core').budgetUsedPct; if > 75%, call ensureCoreBudget() first
   4. system = buildDirectorSystemPrompt()
   5. user = buildDirectorUserPrompt(context, factContext)
   6. rawContent = await llmProvider.generate({ system, user })
   7. parsed = JSON.parse(rawContent) — throw DirectorGenerationError('json_parse') on failure
   8. output = DirectorBackboneOutputSchema.parse(parsed) — throw DirectorGenerationError('validation') on failure
   9. if (!output.exchangeId) output.exchangeId = exchangeId
   10. Write backbone prose to core layer: blackboard.writeEntry('core', this.agentId, { content: output.backboneProse, messageId: output.exchangeId })
   11. For each SceneMarker in output.scenes: write scene marker JSON to procedural layer
   12. Return output
   ```

   **Method 3: `ensureCoreBudget(additionalTokens: number): Promise<void>`** (private) — monitors and prunes core layer at 75% threshold:
   ```
   1. core = blackboard.readLayer('core')
   2. threshold = LAYER_BUDGETS.core * 0.75 (1500 tokens)
   3. If core.tokenCount + additionalTokens > LAYER_BUDGETS.core:
      a. Build a summary of existing core entries (first half of entries)
      b. Write summary to scenario layer: blackboard.writeEntry('scenario', this.agentId, { content: 'Summary of pruned core: ' + summaryText, messageId: crypto.randomUUID() })
      c. Delete pruned entries from core: for each entry in first half, blackboard.deleteEntry('core', entry.id, this.agentId)
   ```

   **Method 4: `arbitrate(sceneId: string, conflicts: Array<{ actorA: string; actorB: string; claimA: string; claimB: string }>): Promise<ArbitrationOutput>`** (public) — writes canonical outcome to scenario layer:
   ```
   1. exchangeId = crypto.randomUUID()
   2. factContext = this.readAllLayerContext()
   3. Build a prompt describing the conflicting claims and ask the LLM to decide the canonical outcome
   4. Parse and validate with ArbitrationOutputSchema
   5. For each ConflictDecision in output.conflicts: write canonicalOutcome prose to scenario layer
   6. Return output
   ```

   **Method 5: `factCheck(sceneId: string, actorOutputs: Array<{ agentId: string; name: string; entries: DialogueEntry[] }>): Promise<FactCheckOutput>`** (public) — flags contradictions to procedural layer:
   ```
   1. exchangeId = crypto.randomUUID()
   2. coreFacts = blackboard.readLayer('core').entries.map(e => e.content).join('\n')
   3. scenarioFacts = blackboard.readLayer('scenario').entries.map(e => e.content).join('\n')
   4. system = buildDirectorSystemPrompt()
   5. user = buildFactCheckUserPrompt({ sceneId, actorOutputs, coreFacts, scenarioFacts })
   6. rawContent = await llmProvider.generate({ system, user })
   7. parsed = JSON.parse(rawContent)
   8. // FactCheckOutput is an array of contradictions — validate each
   9. For each ContradictionEntry in output.contradictions: write to procedural layer with metadata
   10. Return output
   ```

   **Method 6: `signalSceneStart(sceneId: string): void`** (public) — writes scene_start signal to procedural layer:
   ```
   1. signal: SceneStartSignal = { type: 'scene_start', sceneId, directorId: this.agentId, timestamp: new Date().toISOString() }
   2. blackboard.writeEntry('procedural', this.agentId, { content: JSON.stringify(signal), messageId: sceneId })
   ```

   **Method 7: `signalSceneEnd(params: Omit<SceneEndSignal, 'type' | 'timestamp' | 'directorId'>): void`** (public) — writes scene_end signal to procedural layer:
   ```
   1. signal: SceneEndSignal = { type: 'scene_end', directorId: this.agentId, timestamp: new Date().toISOString(), ...params }
   2. blackboard.writeEntry('procedural', this.agentId, { content: JSON.stringify(signal), messageId: params.sceneId })
   ```

   **Method 8: `getAllowedLayers(): string[]`** (public) — returns the Director's allowed write layers from capability service:
   ```
   Returns this.capabilityService.capabilityMap['Director'] (the layer list from the capability map).
   This is used by the constructor assertion and by tests.
   ```

   **Error helper:**
   ```typescript
   private handleLlmFailure(err: unknown): DirectorGenerationError {
     return new DirectorGenerationError('llm_call', String(err), err);
   }
   ```

3. Verify the build succeeds: `npm run build` should complete without errors.

</action>
<verify>npm run build 2>&1 | tail -5 | grep -v "Starting" | grep -v "Build at" | tail -3</verify>
<done>src/services/director.ts exists with Director class, planBackbone, arbitrate, factCheck, signalSceneStart, signalSceneEnd methods; hard semantic-layer assertion in constructor</done>
</task>

<task>
<name>Export Director from services index</name>
<files>src/services/index.ts</files>
<action>
Update `src/services/index.ts` to export the Director class and DirectorOptions interface.
Specific steps:
1. Add after the existing Actor export:
   ```typescript
   export { Director, type DirectorOptions } from './director.js';
   ```
2. Verify build: `npm run build` should complete without errors.

</action>
<verify>npm run build 2>&1 | tail -5 | grep -v "Starting" | grep -v "Build at" | tail -3</verify>
<done>src/services/index.ts exports Director and DirectorOptions; build succeeds</done>
</task>

<task>
<name>Write Director unit tests</name>
<files>tests/director.test.ts</files>
<action>
Create `tests/director.test.ts` with comprehensive unit tests for the Director class covering all 6 requirements and key error cases.
Specific steps:
1. Create `tests/director.test.ts` using vitest (same pattern as tests/actor.test.ts).

2. Add `MockLlmProvider` class (same as actor.test.ts, or import from a shared test utilities module if available):
   ```typescript
   class MockLlmProvider implements LlmProvider {
     private responses: LlmResponse[];
     private callLog: { system: string; user: string }[] = [];
     constructor(responses: LlmResponse[]) {
       this.responses = responses;
     }
     async generate(prompt: { system: string; user: string }): Promise<LlmResponse> {
       this.callLog.push({ system: prompt.system, user: prompt.user });
       return this.responses.shift() ?? { content: JSON.stringify({ exchangeId: 'fallback', contradictions: [], tokenCount: 0 }) };
     }
     getCallLog() { return this.callLog; }
   }
   ```

3. Create `createMockBlackboard()` helper (same pattern as actor.test.ts but with proper Director capability map):
   - The capability map for Director must NOT include 'semantic' in the allowed layers
   - Add `seedBackbone(facts: string[])` to seed core layer with backbone prose
   - Add `seedActorOutput(agentId: string, name: string, entries: DialogueEntry[])` to seed semantic layer with actor outputs

4. Create `createMockCapabilityService()` helper:
   ```typescript
   function createMockCapabilityService(): CapabilityService {
     return {
       jwtSecret: 'test-secret-key-at-least-32-characters',
       capabilityMap: {
         Actor: ['semantic', 'procedural'],
         Director: ['core', 'scenario', 'procedural'],  // NOTE: no 'semantic' — this is the hard constraint
         Admin: ['core', 'scenario', 'semantic', 'procedural'],
       },
       verify: vi.fn() as CapabilityService['verify'],
       check: vi.fn() as CapabilityService['check'],
     };
   }
   ```

5. Create `createTestDirector()` helper that instantiates Director with all mocks.

6. Write test cases:

   | Test ID | Requirement | What it tests | Expected |
   |---------|-----------|---------------|----------|
   | DIR-01a | DIR-01 | planBackbone() writes backbone prose to core layer | blackboard.writeEntry called with layer 'core' |
   | DIR-01b | DIR-01 | Backbone output includes at least one actor_discretion scene marker | output.scenes has marker with type 'actor_discretion' |
   | DIR-01c | DIR-01 | planBackbone() checks core budget at 75%; prunes before write | Core entries pruned when budget exceeded |
   | DIR-02a | DIR-02 | arbitrate() writes canonical outcome to scenario layer | blackboard.writeEntry called with layer 'scenario' |
   | DIR-02b | DIR-02 | arbitrate() detects conflict from actor-raised flags | Actor outputs with unverifiedFacts: true trigger arbitration |
   | DIR-03a | DIR-03 | Director constructor throws when capability map includes 'semantic' | Error thrown with message about semantic layer |
   | DIR-03b | DIR-03 | getAllowedLayers() returns only core/scenario/procedural | No 'semantic' in returned layers |
   | DIR-04a | DIR-04 | planBackbone() backbone prose contains [ACTOR DISCRETION] marker | backboneProse includes '[ACTOR DISCRETION:' |
   | DIR-04b | DIR-04 | arbitrate() does NOT override actor_discretion beats | Canonical outcome does not contradict actor discretion scene |
   | DIR-05a | DIR-05 | factCheck() flags contradiction against core layer as high severity | ContradictionEntry with severity 'high' written to procedural |
   | DIR-05b | DIR-05 | Three severity levels applied (high/medium/low) | All three severity levels appear in output |
   | DIR-06a | DIR-06 | signalSceneStart() writes to procedural layer | blackboard.writeEntry called with layer 'procedural' and type 'scene_start' |
   | DIR-06b | DIR-06 | signalSceneEnd() writes to procedural layer with status | procedural entry contains scene_end type and status field |
   | DIR-06c | DIR-06 | Scene signals have correct structure (sceneId, directorId, timestamp) | All required fields present |
   | ERR-01 | Error | LLM returns malformed JSON | DirectorGenerationError thrown with phase 'json_parse' |
   | ERR-02 | Error | LLM returns invalid schema | DirectorGenerationError thrown with phase 'validation' |

7. Run tests: `npm run build && npm test`
8. All tests should pass.

</action>
<verify>npm run build && npm test 2>&1 | tail -30</verify>
<done>All Director unit tests pass; 6 requirements covered + error cases; no failures</done>
</task>

## Verification Criteria

After all tasks complete, run:

```bash
npm run build   # TypeScript compiles without errors
npm test        # All tests pass including new director.test.ts
```

**Expected test output:** All Director unit tests pass (DIR-01 through DIR-06 + error cases). Total test count increases from previous phase.

### Goal-Backward Verification (must_haves)

| Phase Success Criterion | How Verified |
|------------------------|---------------|
| 1. Director writes plot backbone with at least one "Actor discretion" scene | DIR-01b + DIR-04a: planBackbone output includes type='actor_discretion' marker; backbone prose contains [ACTOR DISCRETION] |
| 2. Actor introduces plot element in Actor discretion scene; Director does not override it | DIR-04b: arbitrate() does not contradict actor_discretion beats in canonical outcome |
| 3. Director fact-checks scene against core layer; contradiction detected and flagged | DIR-05a: high-severity ContradictionEntry written to procedural layer |
| 4. Director arbitrates conflicting Actor outputs; decision written to scenario layer | DIR-02a: blackboard.writeEntry called with layer 'scenario' for canonical outcome |
| 5. Character name change in plot backbone propagates to Actor dialogue within one scene | DIR-06: scene signals ensure deterministic ordering; factCheck called post-actor-generation to catch propagation errors |
| 6. Director issues scene_start and scene_end signals correctly | DIR-06a/06b/06c: procedural layer entries have correct type, sceneId, directorId, timestamp, status |
