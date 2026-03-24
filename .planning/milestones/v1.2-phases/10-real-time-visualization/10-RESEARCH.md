# Phase 10: Real-Time Visualization - Research

**Researched:** 2026-03-22
**Domain:** Real-time data visualization with React, Socket.IO, and React Flow
**Confidence:** HIGH

## Summary

This research focuses on implementing real-time visualization for the Multi-Agent Drama System. The phase requires three main components: a real-time message stream (UI-04), an agent communication graph (UI-05), and a four-layer memory state visualization with token budget monitoring (UI-06). The system already has a solid foundation with React Flow for graph visualization, Socket.IO for real-time communication, and established TypeScript patterns throughout the codebase.

The implementation will extend the existing AgentDashboardTab pattern, add new Socket.IO event handlers for messages and memory state, and create reusable visualization components that follow the project's established coding conventions.

**Primary recommendation:** Leverage existing React Flow and Socket.IO patterns, add new backend Socket.IO events for messages and memory updates, and create a new VisualizationTab component with sub-components for message stream, communication graph, and memory state.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Message Stream Display
- Timeline-style display (not chat-style)
- Claude's discretion on metadata (timestamp, sender name, role recommended)
- Claude's discretion on message styling (color by role recommended)
- Claude's discretion on interactions (filtering, search, and expansion prioritized)

#### Memory Visualization
- Claude's discretion on four-layer display (tab view recommended for focused inspection)
- Claude's discretion on token budget visualization (progress bars recommended)
- Claude's discretion on content display (text preview with expand recommended)
- Claude's discretion on interactions (layer focus, search, and entry details prioritized)

#### Visualization Interactions
- Claude's discretion on main interaction patterns (filtering, zoom/pan, and drill-down prioritized)
- Claude's discretion on search/filtering organization (side panel recommended)
- Claude's discretion on pausing updates (pause button recommended to prevent UI jumping)
- Claude's discretion on export functionality (JSON and image export prioritized)

#### Communication Graph
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-04 | User can view real-time message stream of agent communication | Standard stack identified (React + Socket.IO), existing patterns in AgentDashboardTab, message types defined in routing.ts |
| UI-05 | User can visualize agent communication patterns as real-time graph | React Flow already implemented in AgentGraph.tsx, can extend with animated edges for message flow |
| UI-06 | User can view four-layer memory state and token budget usage | Blackboard API endpoints exist (blackboard.ts), memory types defined in blackboard.ts, progress bars recommended for token visualization |
| RT-03 | Message stream updates in real-time with agent communication | Socket.IO infrastructure already in place, just need to emit message:received events to frontend |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.3.1 | UI framework | Already used throughout frontend, established patterns |
| TypeScript | 5.6.2 | Type safety | Full type safety already in place, all components use .tsx |
| React Flow | 11.11.4 | Graph visualization | Already implemented in AgentGraph.tsx, proven for agent graph |
| Socket.IO Client | 4.8.3 | Real-time communication | Already connected via socketService, existing event patterns |
| Zustand | 5.0.3 | State management | Already in use via useAppStore, can extend for visualization state |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React Hook Form | 7.71.2 | Form handling | For search/filter forms in visualization panel |
| Zod | 3.24.1 | Schema validation | For validating incoming Socket.IO events |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| React Flow | D3.js | More flexible but steeper learning curve; React Flow already integrated |
| Custom timeline | react-window | Could add virtualization for large message streams, defer to optimization phase |

**Installation:**
No new packages needed - all required libraries are already installed.

## Architecture Patterns

### Recommended Project Structure
```
frontend/src/
├── components/
│   └── visualization/
│       ├── VisualizationTab.tsx       # Main tab container
│       ├── MessageStream.tsx          # Timeline-style message display
│       ├── CommunicationGraph.tsx     # Extended React Flow with animations
│       ├── MemoryState.tsx            # Four-layer memory display
│       ├── MemoryLayerTab.tsx         # Individual layer view
│       ├── TokenProgress.tsx          # Token budget progress bars
│       ├── VisualizationControls.tsx  # Pause, filter, search controls
│       └── visualization.css
├── lib/
│   ├── types.ts                       # Add visualization types
│   └── socket.ts                      # Add event types
└── store/
    └── visualizationStore.ts          # Zustand store for visualization state
```

