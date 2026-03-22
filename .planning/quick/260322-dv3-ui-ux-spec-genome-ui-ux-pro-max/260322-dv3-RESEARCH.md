# Research: Frontend UI Redesign with ui-ux-spec-genome & ui-ux-pro-max

**Quick Task ID:** 260322-dv3
**Date:** 2026-03-22
**Status:** Complete

## Task Summary

重新设计前端界面，查找相似项目参考，使用 ui-ux-spec-genome 提取规格，用 ui-ux-pro-max 深入实现。

## Similar Projects Reference

### 1. Multi-Agent Monitoring Dashboards

**Observable / Grafana**
- Real-time metrics visualization
- Panel-based layout system
- Time-series data displays
- Status indicators and health checks

**Key Features:**
- Sidebar navigation with collapsible sections
- Multi-panel dashboard layouts
- Real-time data streaming
- Export capabilities (JSON, CSV, PDF)
- Dark/light theme support

**Design Patterns:**
- Card-based component grouping
- Consistent spacing system (8pt grid)
- Semantic color coding (success/warning/error)
- Responsive breakpoints (mobile/tablet/desktop)

### 2. ChatGPT-like AI Interfaces

**ChatGPT / Claude Web UI**
- Session-based conversation management
- Real-time streaming responses
- Configuration panels for LLM settings
- Export functionality

**Key Features:**
- Clean, minimal aesthetic
- Sidebar with session history
- Collapsible configuration panels
- Toast notifications
- Connection status indicators

### 3. Project Management Tools

**Linear / Notion**
- Modern design systems
- Bento-grid layouts
- Smooth animations (150-300ms)
- High contrast ratios (4.5:1 minimum)
- Keyboard-first navigation

## ui-ux-spec-genome Skill Analysis

### Core Capabilities

1. **Source Extraction**
   - Scan UI sources with `scripts/scan_ui_sources.sh`
   - Requires `rg` (ripgrep) and `bash`
   - Ignores build/cache dirs automatically

2. **Output Structure**
   ```
   ui-ux-spec/
   ├── 00_Guides/
   │   ├── README.md
   │   └── REPLICA_STANDARD.md
   ├── 01_Foundation/
   │   ├── tokens.md
   │   ├── global-styles.md
   │   ├── breakpoints.md
   │   └── layout-shell.md
   ├── 02_Components/
   │   ├── button.md
   │   ├── input.md
   │   ├── card.md
   │   └── ...
   ├── 03_Patterns/
   │   ├── navigation.md
   │   ├── forms.md
   │   └── modals.md
   ├── 04_Pages/
   │   ├── dashboard.md
   │   ├── sessions.md
   │   └── ...
   ├── 05_A11y/
   │   ├── accessibility.md
   │   └── keyboard-nav.md
   ├── 06_Assets/
   │   ├── icons.md
   │   └── images.md
   └── 07_Engineering_Constraints/
       ├── css-architecture.md
       └── theming.md
   ```

3. **Usage Mode for This Project**
   - **Refactor existing** (Mode B)
   - Extract current UI patterns
   - Normalize to consistent tokens
   - Plan incremental improvements

### Key Commands

```bash
# Scan UI sources
bash /workspace/.codebuddy/skills/ui-ux-spec-genome/scripts/scan_ui_sources.sh /workspace/frontend

# Generate output skeleton
bash /workspace/.codebuddy/skills/ui-ux-spec-genome/scripts/generate_output_skeleton.sh
```

## ui-ux-pro-max Skill Analysis

### Core Design Rules (Priority 1-10)

**Priority 1: Accessibility (CRITICAL)**
- Minimum 4.5:1 contrast ratio
- Visible focus rings (2-4px)
- Keyboard navigation support
- Alt text for images
- ARIA labels for icon-only buttons

**Priority 2: Touch & Interaction (CRITICAL)**
- Min touch target: 44×44px
- Min spacing: 8px between targets
- Loading feedback (300ms threshold)
- Error messages near problems
- Visual press feedback

**Priority 3: Performance (HIGH)**
- WebP/AVIF images
- Lazy loading below-fold
- Reserve space (CLS < 0.1)
- Font-display: swap/optional
- Bundle splitting by route

**Priority 4: Style Selection (HIGH)**
- Match product type (Dashboard → clean, data-focused)
- Consistency across all pages
- SVG icons (no emojis)
- Semantic color tokens (no raw hex)
- Platform-adaptive controls

**Priority 5: Layout & Responsive (HIGH)**
- Mobile-first design
- Systematic breakpoints (375/768/1024/1440)
- 16px minimum body text
- Max-width containers (max-w-6xl/7xl)
- No horizontal scroll

