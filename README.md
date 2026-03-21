# Multi-Agent Drama System

一个基于共享黑板（Shared Blackboard）架构的多智能体戏剧协作系统。

该项目通过 Director（导演智能体）与多个 Actor（演员智能体）的协同工作，生成具有角色一致性、上下文连续性和认知边界约束的戏剧内容。系统重点解决多智能体创作中的几个核心问题：上下文漂移、共享状态冲突、角色越权，以及长上下文下的记忆折叠。

## 项目特性

- 共享黑板架构：以统一状态中心管理全局剧情、场景、语义与过程记忆
- 认知边界控制：对不同智能体实施硬性读写权限隔离，防止角色越权
- 多层记忆系统：支持 core / scenario / semantic / procedural 四层记忆
- 实时消息路由：基于 Socket.IO 提供广播、点对点、多播通信
- 超时与心跳机制：避免智能体掉线或沉默导致流程阻塞
- 记忆折叠机制：在 token 预算压力下自动压缩语义层内容
- LLM 提供商抽象：支持 OpenAI 与 Anthropic，可无缝切换
- 结构化日志：所有日志带 agent attribution，便于追踪与调试
- 完整测试覆盖：包含单元测试、协议测试、端到端测试和 chaos tests

## 当前状态

当前已完成 v1.1 里程碑，全部 7 个阶段实现完成。

- Phase 1: Shared Blackboard Service
- Phase 2: Cognitive Boundary Control
- Phase 3: Actor Agents
- Phase 4: Director Agent
- Phase 5: Message Routing Hub
- Phase 6: Memory Management Engine
- Phase 7: Integration + Chaos Testing

当前测试状态：**104 个测试全部通过**。

## 技术栈

- Node.js 22 LTS
- TypeScript 5.5
- Express 4
- Socket.IO 4
- Zod
- Pino
- Vitest
- OpenAI SDK
- Anthropic SDK
- tiktoken

## 目录结构

```text
src/
├── app.ts                  # Express 应用创建与依赖注入
├── config.ts               # 环境变量与配置校验
├── index.ts                # 服务启动入口
├── session.ts              # DramaSession 编排器
├── routes/                 # HTTP 路由
├── services/               # 核心服务层
│   ├── actor.ts
│   ├── auditLog.ts
│   ├── blackboard.ts
│   ├── capability.ts
│   ├── director.ts
│   ├── heartbeat.ts
│   ├── llm.ts
│   ├── logger.ts
│   ├── memoryManager.ts
│   ├── messageBuffer.ts
│   ├── router.ts
│   ├── snapshot.ts
│   └── timeoutManager.ts
└── types/                  # 类型定义与协议 schema

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

## 核心架构说明

### 1. Shared Blackboard

共享黑板是系统的单一事实来源（single source of truth），负责保存所有智能体需要读取或写入的状态信息。

四层结构如下：

- `core`：不可轻易变更的剧情核心事实
- `scenario`：当前场景与故事推进状态
- `semantic`：语义摘要、角色理解、中间推理信息
- `procedural`：流程控制、执行状态、操作轨迹

### 2. Cognitive Boundary Control

系统不是依赖 prompt 约束，而是通过程序级权限控制限制智能体能力。

例如：

- Actor 不能写入 core 层
- Actor 不能读取完整黑板
- Director 拥有更高权限，但不直接代替 Actor 生成角色对白

### 3. Message Routing Hub

系统通过 Socket.IO 进行实时通信，支持：

- broadcast：导演向所有演员广播场景信号
- peer-to-peer：智能体之间点对点发送消息
- multicast：部分智能体组播通信
- heartbeat：存活检测
- timeout fallback：超时回退，保证流程继续推进

### 4. Memory Management Engine

当语义层超过预算时，系统会触发 folding，将低优先级语义内容压缩为摘要，同时保留关键叙事信息，避免上下文无限膨胀。

### 5. DramaSession

`DramaSession` 是端到端戏剧执行编排器，负责：

- 创建一轮戏剧会话
- 管理导演与演员协作过程
- 协调路由、记忆、权限与 LLM 调用
- 处理异常与 chaos 场景

## 环境变量配置

项目通过 `.env` 配置运行参数，示例可参考 `.env.example`。

关键配置包括：

### 服务配置

- `PORT`：HTTP 服务端口，默认 `3000`
- `SOCKET_PORT`：Socket 相关端口配置，默认 `3001`
- `LOG_LEVEL`：日志级别，可选 `debug | info | warn | error | fatal`

### LLM 配置

- `LLM_PROVIDER`：`openai` 或 `anthropic`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_BASE_URL`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL`

### 黑板与记忆配置

- `BLACKBOARD_DATA_DIR`
- `CORE_LAYER_TOKEN_BUDGET`
- `SCENARIO_LAYER_TOKEN_BUDGET`
- `SEMANTIC_LAYER_TOKEN_BUDGET`
- `PROCEDURAL_LAYER_TOKEN_BUDGET`

### 路由与超时配置

- `HEARTBEAT_INTERVAL_MS`
- `ACTOR_TIMEOUT_MS`
- `ACTOR_RETRY_TIMEOUT_MS`
- `SOCKET_GRACE_PERIOD_MS`
- `SCENE_TIMEOUT_MS`

### 权限与认证配置

- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CAPABILITY_ACTOR`
- `CAPABILITY_DIRECTOR`
- `CAPABILITY_ADMIN`

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制示例配置：

```bash
cp .env.example .env
```

然后在 `.env` 中填写你的 API Key 和运行参数。

### 3. 启动开发模式

```bash
npm run dev
```

### 4. 构建项目

```bash
npm run build
```

### 5. 启动生产版本

```bash
npm run start
```

## 测试

运行全部测试：

```bash
npm test
```

监听模式：

```bash
npm run test:watch
```

测试覆盖内容包括：

- 黑板服务
- 边界控制
- Actor 与 Director 行为
- 记忆管理
- 协议校验
- 端到端流程
- Chaos 场景鲁棒性

## 主要接口

### 健康检查

```http
GET /health
```

返回服务健康状态、依赖服务状态与当前配置摘要。

### 创建戏剧会话

```http
POST /session
```

返回示例：

```json
{
  "dramaId": "uuid",
  "status": "created"
}
```

### Blackboard 相关接口

项目还提供黑板读写、审计、Agent 能力相关接口，详见 `src/routes/` 目录中的实现。

## 设计目标

该项目的主要目标不是“让一个大模型伪装成多个角色”，而是构建一个真正具备：

- 分工协作
- 权限边界
- 状态一致性
- 长上下文控制
- 异常恢复能力

的多智能体戏剧系统。

## 后续方向

下一步可以围绕 v1.2 继续扩展，例如：

- 更丰富的 DramaSession 生命周期管理
- 更细粒度的 agent orchestration
- 可视化会话监控界面
- 更复杂的角色关系建模
- 持久化跨会话角色记忆
- 更强的观测性与回放能力

## 仓库地址

GitHub: https://github.com/abchbx/drama.git

---

如果你希望，我也可以继续帮你补一版：

1. **更正式的中英双语 README**
2. **适合开源项目展示的 README 首页排版**
3. **补充 API 使用示例与架构图**
