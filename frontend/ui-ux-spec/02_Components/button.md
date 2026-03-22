# Button

## Purpose

Buttons are interactive elements that trigger actions or navigation. They support multiple variants for different visual hierarchies.

## Structure

```tsx
<button className="btn btn-primary|btn-secondary">
  {icon && <span className="btn-icon">{icon}</span>}
  <span className="btn-label">Label</span>
</button>
```

## Variants

### Primary Button

**Class:** `.btn .btn-primary`

**Usage:** Primary call-to-action, most important action on screen

**States:**

| State | Background | Text | Transform | Shadow |
|-------|-----------|-------|-----------|---------|
| Default | `--color-accent-blue` (#0071e3) | white | none | none |
| Hover | `--color-accent-blue-hover` (#005bb5) | white | translateY(-1px) | `--shadow-sm` |
| Active | `--color-accent-blue-active` (#004494) | white | translateY(0) | none |
| Disabled | `--color-accent-blue` (50% opacity) | white | none | none |
| Focus | — | — | — | 2px blue outline (offset 2px) |

**Code:**

```css
.btn-primary {
  background: var(--color-accent-blue);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-accent-blue-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.btn-primary:active:not(:disabled) {
  background: var(--color-accent-blue-active);
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary:focus-visible {
  outline: 2px solid var(--color-accent-blue);
  outline-offset: 2px;
}
```

### Secondary Button

**Class:** `.btn .btn-secondary`

**Usage:** Secondary actions, cancel buttons, less emphasized actions

**States:**

| State | Background | Text | Border | Hover Background |
|-------|-----------|-------|--------|------------------|
| Default | `--color-bg-elevated` (#ffffff) | `--color-text-primary` | `--color-border-default` | — |
| Hover | `--color-bg-secondary` (#f0f0f2) | `--color-text-primary` | `--color-border-strong` | `--color-bg-secondary` |

**Code:**

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

## Base Styles

**Class:** `.btn`

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm); /* 8px */
  padding: var(--spacing-md) var(--spacing-lg); /* 12px 20px */
  font-size: var(--font-size-md); /* 16px */
  font-weight: 500;
  border-radius: var(--radius-md); /* 12px */
  transition: all var(--transition-fast); /* 150ms */
  white-space: nowrap;
}
```

**Properties:**
- Flexbox layout for centering
- Gap: 8px between icon and text
- Padding: 12px vertical, 20px horizontal
- Font size: 16px
- Font weight: 500 (medium)
- Border radius: 12px
- Transition: 150ms on all properties
- No text wrapping

## Accessibility

### Touch Targets

Minimum touch target size: **44×44px**

Current button with padding (12px vertical, 20px horizontal) + 16px font height meets requirement.

### Keyboard Navigation

- Tab order: Follows DOM order
- Focus indicator: 2px blue outline with 2px offset (focus-visible only)
- Enter/Space: Triggers button action

### ARIA Attributes

```tsx
<button
  aria-label="Create new session"
  aria-describedby="session-create-help"
>
  Create Session
</button>
```

**Best practices:**
- Use `aria-label` for icon-only buttons
- Use `aria-describedby` for additional context
- Avoid redundant labels (e.g., "Click to...")
- Keep labels concise and actionable

## Loading States

**Class:** `.btn .is-loading`

**Structure:**

```tsx
<button className="btn btn-primary is-loading" disabled>
  <span className="spinner spin"></span>
  <span className="btn-label">Loading...</span>
</button>
```

**Spinner Animation:**

```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spin {
  animation: spin 1s linear infinite;
}
```

**Behavior:**
- Button disabled during loading
- Spinner rotates continuously
- Label changes to indicate loading state
- Click events blocked

## Icon Buttons

**Class:** `.btn .btn-icon-only`

**Usage:** Buttons with icons only (e.g., close, menu, actions)

**Example:**

```tsx
<button
  className="btn btn-icon-only"
  aria-label="Close"
>
  <span className="icon">✕</span>
</button>
```

**Accessibility:**
- **Must** have `aria-label` or `aria-labelledby`
- Touch target: 44×44px minimum
- Use SVG icons for scalability

## Sizes

### Small Button

**Class:** `.btn .btn-sm`

```css
.btn-sm {
  padding: var(--spacing-sm) var(--spacing-md); /* 8px 12px */
  font-size: var(--font-size-sm); /* 14px */
}
```

### Large Button

**Class:** `.btn .btn-lg`

```css
.btn-lg {
  padding: var(--spacing-lg) var(--spacing-xl); /* 20px 28px */
  font-size: var(--font-size-lg); /* 18px */
}
```

## Examples

### Primary Action

```tsx
<button className="btn btn-primary">Create Session</button>
```

### With Icon

```tsx
<button className="btn btn-primary">
  <span className="icon">➕</span>
  Create Session
</button>
```

### Secondary Action

```tsx
<button className="btn btn-secondary">Cancel</button>
```

### Loading State

```tsx
<button className="btn btn-primary" disabled>
  <span className="spinner spin"></span>
  Creating...
</button>
```

## Notes

- Use primary buttons sparingly - each screen should have only one primary CTA
- Disabled buttons must have visual indication (opacity, not-allowed cursor)
- Icon-only buttons require `aria-label` for accessibility
- Loading state should disable button and show spinner
- Transitions use 150ms for fast, responsive feel
