# Architecture for v1.2 Frontend & Documentation

**Project:** Multi-Agent Drama System
**Version:** v1.2
**Researched:** 2026-03-21
**Confidence:** HIGH

## Recommended Architecture Overview

The v1.2 architecture extends the existing multi-agent drama system with a modern frontend interface and comprehensive documentation. The frontend will provide real-time visualization of agent communication and blackboard state, while the documentation will make the system accessible to non-technical users.

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend Layer                              │
├─────────────────────────────────────────────────────────────────┤
│ • React 18 UI components with TypeScript 5.5                     │
│ • Zustand for client-side state management                       │
│ • Socket.IO client for real-time communication                   │
│ • Responsive design with Tailwind CSS 3.x                        │
│ • Recharts for data visualization (agent communication graphs)  │
└─────────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP API + Socket.IO
                          │
┌─────────────────────────────────────────────────────────────────┐
│                     Backend Layer                               │
├─────────────────────────────────────────────────────────────────┤
│ • Express.js 4.19 REST API (existing)                            │
│ • Socket.IO 4.8 server for real-time messaging (existing)        │
│ • Static file serving for documentation and frontend assets     │
│ • OpenAPI 3.1 documentation generator                            │
└─────────────────────────────────────────────────────────────────┘
```

## Component Boundaries

### New Components

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Frontend App** | Interactive UI for managing drama sessions, real-time visualization | Express API, Socket.IO server |
| **Documentation Site** | Static documentation built with MkDocs or Docusaurus | Express static file server |
| **API Documentation** | OpenAPI 3.1 specification generated from TypeScript types | Express API, frontend |
| **Socket.IO Client Service** | Wrapper around Socket.IO client for connection management and event handling | Socket.IO server, Zustand store |
| **Zustand Store** | Client-side state management for session data, agent communication, blackboard state | Frontend components, Socket.IO client |

### Existing Components (Modified)

| Component | Changes |
|-----------|---------|
| **Express App** | Add static file serving middleware for frontend and documentation | |
| **RouterService** | Add Socket.IO event handlers for frontend-specific events | |
| **Session Management** | Extend with REST API endpoints for session configuration and control | |

## Data Flow

### Real-Time UI Updates from Agent Communication

```
┌──────────────────────────────────────────────────────────────┐
│  Director/Actor Agents (in-process)                        │
│  • Generate routing messages via RouterService             │
│  • Send to Socket.IO server via routing:message event      │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  RouterService (existing)                                  │
│  • Routes messages to intended recipients                   │
│  • Emits 'message:received' event with RoutingMessage       │
│  • Handles agent connection/disconnection events             │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  Socket.IO Server (existing)                                │
│  • Broadcasts messages to connected clients in 'actors' room │
│  • Emits agent state events to 'monitor' room                │
└──────────────────────────────────────────────────────────────┘
                          │
                          │ WebSocket
                          │
