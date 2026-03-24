# Structure

## Directory Layout

```
/workspace/
├── src/                          # Backend source code
│   ├── index.ts                 # Server entry point - service initialization
│   ├── app.ts                   # Express app setup - routes and middleware
│   ├── session.ts               # DramaSession - core orchestration logic
│   ├── config.ts                # Environment configuration with Zod validation
│   ├── routes/                  # Express route handlers
│   │   ├── agents.ts           # Agent management and token generation
│   │   ├── audit.ts            # Audit log access endpoints
│   │   ├── blackboard.ts       # Blackboard layer operations
│   │   ├── config.ts           # LLM and system configuration
│   │   ├── health.ts           # Health check endpoint
│   │   ├── sessions.ts         # Session CRUD and lifecycle
│   │   └── templates.ts        # Template management
│   ├── services/                # Core business logic services
│   │   ├── actor.ts            # Actor agent implementation
│   │   ├── actorMemory.ts      # Actor personal memory system
│   │   ├── auditLog.ts         # Audit logging service
│   │   ├── blackboard.ts       # Shared blackboard service
│   │   ├── capability.ts       # JWT auth and capability management
│   │   ├── director.ts         # Director agent implementation
│   │   ├── directorMemory.ts   # Director memory system
│   │   ├── exportService.ts    # Script export functionality
│   │   ├── heartbeat.ts        # Agent heartbeat monitoring
│   │   ├── index.ts            # Service exports
│   │   ├── llm.ts              # LLM provider abstraction and prompt building
│   │   ├── llm/                # LLM provider implementations
│   │   │   ├── anthropic.ts   # Anthropic Claude provider
│   │   │   ├── mock.ts        # Mock provider for testing
│   │   │   └── openai.ts      # OpenAI GPT provider
│   │   ├── logger.ts           # Pino logger configuration
│   │   ├── memoryManager.ts    # Automated memory management
│   │   ├── messageBuffer.ts    # Message buffering for retry
│   │   ├── router.ts           # Socket.IO message router
│   │   ├── sessionRegistry.ts  # In-memory session storage
│   │   ├── snapshot.ts         # State snapshot persistence
│   │   └── timeoutManager.ts   # Actor timeout handling
│   └── types/                   # TypeScript type definitions
│       ├── actor.ts            # Actor-related types and schemas
│       ├── blackboard.ts       # Blackboard layer types
│       ├── director.ts         # Director-related types
│       ├── index.ts            # Type exports
│       ├── memory.ts           # Memory system types
│       ├── routing.ts          # Message routing types
│       └── session.ts          # Session types
├── frontend/                    # React frontend application
│   ├── index.html              # HTML entry point
│   ├── package.json            # Frontend dependencies
│   ├── vite.config.ts          # Vite configuration with proxy
│   └── src/
│       ├── main.tsx            # React application entry
│       ├── App.tsx             # Root component with routing
│       ├── App.css             # App-level styles
│       ├── index.css           # Global styles and Tailwind
│       ├── vite-env.d.ts       # Vite type declarations
│       ├── components/          # React components
│       │   ├── config/         # Configuration panels
│       │   ├── dashboard/      # Dashboard views
│       │   └── visualization/  # Visualization components
│       ├── lib/                # Utilities and API clients
│       ├── store/              # Zustand state stores
│       ├── types/              # Frontend type definitions
│       └── utils/              # Helper utilities
├── tests/                       # Test files
│   ├── actor.test.ts           # Actor service tests
│   ├── blackboard.test.ts      # Blackboard service tests
│   ├── director.test.ts        # Director service tests
│   ├── llm.test.ts             # LLM provider tests
│   ├── memoryManager.test.ts   # Memory management tests
│   ├── routing.test.ts         # Message routing tests
│   ├── session.test.ts         # Session orchestration tests
│   ├── snapshot.test.ts        # Snapshot persistence tests
│   └── timeout.test.ts         # Timeout handling tests
├── config/                      # Configuration files
│   └── llm.json                # Default LLM parameters
├── data/                        # Data persistence directory
│   ├── snapshots/              # Blackboard state snapshots
│   └── audit/                  # Audit log files
├── docs/                        # Documentation
│   ├── ARCHITECTURE.md         # Architecture overview
│   ├── PROMPT_DESIGN.md        # Prompt engineering guide
│   ├── SCHEMA_REFERENCE.md     # Type/schema reference
│   └── TESTING_STRATEGY.md     # Testing approach
├── docs-site/                   # VitePress documentation site
├── examples/                    # Example usage
├── dist/                        # Compiled backend output
├── .planning/                   # GSD planning artifacts
│   ├── codebase/               # Codebase mapping documents
│   ├── phases/                 # Phase plans and execution logs
│   ├── research/               # Research documents
│   └── milestones/             # Milestone definitions
├── package.json                 # Backend dependencies
├── tsconfig.json               # TypeScript configuration
└── vitest.config.ts            # Test runner configuration
```

