# Technology Stack

**Project:** Multi-Agent Drama System  
**Version:** v1.1  
**Last Updated:** 2026-03-22  

## Languages & Runtime

### Backend
- **TypeScript 5.5+** - Primary language for backend services
- **Node.js 22 LTS** - JavaScript runtime for server-side execution
- **Target**: ES2022 with NodeNext module resolution

### Frontend
- **TypeScript ~5.6.2** - Type-safe React development
- **React 18.3.1** - UI framework for web interface
- **React DOM 18.3.1** - React DOM renderer

## Core Frameworks & Libraries

### Backend Framework
- **Express 4.19.0** - HTTP server framework for REST API
- **Socket.IO 4.8.3** - Real-time bidirectional event-based communication
- **Socket.IO Client 4.8.3** - Client-side Socket.IO library

### Frontend Framework
- **Vite 6.0.7** - Build tool and dev server
- **@vitejs/plugin-react 4.3.4** - Vite plugin for React support
- **React Hook Form 7.71.2** - Form state management and validation
- **@hookform/resolvers 5.2.2** - Form validation resolvers
- **Zustand 5.0.3** - Lightweight state management

### Data & State Management
- **Zod 3.23.0 / 3.24.1** - TypeScript-first schema validation
- **Pino 9.0.0** - Structured logging for Node.js

## Authentication & Security

- **jsonwebtoken 9.0.3** - JWT token generation and verification
- **Algorithm**: HS256 (symmetric key)
- **@types/jsonwebtoken 9.0.10** - TypeScript definitions

## LLM Provider Integrations

### Official SDKs
- **@anthropic-ai/sdk 0.80.0** - Anthropic Claude API client
- **openai 6.32.0** - OpenAI GPT API client
- **tiktoken 1.0.0** - OpenAI tokenizer for token counting

### LLM Provider Abstraction
- Custom `LlmProvider` interface with three implementations:
  - `OpenAiLlmProvider` - OpenAI integration
  - `AnthropicLlmProvider` - Anthropic integration
  - `MockLlmProvider` - Testing/mock provider

## Utility Libraries

### Backend Utilities
- **dotenv 16.4.0** - Environment variable management
- **uuid 10.0.0** - UUID generation
- **@types/uuid 10.0.0** - TypeScript definitions

### Frontend Utilities
- **html2pdf.js 0.10.1** - PDF generation from HTML
- **ReactFlow 11.11.4** - Graph visualization component

## Development & Testing

### Build Tools
- **tsx 4.16.0** - TypeScript execution engine
- **TypeScript 5.5.0** - TypeScript compiler

### Testing Framework
- **Vitest 2.0.0** - Unit and integration testing framework
- **Supertest 7.0.0** - HTTP assertion library for testing Express apps
- **@types/supertest 6.0.0** - TypeScript definitions

### Logging (Dev)
- **pino-pretty 13.1.3** - Pretty-print Pino logs

### Type Definitions
- **@types/express 5.0.0** - Express TypeScript definitions
- **@types/pino 7.0.4** - Pino TypeScript definitions
- **@types/uuid 10.0.0** - UUID TypeScript definitions
- **@types/react 18.3.18** - React TypeScript definitions
- **@types/react-dom 18.3.5** - React DOM TypeScript definitions

## Configuration Files

### Backend Configuration
- **tsconfig.json** - TypeScript compiler configuration (ES2022, NodeNext)
- **vitest.config.ts** - Vitest test configuration
- **.env.example** - Environment variable template

### Frontend Configuration
- **frontend/vite.config.ts** - Vite build configuration
- **frontend/tsconfig.json** - Frontend TypeScript configuration
- **frontend/.env** - Frontend environment variables

## Project Structure

### Backend (TypeScript)
```
src/
├── app.ts                  # Express app composition
├── config.ts               # Environment configuration & validation
├── index.ts                # Application entry point
├── session.ts              # Drama session orchestrator
├── routes/                 # HTTP route handlers
├── services/               # Core business logic
│   ├── llm/               # LLM provider implementations
│   ├── actor.ts           # Actor agent logic
│   ├── director.ts        # Director agent logic
│   ├── blackboard.ts      # Shared memory service
│   ├── router.ts          # Socket.IO routing service
│   ├── memoryManager.ts   # Memory folding/management
│   ├── capability.ts      # Role-based access control
│   ├── auditLog.ts        # Audit logging
│   ├── snapshot.ts        # State persistence
│   └── heartbeat.ts       # Connection health monitoring
└── types/                  # TypeScript type definitions
```

