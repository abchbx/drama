# Design Tokens

## Overview

DramaFlow uses Apple Design System-inspired design tokens with a light theme. All tokens are defined as CSS custom properties in `frontend/src/index.css`.

## Colors

### Background Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg-base` | `#f5f5f7` | Main background (app-level) |
| `--color-bg-elevated` | `#ffffff` | Cards, panels, surfaces |
| `--color-bg-secondary` | `#f0f0f2` | Hover states, secondary backgrounds |
| `--color-bg-tertiary` | `#e5e5e7` | Tertiary backgrounds, badges |
| `--color-bg-hover` | `#dbdbdd` | Hover states for interactive elements |

### Border Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-border-subtle` | `rgba(0, 0, 0, 0.06)` | Subtle borders, dividers |
| `--color-border-default` | `rgba(0, 0, 0, 0.1)` | Default borders |
| `--color-border-strong` | `rgba(0, 0, 0, 0.15)` | Strong borders, focus states |

### Text Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-text-primary` | `rgba(0, 0, 0, 0.92)` | Primary text, headings |
| `--color-text-secondary` | `rgba(0, 0, 0, 0.65)` | Secondary text, descriptions |
| `--color-text-tertiary` | `rgba(0, 0, 0, 0.45)` | Tertiary text, labels |
| `--color-text-quaternary` | `rgba(0, 0, 0, 0.30)` | Quaternary text, placeholders |

### Accent Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-accent-blue` | `#0071e3` | Primary action, links |
| `--color-accent-blue-hover` | `#005bb5` | Blue hover state |
| `--color-accent-blue-active` | `#004494` | Blue active state |
| `--color-accent-green` | `#34c759` | Success states |
| `--color-accent-orange` | `#ff9500` | Warning states |
| `--color-accent-red` | `#ff3b30` | Error states |
| `--color-accent-yellow` | `#ffcc00` | Warning highlights |
| `--color-accent-purple` | `#af52de` | Decorative accents |
| `--color-accent-pink` | `#ff2d55` | Decorative accents |

### Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-status-success` | `var(--color-accent-green)` | Success indicators |
| `--color-status-warning` | `var(--color-accent-yellow)` | Warning indicators |
| `--color-status-error` | `var(--color-accent-red)` | Error indicators |
| `--color-status-info` | `var(--color-accent-blue)` | Info indicators |
| `--color-bg-overlay` | `rgba(0, 0, 0, 0.4)` | Modal backdrops |
| `--color-fill-default` | `rgba(0, 0, 0, 0.05)` | Default fill backgrounds |
| `--color-fill-hover` | `rgba(0, 0, 0, 0.08)` | Hover fill backgrounds |
| `--color-fill-active` | `rgba(0, 0, 0, 0.12)` | Active fill backgrounds |

## Typography

### Font Families

| Token | Value | Usage |
|-------|-------|-------|
| `--font-family-base` | `-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` | Base font stack |

### Font Sizes

| Token | Value | Usage |
|-------|-------|-------|
| `--font-size-xs` | `12px` | Small labels, badges |
| `--font-size-sm` | `14px` | Secondary text |
| `--font-size-md` | `16px` | Body text, inputs |
| `--font-size-lg` | `18px` | Large body, subheadings |
| `--font-size-xl` | `22px` | Large headings |
| `--font-size-2xl` | `26px` | Page headings |
| `--font-size-3xl` | `32px` | Hero headings |

### Line Heights

| Token | Value | Usage |
|-------|-------|-------|
| `--line-height-tight` | `1.3` | Headings, compact text |
| `--line-height-normal` | `1.6` | Body text, paragraphs |
| `--line-height-relaxed` | `1.8` | Relaxed text, descriptions |

### Font Weights

| Weight | Value | Usage |
|--------|-------|-------|
| Light | 300 | Not currently used |
| Regular | 400 | Body text, labels |
| Medium | 500 | Emphasized text |
| Semi-bold | 600 | Headings, labels |
| Bold | 700 | Strong emphasis |

## Spacing

DramaFlow uses a **12pt-based spacing system** for a more spacious, modern feel.

| Token | Value | Usage |
|-------|-------|-------|
| `--spacing-xs` | `4px` | Tight spacing, gaps |
| `--spacing-sm` | `8px` | Small spacing, adjacent elements |
| `--spacing-md` | `12px` | Medium spacing, component padding |
| `--spacing-lg` | `20px` | Large spacing, section gaps |
| `--spacing-xl` | `28px` | Extra large spacing |
| `--spacing-2xl` | `40px` | Double extra large spacing |

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-xs` | `6px` | Small elements, badges |
| `--radius-sm` | `8px` | Cards, buttons, inputs |
| `--radius-md` | `12px` | Medium cards, panels |
| `--radius-lg` | `16px` | Large cards, containers |
| `--radius-xl` | `20px` | Extra large containers |
| `--radius-full` | `99px` | Pills, rounded elements |

## Shadows

Apple-inspired layered shadow system for elevation.

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-xs` | `0 1px 2px rgba(0, 0, 0, 0.04)` | Subtle elevation |
| `--shadow-sm` | `0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)` | Small elevation |
| `--shadow-md` | `0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)` | Medium elevation |
| `--shadow-lg` | `0 10px 15px rgba(0, 0, 0, 0.12), 0 4px 6px rgba(0, 0, 0, 0.08)` | Large elevation |
| `--shadow-xl` | `0 20px 25px rgba(0, 0, 0, 0.15), 0 10px 10px rgba(0, 0, 0, 0.1)` | Extra large elevation |

## Transitions

| Token | Value | Usage |
|-------|-------|-------|
| `--transition-fast` | `150ms cubic-bezier(0.4, 0, 0.2, 1)` | Micro-interactions, hover states |
| `--transition-base` | `200ms cubic-bezier(0.4, 0, 0.2, 1)` | Standard transitions |
| `--transition-slow` | `300ms cubic-bezier(0.4, 0, 0.2, 1)` | Slow transitions, page changes |
| `--transition-spring` | `500ms cubic-bezier(0.34, 1.56, 0.64, 1)` | Spring animations |

## Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--z-dropdown` | `100` | Dropdowns |
| `--z-sticky` | `200` | Sticky elements |
| `--z-fixed` | `300` | Fixed headers, sidebars |
| `--z-modal-backdrop` | `400` | Modal backdrops |
| `--z-modal` | `500` | Modals |
| `--z-popover` | `600` | Popovers |
| `--z-tooltip` | `700` | Tooltips |

## Breakpoints

| Name | Value | Usage |
|------|-------|-------|
| Mobile | `375px` | Mobile devices |
| Tablet | `768px` | Tablet devices |
| Desktop | `1024px` | Desktop devices |
| Large | `1440px` | Large desktop devices |

## Notes

- All colors are RGBA with transparency for subtle, layered effects
- Spacing system uses 12pt base for a more spacious, modern feel (vs typical 8pt)
- Transitions use cubic-bezier easing for natural motion
- Shadows follow Apple's layered elevation system
- Typography uses Apple's SF Pro-inspired stack with system fallbacks