## Key File Locations

### Configuration
| File | Purpose |
|------|---------|
| `src/config.ts` | Environment variable validation with Zod schemas |
| `config/llm.json` | Default LLM parameters and token budgets |
| `frontend/vite.config.ts` | Vite dev server and proxy configuration |

### Entry Points
| File | Purpose |
|------|---------|
| `src/index.ts` | Backend server initialization and startup |
| `src/app.ts` | Express app factory with route mounting |
| `frontend/src/main.tsx` | React application bootstrap |
| `frontend/index.html` | HTML entry point |

### Core Services
| File | Purpose |
|------|---------|
| `src/session.ts` | DramaSession orchestration (600+ lines) |
| `src/services/blackboard.ts` | Shared blackboard implementation |
| `src/services/director.ts` | Director agent logic |
| `src/services/actor.ts` | Actor agent logic |
| `src/services/router.ts` | Socket.IO message routing |

### Types & Schemas
| File | Purpose |
|------|---------|
| `src/types/blackboard.ts` | Blackboard layer types and error classes |
| `src/types/director.ts` | Director I/O schemas (Zod) |
| `src/types/actor.ts` | Actor and CharacterCard schemas |
| `src/types/routing.ts` | Message routing types |
| `src/types/memory.ts` | Memory system types |

### LLM Integration
| File | Purpose |
|------|---------|
| `src/services/llm.ts` | Provider interface and prompt builders |
| `src/services/llm/openai.ts` | OpenAI implementation |
| `src/services/llm/anthropic.ts` | Anthropic implementation |
| `src/services/llm/mock.ts` | Mock implementation for testing |

### Memory Systems
| File | Purpose |
|------|---------|
| `src/services/directorMemory.ts` | Director's thematic memory |
| `src/services/actorMemory.ts` | Actor's episodic/introspective memory |
| `src/services/memoryManager.ts` | Automated folding/promotion |

## Naming Conventions

### Files
- Services: `camelCase.ts` (e.g., `blackboard.ts`, `actorMemory.ts`)
- Routes: `camelCase.ts` matching endpoint (e.g., `sessions.ts`)
- Types: `camelCase.ts` (e.g., `blackboard.ts`)
- Tests: `*.test.ts` adjacent to source or in `tests/`

### Classes
- Services: PascalCase with Service suffix (e.g., `BlackboardService`, `Director`)
- Errors: PascalCase with Error suffix (e.g., `VersionConflictError`)
- Types/Interfaces: PascalCase (e.g., `BlackboardEntry`, `SceneConfig`)

### Functions & Variables
- camelCase for functions and variables
- UPPER_SNAKE_CASE for constants (e.g., `LAYER_BUDGETS`)

### Schema Objects
- Zod schemas: PascalCase with Schema suffix (e.g., `CharacterCardSchema`)
- Inferred types: PascalCase without suffix (e.g., `CharacterCard`)

## Module Organization

### Service Dependencies
```
index.ts
├── SnapshotService
├── AuditLogService
├── BlackboardService (restores from snapshot)
├── CapabilityService
├── SessionRegistry
├── RouterService (Socket.IO)
└── MemoryManagerService
    └── createLlmProvider()
        ├── OpenAiLlmProvider
        ├── AnthropicLlmProvider
        └── MockLlmProvider
```

### Import Patterns
```typescript
// External dependencies first
import type pino from 'pino';
import { z } from 'zod';

// Internal types (absolute-like from src/)
import type { BlackboardService } from '../types/blackboard.js';

// Internal services
import { DirectorMemoryService } from './directorMemory.js';

// Utilities
import { config } from '../config.js';
```

Note: All imports use `.js` extension for ES Module compatibility.

## Data Directories

### Runtime Data (`data/`)
- `snapshots/` - JSON files with blackboard state snapshots
- `audit/` - Append-only audit log files

### Planning Data (`.planning/`)
- `codebase/` - Codebase mapping documents (this directory)
- `phases/` - Phase plans and execution logs
- `milestones/` - Milestone definitions and retrospectives
- `research/` - Architecture research and technology evaluations
