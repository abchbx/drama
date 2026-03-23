# Multi-Agent Drama System / 多智能体戏剧系统

A shared-blackboard multi-agent drama orchestration system with explicit cognitive boundaries, layered memory, real-time routing, and LLM-provider abstraction.

一个基于共享黑板（Shared Blackboard）架构的多智能体戏剧编排系统，强调认知边界控制、分层记忆管理、实时消息路由，以及对多种 LLM 提供商的统一抽象。

## Status / 当前状态

- Milestone: **v1.2 released**
- Completed phases: **13 / 13**
- Test status: **104 tests passing**
- Main runtime entry: [src/index.ts](src/index.ts)
- Express app composition: [src/app.ts](src/app.ts)
- Frontend: React 18 + TypeScript + Vite (v1.2)
- Documentation: VitePress site (v1.2)

- 当前里程碑：**v1.2 已发布**
- 已完成阶段：**13 / 13**
- 测试状态：**104 个测试全部通过**
- 主运行入口：[src/index.ts](src/index.ts)
- Express 应用装配位置：[src/app.ts](src/app.ts)
- 前端：React 18 + TypeScript + Vite (v1.2)
- 文档站点：VitePress 站点 (v1.2)

## What this project does / 项目用途

This project coordinates a Director agent and multiple Actor agents to produce drama content with:

- shared state consistency
- strict role-based memory boundaries
- character-scoped views
- long-context control through memory folding
- resilient routing with heartbeat and timeout handling
- **v1.2新增**: Web-based frontend interface for session management
- **v1.2新增**: Real-time visualization of agent communication
- **v1.2新增**: Script export in JSON, Markdown, and PDF formats
- **v1.2新增**: Comprehensive documentation site

该项目协调一个 Director（导演智能体）与多个 Actor（演员智能体），用于生成具备以下特性的戏剧内容：

- 共享状态一致性
- 基于角色的严格记忆边界
- 面向演员的作用域视图
- 通过 memory folding 控制长上下文膨胀
- 通过心跳与超时机制实现更稳健的消息路由
- **v1.2新增**: 基于 Web 的前端界面用于会话管理
- **v1.2新增**: 智能体通信实时可视化
- **v1.2新增**: 支持 JSON、Markdown、PDF 格式脚本导出
- **v1.2新增**: 完整的文档站点

## Core capabilities / 核心能力

### Backend / 后端
- Shared blackboard architecture with layered memory
- Programmatic capability enforcement instead of prompt-only isolation
- Layer budgets with token-aware memory folding
- Socket.IO-based broadcast, multicast, and peer messaging
- Audit logging and snapshot persistence hooks
- OpenAI and Anthropic provider adapters
- DramaSession orchestration for end-to-end runs

### Frontend (v1.2) / 前端 (v1.2)
- Web-based session management with React 18 + TypeScript
- Real-time visualization of agent communication using React Flow
- LLM provider configuration (OpenAI, Anthropic, Mock)
- Session parameter configuration
- Script export in JSON, Markdown, and PDF formats
- Session template management
- Dashboard with agent health monitoring
- Toast notifications for user feedback
- Error boundary for crash recovery

### Documentation (v1.2) / 文档 (v1.2)
- VitePress-based documentation site
- API documentation
- Configuration guide
- Deployment guide
- UAT testing checklist

- 基于分层记忆的共享黑板架构
- 通过程序级能力控制实现边界隔离，而不是仅依赖提示词约束
- 按 token 预算进行 memory folding
- 基于 Socket.IO 的广播、组播与点对点通信
- 审计日志与快照持久化能力
- OpenAI / Anthropic 提供商适配层
- 通过 DramaSession 完成端到端戏剧编排

- 基于 Web 的会话管理 (React 18 + TypeScript)
- 使用 React Flow 的智能体通信实时可视化
- LLM 提供商配置 (OpenAI、Anthropic、Mock)
- 会话参数配置
- 脚本导出 (JSON、Markdown、PDF 格式)
- 会话模板管理
- 带有智能体健康监控的仪表板
- 用户反馈的 Toast 通知
- 崩溃恢复的错误边界

- 基于 VitePress 的文档站点
- API 文档
- 配置指南
- 部署指南
- UAT 测试检查清单

## Architecture overview / 架构概览

### Main runtime components / 运行时核心组件

- **HTTP API**: route composition and service exposure in [src/app.ts](src/app.ts)
- **Bootstrap**: service initialization and server startup in [src/index.ts](src/index.ts)
- **Drama orchestrator**: [src/session.ts](src/session.ts)
- **Blackboard service**: [src/services/blackboard.ts](src/services/blackboard.ts)
- **Capability service**: [src/services/capability.ts](src/services/capability.ts)
- **Router service**: [src/services/router.ts](src/services/router.ts)
- **Memory manager**: [src/services/memoryManager.ts](src/services/memoryManager.ts)

