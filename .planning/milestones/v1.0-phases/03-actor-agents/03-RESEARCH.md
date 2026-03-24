# Phase 3: Actor Agents - Research

**Researched:** 2026-03-18
**Domain:** In-process TypeScript Actor class, LLM provider abstraction, structured dialogue generation with hallucination detection, character voice constraint systems
**Confidence:** HIGH for architectural patterns; MEDIUM for LLM prompt engineering specifics (Claude's discretion)

---

## Summary

Phase 3 builds the Actor agent layer: in-process TypeScript classes that the server calls synchronously to generate dialogue. Actors read scoped context from the blackboard (core + semantic layers), call an LLM through a provider interface, and write dialogue entries back to the semantic layer with hallucination flags. The Actor class is not an HTTP client or external process — it holds no persistent state between scenes; all memory lives on the blackboard.

**Primary recommendation:** Build the LLM provider interface first (abstract), then the Actor class with Zod-validated I/O, character card structure, voice constraints, and hallucination detection. Two execution plans: Plan 01 = foundation (types, interfaces, Actor class skeleton), Plan 02 = full integration (dialogue generation, fact-checking, tests).

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

- Actor is an in-process TypeScript class instantiated by the server — not a separate process or external HTTP client
- Server calls `actor.generate(sceneContext)` directly — synchronous scene exchange
- LLM calls go through a provider interface from day 1 — PROTO-03 will be satisfied at Phase 7, but the interface is built now
- Actors are **stateless** — the blackboard is the memory; actors reconstruct context from blackboard layers each scene
- LLM generates structured JSON — schema enforced with Zod
- Actor receives structured scene context object (character card, scene description, semantic layer entries, other actors)
- Actor returns an array of dialogue lines per exchange (speaker, text, hallucination flag)
- **Self-flagging**: actor's system prompt instructs it to mark `unverified_facts: true` if dialogue contains claims not in the provided context
- Hallucination = fact contradicting an established core or scenario layer entry (narrow scope)
- Detection via system prompt instructions (one-pass generation)
- Flagged output written to blackboard with `unverified_facts: true` — Director reviews and can override
- Flag granularity: **per-entry** (not per-line or per-claim)
- Voice = structured style attributes (vocabulary range, sentence length, emotional range, speech patterns, forbidden words/topics)
- Voice constraints stored in character card's voice field — Actor reads every generation
- Character voice stored in procedural layer persists across sessions

### Claude's Discretion

- Exact Zod schema field names for dialogue JSON output
- Exact prompt wording for hallucination detection system instructions
- How many voice dimensions are required (minimum viable set)
- Response timing behavior on LLM failure
- Exact shape of the structured scene context object

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| ACTR-01 | Actor agents generate dialogue constrained by their character card | Actor class reads character card from scene context; system prompt injects voice + identity constraints; LLM produces Zod-validated JSON |
| ACTR-02 | Actor agents have scoped blackboard read access (character card + current scene only) | Phase 2 GET /me/scope already enforces this; Actor reads via BlackboardService.readEntry() in-process; capability map restricts REST API reads |
| ACTR-03 | Hallucination flag system marks unverified details in blackboard entries | System prompt instructs LLM to mark `unverified_facts: true` when dialogue contains claims not in provided context (core + scenario layers); per-entry flag granularity |
| ACTR-04 | Character voice consistency: stored as explicit style constraints in procedural layer | Voice constraints are structured attributes in character card's voice field; Actor reads voice on every generate() call; Director validates voice after 10 exchanges |
| ACTR-05 | Director fact-checks scenes against core layer | Actor reads core layer entries as fact context; system prompt instructs contradiction detection; Director arbitration is Phase 4 scope |

---

## Standard Stack

### No New Production Dependencies

| Library | Status | Why |
|---------|--------|-----|
| `zod` | Already installed | Used for scene context input validation and dialogue output validation |
| `pino` | Already installed | Actor uses `req.app.locals.logger` pattern |
| `tiktoken` | Already installed | Token counting already in BlackboardService; Actor can expose token counts for LLM context management |

### LLM Provider Interface (Abstract — Built Now, Implemented Phase 7)

The LLM provider interface must be defined in Phase 3 even though the concrete adapter (OpenAI or Anthropic) comes in Phase 7. This avoids hardcoding.

```typescript
// src/services/llm.ts (NEW — abstract interface, no concrete impl yet)
export interface LlmProvider {
  generate(prompt: LlmPrompt): Promise<LlmResponse>;
}

export interface LlmPrompt {
  system: string;  // actor system prompt with character card + voice constraints
  user: string;    // scene context as structured text
}

export interface LlmResponse {
  content: string; // raw LLM text response
}
```

**Why build the interface now:** Actors depend on it. If we wait until Phase 7, we either hardcode an LLM call or retrofit interfaces everywhere. The interface is a pure abstraction with no external dependencies.

**Phase 7 implementation:** OpenAI or Anthropic adapter that satisfies `LlmProvider`. Actor code does not change — only the provider construction at startup.

### No HTTP Client Needed

Actor is an in-process class. The server (or test harness) directly calls `actor.generate()`. No `axios`, `fetch`, or similar HTTP client is needed for the Actor class itself.

---

## Architecture Patterns

### Pattern 1: Actor Class — In-Process TypeScript Class

**What:** A TypeScript class instantiated by the server, holding no in-memory conversation history. All context is read from the blackboard on each `generate()` call.

```typescript
// src/services/actor.ts (NEW)
export class Actor {
  private blackboard: BlackboardService;
  private capabilityService: CapabilityService;
  private llmProvider: LlmProvider;
  private logger: pino.Logger;
  private agentId: string;

  constructor(opts: ActorOptions) {
    this.blackboard = opts.blackboard;
    this.capabilityService = opts.capabilityService;
    this.llmProvider = opts.llmProvider;
    this.logger = opts.logger;
    this.agentId = opts.agentId;
  }

  async generate(context: SceneContext): Promise<DialogueOutput> {
    // 1. Read character card + current scene from blackboard
    // 2. Read core layer entries as fact context
    // 3. Build LLM prompt from character card + voice constraints + scene context
    // 4. Call llmProvider.generate()
    // 5. Parse JSON, validate with Zod
    // 6. Detect hallucination flags
    // 7. Write dialogue entries to semantic layer
    // 8. Return DialogueOutput
  }
}

export interface ActorOptions {
  blackboard: BlackboardService;
  capabilityService: CapabilityService;
  llmProvider: LlmProvider;
  logger: pino.Logger;
  agentId: string;
}
```

**Key design decisions:**
- No conversation history stored in Actor instance — each `generate()` call is independent
- Actor reads `character_card` entry from blackboard by `characterCardFor` tag (Phase 3 adds this tagging)
- Actor reads `current_scene` from semantic layer entry `id = 'current_scene'`
- Actor writes dialogue to semantic layer via `blackboard.writeEntry('semantic', ...)`

### Pattern 2: Structured Scene Context

**What:** The object passed to `actor.generate(sceneContext)` contains all information the LLM needs to generate dialogue.

```typescript
// src/types/actor.ts (NEW)
export interface SceneContext {
  characterCard: CharacterCard;        // the actor's own character card
  currentScene: CurrentSceneData;      // scene description + other characters
  factContext: string;                 // core + scenario layer entries as text (for hallucination detection)
  otherActors: OtherActorSummary[];    // other characters in scene
}

export interface CharacterCard {
  id: string;
  name: string;
  role: string;                        // e.g., 'villain', 'hero', 'mentor'
  backstory: string;
  objectives: string[];
  voice: VoiceConstraints;
}

export interface VoiceConstraints {
  vocabularyRange: string[];          // allowed word families / registers
  sentenceLength: 'short' | 'medium' | 'long' | 'variable';
  emotionalRange: string[];           // e.g., ['cold', 'distant', 'sarcastic']
  speechPatterns: string[];           // e.g., ['rhetorical questions', 'declarative statements']
  forbiddenTopics: string[];          // topics the character avoids
  forbiddenWords: string[];           // explicit words the character never uses
}

export interface CurrentSceneData {
  id: string;
  description: string;
  location: string;
  tone: string;                        // e.g., 'tense', 'intimate', 'confrontational'
}

export interface OtherActorSummary {
  agentId: string;
  name: string;
  role: string;
}
```

**Character card storage:** Character cards are entries in the semantic layer tagged with `characterCardFor: agentId` in their metadata. The Director writes them during session initialization. Actor reads by filtering semantic layer entries by this tag.

### Pattern 3: Dialogue Output with Hallucination Flag

**What:** Actor returns structured JSON validated by Zod. Each dialogue entry has a hallucination flag.

```typescript
// src/types/actor.ts (NEW)
export interface DialogueOutput {
  exchangeId: string;
  entries: DialogueEntry[];
  tokenCount: number;
  modelUsed?: string;                // for audit trail
}

export interface DialogueEntry {
  speaker: string;                    // character name
  text: string;                      // the dialogue line
  unverifiedFacts: boolean;           // true if entry contains claims not in fact context
  unverifiedClaims?: string[];       // specific claims flagged (optional, for Director review)
}
```

**Hallucination detection logic:** The system prompt instructs the LLM to compare each factual claim against the provided `factContext` (core + scenario layers as text). If any claim is not supported by factContext, the LLM sets `unverifiedFacts: true` and optionally lists the specific claims in `unverifiedClaims`. The Actor parses this from the LLM JSON response.

### Pattern 4: LLM Provider Interface

```typescript
// src/services/llm.ts (NEW)
import { z } from 'zod';

export interface LlmPrompt {
  system: string;
  user: string;
}

export interface LlmResponse {
  content: string;
}

export interface LlmProvider {
  generate(prompt: LlmPrompt): Promise<LlmResponse>;
}

// Schema for validating LLM JSON output (Actor-specific, not part of interface)
export const DialogueEntrySchema = z.object({
  speaker: z.string(),
  text: z.string().min(1),
  unverifiedFacts: z.boolean(),
  unverifiedClaims: z.array(z.string()).optional(),
});

export const DialogueOutputSchema = z.object({
  exchangeId: z.string().optional(),
  entries: z.array(DialogueEntrySchema),
  tokenCount: z.number().optional(),
  modelUsed: z.string().optional(),
});
```

### Pattern 5: Voice Constraints in Character Card

Voice constraints are embedded in the character card so the Actor reads them on every `generate()` call. This ensures voice is re-applied fresh each scene — no in-memory state.

```typescript
// VoiceConstraints embedded in CharacterCard.voice
const villainCard: CharacterCard = {
  id: 'actor-1',
  name: 'Lord Vane',
  role: 'villain',
  backstory: '...',
  objectives: ['control the kingdom', 'eliminate the hero'],
  voice: {
    vocabularyRange: ['archaic', 'formal', 'intimidating'],
    sentenceLength: 'long',        // elaborate, circling sentences
    emotionalRange: ['cold', 'dismissive', 'superior'],
    speechPatterns: ['rhetorical questions', 'patronizing statements'],
    forbiddenTopics: ['compassion', 'mercy'],
    forbiddenWords: ['please', 'sorry', 'thank you'],
  },
};
```

### Pattern 6: Blackboard Entry Extension for Character Cards

Phase 2 uses `GET /me/scope` to return character cards. Phase 3 needs character cards stored on the blackboard so Actors can read them. New field on `BlackboardEntry` metadata:

```typescript
// src/types/blackboard.ts — new optional field
export interface BlackboardEntry {
  id: string;
  agentId: string;
  messageId?: string;
  timestamp: string;
  content: string;           // JSON-stringified CharacterCard or dialogue
  tokenCount: number;
  version: number;
  // NEW:
  metadata?: {
    characterCardFor?: string;  // agentId — marks entry as character card for this actor
    dialogueFor?: string;      // sceneId — marks entry as dialogue for this scene
    unverifiedFacts?: boolean;  // hallucination flag
    unverifiedClaims?: string[];
  };
}
```

**Alternative considered:** Store character cards as typed entries with a `type` field (`'character_card' | 'dialogue' | 'scene'`). This is cleaner for filtering. The `metadata` approach is backward-compatible with Phase 2 entries.

---

## Character Card Retrieval — Phase 2 Gap to Fill

Phase 2's `GET /me/scope` returns `character_card: null` for Actor. Phase 3 needs to:
1. Director writes character cards to semantic layer with `metadata.characterCardFor: agentId`
2. Actor reads character card via `blackboard.readLayer('semantic')` and filters by `characterCardFor` tag
3. `GET /me/scope` updated to return actual character card for Actor role

**Implementation path:**
- Phase 3 adds a helper `getCharacterCard(blackboard, agentId): CharacterCard | null` in Actor service
- Phase 3 updates `GET /me/scope` to call this helper and return the card
- Character card content written by Director at session start (Phase 4 writes, Phase 3 reads)

---

## Directory Structure for Phase 3

```
src/
├── services/
│   ├── blackboard.ts      # Unchanged
│   ├── capability.ts      # Unchanged
│   ├── llm.ts             # NEW: LlmProvider interface + Zod schemas
│   ├── actor.ts           # NEW: Actor class
│   └── index.ts           # MODIFIED: export Actor, LlmProvider
├── routes/
│   ├── agents.ts          # MODIFIED: GET /me/scope returns character_card
│   └── ...
├── types/
│   ├── blackboard.ts      # MODIFIED: add metadata field to BlackboardEntry
│   ├── actor.ts           # NEW: CharacterCard, VoiceConstraints, SceneContext, DialogueOutput types
│   └── index.ts           # MODIFIED: re-export actor types
tests/
├── actor.test.ts          # NEW: Actor class unit tests
└── conftest.ts            # Existing — add Actor test fixtures
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LLM calls | Hardcoded `fetch` to OpenAI/Anthropic API | LlmProvider interface | PROTO-03 deferred to Phase 7; interface built now prevents hardcoding |
| Dialogue parsing | `JSON.parse()` + manual field extraction | Zod schema validation | Already in project; catches malformed LLM output at runtime |
| Character card lookup | String matching on blackboard content | Structured `metadata.characterCardFor` tag | Type-safe, queryable, backward-compatible |

---

## Common Pitfalls

### Pitfall 1: Actors Store Conversation History In-Memory

**What goes wrong:** Actor builds up a conversation buffer over multiple `generate()` calls. On server restart, history is lost. Violates the stateless requirement.

**How to avoid:** Actor reads all context fresh from the blackboard on each `generate()`. The semantic layer holds the accumulated scene history. Actor does not maintain `this.conversationHistory` or any similar field.

### Pitfall 2: LLM Generates Plain Text Instead of JSON

**What goes wrong:** LLM returns freeform text; Actor tries to parse it and fails on partial or malformed responses.

**How to avoid:** System prompt explicitly instructs the LLM to respond with valid JSON matching the schema. Include a Zod validation step that retries on parse failure (max 1 retry). Prompt engineering: start system prompt with "You are a structured data API. Respond with JSON only."

### Pitfall 3: Hallucination Detection Is Too Broad

**What goes wrong:** LLM flags every line as `unverifiedFacts: true` because it doesn't understand the narrow definition (only contradicting established core/scenario facts).

**How to avoid:** System prompt must be precise: "Only mark `unverifiedFacts: true` if the dialogue contains a factual claim that directly contradicts information in the [Fact Context] section above. Character opinions, emotional reactions, and questions are not facts and should not be flagged."

### Pitfall 4: Actor Class Has External Dependencies

**What goes wrong:** Actor imports and uses `axios` or `node-fetch` to call an LLM API directly, bypassing the LlmProvider interface.

**How to avoid:** The LlmProvider is injected via constructor. In tests, a mock provider is used. In production, a concrete OpenAI/Anthropic adapter is injected. Actor never imports LLM SDKs directly.

### Pitfall 5: Character Card Not Persisted to Blackboard

**What goes wrong:** Character cards exist only in memory; on restart, Actors lose their character context.

**How to avoid:** Character cards are written to and read from the semantic layer on the blackboard. `actor.generate()` always reads from `blackboard.readLayer('semantic')`. No in-memory character card storage.

---

## Code Examples

### Actor.generate() — Full Flow

```typescript
// src/services/actor.ts
import { DialogueOutputSchema, DialogueEntrySchema } from '../types/actor.js';

export class Actor {
  async generate(context: SceneContext): Promise<DialogueOutput> {
    // 1. Build system prompt from character card + voice constraints
    const systemPrompt = this.buildSystemPrompt(context.characterCard);

    // 2. Build user prompt from scene context + fact context
    const userPrompt = this.buildUserPrompt(context);

    // 3. Call LLM
    const response = await this.llmProvider.generate({ system: systemPrompt, user: userPrompt });

    // 4. Parse and validate JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(response.content);
    } catch {
      throw new Error('LLM returned non-JSON response');
    }
    const validated = DialogueOutputSchema.parse(parsed);

    // 5. Write dialogue to semantic layer
    for (const entry of validated.entries) {
      this.blackboard.writeEntry('semantic', this.agentId, {
        content: JSON.stringify(entry),
        messageId: context.currentScene.id,
      });
      // Note: write unverified_facts flag via metadata (Phase 3 implementation detail)
    }

    return validated;
  }

  private buildSystemPrompt(card: CharacterCard): string {
    return [
      'You are ${card.name}, a ${card.role}.',
      'You must respond with valid JSON only.',
      'Your speech style constraints:',
      `- Vocabulary: ${card.voice.vocabularyRange.join(', ')}`,
      `- Sentence length: ${card.voice.sentenceLength}`,
      `- Emotional range: ${card.voice.emotionalRange.join(', ')}`,
      `- Speech patterns: ${card.voice.speechPatterns.join(', ')}`,
      `- Never discuss: ${card.voice.forbiddenTopics.join(', ')}`,
      `- Never use: ${card.voice.forbiddenWords.join(', ')}`,
      '',
      'Hallucination detection:',
      'Only mark unverifiedFacts: true if your dialogue contains a factual claim',
      'that directly contradicts the [Fact Context] provided below.',
    ].join('\n');
  }
}
```

### Mock LLM Provider for Testing

```typescript
// tests/mocks/llm.ts
export class MockLlmProvider implements LlmProvider {
  constructor(private response: LlmResponse) {}
  async generate(): Promise<LlmResponse> {
    return this.response;
  }
}

