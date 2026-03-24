# Phase 12: Documentation Site - Context

**Gathered:** 2026-03-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Create a comprehensive documentation site for the Multi-Agent Drama System that users can access via browser. The documentation includes:
- Getting started guide with step-by-step instructions
- Comprehensive API reference with OpenAPI 3.1 specification
- Detailed user guide with usage examples
- Architecture documentation with component diagrams
- Dark/light theme support and responsive design

The documentation site will be deployed as an independent static site (separate from the main frontend application) using VitePress as the documentation framework.

**Scope guardrail**: This phase focuses on documentation infrastructure and content organization. It does not include creating new backend features or modifying the frontend application's core functionality.
</domain>

<decisions>
## Implementation Decisions

### Documentation Site Architecture
- **D-01**: Independent documentation site (separate from main frontend app)
  - Rationale: Documentation has different release cycles and audience (developers vs end users)
  - Benefits: Independent versioning, easier SEO optimization, can use lightweight framework, future export to PDF/static site

### Documentation Technology Stack
- **D-02**: VitePress as the documentation framework
  - Rationale: Fast build times (Vite-based), built-in search, dark/light theme support, simple Markdown configuration
  - Alternative considered: Docusaurus (React-based, more features but heavier)
  - Alternative considered: Custom React implementation (reuses existing stack but more maintenance)

### Content Organization Structure
- **D-03**: Four-tier navigation structure:
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

### API Documentation Format
- **D-04**: Static Markdown documentation with TypeScript type links
  - Migrate existing `docs/API.md` to structured API reference
  - Include TypeScript type definitions for key interfaces
  - Future: Optional OpenAPI 3.1 specification generator (not required for v1.2)

### Architecture Documentation Presentation
- **D-05**: Mermaid diagrams with text explanations
  - Reuse existing Mermaid diagrams from `docs/architecture/`
  - Each diagram paired with detailed textual explanation
  - Use VitePress Mermaid plugin for rendering
  - Alternative considered: Interactive diagrams (too complex for v1.2)

### Navigation Structure
- **D-06**: Sidebar navigation + breadcrumbs
  - Left fixed sidebar showing current section's subpages
  - Top breadcrumbs showing path (e.g., Guide > Getting Started)
  - Mobile-friendly collapsible sidebar

### Search Functionality
- **D-07**: VitePress built-in search (Algolia)
  - Index all Markdown files
  - Support Chinese language search
  - Search bar in top navigation

### Code Example Display
- **D-08**: Static code blocks with one-click copy
  - Use VitePress code block component
  - Copy button in top-right corner of each code block
  - Syntax highlighting for TypeScript, Bash, JSON, etc.
  - Reuse content from `examples/API_USAGE_GUIDE.md`

### Responsive Design Strategy
- **D-09**: Mobile-first approach
  - Sidebar collapses by default on mobile
  - Hamburger menu navigation
  - Responsive code blocks with horizontal scrolling
  - Leverage VitePress default responsive styles

### Theme Support
- **D-10**: Dark/light theme toggle
  - VitePress built-in theme switching
  - Respect system preference by default
  - Manual override in top navigation

### Content Migration Strategy
- **D-11**: Migrate and restructure existing documentation:
  - `docs/API.md` → `/docs/api/` directory (split into multiple pages)
  - `examples/API_USAGE_GUIDE.md` → `/docs/guide/quick-start.md` (with English translation)
  - `docs/architecture/README.md` → `/docs/architecture/overview.md`
  - `README.md` → `/docs/guide/getting-started.md` (extract relevant sections)

### Content Creation Priorities
- **D-12**: Priority order for content creation:
  1. Getting started guide (minimal viable path)
  2. API reference (migrate existing content)
  3. User guide (session management, configuration, export)
  4. Architecture documentation (diagrams and explanations)

### Claude's Discretion
- Exact visual design of code blocks and code highlighting colors
- Custom theme branding (colors, fonts, logo placement)
- Sidebar exact width and collapse behavior details
- Search ranking and result display tuning
- Additional documentation pages beyond core requirements
- Integration with external services (e.g., comments, analytics) - optional for v1.2
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Documentation
- `docs/API.md` — Complete HTTP API documentation (to be migrated and structured)
- `examples/API_USAGE_GUIDE.md` — Step-by-step API usage guide in Chinese (to be translated and integrated)
- `docs/architecture/README.md` — Architecture diagrams directory (Mermaid files to be reused)
- `README.md` — Project overview and quick start (sections to be extracted)
- `.planning/codebase/ARCHITECTURE.md` — Architecture documentation for architecture section
- `.planning/codebase/STRUCTURE.md` — Codebase structure documentation
- `.planning/codebase/STACK.md` — Technology stack documentation

### Phase Context
- `.planning/phases/08-v1.2-operability-and-api/08-CONTEXT.md` — Frontend foundation context (UI patterns, styling approach)
- `.planning/phases/09-session-configuration-and-agent-dashboard/09-CONTEXT.md` — Session configuration and dashboard context
- `.planning/phases/10-real-time-visualization/10-CONTEXT.md` — Visualization context (for export features)

### Project Configuration
- `.planning/REQUIREMENTS.md` — All v1.2 requirements, especially DOC-01 through DOC-05
- `.planning/ROADMAP.md` — Phase 12 requirements and success criteria

### VitePress Documentation
- https://vitepress.dev/guide/ — Official VitePress guide (for setup and configuration)
- https://vitepress.dev/guide/custom-theme — Custom theme documentation (if needed)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Existing documentation**: `docs/API.md` (9.9KB, comprehensive API reference)
- **Example code**: `examples/API_USAGE_GUIDE.md` (complete usage flow in Chinese)
- **Architecture diagrams**: `docs/architecture/` directory with Mermaid files
- **Frontend styling patterns**: Tailwind CSS usage and custom CSS from Phase 8-10 (for theme customization reference)
- **TypeScript types**: `src/types/*.ts` files (can link API docs to type definitions)

### Established Patterns
- **Documentation style**: Existing `docs/API.md` uses clear structure with endpoint descriptions, request/response examples
- **Code examples**: `examples/API_USAGE_GUIDE.md` provides practical, copy-pasteable examples
- **Architecture diagrams**: Mermaid format for system overview, request flow, session flow
- **Frontend patterns**: React + TypeScript + Tailwind CSS patterns (for theme customization)

### Integration Points
- **No backend integration required** — Documentation site is static, built from Markdown files
- **Content sources**: Migrate existing documentation from `docs/` and `examples/` directories
- **Type definitions**: Link API documentation to `src/types/*.ts` for type references
- **Frontend styling**: Extract design tokens (colors, fonts) from existing frontend for consistent theming

### Deployment Considerations
- **Static site output**: VitePress generates static HTML/CSS/JS in `docs-site/.vitepress/dist/`
- **Independent deployment**: Can be deployed to GitHub Pages, Vercel, or Netlify (separate from main app)
- **No server requirements**: Pure static files, can be served from any CDN
</code_context>

<specifics>
## Specific Ideas

- "Documentation should be accessible to both developers and non-technical users"
- "API examples should be copy-paste ready"
- "Architecture diagrams help users understand the system at a glance"
- "Dark theme is preferred by many developers"
- "Search functionality is critical for finding information quickly"
</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.
</deferred>

---

*Phase: 12-documentation-site*
*Context gathered: 2026-03-22*
