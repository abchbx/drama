# Phase 12: Documentation Site - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-22
**Phase:** 12-Documentation Site
**Areas discussed:** Documentation site architecture, Technology stack, Content organization, API documentation format, Architecture documentation presentation, Navigation structure, Search functionality, Code example display, Responsive design

---

## Documentation Site Architecture

|| Option | Description | Selected |
|--------|-------------|----------|
| Independent site | Professional documentation experience, separate deployment, SEO-friendly | ✓ |
| Integrated into frontend app | Unified access point, shared state, simpler deployment | |

**User's choice:** "你决定" (Claude decides)
**Selected:** Independent site
**Notes:** Rationale: Documentation has different release cycles and audience (developers vs end users). Independent versioning, easier SEO optimization, can use lightweight framework, future export to PDF/static site.

---

## Documentation Technology Stack

|| Option | Description | Selected |
|--------|-------------|----------|
| VitePress (recommended) | Vue-driven, fast (Vite-based), built-in search and theme support | ✓ |
| Docusaurus | React-driven, feature-rich, plugin ecosystem | |
| Custom React implementation | Reuse existing frontend stack, full control | |

**User's choice:** "全部你决定" (Claude decides all)
**Selected:** VitePress
**Notes:** Rationale: Fast build times (Vite-based), built-in search, dark/light theme support, simple Markdown configuration. Alternative considered: Docusaurus (React-based, more features but heavier). Alternative considered: Custom React implementation (reuses existing stack but more maintenance).

---

## Content Organization Structure

**Decision:** Four-tier navigation structure

```
/docs/
├── guide/           # Getting started guide
│   ├── getting-started.md
│   ├── quick-start.md
│   └── concepts.md
├── api/             # API reference
│   ├── overview.md
│   ├── endpoints.md
│   └── schemas.md
├── user-guide/      # User guide
│   ├── sessions.md
│   ├── configuration.md
│   └── export.md
└── architecture/    # Architecture documentation
    ├── overview.md
    ├── components.md
    └── data-flow.md
```

---

## API Documentation Format

|| Option | Description | Selected |
|--------|-------------|----------|
| Static Markdown + type links | Flexible, manual maintenance, can link to types | ✓ |
| Auto-generated from code | Stays in sync, requires toolchain setup | |
| Hybrid approach | Best of both worlds | |

**User's choice:** (Claude decided)
**Selected:** Static Markdown + type links
**Notes:** Migrate existing `docs/API.md` to structured API reference. Include TypeScript type definitions for key interfaces. Future: Optional OpenAPI 3.1 specification generator (not required for v1.2).

---

## Architecture Documentation Presentation

|| Option | Description | Selected |
|--------|-------------|----------|
| Mermaid diagrams + text | Reuse existing diagrams, simple rendering | ✓ |
| Interactive diagrams | Engaging but complex | |
| Text only | Simple but less visual | |

**User's choice:** (Claude decided)
**Selected:** Mermaid diagrams + text
**Notes:** Reuse existing Mermaid diagrams from `docs/architecture/`. Each diagram paired with detailed textual explanation. Use VitePress Mermaid plugin for rendering. Alternative considered: Interactive diagrams (too complex for v1.2).

---

## Navigation Structure

|| Option | Description | Selected |
|--------|-------------|----------|
| Sidebar + breadcrumbs | Clear hierarchy, familiar UX | ✓ |
| Top nav only | Simple but harder to navigate large docs | |
| Left sidebar only | No breadcrumbs, harder to know location | |

**User's choice:** (Claude decided)
**Selected:** Sidebar + breadcrumbs
**Notes:** Left fixed sidebar showing current section's subpages. Top breadcrumbs showing path (e.g., Guide > Getting Started). Mobile-friendly collapsible sidebar.

---

## Search Functionality

|| Option | Description | Selected |
|--------|-------------|----------|
| VitePress built-in search | Algolia-powered, indexes all Markdown, supports Chinese | ✓ |
| Custom search | More control but more implementation | |
| No search | Simplest but poor UX | |

**User's choice:** (Claude decided)
**Selected:** VitePress built-in search (Algolia)
**Notes:** Index all Markdown files. Support Chinese language search. Search bar in top navigation.

---

## Code Example Display

|| Option | Description | Selected |
|--------|-------------|----------|
| Static code blocks + copy | Simple, effective | ✓ |
| Runnable examples | Complex, not needed for docs | |
| Interactive playground | Overkill for v1.2 | |

**User's choice:** (Claude decided)
**Selected:** Static code blocks + one-click copy
**Notes:** Use VitePress code block component. Copy button in top-right corner of each code block. Syntax highlighting for TypeScript, Bash, JSON, etc. Reuse content from `examples/API_USAGE_GUIDE.md`.

---

## Responsive Design Strategy

|| Option | Description | Selected |
|--------|-------------|----------|
| Mobile-first | Best practice for modern web | ✓ |
| Desktop-first | Easier for developers but poor mobile UX | |
| No special handling | Use VitePress defaults | |

**User's choice:** (Claude decided)
**Selected:** Mobile-first
**Notes:** Sidebar collapses by default on mobile. Hamburger menu navigation. Responsive code blocks with horizontal scrolling. Leverage VitePress default responsive styles.

---

## Additional Decisions Made

### Theme Support
- Dark/light theme toggle using VitePress built-in switching
- Respect system preference by default
- Manual override in top navigation

### Content Migration Strategy
- `docs/API.md` → `/docs/api/` directory (split into multiple pages)
- `examples/API_USAGE_GUIDE.md` → `/docs/guide/quick-start.md` (with English translation)
- `docs/architecture/README.md` → `/docs/architecture/overview.md`
- `README.md` → `/docs/guide/getting-started.md` (extract relevant sections)

### Content Creation Priorities
1. Getting started guide (minimal viable path)
2. API reference (migrate existing content)
3. User guide (session management, configuration, export)
4. Architecture documentation (diagrams and explanations)

---

## Claude's Discretion Areas

- Exact visual design of code blocks and code highlighting colors
- Custom theme branding (colors, fonts, logo placement)
- Sidebar exact width and collapse behavior details
- Search ranking and result display tuning
- Additional documentation pages beyond core requirements
- Integration with external services (e.g., comments, analytics) - optional for v1.2

---

## Deferred Ideas

None — discussion stayed within phase scope.
