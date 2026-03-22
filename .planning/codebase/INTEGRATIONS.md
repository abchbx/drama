# External Integrations

**Project:** Multi-Agent Drama System  
**Version:** v1.1  
**Last Updated:** 2026-03-22  

## LLM Provider APIs

### OpenAI Integration

**SDK**: `openai 6.32.0`

**API Endpoint**:
- Default: `https://api.openai.com/v1`
- Customizable via `OPENAI_BASE_URL` environment variable

**Models Supported**:
- `gpt-4-turbo` (default)
- Configurable via `OPENAI_MODEL`

**Authentication**:
- API Key via `OPENAI_API_KEY` environment variable
- Bearer token authentication

**Features**:
- Chat completions API
- Temperature and max_tokens configuration
- Streaming support (currently disabled, using non-streaming mode)
- Error handling with detailed logging

**Implementation**: `src/services/llm/openai.ts`

**Usage**:
```typescript
const completion = await client.chat.completions.create({
  model: this.model,
  messages: [
    { role: 'system', content: prompt.system },
    { role: 'user', content: prompt.user },
  ],
  temperature: this.temperature,
  max_tokens: this.maxTokens,
  stream: false,
});
```

---

### Anthropic Claude Integration

**SDK**: `@anthropic-ai/sdk 0.80.0`

**API Endpoint**: `https://api.anthropic.com/v1/messages`

**Models Supported**:
- `claude-3-opus-20240229` (default)
- Configurable via `ANTHROPIC_MODEL`

**Authentication**:
- API Key via `ANTHROPIC_API_KEY` environment variable
- x-api-key header authentication

**Features**:
- Messages API
- System prompt support
- Temperature and max_tokens configuration
- Content blocks handling (text blocks)
- Error handling with detailed logging

**Implementation**: `src/services/llm/anthropic.ts`

**Usage**:
```typescript
const completion = await client.messages.create({
  model: this.model,
  system: prompt.system,
  messages: [
    { role: 'user', content: prompt.user },
  ],
  temperature: this.temperature,
  max_tokens: this.maxTokens,
  stream: false,
});
```

---

### LLM Provider Switching

**Configuration**: `LLM_PROVIDER` environment variable
- Values: `"openai"` | `"anthropic"`
- Default: `"openai"`

**Fallback**:
- MockLlmProvider automatically used when:
  - API keys are missing
  - Test mode is active (`NODE_ENV=test` or `VITEST=true`)

**Abstraction Layer**:
- `LlmProvider` interface defines common contract
- `createLlmProvider()` factory function selects implementation
- Zero code changes required when switching providers

**Implementation**: `src/services/llm.ts`

---

## Token Counting Integration

### Tiktoken

**Library**: `tiktoken 1.0.0`

**Purpose**: Accurate token counting for budget management

**Encoding**: `cl100k_base` (GPT-4 compatible encoding)

**Features**:
- Synchronous WASM-based tokenizer
- Cached encoder instance for performance
- Used by BlackboardService for token budget enforcement
- Integrates with MemoryManager for memory folding decisions

**Implementation**: `src/services/blackboard.ts`

**Usage**:
```typescript
import { encoding_for_model } from 'tiktoken';

function countTokens(text: string): number {
  const encoder = encoding_for_model('gpt-4'); // Uses cl100k_base
  const tokens = encoder.encode(text);
  encoder.free();
  return tokens.length;
}
```

---

## Real-Time Communication

### Socket.IO Integration

**Server**: `socket.io 4.8.3`
**Client**: `socket.io-client 4.8.3`

**Ports**:
- HTTP API: `PORT` (default: 3000)
- Socket.IO: `SOCKET_PORT` (default: 3001)

**Transports**:
- WebSocket (primary)
- Polling (fallback)

**CORS Configuration**:
- Origin: `*` (all origins allowed)
- Configurable in `src/services/router.ts`

**Features**:
- Bidirectional event-based communication
- Automatic reconnection with configurable attempts
- Room-based messaging (actors, directors, agent-specific)
- Heartbeat monitoring for connection health
- Message buffering for offline agents
- Grace period handling for temporary disconnections

**Server-Side Events**:
- `connection` - New client connection
- `disconnect` - Client disconnection
- `heartbeat:pong` - Heartbeat response
- `routing:message` - Agent-to-agent routing messages
- `agent_connected` - Agent connection notification
- `agent_disconnected` - Agent disconnection notification
- `agent_updated` - Agent state update broadcast
- `message:received` - Message received broadcast