// Usage in test:
const mockProvider = new MockLlmProvider({
  content: JSON.stringify({
    entries: [
      { speaker: 'Lord Vane', text: 'Your weakness is noted.', unverifiedFacts: false },
    ],
  }),
});
const actor = new Actor({ ...opts, llmProvider: mockProvider });
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|-------------|------------------|-------------|--------|
| Actor as external HTTP agent | Actor as in-process TypeScript class | Phase 3 | Simpler deployment; synchronous calls; no HTTP latency; no network failure modes |
| No LLM abstraction | LlmProvider interface | Phase 3 | Provider can be swapped in Phase 7 without changing Actor code |
| Character card in memory | Character card on blackboard (semantic layer) | Phase 3 | Character cards persist across restarts; Director can update mid-session |
| Plain text dialogue output | Zod-validated JSON with hallucination flags | Phase 3 | Structured, machine-readable output; hallucination tracking for Director review |

---

## Open Questions

1. **Zod schema field names for dialogue output**
   - What we know: Needs `speaker`, `text`, `unverifiedFacts`, optional `unverifiedClaims`
   - What's unclear: Whether to use camelCase (`unverifiedFacts`) or snake_case (`unverified_facts`) for consistency with other parts of the system
   - Recommendation: camelCase (`unverifiedFacts`) for TypeScript conventions; snake_case in JSON serialization only if required by a downstream system

