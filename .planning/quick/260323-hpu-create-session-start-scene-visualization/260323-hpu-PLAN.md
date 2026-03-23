# Quick Task 260323-hpu: Fix frontend interaction logic

## Task 1: Fix Start Scene button - add scene config form

**Files:**
- `frontend/src/components/SceneControls.tsx`
- `frontend/src/components/SceneControls.css`

**Action:**
Replace empty `startScene('', '', '', [])` call with an inline scene configuration form. When user clicks "Start Scene", a modal appears with Location, Description, and Tone fields. User fills in parameters and clicks "Confirm Start" to actually start the scene. Cancel button dismisses the modal.

**Verify:**
- Start Scene button opens config form
- Confirm Start calls `startScene(location, description, tone, [])` with real values
- Cancel dismisses the form
- Stop Scene still works independently

---

## Task 2: Wire VisualizationControls filters to child components

**Files:**
- `frontend/src/components/visualization/VisualizationControls.tsx`
- `frontend/src/components/visualization/VisualizationTab.tsx`
- `frontend/src/components/visualization/MessageStream.tsx`
- `frontend/src/components/visualization/CommunicationGraph.tsx`

**Action:**
Lift filter state (`showDirector`, `showActors`, `showDialogues`) from `VisualizationControls` to `VisualizationTab`, pass down as props to `MessageStream` and `CommunicationGraph`. Both components apply filtering logic to their respective data (messages/nodes+edges).

**Verify:**
- Toggling "Show Director" hides Director messages/nodes
- Toggling "Show Actors" hides Actor messages/nodes
- Toggling "Show Dialogues" hides dialogue-type messages/edges

---

## Task 3: Fix MemoryState - render actual layer content instead of placeholder

**Files:**
- `frontend/src/components/visualization/MemoryState.tsx`

**Action:**
Fetch layer entries from `/api/blackboard/layers/{layer}/entries?limit=3` and render them as a list with agent ID, timestamp, and content preview. Add layer descriptions and entry counts. Show empty state message when no entries exist.

**Verify:**
- Layer content area shows actual entry data when available
- Empty state shows "No entries yet" message
- Content refreshes on `memory:updated` socket event

---

## Task 4: Fix AgentDashboardTab and AgentGraph - remove hardcoded mock data

**Files:**
- `frontend/src/components/dashboard/AgentDashboardTab.tsx`
- `frontend/src/components/dashboard/AgentGraph.tsx`
- `frontend/src/components/dashboard/dashboard.css`

**Action:**
Replace hardcoded initial agent arrays (Director/Romeo/Juliet) with empty `[]`. Handle `agent_updated` event which emits batch `{ agents: [...] }` from backend, replacing the entire list with server-side truth. Add empty state UI for when no agents are connected.

**Verify:**
- No mock agents shown on page load
- Agents appear when `agent_updated` socket event fires with real data
- Agents update/disconnect correctly via socket events
- Empty state shown when no agents connected
