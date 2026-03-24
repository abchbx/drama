# Phase 9: Session Configuration & Agent Dashboard - Validation

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | vite.config.ts |
| Quick run command | `npm run test` |
| Full suite command | `npm run test:ui` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-02 | User can configure session parameters | integration | `npm run test` | ❌ Wave 0 |
| UI-03 | User can select LLM provider | integration | `npm run test` | ❌ Wave 0 |
| UI-07 | User can view agent status dashboard | integration | `npm run test` | ❌ Wave 0 |
| UI-09 | User can view system health status | integration | `npm run test` | ❌ Wave 0 |
| RT-02 | UI updates in real-time when agents connect/disconnect | integration | `npm run test` | ❌ Wave 0 |
| RT-04 | Agent status dashboard updates in real-time with connection changes | integration | `npm run test` | ❌ Wave 0 |
| CFG-03 | User can save and load session templates | integration | `npm run test` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test:ui`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/config.test.ts` — covers UI-02 and UI-03
- [ ] `tests/dashboard.test.ts` — covers UI-07 and UI-09
- [ ] `tests/templates.test.ts` — covers CFG-03
- [ ] `tests/websocket.test.ts` — covers RT-02 and RT-04