- **HTTP API**：路由装配与服务暴露位于 [src/app.ts](src/app.ts)
- **启动入口**：服务初始化与服务启动位于 [src/index.ts](src/index.ts)
- **戏剧编排器**：[src/session.ts](src/session.ts)
- **黑板服务**：[src/services/blackboard.ts](src/services/blackboard.ts)
- **能力控制服务**：[src/services/capability.ts](src/services/capability.ts)
- **路由服务**：[src/services/router.ts](src/services/router.ts)
- **记忆管理器**：[src/services/memoryManager.ts](src/services/memoryManager.ts)

### Memory layers / 记忆分层

- `core`: durable high-value narrative facts
- `scenario`: current scene state and story progression
- `semantic`: summaries, interpretations, compressed context
- `procedural`: execution state, workflow traces, control data

- `core`：高价值、稳定的剧情核心事实
- `scenario`：当前场景状态与剧情推进信息
- `semantic`：语义摘要、理解结果、压缩上下文
- `procedural`：执行状态、流程轨迹与控制数据

## Documentation / 文档索引

- API reference: [docs/API.md](docs/API.md)
- Architecture diagrams: `docs/architecture/` *(to be added in this pass)*
- Deployment guide: `docs/deployment/` *(to be added in this pass)*
- Planning artifacts: [.planning/](.planning/)

- API 文档：[docs/API.md](docs/API.md)
- 架构图：`docs/architecture/`（本轮补充）
- 部署文档：`docs/deployment/`（本轮补充）
- 规划产物：[.planning/](.planning/)

## Repository layout / 仓库结构

```text
src/
├── app.ts                  # Express app composition / Express 应用装配
├── config.ts               # Env schema and config validation / 环境变量与配置校验
├── index.ts                # Runtime bootstrap / 启动入口
├── session.ts              # DramaSession orchestrator / 戏剧会话编排器
├── routes/                 # HTTP routes / HTTP 路由
├── services/               # Core runtime services / 核心服务
└── types/                  # Shared types and schemas / 类型与协议 schema

tests/
├── actor.test.ts
├── blackboard.test.ts
├── boundary.test.ts
├── chaos.test.ts
├── director.test.ts
├── e2e.test.ts
├── memoryManager.test.ts
└── protocol.test.ts
```

## Runtime API summary / 运行时 API 摘要

Current documented HTTP endpoints:

- `GET /health`
- `POST /session`
- `POST /blackboard/agents/register`
- `GET /blackboard/agents/me/scope`
- `GET /blackboard/audit`
- `GET /blackboard/layers/:layer/entries`
- `GET /blackboard/layers/:layer/entries/:id`
- `POST /blackboard/layers/:layer/entries`
- `DELETE /blackboard/layers/:layer/entries/:id`

当前已文档化的 HTTP 接口包括：

- `GET /health`
- `POST /session`
- `POST /blackboard/agents/register`
- `GET /blackboard/agents/me/scope`
- `GET /blackboard/audit`
- `GET /blackboard/layers/:layer/entries`
- `GET /blackboard/layers/:layer/entries/:id`
- `POST /blackboard/layers/:layer/entries`
- `DELETE /blackboard/layers/:layer/entries/:id`

For request and response examples, see [docs/API.md](docs/API.md).

请求和响应示例请参考 [docs/API.md](docs/API.md)。

## Environment configuration / 环境变量配置

The runtime configuration is validated in [src/config.ts](src/config.ts) and sample values are provided in [.env.example](.env.example).

运行时配置由 [src/config.ts](src/config.ts) 校验，示例值可参考 [.env.example](.env.example)。

### Required or commonly used variables / 关键环境变量

#### Server / 服务

- `PORT` (default `3000`)
- `SOCKET_PORT` (default `3001`)
- `LOG_LEVEL` (`debug | info | warn | error | fatal`)

- `PORT`（默认 `3000`）
- `SOCKET_PORT`（默认 `3001`）
- `LOG_LEVEL`（`debug | info | warn | error | fatal`）

#### Auth / 认证

- `JWT_SECRET` (minimum 32 chars)
- `JWT_EXPIRES_IN`

- `JWT_SECRET`（至少 32 个字符）
- `JWT_EXPIRES_IN`

#### LLM provider / LLM 提供商

- `LLM_PROVIDER` = `openai` or `anthropic`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_BASE_URL`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`

- `LLM_PROVIDER` = `openai` 或 `anthropic`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_BASE_URL`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`

#### Blackboard and budgets / 黑板与预算

- `BLACKBOARD_DATA_DIR`
- `CORE_LAYER_TOKEN_BUDGET`
- `SCENARIO_LAYER_TOKEN_BUDGET`
- `SEMANTIC_LAYER_TOKEN_BUDGET`
- `PROCEDURAL_LAYER_TOKEN_BUDGET`