┌──────────────────────────────────────────────────────────────┐
│  Socket.IO Client Service (new)                             │
│  • Establishes connection with backend                       │
│  • Listens for 'routing:message' and agent state events      │
│  • Transforms raw data into typed structures                 │
│  • Calls Zustand store actions to update state                │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  Zustand Store (new)                                        │
│  • Stores session data, agent list, message history         │
│  • Manages blackboard layer snapshots                        │
│  • Provides reactive state to UI components                   │
└──────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  React UI Components (new)                                  │
│  • Real-time message feed                                    │
│  • Agent status dashboard                                    │
│  • Blackboard layer visualization                            │
│  • Session configuration form                                │
└──────────────────────────────────────────────────────────────┘
```

### Key Socket.IO Event Types for Frontend

| Event Name | Payload Type | Purpose |
|------------|--------------|---------|
| `routing:message` | `RoutingMessage` | Incoming agent communication messages |
| `agent:connected` | `{ agentId: string; role: AgentRole; socketId: string }` | Agent joins the system |
| `agent:disconnected` | `{ agentId: string; role: AgentRole; socketId: string; graceful: boolean }` | Agent leaves the system |
| `agent:unavailable` | `{ agentId: string; reason: 'timeout' | 'disconnect' | 'dead' }` | Agent becomes unavailable |
| `agent:reconnected` | `{ agentId: string }` | Agent reconnects after timeout |
| `scene:started` | `SceneStartPayload` | Director signals scene start |
| `scene:ended` | `SceneEndPayload` | Director signals scene end |
| `message:received` | `RoutingMessage` | Message received by router (internal) |

## Backend Modifications for Frontend

### New Socket.IO Room: `monitor`

The frontend will connect to a new `monitor` room to receive all agent communication events without interfering with agent communication:

```typescript
// In RouterService.registerConnection()
// Add after existing room joins
if (role === 'monitor') {
  socket.join('monitor');
}
```

### New REST API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/session` | POST | Create a new drama session |
| `/session/:dramaId` | GET | Get session status |
| `/session/:dramaId/initialize` | POST | Initialize session with character cards |
| `/session/:dramaId/scene` | POST | Start a new scene |
| `/session/:dramaId/scene/:sceneId` | GET | Get scene results |
| `/session/:dramaId/script` | GET | Export generated script |
| `/docs` | GET | Serve documentation site |
| `/api-docs` | GET | Serve OpenAPI JSON specification |

### Express App Enhancements

```typescript
// In createApp()
import path from 'node:path';

// Serve frontend static assets
app.use(express.static(path.join(process.cwd(), 'frontend/dist')));

// Serve documentation
app.use('/docs', express.static(path.join(process.cwd(), 'docs/build')));

// Fallback to index.html for SPA routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/blackboard') ||
      req.path.startsWith('/health') ||
      req.path.startsWith('/session') ||
      req.path.startsWith('/docs') ||
      req.path.startsWith('/api-docs')) {
    return next();
  }
  res.sendFile(path.join(process.cwd(), 'frontend/dist/index.html'));
});
```

## Patterns to Follow

### Pattern 1: Socket.IO Client Singleton with Zustand

```typescript
// src/frontend/services/socket.ts
import { io, type Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, (data: any) => void> = new Map();

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(url, {
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        auth: {
          role: 'monitor',
          agentId: `frontend-${crypto.randomUUID()}`,
        },
      });

      this.socket.on('connect', () => resolve());
      this.socket.on('connect_error', (error) => reject(error));
      this.socket.connect();
    });
  }

  on<T = any>(event: string, callback: (data: T) => void): void {
    if (!this.socket) return;

    const listener = (data: T) => callback(data);
    this.listeners.set(event, listener);
    this.socket.on(event, listener);
  }

  off(event: string): void {
    const listener = this.listeners.get(event);
    if (listener && this.socket) {
      this.socket.off(event, listener);
      this.listeners.delete(event);
    }
  }

  disconnect(): void {
    this.listeners.clear();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
```

```typescript
// src/frontend/store/sessionStore.ts
import { create } from 'zustand';
import { socketService } from '../services/socket';
import type { RoutingMessage, ConnectedAgent, SceneStartPayload, SceneEndPayload } from '../../types/routing';

interface SessionState {
  sessionId: string | null;
  agents: ConnectedAgent[];
  messages: RoutingMessage[];
  currentScene: SceneStartPayload | null;
  isConnected: boolean;
  isSessionActive: boolean;
  connect: (url: string) => Promise<void>;
  disconnect: () => void;
  clearMessages: () => void;
  setSessionActive: (active: boolean) => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessionId: null,
  agents: [],
  messages: [],
  currentScene: null,
  isConnected: false,
  isSessionActive: false,
  connect: async (url) => {
    try {
      await socketService.connect(url);
      set({ isConnected: true });

      socketService.on('agent:connected', (agent: ConnectedAgent) =>
        set((state) => ({ agents: [...state.agents, agent] }))
      );

      socketService.on('agent:disconnected', (data: { agentId: string }) =>
        set((state) => ({
          agents: state.agents.filter((a) => a.agentId !== data.agentId),
        }))
      );

      socketService.on('agent:unavailable', (data: { agentId: string }) =>
        // Update agent status in array
        set((state) => ({
          agents: state.agents.map(a =>
            a.agentId === data.agentId ? { ...a, status: 'unavailable' as any } : a
          ),
        }))
      );

      socketService.on('routing:message', (message: RoutingMessage) =>
        set((state) => ({ messages: [...state.messages, message] }))
      );

      socketService.on('scene:started', (payload: SceneStartPayload) =>
        set({ currentScene: payload })
      );

      socketService.on('scene:ended', (payload: SceneEndPayload) => {
        set((state) => ({
          currentScene: null,
          isSessionActive: false,
        }));
      });
    } catch (error) {
      console.error('Failed to connect:', error);
      set({ isConnected: false });
    }
  },
  disconnect: () => {
    socketService.disconnect();
    set({
      sessionId: null,
      agents: [],
      messages: [],
      currentScene: null,
      isConnected: false,
      isSessionActive: false,
    });
  },
  clearMessages: () => set({ messages: [] }),
  setSessionActive: (active) => set({ isSessionActive: active }),
}));
```

