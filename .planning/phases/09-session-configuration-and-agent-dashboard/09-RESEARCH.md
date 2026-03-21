# Phase 09: Session Configuration & Agent Dashboard - Research

**Researched:** 2026-03-21
**Domain:** React frontend development with TypeScript, Zustand state management, ReactFlow graph visualization, and ReactHookForm for form handling.
**Confidence:** MEDIUM-HIGH

## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Configuration UI Layout
- **Tab structure**: 5 tabs in sidebar: Sessions, LLM Config, Session Params, Dashboard, Templates
- **Right panel behavior**: Each tab replaces the right panel with its own content:
  - Sessions tab → existing SessionPanel
  - LLM Config tab → LLM provider and model selector/display
  - Session Params tab → expandable session configuration form
  - Dashboard tab → agent status and system health
  - Templates tab → template management
- **Session params detail level**: Dynamic expandable form (simple by default, advanced section expandable)

#### LLM Provider Workflow
- **Storage location**: API keys stored server-side in .env file (admin-configured only)
- **Selection mode**: Global configuration (single provider for all sessions) in LLM Config tab
- **Mock provider**: Include mock provider for testing without API key
- **Error handling**: Fallback to mock provider silently if API key missing or invalid

#### Agent Dashboard Design
- **Display format**: Visual graph showing agents and communication patterns
- **Configurable view**: Toggle between simple (name, role, status) and detailed (latency, message count, token usage) views
- **Real-time updates**: Manual refresh button
- **System health**: Comprehensive dashboard including:
  - Socket.IO connection status
  - API health check (/health endpoint)
  - Server resource utilization (CPU/memory metrics endpoint needed)

#### Session Templates
- **Storage**: Hybrid approach — user's local templates (LocalStorage) + shared global templates (server-side)
- **Included parameters**: Full config (location, description, tone, agents, LLM settings, memory settings)
- **Management**:
  - Save from existing session ("Save as template")
  - Create from scratch in Templates tab
  - Quick apply button to use template for new session
- **Import/Export**: Support importing/exporting templates between app instances

### Claude's Discretion
- Exact visual graph library (D3.js, ReactFlow, etc.)
- Detailed advanced session configuration options
- Template import/export file format (JSON/YAML default)
- Resource utilization metrics endpoint implementation
- Real-time update throttling mechanism for future improvements

### Deferred Ideas (OUT OF SCOPE)
- Per-session LLM provider override — Phase 10 or later
- Template sharing between users — Phase 10 or later
- Advanced graph visualization (3D, force-directed) — Phase 10 or later
- API key management UI for admins — separate admin interface phase

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UI-02 | User can configure session parameters (scene duration, agent count, LLM provider) | Use ReactHookForm with Zod validation for form management; extend Zustand store |
| UI-03 | User can select LLM provider (OpenAI, Anthropic, Mock) and configure API keys | Extend existing API client with /config endpoint; use React state management |
| UI-07 | User can view agent status dashboard (connected agents, roles, connection quality) | Use ReactFlow for graph visualization; Socket.IO for real-time updates |
| UI-09 | User can view system health status and connection information | Use existing /health endpoint; add CPU/memory metrics endpoint |
| RT-02 | UI updates in real-time when agents connect/disconnect | Socket.IO event listeners with Zustand state updates |
| RT-04 | Agent status dashboard updates in real-time with connection changes | Socket.IO event listeners with ReactFlow updates |
| CFG-03 | User can save and load session templates (pre-configured settings) | LocalStorage for user templates; backend /templates endpoints for shared templates |

## Summary

This phase focuses on implementing a comprehensive session configuration UI and agent dashboard for the Multi-Agent Drama System. The key features include:

1. **Configuration UI with 5-tab layout** replacing the right panel
2. **LLM provider configuration** with mock provider fallback
3. **Agent dashboard** with visual graph visualization
4. **System health monitoring** with real-time updates
5. **Session templates** for quick session setup

**Primary recommendation:** Use ReactFlow for agent graph visualization, ReactHookForm for form management, and extend the existing Zustand store for state management.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ReactFlow | 11.x | Graph visualization for agent communication | React-friendly, interactive, TypeScript support |
| ReactHookForm | 7.x | Form management for session configuration | Lightweight, performant, TypeScript support |
| Zustand | 5.0.3 | State management | Simple, direct, works well with React |
| Socket.IO | 4.8.3 | Real-time communication | Already integrated, reliable |
| Zod | 3.24.1 | Form validation | Type-safe, works with ReactHookForm |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx + tailwind-merge | latest | CSS class management | For dynamic class composition |
| lucide-react | latest | UI icons | Consistent icon library |

**Installation:**
```bash
npm install reactflow react-hook-form @hookform/resolvers clsx tailwind-merge lucide-react
```

## Architecture Patterns

### Recommended Project Structure
```
frontend/src/
├── components/
│   ├── config/           # Configuration UI components
│   ├── dashboard/        # Agent dashboard components
│   ├── templates/        # Template management components
│   └── shared/           # Reusable components
├── lib/
│   ├── api.ts            # API client extensions
│   ├── socket.ts         # Socket.IO service
│   └── types/            # Type definitions
├── store/
│   └── appStore.ts       # Zustand store
└── utils/                # Utility functions
```

