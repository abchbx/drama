# Apple Style Frontend Redesign - Plan

## Task ID: 260322-bvx
**Date**: 2026-03-22
**Objective**: Complete Apple-style redesign of the frontend UI
**Approach**: Self-guided implementation based on Apple Design System principles

---

## Design Decisions Made

### 1. Layout: Hybrid Sidebar
- **Choice**: Left sidebar + top status bar
- **Rationale**: Classic macOS app pattern, familiar to users, optimal for navigation-heavy applications

### 2. Card Design: Flat with Micro Shadows
- **Choice**: Flat cards with subtle elevation
- **Rationale**: Modern Apple aesthetic, clean without being boring

### 3. Color Scheme: Apple Dark Theme
- **Choice**: Deep black (#000000) with elevated grays
- **Rationale**: Matches Apple's dark mode, reduces eye strain, premium feel

### 4. Typography: SF Pro Style
- **Choice**: System font stack (-apple-system, SF Pro)
- **Rationale**: Native feel, best rendering on Apple devices

### 5. Animation: Fluid iOS-style
- **Choice**: Smooth transitions (200ms cubic-bezier)
- **Rationale**: Apple's spring physics, premium feel

### 6. Spacing: Balanced 8pt Grid
- **Choice**: 4/8/16/24/32/48px spacing scale
- **Rationale**: Apple's 8-point grid system, consistent rhythm

---

## Implementation Plan

### Phase 1: Design System Foundation ✅
- [x] Define CSS custom properties for Apple Dark Theme
- [x] Create typography scale (11px, 13px, 15px, 17px, 20px, 24px, 28px)
- [x] Establish color palette (accent colors, semantic colors)
- [x] Implement shadow system (layered shadows)
- [x] Define border radius scale (6px, 8px, 12px, 16px, 20px)
- [x] Create spacing scale (8pt grid)
- [x] Set up animation transitions

### Phase 2: Layout Structure ✅
- [x] Redesign App.tsx structure with new layout
- [x] Create sidebar with logo, form, list, navigation
- [x] Implement main content area with top padding
- [x] Add translucent top bar with backdrop blur
- [x] Position connection status in top bar

### Phase 3: Create Session Form ✅
- [x] Redesign form layout with compact inputs
- [x] Add icon to header
- [x] Implement inline number inputs with units
- [x] Update button styling with icon
- [x] Add loading spinner animation
- [x] Improve focus states and feedback

### Phase 4: Sessions List ✅
- [x] Redesign list items with status dots
- [x] Implement relative timestamps (5m ago, 2h ago)
- [x] Add empty state with icon and hints
- [x] Update status indicators with Apple colors
- [x] Improve hover and selection states

### Phase 5: Tab Navigation ✅
- [x] Create navigation links with icons
- [x] Implement active state styling
- [x] Add hover effects
- [x] Organize tabs logically (Sessions, Dashboard, Visualization, Templates, Config, Params, Export)

### Phase 6: Session Panel ✅
- [x] Redesign panel header with improved typography
- [x] Update detail cards with Apple styling
- [x] Improve spacing and hierarchy
- [x] Enhance hover states

### Phase 7: Status Indicators ✅
- [x] Update ConnectionStatus with pill design
- [x] Implement SceneControls with Apple buttons
- [x] Add proper color states for all statuses

---

## Files Modified

### Core Styles
1. `/workspace/frontend/src/index.css` - Complete Apple Design System implementation

### Components
2. `/workspace/frontend/src/App.tsx` - New layout structure
3. `/workspace/frontend/src/components/CreateSessionForm.tsx` - Redesigned form
4. `/workspace/frontend/src/components/CreateSessionForm.css` - Updated styles
5. `/workspace/frontend/src/components/SessionsList.tsx` - Redesigned list
6. `/workspace/frontend/src/components/SessionsList.css` - Updated styles
7. `/workspace/frontend/src/components/TabNavigation.tsx` - New nav with icons
8. `/workspace/frontend/src/components/TabNavigation.css` - New file
9. `/workspace/frontend/src/components/SessionPanel.css` - Updated styles
10. `/workspace/frontend/src/components/ConnectionStatus.css` - Updated styles
11. `/workspace/frontend/src/components/SceneControls.css` - Updated styles

---

## Design System Specs

### Typography
- Font Family: -apple-system, BlinkMacSystemFont, 'SF Pro Text'
- Sizes: 11px, 13px, 15px, 17px, 20px, 24px, 28px
- Line Heights: 1.2, 1.5, 1.7
- Weights: 400 (regular), 500 (medium), 600 (semibold)

### Colors (Dark Mode)
- Backgrounds: #000000, #1c1c1e, #2c2c2e, #3a3a3c
- Borders: rgba(255,255,255, 0.08/0.12/0.18)
- Text: rgba(255,255,255, 0.95/0.70/0.50/0.30)
- Accent Blue: #0A84FF
- Accent Green: #30D158
- Accent Red: #FF453A
- Accent Yellow: #FFD60A
- Accent Orange: #FF9F0A

### Spacing (8pt Grid)
- 4px, 8px, 16px, 24px, 32px, 48px

### Border Radius
- 6px, 8px, 12px, 16px, 20px

### Shadows (Layered)
- XS: 0 1px 2px rgba(0,0,0,0.3)
- SM: 0 1px 3px rgba(0,0,0,0.4)
- MD: 0 4px 6px rgba(0,0,0,0.5)
- LG: 0 10px 15px rgba(0,0,0,0.6)

### Transitions
- Fast: 150ms cubic-bezier(0.4, 0, 0.2, 1)
- Base: 200ms cubic-bezier(0.4, 0, 0.2, 1)
- Slow: 300ms cubic-bezier(0.4, 0, 0.2, 1)
- Spring: 500ms cubic-bezier(0.34, 1.56, 0.64, 1)

---

## Verification Criteria

- [ ] All components use CSS custom properties from design system
- [ ] Typography follows defined scale
- [ ] Colors use Apple palette
- [ ] Spacing follows 8pt grid
- [ ] Animations are smooth and consistent
- [ ] Hover states provide clear feedback
- [ ] Focus states are visible and accessible
- [ ] No hardcoded colors in component CSS
- [ ] Responsive layout works correctly
- [ ] No lint errors in modified files

---

## Notes

- Frontend dev server is running on port 5174
- All changes maintain existing functionality
- No breaking changes to component APIs
- Design is fully implemented and ready for review