### Pattern 2: Type-Safe API Client with Zod

```typescript
// src/frontend/services/apiClient.ts
import { z } from 'zod';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

// Response schemas
const HealthResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
  snapshotLoaded: z.boolean(),
  services: z.record(z.string()),
  config: z.object({
    llmProvider: z.string(),
    logLevel: z.string(),
  }),
});

const SessionCreateResponseSchema = z.object({
  dramaId: z.string(),
  status: z.string(),
});

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async createSession(): Promise<z.infer<typeof SessionCreateResponseSchema>> {
    const response = await fetch(`${this.baseUrl}/session`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to create session');
    }

    const data = await response.json();
    return SessionCreateResponseSchema.parse(data);
  }

  async getHealth(): Promise<z.infer<typeof HealthResponseSchema>> {
    const response = await fetch(`${this.baseUrl}/health`);

    if (!response.ok) {
      throw new Error('Failed to get health');
    }

    const data = await response.json();
    return HealthResponseSchema.parse(data);
  }

  async initializeSession(
    dramaId: string,
    characterCards: Array<{ id: string; name: string; role: string; backstory: string }>
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/session/${dramaId}/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ characterCards }),
    });

    if (!response.ok) {
      throw new Error('Failed to initialize session');
    }
  }

  async startScene(
    dramaId: string,
    sceneConfig: { id: string; location: string; description: string; tone: string; actorIds: string[] }
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/session/${dramaId}/scene`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sceneConfig),
    });

    if (!response.ok) {
      throw new Error('Failed to start scene');
    }
  }

  async exportScript(dramaId: string, format: 'json' | 'markdown' | 'pdf'): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/session/${dramaId}/script?format=${format}`);

    if (!response.ok) {
      throw new Error('Failed to export script');
    }

    return response.blob();
  }
}

export const apiClient = new ApiClient();
```

### Pattern 3: Blackboard State Management with Zustand

