# Stack Research: Frontend & Documentation (v1.2)

**Domain:** Frontend Interface & Documentation for Multi-Agent Drama System
**Researched:** 2026-03-21
**Confidence:** HIGH

## Overview

This document describes the **additional** stack components needed for v1.2. The existing backend stack from v1.1 remains unchanged and is reused as-is. This is purely additive.

---

## Recommended Stack Additions

### Core Frontend Framework
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React | 19.x | UI component library | Industry-standard for real-time applications, excellent TypeScript support, large ecosystem, integrates seamlessly with Socket.IO. Functional components with hooks provide clean state management for real-time updates. |
| TypeScript | 5.5 | Type-safe development | Reusing existing backend TS version ensures consistency, catches type errors at compile time, improves IDE support. Shares type definitions with backend for message schemas. |
| Vite | 6.x | Frontend build tool | Blazing fast HMR (Hot Module Replacement) for real-time development, optimized production builds, minimal configuration, TypeScript-first design. Outperforms Webpack for modern React apps. |

### UI Components & Styling
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| shadcn/ui | 2.x | Component primitives | Unstyled, accessible component primitives built on Radix UI. Copy-paste into project, customize with Tailwind. No npm packages to maintain, full control over styling. |
| Radix UI | 2.x | Accessibility primitives | WCAG-compliant, keyboard-navigable, screen-reader friendly. Industry standard for accessible React components. |
| Tailwind CSS | 4.x | Utility-first CSS | Rapid UI development, consistent design system, excellent integration with shadcn/ui. Built-in purging for production builds. |
| Lucide React | 0.44x | Icon library | Modern, consistent SVG icons, tree-shakeable, TypeScript support. |

### Real-Time Communication
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| socket.io-client | 4.8+ | Real-time client | Official client library, perfectly compatible with existing Socket.IO backend (v4.x). Automatic reconnection, heartbeat support, binary data support. |
| Zustand | 5.x | State management | Lightweight, simple API, minimal boilerplate. Perfect for real-time state updates without Redux complexity. Integrates with React DevTools. |

### Documentation
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Docusaurus | 3.5+ | Documentation site | First-class TypeScript support, MDX 3.0 for interactive docs, versioning, search, i18n. Built-in TypeDoc integration for API docs. Maintained by Meta, large ecosystem. |
| TypeDoc | 0.27+ | API documentation | Extracts type information from TypeScript source files, generates interactive API docs. Integrates seamlessly with Docusaurus via `@docusaurus/typedoc-api`. |
| MDX | 3.0 | Interactive markdown | Embed React components in documentation. Perfect for interactive examples and live demos. |

### Testing
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vitest | 3.x | Unit & integration tests | Vite-native, fast, Jest-compatible API. First-class TypeScript support, HMR for tests, excellent React integration. |
| React Testing Library | 16.x | Component testing | User-centric testing, encourages best practices, works with Vitest. |
| Playwright | 1.49+ | E2E testing | Cross-browser automation, TypeScript-first, reliable tests. Can test real-time Socket.IO functionality across browsers. |

## Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx | 2.1+ | Class name utilities | Conditional Tailwind class composition |
| tailwind-merge | 2.5+ | Tailwind class merging | Safely merge Tailwind classes without conflicts |
| date-fns | 4.1+ | Date utilities | Formatting timestamps for agent messages |
| react-hook-form | 7.53+ | Form management | Session configuration forms, type-safe with Zod integration |
| @hookform/resolvers | 3.9+ | Zod form validation | Connect Zod schemas (shared with backend) to react-hook-form |
| react-syntax-highlighter | 15.6+ | Code syntax highlighting | Display JSON messages, API examples, script outputs |
| recharts | 2.12+ | Data visualization | Token usage charts, memory layer visualization, agent activity graphs |
| framer-motion | 12.x | Animations | Smooth transitions for real-time updates, expand/collapse panels |
| usehooks-ts | 3.1+ | React hooks collection | Type-safe utility hooks (useLocalStorage, useDebounce, etc.) |

## Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| React DevTools | Debug React components | Browser extension for inspecting React component tree and state |
| ESLint (React plugins) | React-specific linting | Add `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` to existing config |
| Prettier | Code formatting | Reuse backend Prettier config for consistency |
| HMR (Vite) | Hot module replacement | Built-in, instant updates without page reload during development |

---

## Installation

### Project Structure

```
drama/
├── src/                    # Existing backend (unchanged)
├── frontend/               # NEW: Frontend application
├── docs/                   # NEW: Documentation site
└── ... existing files ...
```

### Frontend Setup

```bash
# Initialize Vite React TypeScript project
npm create vite@latest frontend -- --template react-ts
cd frontend

# Core dependencies
npm install react@19 react-dom@19 zustand socket.io-client

# UI components & styling
npm install tailwindcss@4 postcss autoprefixer
npm install lucide-react clsx tailwind-merge framer-motion
# shadcn/ui is copy-paste, no npm install needed

# Form handling & validation (reuse Zod from backend)
npm install react-hook-form @hookform/resolvers

# Utilities
npm install date-fns react-syntax-highlighter recharts usehooks-ts

# Dev dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test
npm install -D eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-react-refresh

# Initialize Tailwind
npx tailwindcss init -p
```

### Documentation Setup

```bash
# Initialize Docusaurus in docs/ directory
npx create-docusaurus@latest docs classic --typescript
cd docs

# Add TypeDoc integration
npm install @docusaurus/typedoc-api typedoc
```

### Backend Updates (Minimal)

```bash
# In root directory - update CORS config if needed
# (already handled via Express CORS middleware, just add FRONTEND_URL to .env)
```

---

## Integration with Existing Backend

### Shared Type Definitions

Create a shared types package or symlink to reuse backend types:

```typescript
// frontend/src/types/shared.ts - re-export from backend
export type {
  Message,
  BlackboardState,
  AgentConfig,
  DramaSessionConfig
} from '../../../src/types/index.js';

// Re-export Zod schemas too
export {
  messageSchema,
  blackboardStateSchema,
  agentConfigSchema
} from '../../../src/schemas/index.js';
```

### CORS Configuration

Update backend Express CORS middleware (already exists, just configure):

```typescript
// src/middleware/cors.ts
import cors from 'cors';

export const corsMiddleware = cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
});
```

### Socket.IO Client Integration Pattern

```typescript
// frontend/src/lib/socket.ts
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000', {
  transports: ['websocket', 'polling'],
  autoConnect: false // Connect explicitly after user config
});

export function useSocket() {
  return { socket, isConnected: socket.connected };
}
```

### Zustand Store for Real-Time State

