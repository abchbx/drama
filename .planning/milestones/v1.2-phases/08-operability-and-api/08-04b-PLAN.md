---
phase: 08-v1.2-operability-and-api
plan: 04b
type: execute
wave: 4
depends_on: [08-04a]
files_modified: [frontend/src/components/Toast.tsx, frontend/src/lib/toast.ts, frontend/src/lib/socket.ts, frontend/src/store/appStore.ts, frontend/src/App.tsx]
autonomous: false
requirements: [UI-08, RT-01]

must_haves:
  truths:
    - "Toast shows when connection drops and restores"
    - "Socket reconnects automatically after disconnect"
    - "Scene state changes reflected in UI via Socket.IO events"
  artifacts:
    - path: "frontend/src/components/Toast.tsx"
      provides: "Toast notification component for connection events"
      exports: ["Toast", "useToast"]
  key_links:
    - from: "frontend/src/lib/socket.ts"
      to: "frontend events"
      via: "socket.on for scene_*, connection_state"
      pattern: "socket\\.(on|emit)"
---

<objective>
Implement toast notifications and wire Socket.IO events to UI state

Purpose: Add toast notifications for connection events (RT-01) and wire Socket.IO events to drive UI state updates. This completes the Phase 8 reconnection feedback and real-time update requirements.

Output: Toast notification system, Socket.IO event wiring, human verification checkpoint
</objective>

<execution_context>
@C:/Users/Administrator/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/Administrator/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/08-v1.2-operability-and-api/08-CONTEXT.md
@.planning/phases/08-v1.2-operability-and-api/08-RESEARCH.md

# Frontend foundation
@frontend/src/lib/api.ts
@frontend/src/lib/socket.ts
@frontend/src/store/appStore.ts
@frontend/src/App.tsx
@frontend/src/components/SceneControls.tsx
@frontend/src/components/ConnectionStatus.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create Toast notification component</name>
  <files>frontend/src/components/Toast.tsx, frontend/src/lib/toast.ts</files>
  <action>
Build toast notification system for connection and action feedback.

1. Create frontend/src/lib/toast.ts:
   - Simple toast service with show(message, type, duration) method
   - Types: 'info', 'success', 'warning', 'error'
   - Subscribe function for components to receive toast events

2. Create frontend/src/components/Toast.tsx:
   - Toast container fixed position (top-center or bottom-center)
   - Toast items with color-coded borders/backgrounds
   - Auto-dismiss after duration (default 3s for info/success, 5s for errors)
   - Dismissible by clicking X
   - Toast messages:
     - "Connection lost - reconnecting..." (warning)
     - "Connection restored" (success)
     - "Scene started" (success)
     - "Scene stopped" (info)
     - API errors (error)
</action>
  <verify>
    <automated>cd frontend && npm run build</automated>
  </verify>
  <done>Toast notification system working, builds without errors</done>
</task>

<task type="auto">
  <name>Task 2: Wire Socket.IO events to UI state</name>
  <files>frontend/src/lib/socket.ts, frontend/src/store/appStore.ts, frontend/src/App.tsx</files>
  <action>
Connect Socket.IO events to UI state updates and toast notifications.

1. Update frontend/src/lib/socket.ts:
   - Listen for frontend events: session_state, scene_started, scene_stopped, scene_completed
   - Emit events to subscribers via callback registration

2. Update frontend/src/store/appStore.ts:
   - Subscribe to socket events on initialization
   - On scene_started: update session status to 'running'
   - On scene_stopped: update session status to 'interrupted' or 'completed'
   - On connection_state_change: update connection status, trigger toast

3. Update frontend/src/App.tsx:
   - Initialize socket connection on mount
   - Handle reconnect automatically (built into socket.io-client)
   - On reconnect, refetch selected session from REST API (state reconciliation)
</action>
  <verify>
    <automated>cd frontend && npm run build</automated>
  </verify>
  <done>Socket events wired to UI, state updates on scene changes, builds without errors</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Checkpoint: Verify Phase 8 complete</name>
  <what-built>
Complete Phase 8 frontend with:
- Session creation UI (UI-01)
- Scene start/stop controls (UI-08)
- Automatic Socket.IO reconnection (RT-01)
- Environment-configurable API URL and Socket settings (CFG-01, CFG-02)
  </what-built>
  <how-to-verify>
1. Start backend: npm run dev
2. Start frontend: cd frontend && npm run dev
3. Visit http://localhost:5173 (or Vite dev server URL)
4. Create a session: Fill form, submit, verify session appears in list
5. Select session: Click session in list, verify details panel shows
6. Start scene: Click "Start Scene", verify status changes to "running", toast shows
7. Stop scene: Click "Stop Scene", verify status changes, toast shows
8. Test reconnect: Stop backend Socket.IO server, verify status shows "reconnecting" with yellow indicator and toast
9. Restart backend: Verify status returns to "connected" (green), toast shows "Connection restored"
10. Verify env config: Check frontend/.env has VITE_API_BASE_URL and VITE_SOCKET_* settings
  </how-to-verify>
  <resume-signal>Type "approved" if all checks pass, or describe any issues found</resume-signal>
</task>

</tasks>

<verification>
- Toast notifications: show on connection events and scene actions
- Socket.IO: auto-reconnects after disconnect, state reconciled via REST refetch
- All Phase 8 requirements addressed: UI-01, UI-08, RT-01, CFG-01, CFG-02
</verification>

<success_criteria>
- UI-01: User can create drama session via web UI - DONE
- UI-08: User can start/stop scenes from UI - DONE
- RT-01: Frontend auto-reconnects on disconnect - DONE
- CFG-01: API base URL configurable via env - DONE
- CFG-02: Socket reconnect settings configurable - DONE
- Human verification checkpoint passed
</success_criteria>

<output>
After completion, create .planning/phases/08-v1.2-operability-and-api/08-04b-SUMMARY.md
</output>