- `BLACKBOARD_DATA_DIR`
- `CORE_LAYER_TOKEN_BUDGET`
- `SCENARIO_LAYER_TOKEN_BUDGET`
- `SEMANTIC_LAYER_TOKEN_BUDGET`
- `PROCEDURAL_LAYER_TOKEN_BUDGET`

#### Routing and timeouts / 路由与超时

- `HEARTBEAT_INTERVAL_MS`
- `ACTOR_TIMEOUT_MS`
- `ACTOR_RETRY_TIMEOUT_MS`
- `SOCKET_GRACE_PERIOD_MS`
- `SCENE_TIMEOUT_MS`

- `HEARTBEAT_INTERVAL_MS`
- `ACTOR_TIMEOUT_MS`
- `ACTOR_RETRY_TIMEOUT_MS`
- `SOCKET_GRACE_PERIOD_MS`
- `SCENE_TIMEOUT_MS`

#### Capabilities / 能力边界

- `CAPABILITY_ACTOR`
- `CAPABILITY_DIRECTOR`
- `CAPABILITY_ADMIN`

- `CAPABILITY_ACTOR`
- `CAPABILITY_DIRECTOR`
- `CAPABILITY_ADMIN`

## Quick start / 快速开始

### 1. Install dependencies / 安装依赖

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Create local env file / 创建本地环境文件

```bash
# Backend environment
cp .env.example .env

# Frontend environment
cd frontend && cp .env.example .env && cd ..
```

Then update `.env` with your provider credentials and runtime settings.

然后在 `.env` 中填写你的模型提供商密钥与运行参数。

### 3. Start in development / 启动开发模式

```bash
# Start backend (terminal 1)
npm run dev

# Start frontend (terminal 2)
cd frontend && npm run dev
```

Frontend will be available at `http://localhost:5173`

前端将在 `http://localhost:5173` 可用

### 4. Build / 构建

```bash
# Build backend
npm run build

# Build frontend
cd frontend && npm run build && cd ..

# Build documentation
npm run docs:build
```

### 5. Start production build / 启动生产构建

```bash
npm start
```

### 6. Access the application / 访问应用

- **Frontend**: `http://localhost:5173` (dev) or `http://localhost:3000` (with Nginx)
- **API**: `http://localhost:3000/api`
- **Documentation**: `http://localhost:3000/docs`

## Testing / 测试

Run all tests:

运行全部测试：

```bash
npm test
```

Watch mode:

监听模式：

```bash
npm run test:watch
```

Current test coverage areas include:

当前测试覆盖包括：

- blackboard behavior / 黑板行为
- cognitive boundaries / 认知边界
- actor and director logic / Actor 与 Director 逻辑
- memory management / 记忆管理
- protocol validation / 协议校验
- end-to-end orchestration / 端到端编排
- chaos resilience / Chaos 鲁棒性

## Design goals / 设计目标

This repository is not trying to make a single model merely impersonate multiple roles. It is trying to build a real multi-agent runtime with:

- coordination
- permission boundaries
- state consistency
- long-context control
- recoverability under failure

这个仓库的目标不是让单个大模型“假装成多个角色”，而是构建一个真正具备以下能力的多智能体运行时：

- 协作编排
- 权限边界
- 状态一致性
- 长上下文控制
- 失败恢复能力

## v1.2 Features / v1.2 新功能

### Frontend Web Interface / 前端 Web 界面
- **Session Management**: Create, configure, and manage drama sessions
- **Real-time Visualization**: Monitor agent communication with React Flow
- **Dashboard**: Track agent health, session status, and system metrics
- **Export**: Download scripts in JSON, Markdown, or PDF formats
- **Templates**: Save and reuse session configurations

### Improvements / 改进
- Enhanced error handling with user-friendly messages
- Socket.IO reconnection with visual status indicators
- Global error boundary for crash recovery
- Performance optimizations (virtual scrolling, event throttling)
- Complete documentation suite

### Documentation / 文档
- Configuration guide with all environment variables
- Deployment guide with step-by-step instructions
- UAT testing checklist
- API reference

## v1.3 Roadmap / v1.3 路线图

Planned next-step areas include:

- Performance optimization (message virtual scrolling, Actor rotation optimization)
- Automated browser testing with Playwright
- Docker containerization
- Key management service integration
- Additional export formats and visualization enhancements
- Theme switching support (light/dark mode)

下一阶段重点方向包括：

- 性能优化（消息虚拟滚动、Actor 轮转优化）
- 使用 Playwright 的自动化浏览器测试
- Docker 容器化
- 密钥管理服务集成
- 额外的导出格式和可视化增强
- 主题切换支持（亮色/暗色模式）

## Repository / 仓库地址

GitHub: https://github.com/abchbx/drama.git