### Pattern 1: Socket.IO Event Handling
**What:** Use useEffect hooks with socketService to listen for real-time events, update state with functional updates.
**When to use:** All real-time data subscriptions (messages, memory updates, graph changes).
**Example:**
```typescript
// Source: frontend/src/components/dashboard/AgentDashboardTab.tsx (existing pattern)
useEffect(() => {
  const handleMessageReceived = (data: unknown) => {
    const message = data as RoutingMessage;
    setMessages(prev => [...prev, message]);
  };

  const handleMemoryUpdated = (data: unknown) => {
    const memoryState = data as MemoryState;
    setMemoryState(memoryState);
  };

  socketService.on('message:received', handleMessageReceived);
  socketService.on('memory:updated', handleMemoryUpdated);

  return () => {
    socketService.off('message:received', handleMessageReceived);
    socketService.off('memory:updated', handleMemoryUpdated);
  };
}, []);
```

### Pattern 2: Functional State Updates
**What:** Use functional updates in useState to ensure thread-safe real-time updates.
**When to use:** When updating arrays or objects that receive frequent real-time updates.
**Example:**
```typescript
// Source: frontend/src/components/dashboard/AgentGraph.tsx (existing pattern)
setAgents(prev => {
  const existing = prev.find(a => a.id === agent.id);
  if (existing) {
    return prev.map(a => a.id === agent.id ? agent : a);
  }
  return [...prev, agent];
});
```

### Pattern 3: Component Composition with Tab View
**What:** Create a main container component with sub-components organized in tabs or panels.
**When to use:** For the main visualization tab, organizing message stream, graph, and memory state.
**Example:**
```typescript
// Source: frontend/src/App.tsx (existing pattern)
const renderTabContent = () => {
  switch (activeTab) {
    case 'visualization':
      return <VisualizationTab />;
    // ... other cases
  }
};
```

### Anti-Patterns to Avoid
- **Direct state mutation:** Always use functional updates for real-time state
- **Missing cleanup:** Always unsubscribe from Socket.IO events in useEffect cleanup
- **Over-rendering:** Use useCallback/useMemo for expensive operations, consider virtualization for large lists
- **Ignoring connection state:** Handle disconnected/reconnecting states gracefully

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Graph visualization | Custom SVG/Canvas | React Flow | Already integrated, handles zoom/pan/selection, node/edge management |
| Real-time communication | Custom WebSockets | Socket.IO | Already connected, handles reconnection, heartbeat, rooms |
| Timeline display | Custom scroll/position | CSS Flexbox + state | Leverage existing CSS patterns, add virtualization later if needed |
| Token progress bars | Custom SVG | HTML/CSS progress elements | Simple, accessible, easy to style |
| State management | React context drilling | Zustand | Already in use, avoids prop drilling |

**Key insight:** The project already has all the core infrastructure in place. Focus on extending existing patterns rather than building new systems from scratch.

## Common Pitfalls

### Pitfall 1: UI Jumping from Rapid Updates
**What goes wrong:** The message stream or graph updates too frequently, causing the UI to jump and making it impossible to read.
**Why it happens:** Socket.IO events fire as quickly as messages are sent, React re-renders on every update.
**How to avoid:** Implement a pause button (as recommended), consider throttling updates, and use auto-pause when user is scrolling.
**Warning signs:** User complains about "can't read messages before they scroll away", UI feels jittery.

### Pitfall 2: Memory Leaks from Uncleaned Event Listeners
**What goes wrong:** Components don't unsubscribe from Socket.IO events on unmount, causing multiple listeners and memory leaks.
**Why it happens:** Forgetting cleanup function in useEffect, or not storing unsubscribe callbacks.
**How to avoid:** Always return cleanup function from useEffect, use socketService's unsubscribe pattern.
**Warning signs:** Multiple console logs for single event, memory usage grows over time, stale data in components.

### Pitfall 3: Performance Degradation with Large Message Volumes
**What goes wrong:** Rendering hundreds/thousands of messages causes lag and high CPU usage.
**Why it happens:** Every message creates a new DOM element, React re-renders entire list on each update.
**How to avoid:** Use windowing/virtualization (defer if possible initially), implement message filtering, cap visible history.
**Warning signs:** UI becomes unresponsive during active scenes, scrolling is choppy, high CPU usage.

### Pitfall 4: Desynchronized State Between Backend and Frontend
**What goes wrong:** Frontend memory state doesn't match actual blackboard state due to missed events.
**Why it happens:** Socket.IO disconnects, events emitted before frontend connects, race conditions.
**How to avoid:** Request full state snapshot on connection, implement periodic resync, handle reconnect properly.
**Warning signs:** Memory display shows wrong token counts, entries missing from layer view.

