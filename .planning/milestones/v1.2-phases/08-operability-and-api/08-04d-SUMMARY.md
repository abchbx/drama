---
phase: 08-v1.2-operability-and-api
plan: 04d
subsystem: real-time
tags: [bug-fix, socket-io, test-fix, null-safe]
requires: [UI-01, UI-08, RT-01, CFG-01, CFG-02]
provides: null-safe routerService.io access for session scene endpoints
affects: src/routes/sessions.ts
tech-stack: [TypeScript, Express, Socket.IO]
key-files: src/routes/sessions.ts
decisions: []
metrics:
  duration: 5 minutes
  completed: 2026-03-21T11:45:12Z
  tasks: 1
  commits: 1
  files: 1
---

# Phase 08 Plan 04d: Null-Safe Router Service IO Access Summary

## One-Liner
Fixed session scene endpoints returning 500 errors in tests by adding null-safe checks for `routerService?.io`.

## Summary
Added null-safe `routerService?.io` checks in `/sessions/:id/scene/start` and `/sessions/:id/scene/stop` endpoints to fix test failures while preserving Socket.IO event emission in production when routerService is available.

## Tasks Completed

| Task | Name | Commit | Files Modified |
|------|------|--------|----------------|
| 1    | Add null-safe check for routerService.io in sessions.ts | 45c6122 | src/routes/sessions.ts |

## Verification Results
13 session route tests now pass, including the 4 previously failing tests for scene start/stop endpoints.

## Key Changes
- Changed routerService type annotation from `RouterService` to `RouterService | undefined`
- Added `if (routerService?.io)` null-safe guard before accessing io.emit()
- Updated both scene start and scene stop endpoints with identical null-safe patterns

## Deviations from Plan
None - plan executed exactly as written.
