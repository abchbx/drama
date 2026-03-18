---
name: "03-actor-agents"
wave: 1
depends_on: []
requirements: [ACTR-01, ACTR-02, ACTR-03, ACTR-04, ACTR-05]
files_modified:
  - src/types/blackboard.ts
  - src/types/actor.ts
  - src/services/llm.ts
  - src/services/actor.ts
  - src/services/index.ts
  - src/routes/agents.ts
  - src/app.ts
  - .env.example
new_files:
  - src/types/actor.ts
  - src/services/llm.ts
  - src/services/actor.ts
  - tests/actor.test.ts
autonomous: false
must_haves:
  truths:
    - "Actor class is in-process TypeScript class with generate() method"
    - "Actor reads character card and fact context from blackboard"
    - "Actor writes dialogue entries to semantic layer with hallucination flags"
    - "Actor uses LlmProvider interface (not hardcoded LLM SDK)"
    - "Actor is stateless — no in-memory conversation history"
  artifacts:
    - path: src/types/actor.ts
      provides: CharacterCard, VoiceConstraints, SceneContext, DialogueOutput types
      min_lines: 60
    - path: src/services/llm.ts
      provides: LlmProvider interface, Zod schemas for dialogue validation
      min_lines: 40
    - path: src/services/actor.ts
      provides: Actor class with generate(), fact-checking, hallucination detection
      min_lines: 100
    - path: tests/actor.test.ts
      provides: Actor class unit tests covering all 5 requirements
      min_lines: 100
  key_links:
    - from: src/services/actor.ts
      to: src/services/llm.ts
      via: LlmProvider interface (injected via constructor)
    - from: src/services/actor.ts
      to: src/services/blackboard.ts
      via: BlackboardService injected via constructor
    - from: src/services/actor.ts
      to: src/types/actor.ts
      via: CharacterCard, SceneContext, DialogueOutput types
    - from: tests/actor.test.ts
      to: src/services/llm.ts
      via: MockLlmProvider injected in test
---

# Phase 3 Plan: Actor Agents

## Wave Map

| Wave | Tasks | Parallel? | Blocked by |
|------|-------|-----------|------------|
| 1 | T1 (blackboard types) + T2 (actor types) + T3 (llm interface) | Yes | None |
| 2 | T4 (Actor class) | No | T1, T2, T3 |
| 3 | T5 (agents route update) | No | T4 |
| 4 | T6 (tests) | No | T4, T5 |

**Note:** Wave 1 tasks are all independent. T2 (actor types) defines the data structures; T3 (LlmProvider interface) defines the protocol; neither depends on the other. T4 (Actor class) depends on both T2 and T3.

---

## Tasks

<task>
<files>src/types/blackboard.ts</files>
<action>
Add optional `metadata` field to `BlackboardEntry` and extend `AuditLogEntry` with a new `metadata` field for actor-specific tracking.
Specific steps:
1. After the `entryContentHash` field in `BlackboardEntry`, add:
   ```typescript
   // Actor-specific metadata (optional)
   metadata?: {
     characterCardFor?: string;  // agentId — marks entry as a character card for this actor
     dialogueFor?: string;       // sceneId — marks entry as dialogue for this scene
     unverifiedFacts?: boolean;   // hallucination flag from actor generation
     unverifiedClaims?: string[]; // specific claims flagged as unverified
     voiceConstraints?: boolean;  // true if this entry stores voice constraints in procedural layer
   };
   ```
2. Verify the build succeeds: `npm run build` should complete without errors
</action>
<verify>npm run build 2>&1 | tail -5 | grep -v "Starting" | grep -v "Build at" | tail -3</verify>
<done>BlackboardEntry has optional metadata field with characterCardFor, dialogueFor, unverifiedFacts, unverifiedClaims, voiceConstraints</done>
</task>