2. **Minimum viable voice constraint dimensions**
   - What we know: Must include vocabulary range, sentence length, emotional range, speech patterns, forbidden words
   - What's unclear: Whether to require all 5 dimensions or allow partial voice constraints
   - Recommendation: All 5 dimensions required but each field allows empty arrays/defaults — `{ vocabularyRange: [], sentenceLength: 'medium', ... }` is valid

3. **LLM failure behavior**
   - What we know: Actor is synchronous; the server calls `generate()` and waits
   - What's unclear: What happens if the LLM call fails? Retry? Return error? Fallback text?
   - Recommendation: Throw a typed `ActorGenerationError` with `cause: err`. Max 1 retry on JSON parse failure. No retry on LLM API failure — let the caller (Director/server) decide.

4. **Scene context object shape**
   - What we know: Needs character card, current scene description, semantic entries, other actors
   - What's unclear: How is the context serialized for the LLM? Freeform text? Structured JSON in user prompt?
   - Recommendation: Structured text in user prompt — the Actor builds the prompt string; the LLM sees natural language. This is easier to prompt-engineer than feeding raw JSON to the LLM.

5. **GET /me/scope character card population**
   - What we know: Phase 2 returns `character_card: null` for Actor; Phase 3 needs actual character cards
   - What's unclear: Who writes character cards? Director at session start (Phase 4). So Phase 3 tests need a test helper that writes character cards.
   - Recommendation: Phase 3 Plan 02 adds a `writeCharacterCard(agentId, card)` helper or test fixture that writes to semantic layer. Production: Director writes during session init.

