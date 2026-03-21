# Phase 08 Research: Frontend Foundation

**Phase:** 08-v1.2-operability-and-api
**Goal:** User can access a basic web interface that connects to the drama system backend
**Researched:** 2026-03-21
**Status:** Ready for planning

---

## Executive Summary

Phase 8 is not just a frontend scaffolding task. To plan it well, treat it as a thin but reliable control surface over an already-working backend that currently exposes only part of the contract the UI needs.

The existing backend already gives you strong foundations:
- Express app and JSON API wiring already exist
- Socket.IO server and reconnect-aware routing infrastructure already exist
- Session orchestration logic already exists in `src/session.ts`
- Environment-variable-based configuration already exists in `src/config.ts`
- Health endpoint already exists

But there is an important planning reality:

**The backend is not yet exposing a complete browser-facing session-control API for the Phase 8 success criteria.**

Today, the codebase has:
- `POST /session` to create a drama session
- `GET /health`
- Blackboard and agent-auth routes
- Socket.IO infrastructure intended for agents

It does **not yet clearly provide**:
- a session registry for multiple sessions
- a REST endpoint to list sessions
- a REST endpoint to start a scene from browser UI
- a REST endpoint to stop a running scene from browser UI
- a frontend-oriented Socket.IO event contract
- browser-specific environment variables for API URL / reconnection tuning

So the right Phase 8 plan is:
1. establish the frontend app foundation,
2. define a minimal browser-facing integration contract,
3. add only the backend API surface needed for Phase 8 success criteria,
4. keep real-time visualization and advanced monitoring out of scope until Phases 9-10.

---

## Required Requirement Coverage

Phase 8 must fully address:

- **UI-01**: User can create new drama session via interactive web UI
- **UI-08**: User can start and stop drama scenes from UI
- **RT-01**: Frontend automatically reconnects to Socket.IO server on disconnection
- **CFG-01**: User can configure frontend API base URL via environment variables
- **CFG-02**: User can configure Socket.IO connection timeout and reconnection attempts

This means the plan must explicitly include:
- a browser app users can load,
- at least one session-creation form,
- start/stop scene controls,
- a visible connection state indicator,
- Socket.IO reconnect behavior with user feedback,
- frontend env vars for API and Socket.IO settings.

---

## What Already Exists in the Codebase

### 1. Express app foundation exists

The current server already mounts core routes in `/health`, `/blackboard`, and `/blackboard/agents`.

Relevant file: `D:/Coding/ClaudeCode/drama/src/app.ts`

```ts
app.use('/blackboard/audit', auditRouter);
app.use('/blackboard', blackboardRouter);
app.use('/blackboard/agents', agentsRouter);
app.use('/health', healthRouter);
```

Implication for planning:
- You do not need a new server stack for the frontend.
- You can either:
  - run the frontend as a separate Vite dev server during development, or
  - later serve built frontend assets from Express.
- For Phase 8, separate frontend dev server is the fastest path.

### 2. A minimal session creation endpoint already exists

Relevant file: `D:/Coding/ClaudeCode/drama/src/index.ts`

```ts
app.post('/session', async (req, res) => {
  try {
    const session = new DramaSession({
      config: {
        sceneTimeoutMs: config.SCENE_TIMEOUT_MS,
        actorTimeoutMs: config.ACTOR_TIMEOUT_MS,
      },
      blackboard: blackboardService,
      router: routerService,
      memoryManager,
      llmProvider,
      capabilityService,
      logger,
    });
    res.json({ dramaId: session.dramaId, status: 'created' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create session' });
  }
});
```

Implication for planning:
- UI-01 is partially unblocked already.
- However, the endpoint currently returns only `{ dramaId, status }`.
- There is no apparent persistence/registry for sessions after creation.
- There is no browser-facing model for selecting a session and then starting/stopping scenes.

### 3. The actual drama orchestration logic exists

Relevant file: `D:/Coding/ClaudeCode/drama/src/session.ts`

```ts
async runScene(sceneConfig: SceneConfig): Promise<SceneResult> {
  if (!this.isInitialized) {
    throw new Error('DramaSession not initialized. Call initialize() first.');
  }

  this.director.signalSceneStart(sceneConfig.id);
  // actor round-robin work
  await this.director.factCheck(sceneConfig.id, actorOutputs);
  this.director.signalSceneEnd({
    sceneId: sceneConfig.id,
    status: 'completed',
    beats,
    conflicts,
    plotAdvancement: 'Scene completed without major plot advancement',
  });
}
```

