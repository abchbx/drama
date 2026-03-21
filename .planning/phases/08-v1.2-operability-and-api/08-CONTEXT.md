# Phase 08: Frontend Foundation - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Provide a basic web interface that connects to the drama system backend. Users can create new drama sessions, start and stop scenes, and the frontend automatically handles Socket.IO reconnection. API base URL and Socket.IO settings are configurable via environment variables.
</domain>

<decisions>
## Implementation Decisions

### Frontend stack
- **Claude's Discretion**: Frontend framework, build tool, and TypeScript setup (React + TypeScript + Vite recommended for speed and simplicity)

### UI components/styling
- **Claude's Discretion**: UI component library and styling approach (shadcn/ui + Tailwind CSS recommended for consistency and modern design)

### Session management UI
- Two-panel layout: Left sidebar with session list, main panel with selected session controls
- Create session form includes: Session name, scene duration (minutes), agent count

### Connection feedback
- Both subtle status indicator and toast notifications
- Status indicator (corner): Green for connected, yellow for reconnecting, red for disconnected
- Toasts: Show when connection drops and when it's restored

### Claude's Discretion
- Exact visual design of components
- Routing approach (e.g., React Router vs Vue Router)
- Form validation details
- Exact Socket.IO reconnection configuration parameters
</decisions>

<specifics>
## Specific Ideas

- "I want it to feel modern and clean"
- "The UI should be intuitive for users unfamiliar with the system"
- "Reconnection feedback should be noticeable but not disruptive"
</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- Socket.IO client library (socket.io-client 4.8.3) — available via npm dependencies
- Zod schema validation — can be reused for frontend form validation

### Established Patterns
- Backend API is RESTful with Socket.IO for real-time communication
- Environment variables used for configuration (see .env.example)
- TypeScript for type safety

### Integration Points
- API endpoints (from src/routes/): Create session, start/stop scene, list sessions
- Socket.IO events (from src/services/socketio.ts): Session updates, scene status changes

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope
</deferred>

---

*Phase: 08-v1.2-operability-and-api*
*Context gathered: 2026-03-21*