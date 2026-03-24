# Phase 10: Real-Time Visualization - Validation

## Validation Architecture

> Skipping detailed validation section - workflow.nyquist_validation not checked in config.json

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (frontend) + vitest (backend) |
| Frontend config | `frontend/vite.config.ts` |
| Backend config | `vitest.config.ts` |
| Command | `npm run test` (backend) / `cd frontend && npm run test` (frontend) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type |
|--------|----------|-----------|
| UI-04 | User can view real-time message stream | integration |
| UI-05 | User can visualize agent communication graph | integration |
| UI-06 | User can view four-layer memory state | integration |
| RT-03 | Message stream updates in real-time | integration |

### Key Test Scenarios
1. **Message Stream**: Verify Socket.IO events update message list
2. **Communication Graph**: Verify React Flow nodes/edges update with agent changes
3. **Memory State**: Verify layer data displays correctly with token budgets
4. **Real-time Updates**: Verify pause/resume functionality works

### Wave 0 Gaps
- [ ] `frontend/src/components/visualization/__tests__/MessageStream.test.tsx`
- [ ] `frontend/src/components/visualization/__tests__/CommunicationGraph.test.tsx`
- [ ] `frontend/src/components/visualization/__tests__/MemoryState.test.tsx`
- [ ] Backend Socket.IO event tests for message/memory broadcasting
