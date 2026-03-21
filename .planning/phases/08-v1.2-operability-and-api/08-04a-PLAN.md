---
phase: 08-v1.2-operability-and-api
plan: 04a
type: execute
wave: 3
depends_on: [08-01, 08-02, 08-03]
files_modified: [frontend/src/components/SceneControls.tsx, frontend/src/components/ConnectionStatus.tsx]
autonomous: true
requirements: [UI-08]

must_haves:
  truths:
    - "User can start scene from UI (button enabled when session idle)"
    - "User can stop scene from UI (button enabled when session running)"
    - "Connection status visible (green/yellow/red indicator)"
  artifacts:
    - path: "frontend/src/components/SceneControls.tsx"
      provides: "Start/Stop scene buttons with state-aware enabling"
      exports: ["SceneControls"]
    - path: "frontend/src/components/ConnectionStatus.tsx"
      provides: "Visual connection status indicator"
      exports: ["ConnectionStatus"]
  key_links:
    - from: "frontend/src/components/SceneControls.tsx"
      to: "apiClient.startScene/stopScene"
      via: "onClick handlers"
      pattern: "onClick.*startScene|stopScene"
---

<objective>
Implement scene controls and connection status indicator

Purpose: Add start/stop scene controls (UI-08) and a visible connection status indicator to complete Phase 8 success criteria. These two components are independent of each other and can be built in parallel.

Output: SceneControls component and ConnectionStatus indicator
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
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create SceneControls component</name>
  <files>frontend/src/components/SceneControls.tsx</files>
  <action>
Build start/stop scene controls with state-aware button enabling.

1. Create frontend/src/components/SceneControls.tsx:
   - Start Scene button: enabled when session status is 'idle' or 'created', disabled when 'running' or 'stopping'
   - Stop Scene button: enabled only when status is 'running', disabled otherwise
   - Loading states during API calls (show spinner, disable both buttons)
   - On start success: update session status to 'running', show toast
   - On stop success: update session status to 'interrupted' or 'completed', show toast
   - On error: show error toast, re-fetch session status

2. Button placement:
   - Prominent position in SessionPanel header
   - Buttons side-by-side with clear visual hierarchy
</action>
  <verify>
    <automated>cd frontend && npm run build</automated>
  </verify>
  <done>SceneControls component with state-aware buttons, builds without errors</done>
</task>

<task type="auto">
  <name>Task 2: Create ConnectionStatus indicator</name>
  <files>frontend/src/components/ConnectionStatus.tsx</files>
  <action>
Build visual connection status indicator.

1. Create frontend/src/components/ConnectionStatus.tsx:
   - Small badge/indicator in corner of app (top-right or bottom-right)
   - Color states:
     - Green: connected (with tooltip "Connected")
     - Yellow: reconnecting (with tooltip "Reconnecting...")
     - Red: disconnected (with tooltip "Disconnected - attempting reconnect")
   - Subscribe to socketService connection state events
   - Subtle pulse animation for reconnecting state
</action>
  <verify>
    <automated>cd frontend && npm run build</automated>
  </verify>
  <done>ConnectionStatus indicator shows correct state, builds without errors</done>
</task>

</tasks>

<verification>
- SceneControls: start/stop buttons work, correct enabled/disabled states
- ConnectionStatus: shows correct color for connected/reconnecting/disconnected
</verification>

<success_criteria>
- UI-08: User can start/stop scenes from UI - DONE (partial)
- Both components build without errors
</success_criteria>

<output>
After completion, create .planning/phases/08-v1.2-operability-and-api/08-04a-SUMMARY.md
</output>
