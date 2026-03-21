# Technology Stack for v1.2 Frontend & Documentation

**Project:** Multi-Agent Drama System
**Researched:** 2026-03-21

## Recommended Stack

### Frontend Framework & Libraries

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **React** | 19.x | UI component library | Industry-standard for real-time applications, excellent TypeScript support, large ecosystem, integrates seamlessly with Socket.IO. Functional components with hooks provide clean state management for real-time updates. |
| **TypeScript** | 5.5 | Type-safe development | Reusing existing backend TS version ensures consistency, catches type errors at compile time, improves IDE support. Shares type definitions with backend for message schemas. |
| **Vite** | 6.x | Frontend build tool | Blazing fast HMR (Hot Module Replacement) for real-time development, optimized production builds, minimal configuration, TypeScript-first design. Outperforms Webpack for modern React apps. |
| **shadcn/ui** | 2.x | Component primitives | Unstyled, accessible component primitives built on Radix UI. Copy-paste into project, customize with Tailwind. No npm packages to maintain, full control over styling. |
| **Radix UI** | 2.x | Accessibility primitives | WCAG-compliant, keyboard-navigable, screen-reader friendly. Industry standard for accessible React components. |
| **Tailwind CSS** | 4.x | Utility-first CSS | Rapid UI development, consistent design system, excellent integration with shadcn/ui. Built-in purging for production builds. |
| **Lucide React** | 0.44x | Icon library | Modern, consistent SVG icons, tree-shakeable, TypeScript support. |
| **socket.io-client** | 4.8+ | Real-time client | Official client library, perfectly compatible with existing Socket.IO backend (v4.x). Automatic reconnection, heartbeat support, binary data support. |
| **Zustand** | 5.x | State management | Lightweight, simple API, minimal boilerplate. Perfect for real-time state updates without Redux complexity. Integrates with React DevTools. |

### Backend Enhancements

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **express-static-gzip** | 2.2.0 | Static file serving | Compression support, better performance |
| **cors** | 2.8.5 | Cross-origin resource sharing | Security for frontend API calls |
| **@asteasolutions/zod-to-openapi** | 4.0.0 | OpenAPI 3.1 generation | Generates OpenAPI from Zod schemas |
| **swagger-ui-express** | 5.0.0 | Interactive API docs | Built into Express, allows testing API endpoints directly |

### Documentation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Docusaurus** | 3.5+ | Documentation site | First-class TypeScript support, MDX 3.0 for interactive docs, versioning, search, i18n. Built-in TypeDoc integration for API docs. Maintained by Meta, large ecosystem. |
| **TypeDoc** | 0.27+ | API documentation | Extracts type information from TypeScript source files, generates interactive API docs. Integrates seamlessly with Docusaurus via `@docusaurus/typedoc-api`. |
| **MDX** | 3.0 | Interactive markdown | Embed React components in documentation. Perfect for interactive examples and live demos. |

### Development Tools

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Vitest** | 3.x | Unit & integration tests | Vite-native, fast, Jest-compatible API. First-class TypeScript support, HMR for tests, excellent React integration. |
| **React Testing Library** | 16.x | Component testing | User-centric testing, encourages best practices, works with Vitest. |
| **Playwright** | 1.49+ | E2E testing | Cross-browser automation, TypeScript-first, reliable tests. Can test real-time Socket.IO functionality across browsers. |

## Frontend Package.json

```json
{
  "name": "drama-frontend",
  "version": "1.2.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src --ext ts,tsx"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zustand": "^5.0.0",
    "socket.io-client": "^4.8.0",
    "lucide-react": "^0.440.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0",
    "framer-motion": "^12.0.0",
    "date-fns": "^4.1.0",
    "react-hook-form": "^7.53.0",
    "@hookform/resolvers": "^3.9.0",
    "react-syntax-highlighter": "^15.6.0",
    "recharts": "^2.12.0",
    "usehooks-ts": "^3.1.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/socket.io-client": "^3.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.17",
    "eslint": "^8.57.0",
    "eslint-plugin-react": "^7.34.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "postcss": "^8.4.35",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.5.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.1.0"
  }
}
```

## Backend Package.json Modifications

```json
{
  "scripts": {
    "dev:frontend": "cd src/frontend && npm run dev",
    "dev:docs": "cd docs && npm start",
    "build:frontend": "cd src/frontend && npm install && npm run build",
    "build:docs": "cd docs && npm run build",
    "build": "tsc && npm run build:frontend && npm run build:docs"
  },
  "dependencies": {
    "express-static-gzip": "^2.2.0",
    "cors": "^2.8.5",
    "@asteasolutions/zod-to-openapi": "^4.0.0",
    "swagger-ui-express": "^5.0.0"
  }
}
```

## Installation

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

# Form handling & validation
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

## Integration with Existing Backend

### Shared Type Definitions

Create a shared types package or symlink to reuse backend types:

```typescript
// frontend/src/types/shared.ts - re-export from backend
export type {
  RoutingMessage,
  BlackboardEntry,
  LayerReadResponse,
  SceneConfig,
  SceneResult,
  DramaResult
} from '../../../src/types/index.js';

// Re-export Zod schemas too
export {
  RoutingMessageSchema,
  SceneConfigSchema,
  BlackboardEntrySchema
} from '../../../src/types/index.js';
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
import type { RoutingMessage, BlackboardEntry, LayerReadResponse } from '../types/shared';

interface DramaStore {
  messages: RoutingMessage[];
  layers: Record<string, LayerReadResponse | null>;
  agents: Array<{ id: string; role: string; status: string }>;
  isConnected: boolean;
  addMessage: (msg: RoutingMessage) => void;
  updateLayer: (layer: string, data: LayerReadResponse) => void;
  updateAgents: (agents: Array<{ id: string; role: string; status: string }>) => void;
  setConnected: (connected: boolean) => void;
}

export const useDramaStore = create<DramaStore>((set) => ({
  messages: [],
  layers: {
    core: null,
    scenario: null,
    semantic: null,
    procedural: null
  },
  agents: [],
  isConnected: false,
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  updateLayer: (layer, data) => set((state) => ({
    layers: { ...state.layers, [layer]: data }
  })),
  updateAgents: (agents) => set({ agents }),
  setConnected: (isConnected) => set({ isConnected })
}));
```

## Sources

- [Socket.IO - React tutorial](https://socket.io/docs/v4/tutorial/introduction) — Socket.IO React integration patterns
- [Docusaurus](https://docusaurus.io) — Documentation tool for TypeScript projects
- [Vite](https://vitejs.dev) — Modern frontend build tool
- [shadcn/ui](https://ui.shadcn.com) — Component library built on Radix UI
- [Zustand](https://github.com/pmndrs/zustand) — Lightweight state management
- [Vitest](https://vitest.dev) — Vite-native testing framework
- [Playwright](https://playwright.dev) — Cross-browser E2E testing