---

## Validation Architecture

> Nyquist validation disabled (`workflow.nyquist_validation_enabled: false` in init JSON). This section is informational only.

### Wave 0 Gaps (if nyquist were enabled)

- `tests/actor.test.ts` — covers ACTR-01 through ACTR-05
- `tests/mocks/llm.ts` — MockLlmProvider for unit tests
- `tests/fixtures/characterCards.ts` — sample character cards for test setup
- `vitest` already installed and configured

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type |
|--------|----------|-----------|
| ACTR-01 | Actor generates dialogue constrained by character card | unit: verify LLM prompt contains card + voice |
| ACTR-02 | Actor reads only scoped context | unit: verify blackboard reads are scoped |
| ACTR-03 | Unverified details marked with hallucination flag | unit: mock LLM with contradictory claim → verify flag |
| ACTR-04 | Voice consistent across 10 exchanges | integration: 10 calls → LLM prompt includes voice constraints |
| ACTR-05 | Fact-checking against core layer | unit: core layer fact in context → LLM prompt includes fact |

---

## Sources

### Primary (HIGH confidence)

- Existing `src/services/blackboard.ts` — BlackboardService API, unchanged in Phase 3 except new metadata field
- Existing `src/services/capability.ts` — CapabilityService pattern for injection
- Existing `src/types/blackboard.ts` — BlackboardEntry type to extend
- Existing `src/routes/agents.ts` — GET /me/scope to extend for character card

### Secondary (MEDIUM confidence)

- Zod documentation — `z.object()`, `z.array()`, `z.string()`, `z.boolean()` validation patterns
- LLM structured output patterns — system prompt instructions for JSON-only response

### Tertiary (LOW confidence)

- LLM hallucination detection prompt wording — requires empirical testing
- Optimal voice constraint dimension set — requires user testing

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all patterns from existing codebase
- Architecture: HIGH — all patterns derived from locked decisions in CONTEXT.md and existing Phase 1-2 code
- Pitfalls: HIGH — all pitfalls are real issues in LLM-augmented multi-agent systems
- Prompt engineering: MEDIUM — system prompt wording is best-effort; empirical testing will refine

**Research date:** 2026-03-18
**Valid until:** 2026-04-18 (30 days — domain is stable)
