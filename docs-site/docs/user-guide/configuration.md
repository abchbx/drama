# Configuration

## Environment Variables

All configuration is managed through environment variables defined in `.env`.

### Server Configuration

```bash
PORT=3000                      # HTTP API port (default: 3000)
SOCKET_PORT=3001                # Socket.IO port (default: 3001)
LOG_LEVEL=info                 # Logging level: debug|info|warn|error|fatal
```

### LLM Provider Configuration

#### OpenAI

```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
OPENAI_BASE_URL=https://api.openai.com/v1  # Optional: for OpenAI-compatible APIs
```

#### Anthropic

```bash
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

### JWT Configuration

```bash
JWT_SECRET=your-super-secret-jwt-key-change-this  # Minimum 32 characters
JWT_EXPIRES_IN=24h                                    # Token expiration time
```

### Blackboard Configuration

```bash
BLACKBOARD_DATA_DIR=./data/blackboard           # Blackboard data directory

# Layer token budgets
CORE_LAYER_TOKEN_BUDGET=2000                # Core layer (no eviction)
SCENARIO_LAYER_TOKEN_BUDGET=4000             # Scenario layer
SEMANTIC_LAYER_TOKEN_BUDGET=8000             # Semantic layer
PROCEDURAL_LAYER_TOKEN_BUDGET=1000           # Procedural layer
```

### Routing and Timeout Configuration

```bash
# Socket.IO heartbeat
HEARTBEAT_INTERVAL_MS=30000                     # 30 seconds

# Agent timeouts
ACTOR_TIMEOUT_MS=300000                          # 5 minutes
ACTOR_RETRY_TIMEOUT_MS=60000                      # 1 minute

# Socket grace period
SOCKET_GRACE_PERIOD_MS=5000                       # 5 seconds

# Scene timeout
SCENE_TIMEOUT_MS=600000                          # 10 minutes
```

### Capability Configuration

```bash
# Capability definitions (JSON arrays of allowed layers)
CAPABILITY_ACTOR=["semantic","procedural"]
CAPABILITY_DIRECTOR=["core","scenario","procedural"]
CAPABILITY_ADMIN=["core","scenario","semantic","procedural"]
```

## Using OpenAI-Compatible APIs

The system supports custom OpenAI-compatible APIs by setting `OPENAI_BASE_URL`:

```bash
# Example: Using a local LLM server
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_API_KEY=your-custom-api-key
```

## Token Budget Management

### Budget Thresholds

- **60% of budget:** Warning logged (not blocking)
- **100% of budget:** Memory fold triggered automatically

### Layer Budgets

| Layer | Budget | Eviction | Purpose |
|-------|---------|-----------|---------|
| Core | 2000 | Never | Immutable facts |
| Scenario | 4000 | Yes | Scene state |
| Semantic | 8000 | Yes | Character data |
| Procedural | 1000 | Yes | Workflow data |

### Memory Folding Behavior

When semantic layer exceeds budget:
1. System compresses current entries into summary
2. Summary written to scenario layer
3. Old semantic entries removed
4. Core layer preserved (never folds)

## Example .env File

```bash
# Server
PORT=3000
SOCKET_PORT=3001
LOG_LEVEL=info

# LLM Provider
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o
OPENAI_BASE_URL=https://api.openai.com/v1

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-at-least-32-chars-long

# Blackboard
BLACKBOARD_DATA_DIR=./data/blackboard
CORE_LAYER_TOKEN_BUDGET=2000
SCENARIO_LAYER_TOKEN_BUDGET=4000
SEMANTIC_LAYER_TOKEN_BUDGET=8000
PROCEDURAL_LAYER_TOKEN_BUDGET=1000

# Routing
HEARTBEAT_INTERVAL_MS=30000
ACTOR_TIMEOUT_MS=300000
ACTOR_RETRY_TIMEOUT_MS=60000
SOCKET_GRACE_PERIOD_MS=5000
SCENE_TIMEOUT_MS=600000

# Capabilities
CAPABILITY_ACTOR=["semantic","procedural"]
CAPABILITY_DIRECTOR=["core","scenario","procedural"]
CAPABILITY_ADMIN=["core","scenario","semantic","procedural"]
```

## Next Steps

- [Getting Started](/guide/getting-started.md) - Setup instructions
- [User Guide](/user-guide/sessions.md) - Session management
- [API Reference](/api/index.md) - Complete API documentation