<task>
<files>src/types/actor.ts</files>
<action>
Create `src/types/actor.ts` (NEW FILE) with all actor-specific types: CharacterCard, VoiceConstraints, SceneContext, DialogueOutput, and Zod validation schemas.
Specific steps:
1. Create `src/types/actor.ts` with these exports:
   - `VoiceConstraints` interface:
     ```typescript
     export interface VoiceConstraints {
       vocabularyRange: string[];       // e.g., ['archaic', 'formal', 'intimidating']
       sentenceLength: 'short' | 'medium' | 'long' | 'variable';
       emotionalRange: string[];        // e.g., ['cold', 'distant', 'sarcastic']
       speechPatterns: string[];       // e.g., ['rhetorical questions', 'declarative statements']
       forbiddenTopics: string[];       // topics the character never discusses
       forbiddenWords: string[];        // explicit words the character never uses
     }
     ```
   - `CharacterCard` interface:
     ```typescript
     export interface CharacterCard {
       id: string;
       name: string;
       role: string;           // e.g., 'villain', 'hero', 'mentor'
       backstory: string;
       objectives: string[];
       voice: VoiceConstraints;
     }
     ```
   - `OtherActorSummary` interface:
     ```typescript
     export interface OtherActorSummary {
       agentId: string;
       name: string;
       role: string;
     }
     ```
   - `CurrentSceneData` interface:
     ```typescript
     export interface CurrentSceneData {
       id: string;
       description: string;
       location: string;
       tone: string;   // e.g., 'tense', 'intimate', 'confrontational'
     }
     ```
   - `SceneContext` interface:
     ```typescript
     export interface SceneContext {
       characterCard: CharacterCard;
       currentScene: CurrentSceneData;
       factContext: string;   // core + scenario layer entries as text
       otherActors: OtherActorSummary[];
     }
     ```
   - `DialogueEntry` interface:
     ```typescript
     export interface DialogueEntry {
       speaker: string;
       text: string;
       unverifiedFacts: boolean;
       unverifiedClaims?: string[];
     }
     ```
   - `DialogueOutput` interface:
     ```typescript
     export interface DialogueOutput {
       exchangeId: string;
       entries: DialogueEntry[];
       tokenCount: number;
       modelUsed?: string;
     }
     ```
   - Zod schemas for runtime validation:
     ```typescript
     export const VoiceConstraintsSchema = z.object({
       vocabularyRange: z.array(z.string()),
       sentenceLength: z.enum(['short', 'medium', 'long', 'variable']),
       emotionalRange: z.array(z.string()),
       speechPatterns: z.array(z.string()),
       forbiddenTopics: z.array(z.string()),
       forbiddenWords: z.array(z.string()),
     });

     export const CharacterCardSchema = z.object({
       id: z.string(),
       name: z.string(),
       role: z.string(),
       backstory: z.string(),
       objectives: z.array(z.string()),
       voice: VoiceConstraintsSchema,
     });

     export const DialogueEntrySchema = z.object({
       speaker: z.string(),
       text: z.string().min(1),
       unverifiedFacts: z.boolean(),
       unverifiedClaims: z.array(z.string()).optional(),
     });

     export const DialogueOutputSchema = z.object({
       exchangeId: z.string(),
       entries: z.array(DialogueEntrySchema),
       tokenCount: z.number(),
       modelUsed: z.string().optional(),
     });
     ```
   - `ActorGenerationError` class:
     ```typescript
     export class ActorGenerationError extends Error {
       readonly cause: unknown;
       readonly phase: 'llm_call' | 'json_parse' | 'validation' | 'blackboard_write';
       constructor(phase: ActorGenerationError['phase'], message: string, cause?: unknown) {
         super(`Actor generation failed (${phase}): ${message}`);
         this.name = 'ActorGenerationError';
         this.phase = phase;
         this.cause = cause;
       }
     }
     ```
2. Import `z` from `zod` at the top
3. Import `z` in `src/types/index.ts` and re-export all actor types and schemas

</action>
<verify>npm run build 2>&1 | tail -5 | grep -v "Starting" | grep -v "Build at" | tail -3</verify>
<done>src/types/actor.ts exists with all interfaces, Zod schemas, and ActorGenerationError class exported; re-exported from src/types/index.ts</done>
</task>

