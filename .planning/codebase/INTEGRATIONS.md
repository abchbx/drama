# Integrations

## External Services

### LLM Providers

#### OpenAI
- **Package**: `openai` v6.32.0
- **Models Supported**: gpt-4-turbo, gpt-4o, gpt-3.5-turbo
- **Configuration**: `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL` (optional)
- **Usage**: `src/services/llm/openai.ts`
- **Features**:
  - Chat completions API
  - Streaming responses
  - Token counting via tiktoken

#### Anthropic
- **Package**: `@anthropic-ai/sdk` v0.80.0
- **Models Supported**: claude-3-opus-20240229, claude-3-5-sonnet, etc.
- **Configuration**: `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`
- **Usage**: `src/services/llm/anthropic.ts`
- **Features**:
  - Messages API
  - Streaming responses
  - Token counting (provider-native)

#### Mock Provider
- **Purpose**: Development/testing without API keys
- **Usage**: `src/services/llm/mock.ts`
- **Behavior**: Returns deterministic mock responses based on prompt content

### Authentication

#### JWT (JSON Web Tokens)
- **Package**: `jsonwebtoken` v9.0.3
- **Usage**: `src/services/capability.ts`
- **Purpose**: Agent authentication and capability verification
- **Configuration**:
  - `JWT_SECRET`: Min 32 characters required
  - `JWT_EXPIRES_IN`: Default '24h'
- **Features**:
  - Agent token generation
  - Token verification middleware
  - Capability-based access control

### Real-time Communication

#### Socket.IO
- **Server Package**: `socket.io` v4.8.3
- **Client Package**: `socket.io-client` v4.8.3
- **Server Port**: 3000 (shared with HTTP)
- **Usage**: `src/services/router.ts`
- **Features**:
  - Bidirectional event-based communication
  - Room-based message routing (per session)
  - Agent connection management
  - Heartbeat/ping monitoring
  - Graceful disconnection handling

### Logging

#### Pino
- **Package**: `pino` v9.0.0
- **Dev Formatter**: `pino-pretty` v13.1.3
- **Usage**: `src/services/logger.ts`
- **Configuration**: `LOG_LEVEL` (debug, info, warn, error, fatal)
- **Features**:
  - Structured JSON logging
  - Child loggers per session/component
  - Pretty printing in development

## Internal Integrations

### Data Persistence

#### File System Storage
- **Purpose**: Session data, audit logs, blackboard state
- **Location**: `data/` directory (configurable via `BLACKBOARD_DATA_DIR`)
- **Usage**: `src/services/snapshot.ts`, `src/services/auditLog.ts`
- **Features**:
  - JSON file serialization
  - Session snapshot save/load
  - Audit log append-only writes

### Memory System

#### Tiktoken
- **Package**: `tiktoken` v1.0.0
- **Usage**: `src/services/blackboard.ts`
- **Purpose**: Token counting for OpenAI model context management
- **Features**:
  - Model-specific encoding
  - Context budget enforcement per layer

### API Routing

#### Express.js
- **Package**: `express` v4.19.0
- **Port**: 3000 (configurable via `PORT`)
- **Routes**: `src/routes/`
- **Endpoints**:
  - `/api/sessions` - Session management
  - `/api/blackboard` - Blackboard operations
  - `/api/agents` - Agent management
  - `/api/config` - Configuration
  - `/api/templates` - Template management
  - `/api/audit` - Audit log access
  - `/api/health` - Health checks

#### CORS
- **Package**: `cors` v2.8.6
- **Usage**: `src/app.ts`
- **Purpose**: Cross-origin requests from frontend dev server

## Frontend Integrations

### Build & Development

#### Vite
- **Dev Server**: Port 5174
- **API Proxy**: `/api` → `http://localhost:3000`
- **Socket Proxy**: `/socket.io` → `http://localhost:3000` (local only)
- **Environment Variables**: `VITE_*` prefix required

### Visualization

#### React Flow
- **Package**: `reactflow` v11.11.4
- **Usage**: Agent communication graph visualization
- **Features**:
  - Interactive node-based graphs
  - Custom node types for agents
  - Edge animations for message flow

### Export

#### html2pdf.js
- **Package**: `html2pdf.js` v0.10.1
- **Usage**: Script export to PDF format
- **Features**:
  - Client-side PDF generation
  - HTML template rendering

## Environment Variables

### Required
| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Min 32 chars, for token signing |

### Optional (with defaults)
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | HTTP server port |
| `SOCKET_PORT` | 3001 | WebSocket port (unused, merged to PORT) |
| `LOG_LEVEL` | info | Pino log level |
| `LLM_PROVIDER` | openai | Default LLM provider |
| `BLACKBOARD_DATA_DIR` | ./data | Data persistence path |

### API Keys (one required for production)
| Variable | Provider |
|----------|----------|
| `OPENAI_API_KEY` | OpenAI GPT models |
| `ANTHROPIC_API_KEY` | Anthropic Claude models |

## Integration Points Summary

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React + Vite)                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │ Socket.IO Client │  │ React Flow      │  │ html2pdf.js │  │
│  └────────┬────────┘  └─────────────────┘  └──────────────┘  │
│           │                                                  │
│           ▼ WebSocket                                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                      Backend (Express)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Socket.IO   │  │ JWT Auth    │  │ OpenAI/Anthropic   │  │
│  │ Server      │  │ Capability  │  │ LLM Clients        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Pino Logger │  │ Tiktoken    │  │ File System        │  │
│  │             │  │ (Token ctr) │  │ (Data/Logs)        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```