```typescript
// frontend/src/store/useDramaStore.ts
import { create } from 'zustand';
import type { Message, BlackboardState } from '../types/shared';

interface DramaStore {
  messages: Message[];
  blackboard: BlackboardState | null;
  isConnected: boolean;
  addMessage: (msg: Message) => void;
  updateBlackboard: (state: BlackboardState) => void;
  setConnected: (connected: boolean) => void;
}

export const useDramaStore = create<DramaStore>((set) => ({
  messages: [],
  blackboard: null,
  isConnected: false,
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  updateBlackboard: (blackboard) => set({ blackboard }),
  setConnected: (isConnected) => set({ isConnected })
}));
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| React 19 | Vue 3.5 | If team has existing Vue expertise; Vue also works well with Socket.IO but smaller real-time ecosystem |
| React 19 | Svelte 5 | For smaller projects; Svelte has excellent DX and smaller bundle sizes, but smaller ecosystem for complex real-time apps |
| Vite 6 | Webpack 5 | If needing extensive custom plugin ecosystem; Webpack is more flexible but slower |
| shadcn/ui | NextUI 3 | If wanting pre-styled components out of the box; NextUI is excellent but less customizable |
| shadcn/ui | MUI 6 | If needing enterprise-grade components with full theming; MUI is heavier but more comprehensive |
| Zustand 5 | Redux Toolkit 2 | If needing devtools, time-travel debugging, and more structured state for very large apps |
| Docusaurus 3 | MkDocs Material 9 | If preferring Python-based tooling; MkDocs is simpler but less TypeScript-integrated |
| Vitest 3 | Jest 30 | If needing mature ecosystem and existing Jest configs; Jest is slower but more established |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Create React App (CRA) | Deprecated, no longer maintained, slow builds | Vite |
| Webpack without good reason | Overkill for modern React, slower HMR, more config | Vite |
| Material-UI (MUI) for this project | Too heavy, opinionated styling conflicts with custom design needs | shadcn/ui + Tailwind |
| Redux (vanilla) | Boilerplate-heavy, unnecessary complexity for this app's scale | Zustand |
| Socket.IO v3 client | Incompatible with Socket.IO v4 server | socket.io-client v4.8+ |
| React Class Components | Verbose, poorer hooks integration, real-time state management harder | Functional Components with Hooks |
| jQuery | DOM manipulation conflicts with React's virtual DOM | React's built-in state management |
| Gatsby | Overkill for documentation; better for marketing sites | Docusaurus |
| Styled Components | Runtime overhead, Tailwind + shadcn/ui is better fit for this project | Tailwind CSS |
| Adding new backend dependencies | v1.2 is frontend-only; backend is feature-complete | Reuse existing backend stack |

---

## Stack Patterns by Variant

**If real-time visualization becomes complex:**
- Add `@tanstack/react-query` for server state management
- Because: Provides caching, invalidation, and loading states for REST API calls alongside Socket.IO

**If testing Socket.IO interactions becomes difficult:**
- Use `socket.io-mock` for unit tests
- Because: Allows testing client components without a running server

**If needing script export to PDF:**
- Add `react-pdf` or `jspdf`
- Because: Generates PDFs from React components or JSON script data

**If multiple frontend environments needed:**
- Use Vite's `.env` files (`.env.development`, `.env.production`)
- Because: Built into Vite, type-safe with `ImportMetaEnv` interface

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| React 19 | TypeScript 5.5+ | React 19 requires TypeScript 5.5 or newer |
| Vite 6 | React 18+ | Vite 6 works with React 18 and 19 |
| socket.io-client 4.8 | socket.io 4.x | Must match major version with server (already using 4.x) |
| Tailwind CSS 4 | PostCSS 8+ | Tailwind 4 uses PostCSS 8 under the hood |
| Docusaurus 3.5 | React 18 | Docusaurus 3.x uses React 18 internally |
| TypeDoc 0.27 | TypeScript 5.0-5.6 | Check TypeDoc version matrix for exact TS compatibility (we use 5.5) |
| Zustand 5 | React 18+ | Zustand 5 requires React 18 or newer |
| Vitest 3 | Vite 5-6 | Vitest 3 is designed for Vite 5 and 6 |
| Zod 3.x | react-hook-form 7.x | Already using Zod in backend; @hookform/resolvers connects them |

---

## Backend Stack Reuse (NO CHANGES)

The following backend stack remains completely unchanged from v1.1:

- Node.js 22 LTS
- TypeScript 5.5
- Express.js
- Socket.IO v4.x
- Zod
- tiktoken
- pino
- All existing tests and utilities

**NO DEPENDENCY CHANGES TO BACKEND.** v1.2 is purely additive on the frontend/documentation side.

---

## Sources

- [Socket.IO - React tutorial](https://socket.io/docs/v4/tutorial/introduction) — Socket.IO React integration patterns
- [Docusaurus](https://docusaurus.io) — Documentation tool for TypeScript projects
- [Vite](https://vitejs.dev) — Modern frontend build tool
- [shadcn/ui](https://ui.shadcn.com) — Component library built on Radix UI
- [Zustand](https://github.com/pmndrs/zustand) — Lightweight state management
- [Vitest](https://vitest.dev) — Vite-native testing framework
- [Playwright](https://playwright.dev) — Cross-browser E2E testing

---
*Stack research for: Frontend Interface & Documentation (v1.2)*
*Researched: 2026-03-21*