Implication for planning:
- The system already knows how to run a scene.
- Phase 8 likely needs lightweight API wrappers around `DramaSession` methods rather than new scene logic.
- The main planning question is not “how to generate scenes,” but “how to safely expose scene lifecycle control to the browser.”

### 4. Socket.IO server infrastructure already exists

Relevant file: `D:/Coding/ClaudeCode/drama/src/services/router.ts`

```ts
this.io = new SocketIOServer(httpServer, {
  cors: { origin: '*' },
});

this.io.on('connection', (socket) => {
  const agentId = this.readHandshakeValue(socket, 'agentId');
  const roleValue = this.readHandshakeValue(socket, 'role');
  const role: AgentRole = roleValue === 'director' ? 'director' : 'actor';

  if (!agentId) {
    socket.disconnect(true);
    return;
  }

  this.registerConnection(socket, agentId, role);
});
```

And reconnect-related internal events already exist:

```ts
this.emit('agent:reconnected', { agentId });
this.emit('agent:connected', { agentId, role, socketId: socket.id });
this.emit('agent:disconnected', { agentId, role, socketId, graceful: false });
this.emit('agent:unavailable', { agentId, reason: 'disconnect' });
```

Implication for planning:
- RT-01 is helped by existing server-side reconnect concepts.
- But the current socket contract is agent-oriented, not frontend-oriented.
- A browser client should not have to pretend to be an actor to receive updates.
- Phase 8 should define a dedicated frontend socket role or monitor channel.

### 5. Health and config patterns already exist

Relevant file: `D:/Coding/ClaudeCode/drama/src/routes/health.ts`

```ts
res.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  snapshotLoaded: snapshotExists,
  services: {
    blackboard: 'connected',
    router: routerService ? 'connected' : 'disconnected',
    capability: 'connected',
    memory: 'connected',
  },
  config: {
    llmProvider: (req.app.locals.config as { LLM_PROVIDER?: string; LOG_LEVEL?: string } | undefined)?.LLM_PROVIDER,
    logLevel: (req.app.locals.config as { LLM_PROVIDER?: string; LOG_LEVEL?: string } | undefined)?.LOG_LEVEL,
  },
});
```

Relevant file: `D:/Coding/ClaudeCode/drama/src/config.ts`

```ts
const RoutingConfigSchema = z.object({
  HEARTBEAT_INTERVAL_MS: z.coerce.number().default(5000),
  ACTOR_TIMEOUT_MS: z.coerce.number().default(30000),
  ACTOR_RETRY_TIMEOUT_MS: z.coerce.number().default(15000),
  SOCKET_GRACE_PERIOD_MS: z.coerce.number().default(10000),
  SCENE_TIMEOUT_MS: z.coerce.number().default(300000),
});
```

Implication for planning:
- The backend already follows a good env-driven configuration model.
- Phase 8 should mirror that pattern on the frontend rather than inventing runtime config complexity.

---

## Key Gap Analysis for Phase 8

These are the most important things to know before planning.

### Gap 1: There is no complete browser-facing session lifecycle API yet

Current state:
- `POST /session` exists
- no obvious `GET /sessions`
- no obvious `POST /session/:id/start`
- no obvious `POST /session/:id/stop`
- no obvious `GET /session/:id`

Why this matters:
- UI-01 and UI-08 cannot be satisfied cleanly with frontend work alone.
- Phase 8 must include a small backend contract extension.

Planning conclusion:
- Treat Phase 8 as a **frontend + minimal API contract phase**, not frontend-only.

### Gap 2: Session ownership/state is not clearly persisted in-process for UI use

The current `POST /session` handler creates a `DramaSession`, returns an ID, and does not visibly store it in a session registry accessible by later requests.

Why this matters:
- The UI cannot start/stop scenes on a session unless the backend can retrieve that session instance by ID.

Planning conclusion:
- Add a lightweight in-memory session manager/registry for v1.2.
- Do not over-engineer persistence in Phase 8.
- A simple map keyed by `dramaId` is enough if scoped carefully.

### Gap 3: Frontend socket needs are different from agent socket needs

Current server handshake expects `agentId` and an actor/director role.

Why this matters:
- The browser UI is an observer/controller, not an actor.
- Forcing browser clients into actor semantics will create confusion and brittle coupling.

Planning conclusion:
- Define a dedicated frontend socket mode, such as `role=monitor` or a separate namespace.
- For Phase 8, keep the socket payload contract small: connection state and scene/session status only.
- Do not pull full message-stream visualization into this phase.

### Gap 4: Start/stop semantics need explicit definition

The requirement says users can start and stop scenes from UI, but the current orchestration code mainly exposes `runScene()` and scene signals through Director.