**Client-Side Events**:
- `connect` - Connection established
- `disconnect` - Disconnection
- `connect_error` - Connection error
- `reconnect_attempt` - Reconnection attempt
- `reconnect` - Reconnection successful
- `reconnect_error` - Reconnection error
- `reconnect_failed` - Reconnection failed
- `scene_started` - Scene started notification
- `scene_stopped` - Scene stopped notification
- `scene_completed` - Scene completed notification
- `session_state` - Session state synchronization

**Implementation**:
- Server: `src/services/router.ts`
- Client: `frontend/src/lib/socket.ts`

---

## HTTP API Integration

### Express REST API

**Framework**: `Express 4.19.0`

**Base URL**: `http://localhost:3000` (default)

**Frontend Proxy**:
- Vite dev server proxies `/api` → backend `http://localhost:3000`
- Socket.IO proxied to backend Socket.IO server

**Endpoints**:
- `GET /health` - Health check
- `POST /session` - Create drama session
- `POST /blackboard/agents/register` - Register agent (issue JWT)
- `GET /blackboard/agents/me/scope` - Get agent scope
- `GET /blackboard/audit` - Query audit log
- `GET /blackboard/layers/:layer/entries` - Read layer entries
- `GET /blackboard/layers/:layer/entries/:id` - Read single entry
- `POST /blackboard/layers/:layer/entries` - Write entry
- `DELETE /blackboard/layers/:layer/entries/:id` - Delete entry
- `GET /sessions` - List sessions
- `GET /sessions/:dramaId` - Get session details
- `POST /sessions/:dramaId/scene/start` - Start scene
- `POST /sessions/:dramaId/scene/stop` - Stop scene
- `GET /config` - Get configuration
- `PUT /config` - Update configuration
- `PUT /config/llm` - Update LLM configuration
- `PUT /config/session` - Update session parameters
- `GET /templates` - List templates
- `GET /templates/:id` - Get template
- `POST /templates` - Create template
- `PUT /templates/:id` - Update template
- `DELETE /templates/:id` - Delete template
- `GET /health` - System health check
- `GET /metrics` - System metrics
- `GET /sessions/:dramaId/export` - Export session (JSON/Markdown)

**Implementation**: `src/routes/` directory

---

## Authentication Integration

### JWT (JSON Web Tokens)

**Library**: `jsonwebtoken 9.0.3`

**Algorithm**: HS256 (HMAC-SHA256 symmetric)

**Purpose**: Agent authentication and authorization

**Flow**:
1. Agent calls `POST /blackboard/agents/register` with agentId and role
2. Server issues JWT token signed with `JWT_SECRET`
3. Agent includes token in `Authorization: Bearer <jwt>` header
4. Server validates token and extracts agentId and role
5. Capability service enforces role-based permissions

**Token Payload**:
```typescript
{
  agentId: string;
  role: 'Actor' | 'Director' | 'Admin';
  iat: number;  // Issued at
  exp: number;  // Expiration
}
```

**Configuration**:
- `JWT_SECRET` - Signing secret (minimum 32 characters)
- `JWT_EXPIRES_IN` - Token expiration (default: 24h)

**Roles and Permissions**:
- **Actor**: Can read/write semantic and procedural layers only
- **Director**: Full access to all layers (core, scenario, semantic, procedural)
- **Admin**: Full access to all layers

**Implementation**: `src/services/capability.ts`, `src/routes/agents.ts`

---

## Persistence Integrations

### File System Storage

**Snapshot Service**:
- **Location**: `BLACKBOARD_DATA_DIR/blackboard.json` (default: `./data/blackboard.json`)
- **Backup**: `blackboard.backup.json`
- **Format**: JSON with schema version and timestamp
- **Purpose**: Persist blackboard state for recovery

**Audit Log Service**:
- **Location**: `BLACKBOARD_DATA_DIR/audit-YYYY-MM-DD.jsonl`
- **Format**: JSONL (one JSON object per line)
- **Rotation**: Daily rotation by date
- **Retention**: Current day + previous day

**Template Storage** (Frontend):
- **Location**: Browser localStorage
- **Key**: `drama-templates`
- **Format**: JSON array of templates
- **Purpose**: Persistent session templates

**Implementation**:
- Snapshot: `src/services/snapshot.ts`
- Audit Log: `src/services/auditLog.ts`
- Templates: `frontend/src/utils/templateStorage.ts`

---

## PDF Export Integration

### html2pdf.js

**Library**: `html2pdf.js 0.10.1`

**Purpose**: Generate PDF from Markdown-formatted scripts

**Workflow**:
1. Fetch script in Markdown format from backend
2. Convert Markdown to HTML
3. Use html2pdf.js to generate PDF
4. Trigger browser download