**Priority 6-10:**
- Typography: 1.5-1.75 line-height, consistent scale
- Animation: 150-300ms, transform/opacity only
- Forms: Visible labels, error near field
- Navigation: Predictable back, bottom nav ≤5 items
- Charts: Legends, tooltips, accessible colors

### Design System Recommendations for DramaFlow

**Product Type:** Dashboard + Session Management
**Recommended Style:** Clean, Modern, Data-Focused
**Color Palette:** Slate-based neutrals + blue accent (iOS HIG inspired)
**Typography:** Inter/system-ui (16px body, 1.5 line-height)
**Spacing:** 8pt incremental scale (8/16/24/32/48/64)
**Border Radius:** 6-8px for cards, 4px for small elements
**Shadows:** Consistent elevation scale (0/1/2/3/4)
**Animation:** 200ms ease-out standard

### Component Priorities

1. **Foundational (Phase 1)**
   - Design tokens (colors, typography, spacing)
   - Global styles (reset, body defaults)
   - Layout shell (sidebar + main content)

2. **Base Components (Phase 2)**
   - Button (primary/secondary/ghost)
   - Input (text, textarea, select)
   - Card (with elevation variants)
   - Toast (notifications)

3. **Pattern Components (Phase 3)**
   - Sidebar navigation
   - Tab navigation
   - Session list items
   - Configuration panels

4. **Page Components (Phase 4)**
   - Dashboard panels
   - Visualization containers
   - Export forms

## Integration with Existing Codebase

### Current Stack
- Framework: React 18 with TypeScript
- Build: Vite
- Styling: CSS modules (no utility library)
- State: Zustand (appStore)
- Icons: Inline SVGs

### Integration Points

1. **Design System Migration**
   - Existing: CSS variables in `index.css`
   - Target: Tokenized design system (consistent naming)
   - Approach: Gradual replacement, maintain existing values

2. **Component Refactoring**
   - Existing: Individual CSS files per component
   - Target: Component catalog with variants/states
   - Approach: Document existing patterns first, then align

3. **Accessibility Improvements**
   - Existing: Basic HTML structure
   - Target: ARIA labels, keyboard nav, focus management
   - Approach: Add accessibility layer without breaking UI

### Constraints & Considerations

1. **Preserve Business Logic**
   - UI/UX only - no changes to socket, store, or domain logic
   - Keep component props and event handlers unchanged
   - Maintain data flow and state management

2. **Minimal Breaking Changes**
   - Work in place (no file moves)
   - Small-step commits
   - Reversible changes

3. **Current Light Theme**
   - User prefers light theme (from previous quick task)
   - Maintain light theme colors
   - Consider dark mode future compatibility

## Recommended Workflow

### Phase 1: Extract & Normalize
1. Run ui-ux-spec-genome scan script
2. Generate ui-ux-spec output skeleton
3. Document current tokens and styles
4. Identify gaps and inconsistencies

### Phase 2: Plan Improvements
1. Use ui-ux-pro-max to identify design issues
2. Create phased improvement plan
3. Prioritize by impact vs. effort
4. Focus on accessibility first (Priority 1-2)

### Phase 3: Execute Refactor
1. Start with global styles and tokens
2. Update base components
3. Improve patterns (sidebar, tabs)
4. Enhance page layouts

### Phase 4: Verify & Iterate
1. Check against ui-ux-spec
2. Validate accessibility (contrast, keyboard nav)
3. Test responsiveness (mobile/tablet/desktop)
4. User feedback and iteration

## Common Pitfalls to Avoid

1. **Over-engineering**
   - Don't introduce new frameworks (React Query, Formik, etc.)
   - Keep it simple - styling improvements only
   - Focus on visual quality and UX

2. **Breaking Changes**
   - Don't change component APIs
   - Don't restructure folders
   - Don't modify business logic

3. **Inconsistent Execution**
   - Follow ui-ux-pro-max priorities strictly
   - Don't skip accessibility for "visual impact"
   - Maintain consistency across all components

4. **Ignoring Existing Design**
   - Respect current light theme preference
   - Build on existing Apple Design System foundation
   - Don't start from scratch without reason

## Expected Outcomes

1. **Documentation**
   - Complete ui-ux-spec folder with tokens, components, patterns
   - Migration plan with phases
   - Gap analysis report

2. **Code Improvements**
   - Consistent design tokens across all components
   - Improved accessibility (contrast, keyboard nav, ARIA)
   - Better visual hierarchy and spacing
   - Smooth animations and transitions
   - Responsive improvements

3. **Quality Metrics**
   - Contrast ratio ≥ 4.5:1 for all text
   - Touch targets ≥ 44×44px
   - Loading states for all async operations
   - No horizontal scroll on mobile
   - Smooth 200ms animations
