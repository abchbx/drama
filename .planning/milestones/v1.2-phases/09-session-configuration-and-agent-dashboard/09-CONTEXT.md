# Phase 09: Session Configuration & Agent Dashboard - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

User can configure session parameters (LLM provider, scene settings) and monitor agent status in real-time. Configuration UI replaces the right panel when its tab is selected. Templates allow quick session setup.

- **Requires**: Phase 8 Frontend Foundation (React + Vite + Zustand + Socket.IO)
- **Scope guardrail**: No changes to core backend services (blackboard, routing, memory) — frontend-only feature additions

</domain>

<decisions>
## Implementation Decisions

### Configuration UI Layout
- **Tab structure**: 5 tabs in sidebar: Sessions, LLM Config, Session Params, Dashboard, Templates
- **Right panel behavior**: Each tab replaces the right panel with its own content:
  - Sessions tab → existing SessionPanel
  - LLM Config tab → LLM provider and model selector/display
  - Session Params tab → expandable session configuration form
  - Dashboard tab → agent status and system health
  - Templates tab → template management
- **Session params detail level**: Dynamic expandable form (simple by default, advanced section expandable)

### LLM Provider Workflow
- **Storage location**: API keys stored server-side in .env file (admin-configured only)
- **Selection mode**: Global configuration (single provider for all sessions) in LLM Config tab
- **Mock provider**: Include mock provider for testing without API key
- **Error handling**: Fallback to mock provider silently if API key missing or invalid

### Agent Dashboard Design
- **Display format**: Visual graph showing agents and communication patterns
- **Configurable view**: Toggle between simple (name, role, status) and detailed (latency, message count, token usage) views
- **Real-time updates**: Manual refresh button
- **System health**: Comprehensive dashboard including:
  - Socket.IO connection status
  - API health check (/health endpoint)
  - Server resource utilization (CPU/memory metrics endpoint needed)

### Session Templates
- **Storage**: Hybrid approach — user's local templates (LocalStorage) + shared global templates (server-side)
- **Included parameters**: Full config (location, description, tone, agents, LLM settings, memory settings)
- **Management**:
  - Save from existing session ("Save as template")
  - Create from scratch in Templates tab
  - Quick apply button to use template for new session
- **Import/Export**: Support importing/exporting templates between app instances

### Claude's Discretion
- Exact visual graph library (D3.js, ReactFlow, etc.)
- Detailed advanced session configuration options
- Template import/export file format (JSON/YAML default)
- Resource utilization metrics endpoint implementation
- Real-time update throttling mechanism for future improvements

</decisions>

<specifics>
## Specific Ideas

- Templates should feel like "blueprints" for sessions — one-click apply
- Agent graph should be interactive (hover for details, click to focus)
- Configuration panels should have clear visual hierarchy (section headers, field grouping)
- System health status should use color-coding: green (ok), yellow (warning), red (error)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Zustand store**: useAppStore can be extended with config and template state
- **Form validation**: Reuse CreateSessionForm validation pattern
- **Socket.IO connection**: socketService for real-time updates from backend
- **API client**: apiClient can be extended with /health, template endpoints
- **SessionPanel**: Can be reused as base for other right-panel components

### Established Patterns
- **State management**: Zustand with async actions
- **Real-time communication**: Socket.IO event listeners with toast notifications
- **Form handling**: Controlled components with client-side validation
- **UI styling**: CSS modules or utility classes (existing app uses CSS classes)

### Integration Points
- `/health` backend endpoint for system status
- `/templates` backend endpoints for shared templates (POST for save, GET for list)
- Socket.IO events from heartbeat service for agent status updates
- `/sessions` endpoints for session creation with template IDs

</code_context>

<deferred>
## Deferred Ideas

- Per-session LLM provider override — Phase 10 or later
- Template sharing between users — Phase 10 or later
- Advanced graph visualization (3D, force-directed) — Phase 10 or later
- API key management UI for admins — separate admin interface phase

</deferred>

---

*Phase: 09-session-configuration-and-agent-dashboard*
*Context gathered: 2026-03-21*