```typescript
// src/frontend/store/blackboardStore.ts
import { create } from 'zustand';
import type { BlackboardLayer, LayerReadResponse, BlackboardEntry } from '../../types/blackboard';
import { apiClient } from '../services/apiClient';

interface BlackboardState {
  layers: Record<BlackboardLayer, LayerReadResponse | null>;
  loadingLayers: BlackboardLayer[];
  token: string | null;
  setToken: (token: string) => void;
  fetchLayer: (layer: BlackboardLayer) => Promise<void>;
  fetchAllLayers: () => Promise<void>;
  clearLayers: () => void;
}

export const useBlackboardStore = create<BlackboardState>((set, get) => ({
  layers: {
    core: null,
    scenario: null,
    semantic: null,
    procedural: null,
  },
  loadingLayers: [],
  token: null,

  setToken: (token) => set({ token }),

  fetchLayer: async (layer) => {
    const { token, loadingLayers } = get();

    if (!token || loadingLayers.includes(layer)) return;

    set((state) => ({ loadingLayers: [...state.loadingLayers, layer] }));

    try {
      const data = await apiClient.getBlackboardLayer(layer, token);
      set((state) => ({
        layers: { ...state.layers, [layer]: data },
      }));
    } catch (error) {
      console.error(`Failed to fetch layer ${layer}:`, error);
    } finally {
      set((state) => ({
        loadingLayers: state.loadingLayers.filter((l) => l !== layer),
      }));
    }
  },

  fetchAllLayers: async () => {
    const layers: BlackboardLayer[] = ['core', 'scenario', 'semantic', 'procedural'];
    await Promise.all(layers.map((layer) => get().fetchLayer(layer)));
  },

  clearLayers: () =>
    set({
      layers: {
        core: null,
        scenario: null,
        semantic: null,
        procedural: null,
      },
    }),
}));
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Direct DOM Manipulation with Socket.IO Events

**What:** Handling Socket.IO events by directly updating the DOM instead of using a state management library.

**Why bad:** Leads to hard-to-maintain code, inconsistent state, and poor performance.

**Instead:** Use Zustand to manage state and let React handle DOM updates.

### Anti-Pattern 2: Uncontrolled Socket.IO Connections

**What:** Creating Socket.IO connections in component lifecycle methods without proper cleanup.

**Why bad:** Leads to memory leaks and connection conflicts.

**Instead:** Use a singleton socket service with proper connection management.

### Anti-Pattern 3: Overloading the Blackboard with UI State

**What:** Storing UI state (like view preferences, selected tab, etc.) on the blackboard.

**Why bad:** Pollutes the blackboard with non-drama-related state, violates separation of concerns.

**Instead:** Store UI state in the Zustand store.

### Anti-Pattern 4: Polling for Blackboard Updates

**What:** Using HTTP polling to refresh blackboard state instead of listening for Socket.IO events.

**Why bad:** Wastes bandwidth, introduces latency, doesn't scale.

**Instead:** Listen for `blackboard:updated` events and fetch layers on demand.

## Documentation Architecture

### Documentation Structure

```
docs/
├── index.md                    # Home page
├── getting-started.md          # Quick start guide
├── user-guide/
│   ├── creating-sessions.md    # How to create drama sessions
│   ├── configuring-agents.md   # How to configure Director/Actor agents
│   ├── managing-scenes.md      # How to start and manage scenes
│   └── exporting-scripts.md    # How to export generated scripts
├── api-reference/
│   ├── rest-api.md             # REST API documentation
│   ├── socket-events.md        # Socket.IO events documentation
│   └── types.md                # TypeScript types
├── architecture/               # System architecture docs
│   └── README.md               # Existing architecture docs
├── API.md                      # Existing API reference (to be merged)
└── mkdocs.yml                  # MkDocs configuration
```

### Documentation Tools

| Tool | Purpose | Why |
|------|---------|-----|
| **MkDocs Material** | Documentation site generator | Markdown-based, customizable, static site generation, great documentation |
| **TypeDoc** | API documentation from TypeScript | Generates documentation from TypeScript types and JSDoc comments |
| **zod-to-openapi** | OpenAPI 3.1 specification | Generates OpenAPI from existing Zod schemas |
| **Swagger UI** | Interactive API docs | Built into Express, allows testing API endpoints directly |

### API Documentation Generation

```typescript
// src/docs/openapi.ts
import { z } from 'zod';
import { extendZodWithOpenApi, createDocument } from '@asteasolutions/zod-to-openapi';
import type { OpenAPIV3_1 } from 'openapi-types';

extendZodWithOpenApi(z);