### Frontend (TypeScript + React)
```
frontend/src/
├── App.tsx                 # Main React application
├── components/             # React components
│   ├── config/            # Configuration UI components
│   ├── dashboard/         # Dashboard components
│   ├── templates/         # Template management
│   └── visualization/      # Real-time visualization
├── lib/                    # Utility libraries
│   ├── api.ts             # HTTP API client
│   ├── socket.ts          # Socket.IO client
│   └── pdfExporter.ts     # PDF export utility
├── store/                  # State management
│   └── appStore.ts        # Zustand global store
├── types/                  # TypeScript types
└── utils/                  # Utility functions
```

## Package Management

### Backend
- **package-lock.json** - Exact dependency versions
- **npm** - Package manager

### Frontend
- **frontend/package-lock.json** - Frontend dependencies
- **npm** - Package manager

## Runtime Environments

### Development
- `npm run dev` - Backend with hot reload (tsx watch)
- `npm run dev` (frontend) - Frontend dev server (Vite)

### Production
- `npm run build` - TypeScript compilation
- `npm run start` - Production Node.js server
- `npm run build` (frontend) - Production React build

### Testing
- `npm test` - Run all tests
- `npm run test:watch` - Watch mode testing

## Build Targets

### Backend
- **Output**: `dist/` directory
- **Module**: ES2022 NodeNext modules
- **Format**: ESM (ECMAScript Modules)

### Frontend
- **Output**: `frontend/dist/` directory
- **Format**: Optimized static assets (JS, CSS, HTML)

## Environment Variables

### Required Environment Variables
- `PORT` - HTTP server port (default: 3000)
- `SOCKET_PORT` - Socket.IO port (default: 3001)
- `JWT_SECRET` - JWT signing secret (min 32 chars)
- `LLM_PROVIDER` - LLM provider (openai | anthropic)

### LLM Provider Configuration
- `OPENAI_API_KEY` - OpenAI API key
- `OPENAI_MODEL` - OpenAI model name (default: gpt-4-turbo)
- `OPENAI_BASE_URL` - OpenAI base URL (optional)
- `ANTHROPIC_API_KEY` - Anthropic API key
- `ANTHROPIC_MODEL` - Anthropic model name (default: claude-3-opus-20240229)

### Blackboard Configuration
- `BLACKBOARD_DATA_DIR` - Data directory for snapshots (default: ./data)
- `CORE_LAYER_TOKEN_BUDGET` - Core layer token budget (default: 2048)
- `SCENARIO_LAYER_TOKEN_BUDGET` - Scenario layer budget (default: 8192)
- `SEMANTIC_LAYER_TOKEN_BUDGET` - Semantic layer budget (default: 16384)
- `PROCEDURAL_LAYER_TOKEN_BUDGET` - Procedural layer budget (default: 4096)

### Routing & Timeout Configuration
- `HEARTBEAT_INTERVAL_MS` - Heartbeat interval (default: 5000)
- `ACTOR_TIMEOUT_MS` - Actor response timeout (default: 30000)
- `ACTOR_RETRY_TIMEOUT_MS` - Actor retry timeout (default: 15000)
- `SOCKET_GRACE_PERIOD_MS` - Disconnect grace period (default: 10000)
- `SCENE_TIMEOUT_MS` - Scene timeout (default: 300000)

### Role Capabilities
- `CAPABILITY_ACTOR` - Actor layer access (default: semantic,procedural)
- `CAPABILITY_DIRECTOR` - Director layer access (default: core,scenario,semantic,procedural)
- `CAPABILITY_ADMIN` - Admin layer access (default: core,scenario,semantic,procedural)

## Deployment Considerations

### Backend Deployment
- Node.js 22+ runtime required
- Environment variables must be configured
- File system access for BLACKBOARD_DATA_DIR
- Network ports: HTTP (3000), Socket.IO (3001)

### Frontend Deployment
- Static files served from frontend/dist/
- Requires backend API proxy configuration
- WebSocket connection to backend Socket.IO server

## Version Information

- **Backend Version**: 0.1.0
- **Frontend Version**: 0.0.0
- **Current Milestone**: v1.1 complete
- **Test Status**: 104 tests passing
