# Input

## Purpose

Inputs allow users to enter and edit text data. They support validation, states, and accessibility features.

## Structure

```tsx
<div className="form-group">
  <label htmlFor="session-name">Session Name</label>
  <input
    id="session-name"
    type="text"
    className="form-input"
    placeholder="Enter session name"
  />
  {error && <span className="field-error">Error message</span>}
</div>
```

## Base Styles

**Class:** `.form-group` (wrapper)

```css
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm); /* 8px */
  position: relative;
}
```

**Class:** `input`, `textarea`, `select`

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
```

**Properties:**
- Inherits font family and size from parent
- White background
- Default border color
- Medium border radius (12px)
- Padding: 12px vertical, 20px horizontal
- Fast transition on border color

## States

### Default State

```css
input {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border-default);
  color: var(--color-text-primary);
}
```

### Focus State

```css
input:focus, textarea:focus, select:focus {
  outline: none;
  border-color: var(--color-accent-blue);
  box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.1);
}
```

**Visual indicators:**
- Blue border (#0071e3)
- Blue box-shadow: 3px spread, 10% opacity
- No outline (handled by box-shadow)

### Disabled State

```css
input:disabled, textarea:disabled, select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

**Behavior:**
- 50% opacity
- Not-allowed cursor
- Cannot be focused or edited

### Error State

```css
.input-error {
  border-color: var(--color-status-error);
  background: rgba(255, 59, 48, 0.05);
}

.input-error:focus {
  border-color: var(--color-status-error);
  box-shadow: 0 0 0 3px rgba(255, 59, 48, 0.1);
}
```

**Visual indicators:**
- Red border
- Light red background tint
- Red focus ring

## Label

**Class:** `.form-group label`

```css
.form-group label {
  font-size: var(--font-size-xs); /* 12px */
  color: var(--color-text-tertiary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

**Properties:**
- Small font (12px)
- Tertiary text color (light gray)
- Semi-bold (600)
- Uppercase
- Slight letter spacing (0.05em)

## Placeholder

```css
input::placeholder, textarea::placeholder {
  color: var(--color-text-quaternary);
}
```

**Color:** Quaternary text (30% black)

## Error Message

**Class:** `.field-error`

```css
.field-error {
  color: var(--color-status-error);
  font-size: var(--font-size-xs);
  margin-top: 2px;
}
```

**Properties:**
- Red text
- Small font (12px)
- Top margin: 2px

## Validation Messages

### Success Message

**Class:** `.success-message`

```css
.success-message {
  background: rgba(52, 199, 89, 0.1);
  color: var(--color-status-success);
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-lg);
  font-size: var(--font-size-sm);
  border: 1px solid rgba(52, 199, 89, 0.2);
}
```

### Error Message

**Class:** `.error-message`

```css
.error-message {
  background: rgba(255, 59, 48, 0.1);
  color: var(--color-status-error);
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-lg);
  font-size: var(--font-size-sm);
  border: 1px solid rgba(255, 59, 48, 0.2);
}
```

## Input Types

### Text Input

```tsx
<input
  type="text"
  placeholder="Enter text"
/>
```

### Number Input

```tsx
<input
  type="number"
  min="0"
  max="100"
  step="1"
/>
```

### Email Input

```tsx
<input
  type="email"
  placeholder="you@example.com"
/>
```

### Textarea

```tsx
<textarea
  rows="4"
  placeholder="Enter description"
/>
```

**Additional styles:**
- Min-height for better touch target
- Vertical resize only (user-controlled)

### Select

```tsx
<select>
  <option value="">Select an option</option>
  <option value="option1">Option 1</option>
  <option value="option2">Option 2</option>
</select>
```

**Note:** Select elements inherit base input styles.

## Input Suffix

**Class:** `.input-suffix`

**Usage:** Display additional info (e.g., character count, unit) inside input

```tsx
<div className="form-group">
  <label htmlFor="value">Value</label>
  <input
    id="value"
    type="number"
    className="has-suffix"
  />
  <span className="input-suffix">units</span>
</div>
```

```css
.input-suffix {
  position: absolute;
  right: var(--spacing-lg);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-tertiary);
  font-size: var(--font-size-xs);
  pointer-events: none;
}

.form-group-compact .input-suffix {
  right: var(--spacing-lg);
  top: calc(50% + 18px);
}
```

**Properties:**
- Absolute positioning
- Right-aligned
- Vertically centered
- Small font (12px)
- Pointer events: none (clicks pass through to input)

## Form Row

**Class:** `.form-row`

**Usage:** Display two inputs side-by-side

```tsx
<div className="form-row">
  <div className="form-group">
    <label>Field 1</label>
    <input type="text" />
  </div>
  <div className="form-group form-group-compact">
    <label>Field 2</label>
    <input type="text" />
  </div>
</div>
```

```css
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-md); /* 12px */
}

.form-group-compact {
  flex: 1;
}
```

## Accessibility

### Labels

**Best practices:**
- Use `<label>` element with `htmlFor` attribute
- Labels should be descriptive and concise
- Avoid placeholder-only labels (WCAG violation)

```tsx
<label htmlFor="email">Email Address</label>
<input id="email" type="email" />
```

### ARIA Attributes

```tsx
<input
  type="text"
  aria-label="Session name"
  aria-describedby="session-name-help"
  aria-invalid={hasError}
  aria-required="true"
  required
/>
```

**Common attributes:**
- `aria-label`: Accessible name (use if label is not visible)
- `aria-describedby`: Links to helper text
- `aria-invalid`: Indicates validation error
- `aria-required`: Indicates required field
- `required`: Native HTML5 validation

### Focus Management

- Tab order: Follows DOM order
- Focus indicator: Blue border + box-shadow
- Enter key: Submits form (if in form)

### Touch Targets

Minimum touch target: **44×44px**

Current input with padding (12px vertical) + 16px font height meets requirement.

## Examples

### Basic Input

```tsx
<div className="form-group">
  <label htmlFor="name">Session Name</label>
  <input id="name" type="text" placeholder="Enter session name" />
</div>
```

### With Error

```tsx
<div className="form-group">
  <label htmlFor="name">Session Name</label>
  <input
    id="name"
    type="text"
    className="input-error"
    aria-invalid="true"
  />
  <span className="field-error">Session name is required</span>
</div>
```

### With Suffix

```tsx
<div className="form-group">
  <label htmlFor="duration">Duration</label>
  <input id="duration" type="number" />
  <span className="input-suffix">minutes</span>
</div>
```

### Form Row

```tsx
<div className="form-row">
  <div className="form-group">
    <label>Min Agents</label>
    <input type="number" min="1" />
  </div>
  <div className="form-group form-group-compact">
    <label>Max Agents</label>
    <input type="number" min="1" />
  </div>
</div>
```

### Textarea

```tsx
<div className="form-group">
  <label htmlFor="description">Description</label>
  <textarea
    id="description"
    rows="4"
    placeholder="Enter description"
  />
</div>
```

## Notes

- Always use visible `<label>` elements, not placeholders
- Error messages should be displayed near the problem field
- Use `aria-invalid` and `aria-describedby` for screen readers
- Disabled inputs must have visual indication (opacity, not-allowed cursor)
- Focus state uses blue border + box-shadow (no outline)
- Transition: 150ms fast on border color
