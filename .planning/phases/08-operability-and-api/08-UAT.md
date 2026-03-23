---
status: testing
phase: 08-v1.2-operability-and-api
source: [08-01-SUMMARY.md, 08-02-SUMMARY.md, 08-03-SUMMARY.md, 08-04a-SUMMARY.md, 08-04c-SUMMARY.md, 08-04d-SUMMARY.md, 08-04b-PLAN.md]
started: 2026-03-22T08:00:00Z
updated: 2026-03-22T08:00:00Z
---

## Current Test

number: 3
name: Frontend Loads and Connects
expected: |
  Navigate to frontend URL (http://localhost:5173 in dev mode). Frontend loads successfully without console errors. Connection status indicator shows green "Connected" state after initial connection.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running server/service. Clear ephemeral state (temp DBs, caches, lock files). Start the application from scratch with `npm run dev` in the backend directory. Server boots without errors, any seed/migration completes, and a primary query (GET /sessions, health check, or basic API call) returns live data.
result: pass

### 2. Backend REST API Endpoints
expected: Backend exposes REST endpoints for session management: GET /sessions (list all), GET /sessions/:id (get by dramaId), POST /sessions (create), POST /sessions/:id/scene/start, POST /sessions/:id/scene/stop. All endpoints return valid JSON responses and handle errors appropriately.
result: pass

### 2. Backend REST API Endpoints
expected: Backend exposes REST endpoints for session management: GET /sessions (list all), GET /sessions/:id (get by dramaId), POST /sessions (create), POST /sessions/:id/scene/start, POST /sessions/:id/scene/stop. All endpoints return valid JSON responses and handle errors appropriately.
result: pending

### 3. Frontend Loads and Connects
expected: Navigate to frontend URL (http://localhost:5173 in dev mode). Frontend loads successfully without console errors. Connection status indicator shows green "Connected" state after initial connection.
result: pending

### 4. Create Session from UI
expected: Fill session creation form with valid inputs (name 3-50 chars, duration 1-120 min, agent count 2-10). Submit form. Session created successfully, appears in session list sidebar with status badge (e.g., "created" or "idle"), toast notification shows success message.
result: pending

### 5. View Session List and Details
expected: Session list sidebar shows all sessions with name, status badge, and timestamp. Click on a session to select it. Main panel displays session details including dramaId, status, duration, agent count, timestamps, current scene ID, and last result in a clear two-column layout.
result: pending

### 6. Connection Status Indicator
expected: Connection status indicator (top-right) shows socket connection state with color-coded states: green (connected), yellow with pulse (reconnecting), red (disconnected). Hovering over indicator shows tooltip with descriptive message (e.g., "Connected", "Reconnecting...", "Disconnected - attempting reconnect").
result: pending

### 7. Start Scene from UI
expected: With a session selected and socket connected, click "Start Scene" button. Button shows loading state ("Starting..."). Scene starts, session status changes to "running" in both list and details panel. Button becomes disabled. Toast notification shows "Scene started". Socket.IO event 'scene_started' is broadcast.
result: pending

### 8. Stop Scene from UI
expected: With a running session, click "Stop Scene" button. Button shows loading state ("Stopping..."). Scene stops, session status changes to "interrupted" or "completed". Start button becomes enabled. Toast notification shows "Scene stopped". Socket.IO event 'scene_stopped' is broadcast.
result: pending

### 9. Toast Notifications
expected: Toast notifications appear for connection events (e.g., "Connection lost - reconnecting..." warning, "Connection restored" success) and scene actions (e.g., "Scene started" success, "Scene stopped" info). Toasts auto-dismiss after appropriate duration (3s for success/info, 5s for errors) and can be dismissed by clicking X.
result: pending

### 10. Socket.IO Auto-Reconnect
expected: Stop the backend Socket.IO server or cause a network disconnect. Frontend connection status indicator changes to yellow "Reconnecting..." with pulse animation, toast shows "Connection lost - reconnecting...". When backend server restarts, frontend automatically reconnects without manual intervention, status indicator returns to green, toast shows "Connection restored".
result: pending

## Summary

total: 10
passed: 2
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps

[none yet]