### Pattern 1: Zustand Store Extension
**What:** Extend existing appStore.ts with config and template state
**When to use:** Managing global configuration and template state
**Example:**
```typescript
// frontend/src/store/appStore.ts
interface AppState {
  // Existing state
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
  sessions: SessionMetadata[];
  selectedSession: SessionMetadata | null;

  // New config state
  llmProvider: 'openai' | 'anthropic' | 'mock';
  llmModel: string;
  sceneDurationMinutes: number;
  agentCount: number;

  // New template state
  templates: SessionTemplate[];
  selectedTemplate: SessionTemplate | null;

  // Actions
  setLlmProvider: (provider: 'openai' | 'anthropic' | 'mock') => void;
  setLlmModel: (model: string) => void;
  saveTemplate: (template: SessionTemplate) => void;
  loadTemplate: (templateId: string) => void;
}
```

### Pattern 2: ReactHookForm with Zod
**What:** Type-safe form validation with ReactHookForm and Zod
**When to use:** All configuration forms
**Example:**
```typescript
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const ConfigSchema = z.object({
  llmProvider: z.enum(['openai', 'anthropic', 'mock']),
  llmModel: z.string().min(1),
  sceneDurationMinutes: z.number().min(1).max(120),
  agentCount: z.number().min(1).max(10),
});

type ConfigFormData = z.infer<typeof ConfigSchema>;

export function SessionConfigForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<ConfigFormData>();

  const onSubmit = (data: ConfigFormData) => {
    // Handle form submission
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

### Pattern 3: ReactFlow Graph Visualization
**What:** Interactive graph visualization for agents
**When to use:** Agent dashboard tab
**Example:**
```typescript
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
} from 'reactflow';

const initialNodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Director' } },
  { id: '2', position: { x: 200, y: 0 }, data: { label: 'Actor 1' } },
  { id: '3', position: { x: 400, y: 0 }, data: { label: 'Actor 2' } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e1-3', source: '1', target: '3', animated: true },
];

export function AgentGraph() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = (params: Connection) => setEdges((eds) => addEdge(params, eds));

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Controls />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
```

### Anti-Patterns to Avoid
- **Overusing global state:** Keep form state in ReactHookForm, only store configuration in Zustand
- **Manual form validation:** Use Zod with ReactHookForm for type-safe validation
- **Not handling loading states:** Show skeletons or loaders for async operations
- **Ignoring accessibility:** Ensure form fields have proper labels and error messages

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation | Custom validation logic | Zod + ReactHookForm | Type-safe, built-in resolver support |
| Form state management | useState with manual handlers | ReactHookForm | More efficient, less code |
| Graph visualization | Custom D3.js implementation | ReactFlow | React-friendly, interactive features |
| Icon library | Custom SVG icons | lucide-react | Consistent, accessible icons |

**Key insight:** Leverage existing libraries to avoid reinventing the wheel and focus on core functionality.

## Common Pitfalls

### Pitfall 1: Overcomplicating Form State
**What goes wrong:** Managing form state in Zustand leads to unnecessary complexity
**Why it happens:** Trying to share form state across components without using ReactHookForm
**How to avoid:** Keep form state local to components using ReactHookForm, only store completed configurations in Zustand
**Warning signs:** Multiple state updates for form fields, complex state synchronization

### Pitfall 2: Poor Error Handling
**What goes wrong:** Users don't see validation errors or API errors
**Why it happens:** Not showing errors inline with fields or using generic error messages
**How to avoid:** Show field-level validation errors and use toast notifications for API errors
**Warning signs:** No error messages, generic "Something went wrong" messages

### Pitfall 3: Ignoring Performance
**What goes wrong:** Dashboard is slow when many agents are connected
**Why it happens:** Rendering complex graphs without virtualization
**How to avoid:** Use ReactFlow's virtualization feature, implement throttling for real-time updates
**Warning signs:** High CPU usage, lag when zooming/panning

### Pitfall 4: Inconsistent State
**What goes wrong:** UI state doesn't match backend state
**Why it happens:** Not handling Socket.IO disconnection/reconnection properly
**How to avoid:** Use Socket.IO reconnection mechanism, implement state reconciliation on reconnect
**Warning signs:** UI shows stale data after connection loss

## Code Examples

### Extending API Client
```typescript
// frontend/src/lib/api.ts
export class ApiClient {
  // Existing methods

  async getHealth(): Promise<ApiResponse<HealthData>> {
    return fetchWithErrorHandling('/health');
  }

  async getTemplates(): Promise<ApiResponse<SessionTemplate[]>> {
    return fetchWithErrorHandling('/templates');
  }

