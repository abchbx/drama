# Phase 10: Real-Time Visualization - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Visualization of real-time agent communication, message streams, and memory state for the Multi-Agent Drama System. Users can monitor what agents are saying, how they're communicating, and the four-layer memory state.

This includes:
- Real-time message stream showing all agent communication
- Communication graph visualizing agent interactions
- Four-layer memory state (core, scenario, scene, turn) visualization
- Token budget usage monitoring

Export functionality is in Phase 11. Documentation is in Phase 12.
</domain>

<decisions>
## Implementation Decisions

### Message Stream Display
- Timeline-style display (not chat-style)
- Claude's discretion on metadata (timestamp, sender name, role recommended)
- Claude's discretion on message styling (color by role recommended)
- Claude's discretion on interactions (filtering, search, and expansion prioritized)

### Memory Visualization
- Claude's discretion on four-layer display (tab view recommended for focused inspection)
- Claude's discretion on token budget visualization (progress bars recommended)
- Claude's discretion on content display (text preview with expand recommended)
- Claude's discretion on interactions (layer focus, search, and entry details prioritized)

### Visualization Interactions
- Claude's discretion on main interaction patterns (filtering, zoom/pan, and drill-down prioritized)
- Claude's discretion on search/filtering organization (side panel recommended)
- Claude's discretion on pausing updates (pause button recommended to prevent UI jumping)
- Claude's discretion on export functionality (JSON and image export prioritized)

### Communication Graph
- Claude's discretion on primary visualization (message flow with animated particles recommended)
- Claude's discretion on layout (hierarchical recommended with Director at top)
- Claude's discretion on animations (animated particles or edge pulsing recommended)
- Claude's discretion on graph interactions (node click, edge click, and zoom/pan prioritized)

### Claude's Discretion
- Message stream metadata: what specific fields to show beyond timestamp, sender, role
- Message styling: exact color scheme and visual hierarchy
- Message stream interactions: which filtering/search/expansion features to implement first
- Memory layer display: tabs vs side-by-side vs collapsible
- Memory token visualization: exact design of progress bars
- Memory content: how much to show by default, how to structure the hierarchy
- Memory interactions: specific drill-down details and search capabilities
- Visualization patterns: exact interaction flows and UI structure
- Search/filtering: exact UI placement and design
- Pausing: exact implementation (manual pause vs auto-pause on scroll)
- Export: which formats and data to include
- Communication graph: exact visualization (message flow vs connection strength)
- Graph layout: exact algorithm and positioning
- Graph animations: whether to use particles vs pulsing, performance thresholds
- Graph interactions: what details to show on node/edge clicks
- Overall tab layout and organization
- Performance optimizations (throttling, virtualization, etc.)
- Socket.IO event handling for real-time updates
- Integration with existing Socket.IO infrastructure
- Error states and empty states for all components
- Responsive design for different screen sizes

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **React Flow** (frontend/src/components/dashboard/AgentGraph.tsx): Existing agent graph visualization already implemented with nodes, edges, controls, mini-map
- **socketService** (frontend/src/lib/socket.ts): Socket.IO client already connected, existing event handlers for agent_connected/agent_disconnected/agent_updated
- **Agent type** (frontend/src/lib/types.ts): Type definitions for Agent objects with status, latency, etc.
- **TabNavigation** (frontend/src/components/TabNavigation.tsx): Existing tab system, could add "Visualization" tab
- **App structure** (frontend/src/App.tsx): Sidebar + main content layout pattern established
- **State management**: React hooks + useState/useEffect patterns for Socket.IO listeners

### Established Patterns
- **Socket.IO integration**: Components use useEffect to listen to socket events, clean up on unmount
- **Real-time state**: useState with setters that merge updates (prev => prev.map(a => a.id === id ? {...a, ...data} : a))
- **Component organization**: Feature-based directories (components/dashboard/, components/config/)
- **TypeScript**: Full type safety with .tsx files
- **CSS**: Component-scoped .css files (dashboard.css, etc.)

### Integration Points
- **New tab in App.tsx**: Add "visualization" to activeTab switch and create corresponding tab component
- **Socket.IO events**: Backend needs to emit message events (when agents send messages), memory state events, and communication graph updates
- **Backend routes**: May need API endpoints to fetch historical messages and memory snapshots
- **Builds on Phase 9**: Reuses AgentDashboardTab foundation and AgentGraph component

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches, leveraging existing React Flow and Socket.IO patterns from the codebase.
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.
</deferred>

---

*Phase: 10-real-time-visualization*
*Context gathered: 2026-03-22*
