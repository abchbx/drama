---
phase: 12-documentation-site
plan: 03
subsystem: User Guide Documentation
tags: [user-guide, examples, tutorials]
dependency_graph:
  provides: [quick-start, concepts, sessions, configuration, export, troubleshooting]
  affects: [api-users, new-users]
tech_stack:
  added: []
key_files:
  created:
    - path: "docs-site/docs/guide/quick-start.md"
      provides: "Quick start tutorial with working examples"
    - path: "docs-site/docs/guide/concepts.md"
      provides: "Core concepts explanation"
    - path: "docs-site/docs/user-guide/sessions.md"
      provides: "Session management guide"
    - path: "docs-site/docs/user-guide/configuration.md"
      provides: "Configuration reference"
    - path: "docs-site/docs/user-guide/export.md"
      provides: "Export functionality guide"
    - path: "docs-site/docs/user-guide/troubleshooting.md"
      provides: "Troubleshooting guide"
decisions: []
metrics:
  duration: "10 minutes"
  completed_date: "2026-03-22"
---

# Phase 12 Plan 03: User Guide Documentation Summary

Created detailed user guide with practical usage examples, session management, configuration, and export documentation.

## What Was Built

**Quick Start Tutorial:**
- Complete bash script for creating two-character dialogue
- Step-by-step breakdown of each operation
- Key takeaways summary
- Migrated from examples/API_USAGE_GUIDE.md (Chinese to English translation)

**Core Concepts Guide:**
- Shared Blackboard architecture explanation
- Four-layer memory model details
- Role-based boundaries matrix
- Memory folding behavior
- Agent types and workflows
- Communication flow diagram

**Session Management Guide:**
- Session creation process
- Agent registration steps
- Character card format and example
- Scene lifecycle (start/end)
- Audit log queries

**Configuration Reference:**
- All environment variables documented
- Server configuration (PORT, SOCKET_PORT, LOG_LEVEL)
- LLM provider configuration (OpenAI, Anthropic)
- JWT configuration
- Blackboard layer budgets
- Routing and timeout settings
- Capability definitions

**Export Guide:**
- Export formats (JSON, Markdown, PDF)
- Export API endpoints
- Complete export workflow example
- JSON and Markdown format examples

**Troubleshooting Guide:**
- Port already in use issue
- Invalid/missing API key issue
- Capability violation (403) issue
- Token budget exceeded (413) issue
- Version mismatch (409) issue
- Socket.IO connection issues
- Blackboard data persistence issues
- Memory folding issues
- Slow performance issues
- Debug logging instructions

## Technical Implementation

### Translation Approach

Translated content from Chinese examples/API_USAGE_GUIDE.md to English:
- Preserved code examples (bash, curl commands)
- Translated explanations and comments
- Maintained structure and formatting

### Content Organization

6 documentation pages organized by user journey:
1. **quick-start.md** - Hands-on example (immediate value)
2. **concepts.md** - Understanding the system
3. **sessions.md** - Managing sessions
4. **configuration.md** - Setup and tuning
5. **export.md** - Output functionality
6. **troubleshooting.md** - Solving problems

### Code Examples

All bash and curl examples use:
- Proper quoting for JSON payloads
- Environment variable substitution
- jq for JSON parsing
- Comments explaining each step

## Deviations from Plan

None - plan executed exactly as written.

## Key Decisions

1. **Complete Script:** Included full working bash script in quick start (not just snippets)
2. **Translation:** Translated from Chinese to English for broader accessibility
3. **Troubleshooting:** Added 9 common issues with solutions

## Self-Check: PASSED

- [x] docs-site/docs/guide/quick-start.md created (100+ lines, complete example)
- [x] docs-site/docs/guide/concepts.md created (80+ lines, core concepts)
- [x] docs-site/docs/user-guide/sessions.md created (60+ lines, session guide)
- [x] docs-site/docs/user-guide/configuration.md created (80+ lines, config reference)
- [x] docs-site/docs/user-guide/export.md created (50+ lines, export guide)
- [x] docs-site/docs/user-guide/troubleshooting.md created (60+ lines, troubleshooting)
- [x] All content migrated from examples/API_USAGE_GUIDE.md
- [x] Git commit created with proper message