**Features**:
- Client-side PDF generation
- Custom page formatting
- Document metadata

**Implementation**: `frontend/src/lib/pdfExporter.ts`

---

## Development & Testing Integrations

### Testing Framework

**Vitest 2.0.0**:
- Unit and integration testing
- Watch mode for development
- Environment: Node (server-side tests)
- Test timeout: 30 seconds

**Supertest 7.0.0**:
- HTTP endpoint testing
- Express app integration
- Request/response assertion

**Mock LLM Provider**:
- Used in all tests to avoid API calls
- Simulates realistic responses
- Configurable delay for testing timeouts

**Coverage Areas**:
- Blackboard behavior
- Cognitive boundary enforcement
- Actor and Director logic
- Memory management and folding
- Protocol validation
- End-to-end orchestration
- Chaos resilience testing

**Implementation**: `tests/` directory

---

## Logging Integration

### Pino Structured Logging

**Library**: `pino 9.0.0`

**Purpose**: Production-grade structured logging

**Features**:
- JSON-formatted logs
- Log levels: debug, info, warn, error, fatal
- Agent attribution in logs
- Timestamps and context metadata
- Pretty printing in development (pino-pretty)

**Configuration**:
- `LOG_LEVEL` environment variable
- Default: `info`

**Implementation**: `src/services/logger.ts`

---

## Data Visualization Integration

### ReactFlow

**Library**: `reactflow 11.11.4`

**Purpose**: Graph visualization for agent communication

**Features**:
- Interactive node graphs
- Custom node styling
- Real-time updates via Socket.IO
- Message flow visualization

**Implementation**: `frontend/src/components/dashboard/AgentGraph.tsx`

---

## Frontend Build Integration

### Vite

**Library**: `Vite 6.0.7`

**Purpose**: Fast build tool and dev server

**Features**:
- HMR (Hot Module Replacement)
- TypeScript support
- React plugin integration
- Environment variable management (`VITE_*` prefix)
- API proxy configuration
- Production optimization

**Configuration**:
- Dev server port: 5174
- Proxy `/api` → backend HTTP
- Proxy `/socket.io` → backend Socket.IO

**Implementation**: `frontend/vite.config.ts`

---

## State Management Integration

### Zustand

**Library**: `zustand 5.0.3`

**Purpose**: Lightweight global state management

**Features**:
- Minimal boilerplate
- TypeScript support
- Persistent state (sessions, config, templates)
- Reactive updates
- Integration with Socket.IO events

**Implementation**: `frontend/src/store/appStore.ts`

---

## Configuration Management

### dotenv

**Library**: `dotenv 16.4.0`

**Purpose**: Environment variable loading

**Features**:
- Load from `.env` file
- Type-safe configuration validation with Zod
- Schema validation at startup
- Detailed error messages for missing/invalid config

**Implementation**: `src/config.ts`

---

## Webhook Integration

**Status**: Not currently implemented

**Future Considerations**:
- Webhook notifications for external systems
- Integration with CI/CD pipelines
- External system triggers for drama sessions

---

## OAuth Integration

**Status**: Not currently implemented

**Current Authentication**:
- JWT-based internal authentication
- No external OAuth providers
- Self-contained system with internal user management

**Future Considerations**:
- OAuth 2.0 for external integrations
- SSO support for enterprise deployments

---

## Database Integration

**Status**: No external database used

**Current Storage**:
- File-based persistence (JSON)
- In-memory blackboard state
- localStorage for frontend templates
- Audit logs in JSONL format

**Future Considerations**:
- PostgreSQL for production persistence
- Redis for distributed caching
- Database migration system
- Distributed blackboard state

---

## Monitoring & Observability

**Status**: Basic health monitoring implemented

**Current Features**:
- `/health` endpoint for health checks
- Structured logging (Pino)
- Agent heartbeat monitoring
- Connection status tracking
- Error logging and reporting

**Future Considerations**:
- Metrics collection (Prometheus)
- Distributed tracing (OpenTelemetry)
- Alerting integration
- Log aggregation (ELK stack)
- Performance monitoring (APM)

---

## External Service Dependencies Summary

### Required for Production
- **OpenAI API Key** OR **Anthropic API Key** (for LLM functionality)
- **File System Access** (for snapshots and audit logs)

### Optional for Development
- MockLlmProvider (no API key required)
- In-memory storage (no file system required)

### Network Requirements
- Outbound HTTPS access to LLM provider APIs
- Inbound HTTP access on configured ports
- WebSocket support for Socket.IO

### Service Availability
- Single-node deployment (no distributed dependencies)
- No external message queues
- No external databases
- No external cache systems