Why this matters:
- “Start” can mean create-and-run a scene immediately.
- “Stop” can mean interrupt current scene, mark scene as interrupted, or request graceful halt.
- If this is undefined, implementation will drift and tests will be ambiguous.

Planning conclusion:
- Define exact semantics before implementation:
  - **Start scene**: create scene config, invoke session scene execution, mark session state as running.
  - **Stop scene**: request interruption; scene ends with `interrupted` status.
- Phase 8 should support one active scene at a time per session.

### Gap 5: Frontend config variables do not exist yet

Current `.env.example` includes backend-only config.

Relevant file: `D:/Coding/ClaudeCode/drama/.env.example`

```env
PORT=3000
SOCKET_PORT=3001
LOG_LEVEL=info
HEARTBEAT_INTERVAL_MS=5000
ACTOR_TIMEOUT_MS=30000
ACTOR_RETRY_TIMEOUT_MS=15000
SOCKET_GRACE_PERIOD_MS=10000
SCENE_TIMEOUT_MS=300000
```

Why this matters:
- CFG-01 and CFG-02 explicitly require frontend-configurable API URL and Socket.IO reconnect tuning.

Planning conclusion:
- Add frontend env variables, likely Vite-style, for example:
  - `VITE_API_BASE_URL`
  - `VITE_SOCKET_URL`
  - `VITE_SOCKET_RECONNECTION_ATTEMPTS`
  - `VITE_SOCKET_RECONNECTION_DELAY_MS`
  - `VITE_SOCKET_TIMEOUT_MS`
- Keep them client-only and documented.

---

## Recommended Phase 8 Scope

To avoid scope creep, Phase 8 should implement only the minimum browser experience needed to satisfy the success criteria.

### In scope

1. Frontend app bootstrap
   - React + TypeScript + Vite
   - basic folder structure
   - app shell layout

2. Session creation UI
   - form with session name, scene duration, agent count
   - submit to backend
   - show created session in UI

3. Session control UI
   - select active session
   - start scene button
   - stop scene button
   - disabled/loading states

4. Connection management
   - Socket.IO client service
   - reconnect configuration from env vars
   - visible connection indicator
   - toast/inline notifications for disconnect/reconnect

5. Minimal backend additions
   - session registry
   - start scene endpoint
   - stop scene endpoint
   - optional list/get session endpoint(s)
   - minimal status events for frontend

6. Frontend environment config
   - API base URL
   - Socket.IO URL
   - timeout/reconnect settings

### Explicitly out of scope for Phase 8

1. Full agent dashboard
2. Real-time message stream
3. Communication graph
4. Memory-layer visualization
5. Session templates
6. Export functionality
7. Full documentation site
8. Rich multi-page routing unless genuinely needed

This boundary aligns with the roadmap and prevents accidental Phase 9-10 work.

---

## Recommended Technical Approach

## 1. Frontend stack

Based on project research and current codebase patterns, the best fit is:
- **React** for UI
- **TypeScript** for consistency with backend
- **Vite** for fast setup and env var support
- **Zod** for shared validation style
- **socket.io-client** already present in dependencies

This also matches prior research and project decisions in `.planning/STATE.md`.

### Why this fits well
- Same language across stack
- Fastest path to a usable browser app
- Easy env-variable story with Vite
- Easy integration with Socket.IO client already installed

## 2. State management

The project state lists this as an open question, but for Phase 8 the simplest planning choice is:
- start with a **small central store** for app/session/connection state
- Zustand is a good fit, but React Context + reducer is also enough for this phase

Recommendation:
- Use **Zustand** if you want a clean path into Phases 9-10.
- Use **React Context** only if you want to keep Phase 8 dependency count minimal.

Given later dashboard/visualization work, **Zustand is the better planning choice**.

## 3. UI architecture

Use a simple two-panel layout, matching the user context file:
- **left sidebar**: session list + create session form
- **main panel**: selected session details, start/stop controls, connection status

This satisfies the requested “modern and clean” feel without overdesign.

## 4. API design for Phase 8

Recommended minimal API contract:

- `POST /session`
  - create session
- `GET /session` or `GET /sessions`
  - list sessions
- `GET /session/:id`
  - fetch session details/status
- `POST /session/:id/scene/start`
  - start a scene
- `POST /session/:id/scene/stop`
  - stop active scene

Suggested response model:
- session id
- display name
- status: `created | idle | running | stopping | completed | interrupted | failed`
- current scene id
- timestamps
- last scene result summary

Do not expose blackboard internals directly as the main Phase 8 UI contract.

## 5. Socket.IO contract for Phase 8

