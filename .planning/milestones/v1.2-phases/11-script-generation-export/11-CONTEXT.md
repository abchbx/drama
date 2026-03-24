# Phase 11: Script Generation & Export - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Export generated drama scripts in multiple formats (JSON, Markdown, PDF) for completed sessions. Users can download exported files directly from the browser. Export functionality is accessible via a dedicated Export tab in the frontend interface.

This includes:
- Export complete scripts (session metadata, character cards, plot backbone, scene beats, timestamps)
- JSON export with nested structure (session → config → characters → scenes)
- Markdown export in dramatic script format (角色名: 台词)
- PDF export via client-side html2pdf.js generation
- Only sessions with status "completed" can be exported

Documentation is in Phase 12.
</domain>

<decisions>
## Implementation Decisions

### Export Content Scope
- **D-01:** Export complete剧本 including session metadata, character cards, plot backbone, scene beats, and timestamps
- **D-02:** Export available only for sessions with status "completed"

### Export UI Location
- **D-03:** Create dedicated "Export" tab in sidebar navigation
- **D-04:** Right panel displays export options: format selection (JSON/Markdown/PDF) and session selector

### JSON Format Structure
- **D-05:** Use nested hierarchical structure: { session, config, characters, backbone, scenes[] }
- **D-06:** Each scene contains: sceneId, location, description, beats[], timestamp, conflicts[]
- **D-07:** Exclude full blackboard entries (too large, not user-facing)

### Markdown Script Style
- **D-08:** Use dramatic script format with sections: Title, Character List, Scenes with location headers
- **D-09:** Dialogue format: **CharacterName**: Dialogue text
- **D-10:** Include timestamps and scene metadata in sections

### PDF Generation Approach
- **D-11:** Use client-side html2pdf.js library (render Markdown as HTML, then convert to PDF)
- **D-12:** Reuse Markdown styling for consistent appearance across formats

### Export Workflow
- **D-13:** User selects completed session → chooses format → clicks export → file downloads immediately
- **D-14:** No confirmation dialogs or preview step (keep it simple)

### Claude's Discretion
- Exact file naming convention (recommended: `{session-name}-{format}.{extension}`)
- PDF page layout and typography details
- Export error handling and user feedback (toasts)
- Loading states during export (spinner on export button)
- Whether to add cover page for PDF exports

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **downloadTemplate** (`frontend/src/utils/templateStorage.ts` lines 107-117): Existing Blob + anchor click download pattern - can be adapted for script exports
- **TabNavigation** (`frontend/src/components/TabNavigation.tsx`): Can be extended to add "Export" tab option
- **appStore** (`frontend/src/store/appStore.ts`): Can be extended with export state
- **SessionsList** (`frontend/src/components/SessionsList.tsx`): Can be reused or adapted for session selector in Export tab
- **ApiClient** (`frontend/src/lib/api.ts`): Can be extended with `/sessions/:id/export` endpoint call

### Established Patterns
- **Frontend stack**: React 18.3 + Vite + Zustand + TypeScript
- **Download pattern**: Blob + createObjectURL + anchor element + revokeObjectURL (see templateStorage.ts)
- **Tab navigation**: Sidebar with active tab state, switch statement in App.tsx for content rendering
- **Styling**: Catppuccin Mocha dark theme with CSS variables, BEM naming convention
- **State management**: Zustand with async actions for API calls
- **Error handling**: Toast notifications via toast service

### Integration Points
- **Backend export API**: Need new `GET /sessions/:id/export?format=json|markdown` endpoint that aggregates session metadata + all scene beats + character cards + backbone from blackboard
- **Backend blackboard access**: Export endpoint needs to read from all blackboard layers (core, scenario, semantic, procedural) to build complete script data
- **Frontend**: Add "script-export" to TabType in types.ts, create ExportTab.tsx component, wire up in App.tsx
- **npm dependencies**: Need to add `html2pdf.js` for PDF generation

### Data Sources for Export
- Session metadata: `Session` from `/sessions/:id` endpoint
- Scene beats: `Session.lastResult.beats[]` (simplified) OR full blackboard entries for each scene (complete dialogue)
- Character cards: Blackboard semantic layer entries with `metadata.characterCardFor`
- Backbone: Blackboard core layer entries (DirectorBackboneOutput)
- Scene metadata: Scene signals from procedural layer (SceneEndSignal)

</code_context>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 11 Specification
- `.planning/ROADMAP.md` §Phase 11 — Phase goal, requirements, success criteria
- `.planning/REQUIREMENTS.md` §v1.2 Requirements (EXP-01, EXP-02, EXP-03, EXP-04) — Export functionality requirements

### Backend Types and APIs
- `src/types/session.ts` — Session interface, SessionStatus, BackendSceneResult
- `src/types/blackboard.ts` — BlackboardEntry, BlackboardState, LayerState
- `src/types/actor.ts` — CharacterCard, DialogueEntry
- `src/types/director.ts` — DirectorBackboneOutput, SceneEndSignal
- `src/routes/sessions.ts` — Session CRUD endpoints
- `src/routes/blackboard.ts` — Blackboard read endpoints, authentication requirements
- `src/services/blackboard.ts` — BlackboardService methods for layer access

### Frontend Structure and Patterns
- `frontend/src/App.tsx` — Main app layout, tab switching pattern
- `frontend/src/components/TabNavigation.tsx` — Tab navigation implementation
- `frontend/src/components/SessionsList.tsx` — Session list component pattern
- `frontend/src/lib/api.ts` — ApiClient pattern, fetchWithErrorHandling
- `frontend/src/store/appStore.ts` — Zustand store pattern
- `frontend/src/utils/templateStorage.ts` — downloadTemplate function (lines 107-117) — Download pattern reference

### Existing Export Implementation
- `frontend/src/components/templates/TemplatesTab.tsx` — Template export button and download invocation (lines 296-298)

</canonical_refs>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for script generation and export functionality.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 11-script-generation-export*
*Context gathered: 2026-03-22*
