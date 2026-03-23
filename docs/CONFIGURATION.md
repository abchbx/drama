# Configuration Guide / 配置指南

This guide provides detailed information about configuring the Multi-Agent Drama System.

本文档详细说明如何配置多智能体戏剧系统。

## Table of Contents / 目录

- [Environment Variables / 环境变量](#environment-variables--环境变量)
- [Required Variables / 必需变量](#required-variables--必需变量)
- [Optional Variables / 可选变量](#optional-variables--可选变量)
- [Default Configuration / 默认配置](#default-configuration--默认配置)
- [Security Best Practices / 安全最佳实践](#security-best-practices--安全最佳实践)
- [Environment-specific Configurations / 不同环境配置](#environment-specific-configurations--不同环境配置)
- [Troubleshooting / 故障排查](#troubleshooting--故障排查)

---

## Environment Variables / 环境变量

The application uses environment variables for configuration. Copy `.env.example` to `.env` and customize the values.

应用程序使用环境变量进行配置。将 `.env.example` 复制到 `.env` 并自定义值。

```bash
cp .env.example .env
```

### Required Variables / 必需变量

#### Server Configuration / 服务器配置

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | HTTP server port | `3000` | No |
| `SOCKET_PORT` | Socket.IO server port | `3001` | No |
| `LOG_LEVEL` | Logging level: `debug`, `info`, `warn`, `error`, `fatal` | `info` | No |

```env
PORT=3000
SOCKET_PORT=3001
LOG_LEVEL=info
```

#### Authentication / 认证

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `JWT_SECRET` | Secret key for JWT tokens (minimum 32 characters) | - | **Yes** |
| `JWT_EXPIRES_IN` | JWT token expiration time | `24h` | No |

```env
JWT_SECRET=your-secret-key-at-least-32-characters-long
JWT_EXPIRES_IN=24h
```

⚠️ **Important:** `JWT_SECRET` must be at least 32 characters long. Use a strong, randomly generated value in production.

⚠️ **重要:** `JWT_SECRET` 必须至少32个字符。在生产环境中使用强随机值。

#### LLM Provider / LLM 提供商

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `LLM_PROVIDER` | Provider: `openai`, `anthropic`, or `mock` | - | **Yes** |
| `OPENAI_API_KEY` | OpenAI API key (if `LLM_PROVIDER=openai`) | - | Conditional |
| `OPENAI_MODEL` | OpenAI model name | `gpt-4-turbo` | No |
| `OPENAI_BASE_URL` | OpenAI API base URL | `https://api.openai.com/v1` | No |
| `ANTHROPIC_API_KEY` | Anthropic API key (if `LLM_PROVIDER=anthropic`) | - | Conditional |
| `ANTHROPIC_MODEL` | Anthropic model name | `claude-3-opus-20240229` | No |

**Example for OpenAI:**

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4-turbo
OPENAI_BASE_URL=https://api.openai.com/v1
```

**Example for Anthropic:**

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
ANTHROPIC_MODEL=claude-3-opus-20240229
```

**Example for Mock (testing):**

```env
LLM_PROVIDER=mock
```

#### Blackboard Configuration / 黑板配置

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `BLACKBOARD_DATA_DIR` | Directory for blackboard data persistence | `./data` | No |
| `CORE_LAYER_TOKEN_BUDGET` | Core layer token budget | `2048` | No |
| `SCENARIO_LAYER_TOKEN_BUDGET` | Scenario layer token budget | `8192` | No |
| `SEMANTIC_LAYER_TOKEN_BUDGET` | Semantic layer token budget | `16384` | No |
| `PROCEDURAL_LAYER_TOKEN_BUDGET` | Procedural layer token budget | `4096` | No |

```env
BLACKBOARD_DATA_DIR=./data
CORE_LAYER_TOKEN_BUDGET=2048
SCENARIO_LAYER_TOKEN_BUDGET=8192
SEMANTIC_LAYER_TOKEN_BUDGET=16384
PROCEDURAL_LAYER_TOKEN_BUDGET=4096
```

#### Routing Configuration / 路由配置

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `HEARTBEAT_INTERVAL_MS` | Heartbeat interval in milliseconds | `5000` | No |
| `ACTOR_TIMEOUT_MS` | Actor timeout in milliseconds | `30000` | No |
| `ACTOR_RETRY_TIMEOUT_MS` | Actor retry timeout in milliseconds | `15000` | No |
| `SOCKET_GRACE_PERIOD_MS` | Socket grace period in milliseconds | `10000` | No |
| `SCENE_TIMEOUT_MS` | Scene timeout in milliseconds | `300000` | No |

```env
HEARTBEAT_INTERVAL_MS=5000
ACTOR_TIMEOUT_MS=30000
ACTOR_RETRY_TIMEOUT_MS=15000
SOCKET_GRACE_PERIOD_MS=10000
SCENE_TIMEOUT_MS=300000
```

#### Capability Configuration / 能力配置

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `CAPABILITY_ACTOR` | Layers accessible to Actor agents | `semantic,procedural` | No |
| `CAPABILITY_DIRECTOR` | Layers accessible to Director agents | `core,scenario,semantic,procedural` | No |
| `CAPABILITY_ADMIN` | Layers accessible to Admin agents | `core,scenario,semantic,procedural` | No |

```env
CAPABILITY_ACTOR=semantic,procedural
CAPABILITY_DIRECTOR=core,scenario,semantic,procedural
CAPABILITY_ADMIN=core,scenario,semantic,procedural
```

### Optional Variables / 可选变量

#### Frontend Configuration / 前端配置

Create `frontend/.env` for frontend-specific variables:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3001
VITE_SOCKET_RECONNECTION_ATTEMPTS=5
VITE_SOCKET_RECONNECTION_DELAY_MS=1000
VITE_SOCKET_TIMEOUT_MS=5000
```

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | Current origin |
| `VITE_SOCKET_URL` | Socket.IO server URL | Current origin |
| `VITE_SOCKET_RECONNECTION_ATTEMPTS` | Max reconnection attempts | `5` |
| `VITE_SOCKET_RECONNECTION_DELAY_MS` | Reconnection delay | `1000` |
| `VITE_SOCKET_TIMEOUT_MS` | Connection timeout | `5000` |

---

## Default Configuration / 默认配置

A default configuration file is provided at `config/defaults.json`:

默认配置文件位于 `config/defaults.json`:

```json
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0"
  },
  "blackboard": {
    "memoryFoldIntervalMs": 5000
  },
  "logging": {
    "level": "info",
    "format": "json"
  }
}
```

Environment variables override default values. Use this file as a reference for development environments.

环境变量会覆盖默认值。将此文件用作开发环境的参考。

---

## Security Best Practices / 安全最佳实践

### 1. Protect API Keys / 保护 API 密钥

**Never commit `.env` files to version control.**

**永远不要将 `.env` 文件提交到版本控制。**

Add `.env` to `.gitignore`:

将 `.env` 添加到 `.gitignore`:

```gitignore
# Environment variables
.env
.env.local
.env.*.local
```

### 2. Use Strong Secrets / 使用强密钥

Generate a random JWT secret for production:

为生产环境生成随机 JWT 密钥:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32
```

### 3. Rotate API Keys Regularly / 定期轮换 API 密钥

Set up a schedule to rotate API keys every 90 days for production environments.

为生产环境设置每90天轮换 API 密钥的计划。

### 4. Use Environment-Specific Configs / 使用环境特定配置

Create separate `.env` files for different environments:

为不同环境创建单独的 `.env` 文件:

```bash
.env.development    # Development environment
.env.staging       # Staging environment
.env.production    # Production environment
```

Use a tool like `dotenv-cli` to load the appropriate file:

使用 `dotenv-cli` 等工具加载适当的文件:

```bash
# Development
dotenv -e .env.development -- npm run dev

# Production
dotenv -e .env.production -- npm start
```

### 5. Limit Access to Secrets / 限制对密钥的访问

In production, use a secrets management service:

在生产环境中,使用密钥管理服务:

- **AWS Secrets Manager**: Store and rotate secrets automatically
- **HashiCorp Vault**: Enterprise-grade secret management
- **Google Secret Manager**: Cloud-native secret storage
- **Azure Key Vault**: Azure-specific secret management

**AWS Secrets Manager / HashiCorp Vault / Google Secret Manager / Azure Key Vault:**
企业级密钥管理和自动轮换。

---

## Environment-specific Configurations / 不同环境配置

### Development / 开发环境

```env
# Server
PORT=3000
SOCKET_PORT=3001
LOG_LEVEL=debug

# LLM Provider
LLM_PROVIDER=mock

# Routing (relaxed timeouts for debugging)
HEARTBEAT_INTERVAL_MS=10000
ACTOR_TIMEOUT_MS=60000
```

### Staging / 测试环境

```env
# Server
PORT=3000
SOCKET_PORT=3001
LOG_LEVEL=info

# LLM Provider (use real API but with cheaper models)
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-test-key-here
OPENAI_MODEL=gpt-4o-mini
```

### Production / 生产环境

```env
# Server
PORT=3000
SOCKET_PORT=3001
LOG_LEVEL=warn

# LLM Provider (use production API keys)
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-production-key-here
OPENAI_MODEL=gpt-4-turbo

# Routing (strict timeouts)
HEARTBEAT_INTERVAL_MS=5000
ACTOR_TIMEOUT_MS=30000
SCENE_TIMEOUT_MS=300000

# JWT (strong secret from secrets manager)
JWT_SECRET=<from-secrets-manager>
JWT_EXPIRES_IN=1h
```

---

## Troubleshooting / 故障排查

### Connection Issues / 连接问题

**Problem:** Frontend cannot connect to backend.

**问题:** 前端无法连接到后端。

**Solution:** Check `VITE_API_BASE_URL` and `VITE_SOCKET_URL` in `frontend/.env`.

**解决:** 检查 `frontend/.env` 中的 `VITE_API_BASE_URL` 和 `VITE_SOCKET_URL`。

```env
# If backend is on localhost:3000
VITE_API_BASE_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

### API Key Errors / API 密钥错误

**Problem:** 401 Unauthorized errors from LLM provider.

**问题:** LLM 提供商返回 401 Unauthorized 错误。

**Solution:** Verify API key is correct and active.

**解决:** 验证 API 密钥是否正确且有效。

```bash
# Test OpenAI API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Timeout Issues / 超时问题

**Problem:** Actors timing out frequently.

**问题:** Actor 频繁超时。

**Solution:** Increase `ACTOR_TIMEOUT_MS` or check network latency.

**解决:** 增加 `ACTOR_TIMEOUT_MS` 或检查网络延迟。

```env
# Increase timeout from 30s to 60s
ACTOR_TIMEOUT_MS=60000
```

### Memory Issues / 内存问题

**Problem:** Out of memory errors or slow performance.

**问题:** 内存不足错误或性能缓慢。

**Solution:** Reduce token budgets or enable memory folding.

**解决:** 减少令牌预算或启用内存折叠。

```env
# Reduce budgets
CORE_LAYER_TOKEN_BUDGET=1024
SCENARIO_LAYER_TOKEN_BUDGET=4096
```

---

## Additional Resources / 其他资源

- [API Documentation](./API.md) - Detailed API reference
- [Architecture Guide](../.planning/codebase/ARCHITECTURE.md) - System architecture
- [Testing Guide](../.planning/codebase/TESTING.md) - Testing procedures

---

For questions or issues, please refer to the [main README](../README.md).

如有疑问或问题,请参阅 [主 README](../README.md)。