Keep it intentionally narrow.

Recommended frontend events:
- `frontend:session_state`
- `frontend:scene_started`
- `frontend:scene_stopped`
- `frontend:scene_completed`
- `frontend:error`
- `frontend:connection_state` (optional client-derived only)

Alternatively, map existing internal router events into browser-facing events server-side.

Important planning note:
- Do **not** make the frontend depend on low-level actor routing events yet.
- Use a translation layer so future phases can expand without breaking the UI contract.

---

## Suggested Implementation Slices

A good Phase 8 plan should probably be split into 3-5 execution slices.

### Slice 1: Frontend bootstrap and config

Deliverables:
- Vite React app created
- base layout working
- env var loading implemented
- API client and Socket.IO client wrappers created

Success check:
- browser can load the app
- app can read API/socket config from env

### Slice 2: Backend session registry and REST contract

Deliverables:
- in-memory session registry/service
- create/list/get session endpoints
- typed request/response payloads

Success check:
- frontend can create session and see it in session list

### Slice 3: Scene start/stop control path

Deliverables:
- start scene endpoint
- stop scene endpoint
- session state transitions defined
- basic optimistic UI states

Success check:
- user can start scene from UI
- user can stop scene from UI

### Slice 4: Frontend Socket.IO connection and reconnect UX

Deliverables:
- socket client wrapper
- reconnect config from env
- connection status indicator
- disconnect/reconnect notifications

Success check:
- user sees connected/reconnecting/disconnected states
- client reconnects automatically after interruption

### Slice 5: Hardening and tests

Deliverables:
- unit tests for session API/service
- frontend tests for form and connection states
- integration test for create/start/stop flow

Success check:
- Phase 8 requirements demonstrably covered

---

## Data Model Decisions You Should Make Up Front

These decisions will prevent churn during implementation.

### 1. Session status model

Define a single canonical session status enum for backend and frontend.

Recommended statuses:
- `created`
- `idle`
- `running`
- `stopping`
- `completed`
- `interrupted`
- `failed`

Why this matters:
- The UI needs stable button enable/disable logic.
- Tests need predictable transitions.

### 2. One active scene per session

Adopt this constraint for Phase 8.

Why this matters:
- Prevents concurrency complexity.
- Keeps stop/start semantics easy to reason about.
- Fits the current orchestration maturity.

### 3. Browser as controller/observer, not agent

Make this explicit.

Why this matters:
- Prevents awkward auth/handshake misuse.
- Avoids coupling frontend to agent-specific routing design.

### 4. Minimal session metadata

At minimum, store:
- `dramaId`
- `name`
- `sceneDurationMinutes`
- `agentCount`
- `status`
- `createdAt`
- `updatedAt`
- `activeSceneId`
- optional `lastResult`

Why this matters:
- Enough to build UI-01/UI-08 now
- Enough to extend for Phase 9 later

---

## Risks and Planning Pitfalls

## 1. Scope creep into dashboard/visualization work

This is the biggest planning risk.

Examples of scope creep:
- adding agent cards now
- adding message feed now
- exposing blackboard layer browser now
- building charts now

Why it is harmful:
- Phase 8 becomes fuzzy and slow
- Phase 9 and 10 lose clear purpose

Mitigation:
- enforce a strict acceptance checklist tied only to UI-01, UI-08, RT-01, CFG-01, CFG-02.

## 2. Building frontend against unstable backend assumptions

The context file mentions endpoints like create session, start/stop scene, list sessions, but the codebase does not yet clearly expose them all.

Mitigation:
- write the API contract first
- implement backend support before deep UI work
- use typed API client models rather than ad hoc fetch calls everywhere

## 3. Reconnect without state reconciliation

Automatic reconnect alone is not enough.

If the socket reconnects but local UI state is stale, users will distrust the system.

Mitigation:
- on reconnect, refetch selected session status from REST
- treat REST as truth for current state, socket as change notification channel

This directly addresses the “state desync” pitfall identified in research.

## 4. Undefined stop behavior

If stop means different things in frontend and backend, the phase will stall.

Mitigation:
- document stop semantics in the plan before coding
- likely implement stop as “interrupt current scene and emit final interrupted state”

## 5. Dev-server/CORS confusion

The backend Socket.IO server currently uses permissive CORS:

Relevant file: `D:/Coding/ClaudeCode/drama/src/services/router.ts`

```ts
this.io = new SocketIOServer(httpServer, {
  cors: { origin: '*' },
});
```

This is helpful during development, but frontend planning should still account for:
- Vite dev server origin
- REST API CORS behavior if frontend runs separately
- eventual tightening of allowed origins later