<task>
<files>src/services/llm.ts</files>
<action>
Create `src/services/llm.ts` (NEW FILE) defining the abstract LLM provider interface. This interface is built now (Phase 3) but the concrete implementation comes in Phase 7. Actor class uses this interface exclusively — no hardcoded LLM SDKs.
Specific steps:
1. Create `src/services/llm.ts`:
   ```typescript
   import { z } from 'zod';

   /**
    * Abstract LLM Provider interface.
    * Concrete implementations (OpenAI, Anthropic, etc.) come in Phase 7.
    * Actor class uses ONLY this interface — no LLM SDK imports in actor.ts.
    */
   export interface LlmProvider {
     generate(prompt: LlmPrompt): Promise<LlmResponse>;
   }

   export interface LlmPrompt {
     system: string;   // system prompt with character card + voice constraints
     user: string;    // scene context as structured text
   }

   export interface LlmResponse {
     content: string;  // raw LLM text (usually JSON string)
   }

   /**
    * Build a system prompt for an Actor from its character card.
    * Extracted here so it can be tested independently of the Actor class.
    */
   export function buildActorSystemPrompt(card: import('../types/actor.js').CharacterCard): string {
     const lines: string[] = [
       `You are ${card.name}, a ${card.role}.`,
       'You must respond with valid JSON only — no prose, no markdown, no explanation.',
       'Your response must match this exact schema:',
       '{"exchangeId": "...", "entries": [{"speaker": "...", "text": "...", "unverifiedFacts": boolean, "unverifiedClaims": ["..."]}]}',
       '',
       'Your speech style constraints:',
       `- Vocabulary range: ${card.voice.vocabularyRange.length > 0 ? card.voice.vocabularyRange.join(', ') : 'neutral'}`,
       `- Sentence length: ${card.voice.sentenceLength}`,
       `- Emotional range: ${card.voice.emotionalRange.join(', ') || 'neutral'}`,
       `- Speech patterns: ${card.voice.speechPatterns.join(', ') || 'standard'}`,
       `- Never discuss: ${card.voice.forbiddenTopics.join(', ') || 'none'}`,
       `- Never use these words: ${card.voice.forbiddenWords.join(', ') || 'none'}`,
       '',
       'Hallucination detection rules:',
       '- Only mark unverifiedFacts: true if your dialogue contains a FACTUAL CLAIM that directly contradicts the [Fact Context] provided in the user message.',
       '- Character opinions, emotional reactions, rhetorical questions, and dramatic statements are NOT facts — do not flag them.',
       '- If you are uncertain whether a claim is factual, do not flag it.',
       '- When unverifiedFacts is true, optionally list specific contradictory claims in unverifiedClaims.',
       '',
       'Respond with JSON only.',
     ];
     return lines.join('\n');
   }

   /**
    * Build a user prompt for an Actor from the scene context.
    */
   export function buildActorUserPrompt(context: import('../types/actor.js').SceneContext): string {
     const lines: string[] = [
       '[Character Identity]',
       `You are ${context.characterCard.name}.`,
       `Your role: ${context.characterCard.role}.`,
       `Your objectives: ${context.characterCard.objectives.join('; ')} or create dramatic tension.`,
       '',
       '[Current Scene]',
       `Scene ID: ${context.currentScene.id}`,
       `Location: ${context.currentScene.location}`,
       `Description: ${context.currentScene.description}`,
       `Tone: ${context.currentScene.tone}`,
     ];

     if (context.otherActors.length > 0) {
       lines.push('', '[Other Characters in Scene]');
       for (const actor of context.otherActors) {
         lines.push(`- ${actor.name} (${actor.role})`);
       }
     }

     if (context.factContext.trim().length > 0) {
       lines.push('', '[Fact Context — these are established facts, do not contradict them]');
       lines.push(context.factContext);
     } else {
       lines.push('', '[Fact Context — no established facts yet in this session]');
     }

     lines.push('', '[Your Task]', 'Generate 1-3 dialogue lines as your character. Respond with JSON only.');

     return lines.join('\n');
   }
   ```
2. Verify build: `npm run build` should complete without errors
</action>
<verify>npm run build 2>&1 | tail -5 | grep -v "Starting" | grep -v "Build at" | tail -3</verify>
<done>src/services/llm.ts exists with LlmProvider interface, buildActorSystemPrompt, buildActorUserPrompt functions</done>
</task>

