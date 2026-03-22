# Global Styles

## Overview

Global styles are defined in `frontend/src/index.css` using a CSS reset and Apple Design System conventions.

## Reset & Normalize

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
```

Standard CSS reset to remove default browser styles and ensure consistent box-sizing.

## Body Defaults

```css
body {
  font-family: var(--font-family-base);
  font-size: var(--font-size-md); /* 16px */
  line-height: var(--line-height-normal); /* 1.6 */
  font-weight: 400;
  background: var(--color-bg-base); /* #f5f5f7 */
  color: var(--color-text-primary); /* rgba(0, 0, 0, 0.92) */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-font-feature-settings: 'kern' 1;
  font-feature-settings: 'kern' 1;
}
```

- Font: Apple system fonts with fallback to SF Pro Text
- Font size: 16px base (meets mobile zoom threshold)
- Line height: 1.6 for readability
- Font smoothing: Antialiased for crisp text on high-DPI displays
- Kerning: Enabled for better typography

## Button Defaults

```css
button {
  font-family: inherit;
  font-size: inherit;
  border: none;
  background: none;
  cursor: pointer;
  appearance: none;
}

button:focus {
  outline: none;
}

button:focus-visible {
  outline: 2px solid var(--color-accent-blue);
  outline-offset: 2px;
}
```

- No default borders or backgrounds
- Inherits font styles from parent
- Removes default button appearance
- Focus states: No default outline, but visible focus ring on keyboard navigation
- Focus ring: 2px blue outline with 2px offset

## Input Defaults

```css
input, textarea, select {
  font-family: inherit;
  font-size: inherit;
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-default);
  color: var(--color-text-primary);
  border-radius: var(--radius-md); /* 12px */
  padding: var(--spacing-md) var(--spacing-lg); /* 12px 20px */
  transition: border-color var(--transition-fast);
}

input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: var(--color-accent-blue);
  box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.1);
}
```

- Inherits font from parent
- White background with default border
- Medium border radius (12px)
- Padding: 12px vertical, 20px horizontal
- Fast transition on border color
- Focus state: Blue border with subtle blue box-shadow (3px, 10% opacity)

## Typography Utilities

### Headings

```css
h1, h2, h3, h4, h5, h6 {
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--color-text-primary);
}
```

All headings use:
- Font weight: 600 (semi-bold)
- Letter spacing: -0.01em (slight tightening for better readability)
- Color: Primary text

### Heading Sizes

| Element | Font Size | Line Height |
|---------|-----------|-------------|
| h1 | `--font-size-3xl` (32px) | `--line-height-tight` (1.3) |
| h2 | `--font-size-2xl` (26px) | `--line-height-tight` (1.3) |
| h3 | `--font-size-xl` (22px) | `--line-height-normal` (1.6) |
| h4 | `--font-size-lg` (18px) | `--line-height-normal` (1.6) |
| h5 | `--font-size-md` (16px) | `--line-height-normal` (1.6) |
| h6 | `--font-size-sm` (14px) | `--line-height-normal` (1.6) |

### Text Color Utilities

```css
.text-secondary { color: var(--color-text-secondary); }
.text-tertiary { color: var(--color-text-tertiary); }
.text-accent { color: var(--color-accent-blue); }
.text-success { color: var(--color-status-success); }
.text-warning { color: var(--color-status-warning); }
.text-error { color: var(--color-status-error); }
```

## Animation Utilities

### Keyframe Animations

```css
/* Pulse animation for live indicators */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Fade in animation */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up animation */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Animation Classes

| Class | Animation | Duration | Easing |
|-------|-----------|----------|--------|
| `.pulse` | `pulse` | `var(--transition-base)` (200ms) | `cubic-bezier(0.4, 0, 0.6, 1)` |
| `.fade-in` | `fadeIn` | `var(--transition-base)` (200ms) | (linear) |
| `.slide-up` | `slideUp` | `var(--transition-slow)` (300ms) | `cubic-bezier(0.34, 1.56, 0.64, 1)` |

## Component Base Styles

### Card Base

```css
.card {
  background: var(--color-bg-elevated);
  border-radius: var(--radius-lg); /* 16px */
  border: 1px solid var(--color-border-default);
  transition: all var(--transition-base);
  box-shadow: var(--shadow-xs);
}

.card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
```

