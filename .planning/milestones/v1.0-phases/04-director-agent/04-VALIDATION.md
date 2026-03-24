# Phase 4: Director Agent - Validation

## Validation Architecture

> Note: `workflow.nyquist_validation` was not found in `.planning/config.json` — the key is absent, treated as `false`. Validation Architecture section is included for completeness; it should be activated when `nyquist_validation` is set to `true`.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 2.x |
| Config file | `vitest.config.ts` (if present) or `package.json` vitest section |
| Quick run command | `npm test -- --run tests/director.test.ts` |
| Full suite command | `npm test -- --run` |
| Per-wave command | `npm test -- --run --reporter=dot` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DIR-01 | Director writes plot backbone prose to core layer | unit | `npm test -- --run tests/director.test.ts -t "writes.*backbone.*core"` | Wave 0 needed |
| DIR-01 | Backbone includes at least one `[ACTOR DISCRETION]` marker | unit | `npm test -- --run tests/director.test.ts -t "ACTOR DISCRETION"` | Wave 0 needed |
| DIR-01 | Director monitors core token budget; prunes at 75% | unit | `npm test -- --run tests/director.test.ts -t "core.*budget\|prune"` | Wave 0 needed |
| DIR-02 | Director detects Actor-raised conflict flag | unit | `npm test -- --run tests/director.test.ts -t "conflict.*flag"` | Wave 0 needed |
| DIR-02 | Director arbitration decision written to scenario layer | unit | `npm test -- --run tests/director.test.ts -t "arbitrat.*scenario"` | Wave 0 needed |
| DIR-03 | Director semantic layer write raises BoundaryViolationError | unit | `npm test -- --run tests/director.test.ts -t "semantic.*violation"` | Wave 0 needed |
| DIR-03 | Director capability constructor asserts semantic denied | unit | `npm test -- --run tests/director.test.ts -t "constructor.*semantic"` | Wave 0 needed |
| DIR-04 | Actor discretion scene present in backbone | unit | `npm test -- --run tests/director.test.ts -t "ACTOR DISCRETION"` | Wave 0 needed |
| DIR-04 | Director does not override Actor discretion beat in arbitration | unit/integration | `npm test -- --run tests/director.test.ts -t "override.*discretion"` | Wave 0 needed |
| DIR-05 | Director fact-checks scene against core; contradiction flagged | unit | `npm test -- --run tests/director.test.ts -t "fact.*check\|contradiction"` | Wave 0 needed |
| DIR-05 | Three severity levels applied (high/medium/low) | unit | `npm test -- --run tests/director.test.ts -t "severity"` | Wave 0 needed |
| DIR-06 | Name change in backbone propagates to Actor dialogue within one scene | integration | `npm test -- --run tests/director.test.ts -t "name.*change\|propagate"` | Wave 0 needed |
| DIR-06 | scene_start and scene_end signals written to procedural layer | unit | `npm test -- --run tests/director.test.ts -t "scene_start\|scene_end"` | Wave 0 needed |

### Wave 0 Gaps
- [ ] `tests/director.test.ts` — covers DIR-01 through DIR-06 with mocked LlmProvider
- [ ] `tests/director.integration.test.ts` — end-to-end Director + Actor flow (if nyquist_validation enabled)
- [ ] `tests/conftest.ts` — shared Director test fixtures (mockDirector, mockBlackboard, mockLlmProvider)
- [ ] `src/types/director.ts` — DirectorOutput schemas, DirectorGenerationError, scene signal schemas
- [ ] `src/services/llm.ts` — add buildDirectorSystemPrompt, buildDirectorUserPrompt, buildFactCheckUserPrompt