// Define OpenAPI components from existing Zod schemas
export function generateOpenAPISpec(): OpenAPIV3_1.Document {
  return createDocument({
    openapi: '3.1.0',
    info: {
      title: 'Multi-Agent Drama System API',
      version: '1.2.0',
      description: 'REST API for managing multi-agent drama sessions',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local development server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  });
}
```

```typescript
// In app.ts
import swaggerUi from 'swagger-ui-express';
import { generateOpenAPISpec } from './docs/openapi.js';

// Serve OpenAPI JSON
app.get('/api-docs.json', (_req, res) => {
  res.json(generateOpenAPISpec());
});

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(generateOpenAPISpec()));
```

## Project Structure for v1.2

```
drama/
├── src/
│   ├── index.ts                 # Existing entry point
│   ├── app.ts                   # Modified with static file serving
│   ├── frontend/                # NEW: Frontend app
│   │   ├── index.html
│   │   ├── src/
│   │   │   ├── main.tsx         # React entry point
│   │   │   ├── App.tsx          # Main app component
│   │   │   ├── components/
│   │   │   │   ├── SessionDashboard.tsx
│   │   │   │   ├── MessageFeed.tsx
│   │   │   │   ├── AgentStatus.tsx
│   │   │   │   ├── BlackboardViewer.tsx
│   │   │   │   └── SceneConfig.tsx
│   │   │   ├── store/
│   │   │   │   ├── sessionStore.ts
│   │   │   │   └── blackboardStore.ts
│   │   │   ├── services/
│   │   │   │   ├── socket.ts
│   │   │   │   └── apiClient.ts
│   │   │   └── types/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── tailwind.config.js
│   ├── docs/                    # NEW: Documentation generation
│   │   └── openapi.ts
│   └── routes/
│       └── session.ts           # NEW: Session management endpoints
├── docs/                        # Documentation site (MkDocs)
│   ├── index.md
│   ├── getting-started.md
│   ├── user-guide/
│   ├── api-reference/
│   ├── architecture/
│   └── mkdocs.yml
├── .planning/research/
│   ├── ARCHITECTURE.md          # This file
│   ├── STACK.md                 # Frontend stack recommendations
│   └── ...
└── package.json                 # Modified with frontend build scripts
```

## Build/Deployment Considerations

### Frontend Build

```bash
# From frontend directory
cd src/frontend

# Install dependencies
npm install

# Development server (Vite)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Documentation Build

```bash
# Install MkDocs
pip install mkdocs-material

# Serve documentation locally
mkdocs serve

# Build documentation
mkdocs build
```

### Backend Build

```bash
# From root directory
npm install

# Build TypeScript
npm run build

# Build frontend and documentation
npm run build:frontend
npm run build:docs

# Start server (serves API, frontend, and docs)
npm start
```

### Package.json Scripts Additions

```json
{
  "scripts": {
    "dev:frontend": "cd src/frontend && npm run dev",
    "dev:docs": "mkdocs serve",
    "build:frontend": "cd src/frontend && npm install && npm run build",
    "build:docs": "mkdocs build",
    "build": "tsc && npm run build:frontend && npm run build:docs"
  }
}
```

## Scalability Considerations

| Concern | At 100 users | At 10K users | At 1M users |
|---------|--------------|--------------|-------------|
| **Socket.IO Connections** | Single server instance with Socket.IO's built-in scaling | Redis adapter for Socket.IO | Kubernetes cluster with Redis adapter and load balancing |
| **Frontend Performance** | Static assets served via Express static middleware | CDN for static assets | CDN + edge computing |
| **API Rate Limiting** | Basic rate limiting middleware | Redis-based rate limiting | Advanced rate limiting with analytics |
| **Documentation** | Static files served via Express | CDN for documentation | Dedicated documentation hosting (Netlify, Vercel) |

## Sources

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [React Documentation](https://react.dev/)
- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [MkDocs Material Documentation](https://squidfunk.github.io/mkdocs-material/)
- [TypeDoc Documentation](https://typedoc.org/)
- [Socket.IO and React Best Practices (LogRocket)](https://blog.logrocket.com/real-time-apps-react-socket-io-best-practices-2024/)
- [Zustand and Socket.IO Patterns (LogRocket)](https://blog.logrocket.com/real-time-react-apps-with-socket-io-and-zustand/)
- [React Express Socket.IO Guide (Medium)](https://medium.com/@shahidshaikh_76282/real-time-application-with-react-express-and-socket-io-2024-guide-36f22c931057)
- [Socket.IO Examples (GitHub)](https://github.com/socketio/socket.io/tree/main/examples/react-express)

---
*Architecture research for v1.2 Frontend & Documentation*
*Researched: 2026-03-21*