- White background, large border radius (16px)
- Subtle shadow on default
- Hover state: Stronger border, medium shadow, slight lift (-2px)

### Button Base

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  font-size: var(--font-size-md);
  font-weight: 500;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
  white-space: nowrap;
}
```

- Flexbox layout for centering
- 8px gap between icon and text
- Padding: 12px vertical, 20px horizontal
- Medium font weight (500)
- Medium border radius (12px)
- Fast transition on all properties
- No text wrapping

### Primary Button

```css
.btn-primary {
  background: var(--color-accent-blue);
  color: white;
}

.btn-primary:hover {
  background: var(--color-accent-blue-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.btn-primary:active {
  background: var(--color-accent-blue-active);
  transform: translateY(0);
}
```

- Blue background, white text
- Hover: Darker blue, slight lift (-1px), small shadow
- Active: Darkest blue, no lift (pressed down)

### Secondary Button

```css
.btn-secondary {
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-default);
}

.btn-secondary:hover {
  background: var(--color-bg-secondary);
  border-color: var(--color-border-strong);
}
```

- White background, default border
- Hover: Light gray background, stronger border

### Badge Styles

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  font-size: var(--font-size-xs); /* 12px */
  font-weight: 600;
  border-radius: 99px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

- Compact padding (4px vertical, 10px horizontal)
- Small font (12px), semi-bold (600)
- Fully rounded (pill shape)
- Uppercase with slight letter spacing

## Scrollbar Styling

Apple-style custom scrollbars.

```css
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

::-webkit-scrollbar-track {
  background: transparent;
  border-radius: var(--radius-xs);
}

::-webkit-scrollbar-thumb {
  background: var(--color-border-default);
  border-radius: var(--radius-xs);
  border: 3px solid transparent;
  background-clip: padding-box;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-strong);
  border-radius: var(--radius-xs);
}
```

- 10px width/height (consistent with track)
- Transparent track
- Thumb with 3px transparent border for padding
- Thumb uses border-radius-xs (6px)
- Hover state: Stronger border color

## Layout Shell

### App Container

```css
.app-container {
  display: flex;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  background: var(--color-bg-base);
}
```

- Flexbox layout
- Full viewport height
- No overflow (scroll handled by children)
- Light gray background

### Sidebar

```css
.sidebar {
  display: flex;
  flex-direction: column;
  width: 300px;
  height: 100vh;
  background: var(--color-bg-elevated);
  border-right: 1px solid var(--color-border-default);
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar::-webkit-scrollbar {
  width: 0;
}

.sidebar:hover::-webkit-scrollbar {
  width: 10px;
}
```

- Fixed width: 300px
- Full height with vertical scroll
- White background with right border
- Scrollbar hidden until hover

### Main Content

```css
.main-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--color-bg-base);
  padding-top: 70px;
}
```

- Flex grow (fills remaining space)
- Vertical scroll, no horizontal scroll
- Light gray background
- Top padding: 70px (for fixed header)

### Top Bar

```css
.top-bar {
  position: fixed;
  top: 0;
  left: 300px;
  right: 0;
  height: 70px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--color-border-default);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-lg);
  z-index: var(--z-fixed);
}
```

- Fixed position
- Starts after sidebar (300px left)
- Height: 70px
- Semi-transparent white with blur backdrop
- Flexbox layout
- Z-index: 300 (fixed level)

## Focus Management

### Focus Visible

Focus styles use `:focus-visible` to show focus ring only on keyboard navigation, not mouse clicks.

```css
button:focus-visible {
  outline: 2px solid var(--color-accent-blue);
  outline-offset: 2px;
}

input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: var(--color-accent-blue);
  box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.1);
}
```

- Buttons: 2px blue outline with 2px offset
- Inputs: Blue border + blue box-shadow (3px, 10% opacity)

## Notes

- Global styles follow Apple Design System conventions
- Focus states are keyboard-only (no outline on mouse clicks)
- Scrollbars are custom-styled but hidden until hover on sidebar
- All transitions use CSS variables for consistency
- Typography uses antialiasing and kerning for crisp text