<task>
<files>src/services/actor.ts</files>
<action>
Create `src/services/actor.ts` (NEW FILE) implementing the Actor class — in-process TypeScript class that the server calls synchronously via `generate()`.
Specific steps:
1. Create `src/services/actor.ts` with these imports:
   - `z` from `zod`
   - `pino` type for logger
   - `BlackboardService` from `./blackboard.js`
   - `CapabilityService` from `./capability.js`
   - `LlmProvider` from `./llm.js`
   - `buildActorSystemPrompt`, `buildActorUserPrompt` from `./llm.js`
   - All types from `../types/actor.js`
   - `CharacterCardSchema`, `DialogueOutputSchema` from `../types/actor.js`
   - `LAYER_NAMES` from `../types/blackboard.js`

2. Define `ActorOptions` interface:
   ```typescript
   export interface ActorOptions {
     blackboard: BlackboardService;
     capabilityService: CapabilityService;
     llmProvider: LlmProvider;
     logger: pino.Logger;
     agentId: string;
   }
   ```

3. Define `Actor` class with:
   - Private fields: `blackboard`, `capabilityService`, `llmProvider`, `logger`, `agentId`
   - Constructor: accepts `ActorOptions`, validates required fields
   - `async generate(context: SceneContext): Promise<DialogueOutput>` method (the main public API)
   - `private getCharacterCard(): CharacterCard | null` — reads semantic layer, finds entry tagged with `metadata?.characterCardFor === this.agentId`, parses JSON content, validates with CharacterCardSchema
   - `private readFactContext(): string` — reads core and scenario layer entries, concatenates as text for the LLM prompt
   - `private writeDialogueEntries(output: DialogueOutput, sceneId: string): void` — writes each dialogue entry to semantic layer via `blackboard.writeEntry()` with metadata: `{ dialogueFor: sceneId, unverifiedFacts: entry.unverifiedFacts, unverifiedClaims: entry.unverifiedClaims }`
   - `private handleLlmFailure(err: unknown): never` — throws `ActorGenerationError` with phase 'llm_call'

4. The `generate()` method flow:
   ```
   1. Generate exchangeId = crypto.randomUUID()
   2. Build system prompt: buildActorSystemPrompt(context.characterCard)
   3. Build user prompt: buildActorUserPrompt(context)
   4. Call llmProvider.generate({ system, user })
   5. Parse JSON response
   6. Validate with DialogueOutputSchema.parse() — throw ActorGenerationError on validation failure
   7. Assign exchangeId to output.exchangeId if not set
   8. Write dialogue entries to semantic layer via writeDialogueEntries()
   9. Return DialogueOutput
   ```

5. The `getCharacterCard()` implementation:
   ```
   1. Call blackboard.readLayer('semantic')
   2. Find entry where entry.metadata?.characterCardFor === this.agentId
   3. Parse entry.content as JSON
   4. Return CharacterCardSchema.parse(parsed) — return null if no entry found
   ```

6. The `readFactContext()` implementation:
   ```
   1. Call blackboard.readLayer('core')
   2. Call blackboard.readLayer('scenario')
   3. Concatenate: "## Core Facts\n" + core.entries.map(e => e.content).join('\n') + "\n## Scenario\n" + scenario.entries.map(e => e.content).join('\n')
   ```

7. The `writeDialogueEntries()` implementation:
   ```
   For each entry in output.entries:
     blackboard.writeEntry('semantic', this.agentId, {
       content: JSON.stringify(entry),
       messageId: sceneId,
     })
   ```
   Note: In Phase 3, metadata is written as part of the content JSON. The `metadata` field on `BlackboardEntry` is available for future use (Phase 5 or later). For Phase 3, store unverifiedFacts as a field in the JSON content string.

8. Export `Actor` and `ActorOptions` from `src/services/index.ts`

9. Export `Actor` from `src/services/index.ts`

</action>
<verify>npm run build 2>&1 | tail -5 | grep -v "Starting" | grep -v "Build at" | tail -3</verify>
<done>src/services/actor.ts exists with Actor class, generate(), getCharacterCard(), readFactContext(), writeDialogueEntries(); exported from src/services/index.ts</done>
</task>

