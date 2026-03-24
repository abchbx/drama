---
phase: 11
plan: 01
subsystem: backend
tags: [export, api, json, markdown]
dependency_graph:
  requires: []
  provides: ["ExportService", "export API endpoint"]
  affects: ["11-02"]
tech_stack:
  added: []
  patterns: [export-service, async-api]
key_files:
  created:
    - path: src/services/exportService.ts
      provides: ExportService class with exportSession method
  modified:
    - path: src/types/session.ts
      provides: ExportFormat enum, ExportedScript interface
    - path: src/routes/sessions.ts
      provides: GET /sessions/:id/export endpoint
    - path: src/index.ts
      provides: blackboardService in app.locals
decisions: []
metrics:
  duration: 10 minutes
  completed_date: 2026-03-22
---

# Phase 11 Plan 01: Backend Export API Endpoint Summary

## What Was Built

Implemented REST API endpoint that aggregates session data from SessionRegistry and Blackboard into structured export formats (JSON and Markdown). ExportService extracts character cards from blackboard semantic layer (metadata.characterCardFor), backbone from core layer, and scenes from Session.lastResult.

## Deviations from Plan

None - plan executed exactly as written.

## Implementation Details

**Task 1: Export Types**
- Added ExportFormat enum (JSON, Markdown) to src/types/session.ts
- Added ExportedScript interface with session, config, characters, backbone, scenes structure
- All types follow data model from Blackboard and SessionRegistry

**Task 2: ExportService**
- Created src/services/exportService.ts with ExportService class
- exportSession(dramaId, format) validates session.status === 'completed'
- exportAsJson() aggregates data into structured JSON
- exportAsMarkdown() formats as dramatic script with character list and scenes
- extractCharacters() reads blackboard semantic layer for metadata.characterCardFor entries
- extractBackbone() reads blackboard core layer for all entries
- extractScenes() uses Session.lastResult.beats and .conflicts

**Task 3: Export Endpoint**
- Added GET /sessions/:id/export?format=json|markdown to src/routes/sessions.ts
- Endpoint validates format param and session existence
- Sets Content-Type (application/json or text/markdown)
- Sets Content-Disposition header with filename: `{session-name}-script.{format}`
- Returns 404 if session not found
- Returns 400 if export fails (e.g., session not completed)

**Task 4: Wiring**
- Added app.locals.blackboardService in src/index.ts
- ExportService is instantiated directly in route handler (no singleton needed)
- Existing app.locals.blackboard also available but export endpoint uses blackboardService

## Key Features

1. **Only completed sessions can be exported** - ExportService checks session.status before proceeding
2. **Multi-format support** - JSON for structured data, Markdown for human-readable scripts
3. **Data aggregation from multiple sources** - SessionRegistry metadata + Blackboard layers (semantic, core) + Session.lastResult
4. **Proper HTTP response headers** - Content-Type and Content-Disposition for browser download
5. **Error handling** - Clear error messages for missing sessions, invalid formats, incomplete sessions

## Requirements Addressed

- EXP-01: Export format support (JSON, Markdown)
- EXP-02: Backend export API endpoint
- EXP-03: Script generation (aggregation from session and blackboard)
- EXP-04: Export only completed sessions

## Files Modified/Created

- src/types/session.ts (modified): Added ExportFormat enum, ExportedScript interface
- src/services/exportService.ts (created): ExportService class with exportSession method
- src/routes/sessions.ts (modified): Added GET /sessions/:id/export endpoint
- src/index.ts (modified): Added app.locals.blackboardService

## Next Steps

Plan 11-02 will consume this backend API to build the frontend Export tab with JSON/Markdown download capability.

## Self-Check: PASSED

- [x] src/services/exportService.ts exists and contains ExportService class
- [x] ExportService has exportSession, exportAsJson, exportAsMarkdown methods
- [x] src/routes/sessions.ts has GET /sessions/:id/export endpoint
- [x] src/types/session.ts has ExportFormat and ExportedScript types
- [x] src/index.ts has app.locals.blackboardService
- [x] All commits exist (9ee3ded, a17c6af, c04811e, 6af8633)
