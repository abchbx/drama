# Phase 2: Cognitive Boundary Control - Validation

## Validation Architecture

### Wave 0 Gaps

- `tests/boundary.test.ts` — covers BOUND-01 through BOUND-04
- `tests/conftest.ts` — shared fixtures (existing `createTestApp` helper in `blackboard.test.ts` can be extracted)
- `vitest` already installed and configured

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| BOUND-01 | Actor write to core layer: rejected with CAPABILITY_CLOSED + 403 | unit/integration | `vitest run tests/boundary.test.ts` |
| BOUND-02 | Actor read of full blackboard: returns only character_card + current_scene | unit/integration | `vitest run tests/boundary.test.ts` |
| BOUND-03 | Actor read of core/scenario: returns 403 with NAMESPACE_VIOLATION | unit/integration | `vitest run tests/boundary.test.ts` |
| BOUND-04 | Boundary enforcement is hard (API rejects before agent reasoning) | smoke | `vitest run tests/boundary.test.ts` |

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest |
| Config | `vitest.config.ts` |
| Command | `npm test -- --run tests/boundary.test.ts` |

### Sampling Rate
- Per task commit: `npm test -- --run`
- Phase gate: Full boundary test suite green
