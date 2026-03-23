# Phase 3: Actor Agents - Validation

## Validation Architecture

### Wave 0 Gaps

- `tests/actor.test.ts` — covers ACTR-01 through ACTR-05
- `tests/mocks/llm.ts` — MockLlmProvider for unit tests
- `tests/fixtures/characterCards.ts` — sample character cards for test setup
- `vitest` already installed and configured

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type |
|--------|----------|-----------|
| ACTR-01 | Actor generates dialogue constrained by character card | unit: verify LLM prompt contains card + voice |
| ACTR-02 | Actor reads only scoped context | unit: verify blackboard reads are scoped |
| ACTR-03 | Unverified details marked with hallucination flag | unit: mock LLM with contradictory claim → verify flag |
| ACTR-04 | Voice consistent across 10 exchanges | integration: 10 calls → LLM prompt includes voice constraints |
| ACTR-05 | Fact-checking against core layer | unit: core layer fact in context → LLM prompt includes fact |

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 2.x |
| Config | `vitest.config.ts` |
| Command | `npm test -- --run tests/actor.test.ts` |

### Sampling Rate
- Per task commit: `npm test -- --run`
- Per wave merge: `npm test -- --run --reporter=dot`
- Phase gate: Full suite green before `/gsd:verify-work`
