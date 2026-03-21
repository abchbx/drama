---
phase: 08-v1.2-operability-and-api
plan: 04d
type: execute
wave: 1
depends_on: []
files_modified:
  - src/routes/sessions.ts
autonomous: true
gap_closure: true
requirements:
  - UI-01
  - UI-08
  - RT-01
  - CFG-01
  - CFG-02

must_haves:
  truths:
    - "Backend session scene endpoints return 200 (not 500) in test environment"
    - "Socket.IO events still emit correctly in production when routerService exists"
  artifacts:
    - path: "src/routes/sessions.ts"
      provides: "REST endpoints for session scene control"
      contains: "null-safe routerService?.io check"
  key_links:
    - from: "src/routes/sessions.ts"
      to: "src/services/router.ts"
      via: "routerService.io.emit"
      pattern: "routerService\\?\\.io"
---

<objective>
Close the verification gap where session scene endpoints return 500 errors in tests due to accessing routerService.io without null check.

Purpose: Fix test failures while preserving Socket.IO event emission in production
Output: Fixed sessions.ts with null-safe routerService.io access
</objective>

<tasks>

<task type="auto">
  <name>Task: Add null-safe check for routerService.io in sessions.ts</name>
  <files>src/routes/sessions.ts</files>
  <action>
    In src/routes/sessions.ts, update lines 96-100 (scene/start endpoint) and lines 141-146 (scene/stop endpoint) to add null-safe check before accessing routerService.io.

    Current code (lines 96-100):
    ```typescript
    const routerService = (req.app.locals as any).routerService as RouterService;
    const io = routerService.io;
    const sceneId = session.activeSceneId;
    io.emit('scene_started', { dramaId, sceneId, status: session.status });
    io.emit('session_state', { dramaId, status: session.status, activeSceneId: sceneId });
    ```

    Replace with:
    ```typescript
    const routerService = (req.app.locals as any).routerService as RouterService | undefined;
    if (routerService?.io) {
      const sceneId = session.activeSceneId;
      routerService.io.emit('scene_started', { dramaId, sceneId, status: session.status });
      routerService.io.emit('session_state', { dramaId, status: session.status, activeSceneId: sceneId });
    }
    ```

    Current code (lines 141-146):
    ```typescript
    const routerService = (req.app.locals as any).routerService as RouterService;
    const io = routerService.io;
    const finishedSceneId = session.lastResult?.sceneId;
    const finalStatus = session.status;
    io.emit('scene_stopped', { dramaId, sceneId: finishedSceneId, status: status });
    io.emit('session_state', { dramaId, status: finalStatus, activeSceneId: null });
    ```

    Replace with:
    ```typescript
    const routerService = (req.app.locals as any).routerService as RouterService | undefined;
    if (routerService?.io) {
      const finishedSceneId = session.lastResult?.sceneId;
      const finalStatus = session.status;
      routerService.io.emit('scene_stopped', { dramaId, sceneId: finishedSceneId, status: status });
      routerService.io.emit('session_state', { dramaId, status: finalStatus, activeSceneId: null });
    }
    ```

    This preserves the Socket.IO event emission when running in production (where routerService exists), while making the code resilient to missing routerService in test environments.
  </action>
  <verify>
    <automated>npm test -- tests/routes/sessions.test.ts</automated>
  </verify>
  <done>
    All 4 previously failing tests now pass (scene start 2 tests, scene stop 2 tests)
    Socket.IO events still emit in production when routerService is available
  </done>
</task>

</tasks>

<verification>
Run the sessions route tests to verify all 13 tests pass (was 9 passed, 4 failed)
</verification>

<success_criteria>
- All session route tests pass (no 500 errors)
- Backend scene start/stop endpoints work correctly in production with routerService
</success_criteria>

<output>
After completion, create `.planning/phases/08-v1.2-operability-and-api/08-04d-SUMMARY.md`
</output>