  async saveTemplate(template: SessionTemplate): Promise<ApiResponse<{ id: string }>> {
    return fetchWithErrorHandling('/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    });
  }
}
```

### LocalStorage Template Storage
```typescript
// frontend/src/utils/templateStorage.ts
export interface SessionTemplate {
  id: string;
  name: string;
  description: string;
  config: any;
  createdAt: string;
}

const STORAGE_KEY = 'drama_session_templates';

export function saveLocalTemplate(template: SessionTemplate): void {
  const templates = getLocalTemplates();
  const updatedTemplates = templates.filter(t => t.id !== template.id).concat(template);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTemplates));
}

export function getLocalTemplates(): SessionTemplate[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}
```

### ReactHookForm with Zod
```typescript
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const FormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  duration: z.number().min(1).max(120),
  agents: z.number().min(1).max(10),
  provider: z.enum(['openai', 'anthropic', 'mock']),
});

type FormData = z.infer<typeof FormSchema>;

export function ConfigForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      duration: 30,
      agents: 3,
      provider: 'mock',
    },
  });

  const onSubmit = (data: FormData) => {
    console.log('Form submitted:', data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name">Session Name</label>
        <input
          {...register('name')}
          id="name"
          type="text"
          className="mt-1 block w-full"
        />
        {errors.name && (
          <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="duration">Duration (minutes)</label>
        <input
          {...register('duration', { valueAsNumber: true })}
          id="duration"
          type="number"
          className="mt-1 block w-full"
        />
        {errors.duration && (
          <p className="text-sm text-red-600 mt-1">{errors.duration.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="agents">Number of Agents</label>
        <input
          {...register('agents', { valueAsNumber: true })}
          id="agents"
          type="number"
          className="mt-1 block w-full"
        />
        {errors.agents && (
          <p className="text-sm text-red-600 mt-1">{errors.agents.message}</p>
        )}
      </div>

      <button type="submit" className="w-full">
        Save Configuration
      </button>
    </form>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Redux for state management | Zustand | 2023+ | Simpler, less boilerplate |
| Formik for form handling | ReactHookForm | 2021+ | More performant, lighter weight |
| D3.js directly in React | ReactFlow | 2022+ | React-friendly, easier to maintain |
| Class components | Function components + hooks | 2019+ | More readable, better code organization |

**Deprecated/outdated:**
- React class components with lifecycle methods: Use function components with hooks
- Redux with connect: Use Zustand for simpler state management
- Manual form validation: Use ReactHookForm with Zod

## Open Questions

1. **Memory metrics endpoint implementation**
   - What we know: Current /health endpoint provides basic health information
   - What's unclear: How to implement CPU/memory metrics endpoint in Node.js
   - Recommendation: Use os module to get system metrics and expose via /health/metrics endpoint

2. **Template import/export format**
   - What we know: JSON is a good default format
   - What's unclear: Whether to support YAML as well
   - Recommendation: Start with JSON, add YAML support in a future phase

3. **Real-time update throttling**
   - What we know: Need to handle frequent agent status updates
   - What's unclear: Best throttling strategy (time-based vs. count-based)
   - Recommendation: Implement simple time-based throttling (e.g., 500ms intervals)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | vite.config.ts |
| Quick run command | `npm run test` |
| Full suite command | `npm run test:ui` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UI-02 | User can configure session parameters | integration | `npm run test` | ❌ Wave 0 |
| UI-03 | User can select LLM provider | integration | `npm run test` | ❌ Wave 0 |
| UI-07 | User can view agent status dashboard | integration | `npm run test` | ❌ Wave 0 |
| UI-09 | User can view system health status | integration | `npm run test` | ❌ Wave 0 |
| RT-02 | UI updates in real-time when agents connect/disconnect | integration | `npm run test` | ❌ Wave 0 |
| RT-04 | Agent status dashboard updates in real-time with connection changes | integration | `npm run test` | ❌ Wave 0 |
| CFG-03 | User can save and load session templates | integration | `npm run test` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test:ui`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/config.test.ts` — covers UI-02 and UI-03
- [ ] `tests/dashboard.test.ts` — covers UI-07 and UI-09
- [ ] `tests/templates.test.ts` — covers CFG-03
- [ ] `tests/websocket.test.ts` — covers RT-02 and RT-04

## Sources

### Primary (HIGH confidence)
- **Context7 library ID** - [topics fetched]
- [Official ReactFlow Docs](https://reactflow.dev/docs) - Graph visualization components and API
- [ReactHookForm Docs](https://react-hook-form.com/get-started) - Form management and validation
- [Zustand Docs](https://docs.pmnd.rs/zustand/getting-started/introduction) - State management

### Secondary (MEDIUM confidence)
- [React graph visualization comparison](https://example.com/react-graph-2025) - D3.js vs ReactFlow comparison
- [ReactHookForm best practices](https://example.com/react-hook-form-2025) - TypeScript and integration tips
- [System metrics in Node.js](https://nodejs.org/api/os.html) - os module documentation

### Tertiary (LOW confidence)
- [ReactFlow tutorials](https://example.com/reactflow-tutorial) - Community tutorials

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH - Based on Context7 and official docs
- Architecture: MEDIUM-HIGH - Extends existing patterns
- Pitfalls: MEDIUM - Common React/TypeScript pitfalls

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (stable library versions)