Mitigation:
- explicitly plan dev-mode frontend/backend URL configuration
- consider adding Express CORS middleware if needed during implementation

---

## Testing Strategy Needed for Good Planning

A good Phase 8 plan should include testing from the start.

### Backend tests
- create session endpoint returns session metadata
- list/get session endpoints return expected records
- start scene changes session state to running
- stop scene changes active scene to interrupted/stopped state
- invalid session ID returns 404
- double-start while running returns 409 or validation error

### Frontend tests
- create session form validation and submit behavior
- session list renders created session
- start button enabled only when appropriate
- stop button enabled only when appropriate
- connection indicator changes on socket lifecycle events
- reconnect toast/notification behavior

### Integration tests
- create session from UI
- start scene from UI
- stop scene from UI
- simulate temporary socket disconnect and verify reconnect state

Planning note:
- Since the backend is already heavily tested with Vitest, keep the same test runner where possible.

---

## Recommended Definition of Done for Phase 8

Phase 8 should be considered well-planned only if the execution plan targets all of these outcomes:

1. User can open the frontend in a browser and see a working app shell.
2. User can create a session from a form and see it appear in the UI.
3. User can select a session and start a scene.
4. User can stop a running scene.
5. User can see connection state as connected/reconnecting/disconnected.
6. Socket.IO client reconnects automatically after interruption.
7. On reconnect, frontend refreshes selected session state from REST.
8. API base URL is configurable by frontend env vars.
9. Socket.IO reconnect settings are configurable by frontend env vars.
10. Phase 8 does not include Phase 9-10 visualization/dashboard scope.

---

## Concrete Planning Recommendations

If you are about to write the execution plan for this phase, these are the most important decisions to lock in:

### Recommendation 1
Plan Phase 8 as **frontend foundation plus minimal backend contract work**.

### Recommendation 2
Add a **session registry/service** so sessions can be created once and later controlled by ID.

### Recommendation 3
Define a **browser-facing session API** before building UI components.

### Recommendation 4
Use **React + TypeScript + Vite**, and preferably **Zustand**, because later phases will need richer shared client state.

### Recommendation 5
Treat **REST as source of truth** and **Socket.IO as live-update transport**.

### Recommendation 6
Create a **frontend-specific socket contract** rather than reusing raw actor-routing behavior directly.

### Recommendation 7
Define exact **scene start/stop semantics** in the plan so implementation and tests are unambiguous.

### Recommendation 8
Keep the UI intentionally narrow:
- session creation
- session selection
- start/stop controls
- connection feedback

That is enough for a successful Phase 8.

---

## File-Level Evidence Used for This Research

### Planning files read
- `D:/Coding/ClaudeCode/drama/.planning/STATE.md`
- `D:/Coding/ClaudeCode/drama/.planning/ROADMAP.md`
- `D:/Coding/ClaudeCode/drama/.planning/REQUIREMENTS.md`
- `D:/Coding/ClaudeCode/drama/.planning/phases/08-v1.2-operability-and-api/08-CONTEXT.md`

### Project files inspected
- `D:/Coding/ClaudeCode/drama/src/app.ts`
- `D:/Coding/ClaudeCode/drama/src/index.ts`
- `D:/Coding/ClaudeCode/drama/src/session.ts`
- `D:/Coding/ClaudeCode/drama/src/config.ts`
- `D:/Coding/ClaudeCode/drama/src/routes/health.ts`
- `D:/Coding/ClaudeCode/drama/src/services/router.ts`
- `D:/Coding/ClaudeCode/drama/src/services/director.ts`
- `D:/Coding/ClaudeCode/drama/src/types/routing.ts`
- `D:/Coding/ClaudeCode/drama/package.json`
- `D:/Coding/ClaudeCode/drama/.env.example`

### Notable project-guidance result
- `D:/Coding/ClaudeCode/drama/CLAUDE.md` does not exist.
- `D:/Coding/ClaudeCode/drama/.claude/skills/` and `D:/Coding/ClaudeCode/drama/.agents/skills/` were not present as readable skill directories in the inspected project root.

---

## Bottom Line

To plan Phase 8 well, assume the hardest part is not the React UI itself. The real planning work is defining the smallest stable browser-facing contract over the existing session and routing system.

If you keep the phase focused on:
- frontend bootstrap,
- session creation,
- scene start/stop controls,
- reconnect-aware Socket.IO client behavior,
- frontend env-based config,
- and minimal backend contract additions,

then Phase 8 will set up Phase 9 and Phase 10 cleanly without dragging their scope forward.

That is the correct planning posture for this phase.