### Pitfall 5: Over-Engineering the Graph Animation
**What goes wrong:** Spending too much time on perfect particle animations that hurt performance.
**Why it happens:** Getting caught up in visual polish before core functionality works.
**How to avoid:** Start with simple edge highlighting/pulsing, add particles later if performance allows.
**Warning signs:** Spending days on animation without working message stream, graph is laggy on lower-end machines.

## Code Examples

Verified patterns from existing codebase:

### Socket.IO Event Listening
```typescript
// Source: frontend/src/components/dashboard/AgentDashboardTab.tsx
useEffect(() => {
  const handleAgentConnected = (data: unknown) => {
    const agent = data as Agent;
    setAgents(prev => {
      const existing = prev.find(a => a.id === agent.id);
      if (existing) {
        return prev.map(a => a.id === agent.id ? agent : a);
      }
      return [...prev, agent];
    });
  };

  socketService.on('agent_connected', handleAgentConnected);

  return () => {
    socketService.off('agent_connected', handleAgentConnected);
  };
}, []);
```

### React Flow Node and Edge Management
```typescript
// Source: frontend/src/components/dashboard/AgentGraph.tsx
useEffect(() => {
  const newNodes: Node<AgentNodeData>[] = agents.map((agent, i) => ({
    id: agent.id,
    type: 'agentNode',
    position: {
      x: 200 + (i % 3) * 250,
      y: 100 + Math.floor(i / 3) * 200
    },
    data: { agent },
  }));

  setNodes(newNodes);
}, [agents, setNodes]);
```

### State Merging Pattern
```typescript
// Source: frontend/src/components/dashboard/AgentGraph.tsx
setAgents(prev =>
  prev.map(a => a.id === agent.id ? { ...a, ...agent } : a)
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling for updates | Socket.IO push events | v1.1 (Phase 5) | Lower latency, better performance, real-time updates |
| Manual DOM manipulation | React + React Flow | v1.2 (Phase 8) | Declarative UI, better maintainability |
| Full prompt injection | Four-layer memory with folding | v1.1 (Phase 6) | Token efficient, prevents context drift |

**Deprecated/outdated:**
- Polling API endpoints for updates: Replaced by Socket.IO push events
- Direct WebSocket usage: Replaced by Socket.IO with heartbeat/reconnection

## Open Questions

1. **Backend Socket.IO events for messages and memory**
   - What we know: RouterService has 'message:received' event that emits to internal listeners
   - What's unclear: Need to verify if these should be broadcast to frontend, or if new events should be created
   - Recommendation: Add Socket.IO broadcasts in RouterService when messages are received and when memory is updated

2. **Memory layer names discrepancy**
   - What we know: CONTEXT.md mentions "core, scenario, scene, turn" but blackboard.ts has "core, scenario, semantic, procedural"
   - What's unclear: Which layer names to use in UI
   - Recommendation: Use the actual layer names from code (core, scenario, semantic, procedural) with documentation

3. **Authentication for blackboard API**
   - What we know: Blackboard endpoints require JWT authentication (agents only)
   - What's unclear: How frontend will fetch memory state without agent JWT
   - Recommendation: Add public/unauthenticated GET endpoints for memory state, or create admin JWT for frontend

4. **Message history persistence**
   - What we know: Need to show message stream, but not sure how much history to keep
   - What's unclear: Does backend persist message history? Should we fetch on connect?
   - Recommendation: Keep message history in frontend state (with reasonable limit), add API endpoint for historical messages if needed

## Validation Architecture

> Skipping this section - workflow.nyquist_validation not checked in config.json

## Sources

### Primary (HIGH confidence)
- `/websites/reactflow_dev` - React Flow for graph visualization (already integrated)
- `/websites/socket_io_v4_client-api` - Socket.IO client for real-time communication (already integrated)
- `frontend/src/components/dashboard/AgentGraph.tsx` - Existing React Flow implementation
- `frontend/src/components/dashboard/AgentDashboardTab.tsx` - Existing Socket.IO patterns
- `frontend/src/lib/socket.ts` - Socket.IO client service
- `src/types/routing.ts` - Message type definitions
- `src/types/blackboard.ts` - Memory layer definitions
- `src/services/router.ts` - Backend Socket.IO routing
- `src/routes/blackboard.ts` - Blackboard API endpoints

### Secondary (MEDIUM confidence)
- [React Flow Official Documentation](https://reactflow.dev/) - Graph visualization patterns
- WebSearch results for Socket.IO React best practices

### Tertiary (LOW confidence)
- None - all key findings based on existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in use
- Architecture: HIGH - patterns established in existing code
- Pitfalls: HIGH - based on real-world experience with similar real-time systems

**Research date:** 2026-03-22
**Valid until:** 2026-04-21 (30 days - stable stack)