<task>
<files>src/routes/agents.ts</files>
<action>
Update `GET /me/scope` in `src/routes/agents.ts` to return the actual character card for the Actor (not null). Phase 2 returned null because character cards weren't stored yet. Phase 3 adds character card storage to the semantic layer.
Specific steps:
1. In the `GET /me/scope` handler, after getting the `blackboard` from `req.app.locals.blackboard`:
   - For Actor role: instead of returning `character_card: null`, read the semantic layer and find the character card entry tagged with `metadata?.characterCardFor === agent.agentId`
   - If found: parse the content as JSON and return it as `character_card`
   - If not found: return `character_card: null` (session not initialized yet — this is expected before Phase 4 Director writes cards)
   - Keep `current_scene` behavior unchanged from Phase 2
2. Keep the `POST /register` handler unchanged
3. Ensure imports are correct (no new imports needed — BlackboardService is already imported)

</action>
<verify>npm run build 2>&1 | tail -5 | grep -v "Starting" | grep -v "Build at" | tail -3</verify>
<done>GET /me/scope returns character_card (parsed from semantic layer or null); POST /register unchanged</done>
</task>

<task>
<files>tests/actor.test.ts</files>
<action>
Create `tests/actor.test.ts` with comprehensive unit tests for the Actor class covering all 5 requirements and success criteria.
Specific steps:
1. Create `tests/actor.test.ts` using `vitest` (same as existing test files)
2. Add `MockLlmProvider` class in `tests/` directory or inline in the test file:
   ```typescript
   class MockLlmProvider implements LlmProvider {
     constructor(private response: LlmResponse) {}
     async generate(): Promise<LlmResponse> { return this.response; }
   }
   ```
3. Create a `createTestActor()` helper that instantiates an Actor with mock BlackboardService, mock CapabilityService, MockLlmProvider, and a pino test logger

4. Write test cases covering:

   | Test | What it does | Expected |
   |------|-------------|----------|
   | ACTR-01a | generate() with villain character card | LLM prompt contains character name + role + voice constraints |
   | ACTR-01b | generate() with hero character card | LLM prompt contains different voice constraints from villain |
   | ACTR-02 | verify blackboard reads are scoped | Actor reads semantic + core + scenario layers only |
   | ACTR-03a | LLM returns claim contradicting fact context | unverifiedFacts: true in output |
   | ACTR-03b | LLM returns no contradictory claims | unverifiedFacts: false in output |
   | ACTR-04 | 10 consecutive generate() calls | All 10 calls include voice constraints in LLM prompt |
   | ACTR-05 | Fact context includes core layer facts | Core layer entries appear in user prompt |
   | ERROR-01 | LLM returns malformed JSON | ActorGenerationError thrown with phase: 'json_parse' |
   | ERROR-02 | LLM returns invalid schema | ActorGenerationError thrown with phase: 'validation' |

5. For mock BlackboardService: use a simple object that tracks readLayer/readEntry calls and returns configurable data
6. For mock CapabilityService: return mock data for any role check
7. Use `beforeEach` to reset mock state, `afterEach` to clean up
8. Run tests: `npm run build && npm test`

</action>
<verify>npm run build && npm test 2>&1 | tail -20</verify>
<done>All Actor class unit tests pass; MockLlmProvider tested; error cases covered</done>
</task>

## Verification Criteria

After all tasks complete, run:

```bash
npm run build   # TypeScript compiles without errors
npm test        # All tests pass including new actor.test.ts
```

**Expected test output:** All Actor unit tests pass (ACTR-01 through ACTR-05 + error cases).

### Goal-Backward Verification (must_haves)

| Phase Success Criterion | How Verified |
|------------------------|---------------|
| 1. Two Actor agents with different character cards generate distinct dialogue | ACTR-01a/ACTR-01b tests: villain vs hero prompts contain different voice constraints |
| 2. Actor dialogue does not contradict established core layer facts | ACTR-05 test: fact context from core layer appears in LLM user prompt |
| 3. Unverified details marked with hallucination flag | ACTR-03a/ACTR-03b tests: unverifiedFacts flag correctly set based on LLM output |
| 4. After 10 scene exchanges, character voice remains consistent | ACTR-04 test: voice constraints included in prompt on all 10 calls |
| 5. Actors respect scoped read access | ACTR-02 test: Actor reads only semantic + core + scenario layers |
