# DramaFlow - 多智能体剧本系统

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](./CHANGELOG.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

DramaFlow 是一个基于**共享黑板架构**的多智能体剧本生成系统，通过 Director-Agent 协作模式自动生成连贯的剧本对话。系统集成了 LLM（大语言模型）、分层记忆系统和可视化界面，支持复杂的角色交互和剧情推进。

---

## ✨ 核心特性

### 🎬 Director-Agent 架构
- **Director（导演）**：负责剧本整体规划、场景编排、冲突仲裁和事实核查
- **Actor（演员）**：基于角色卡生成符合人设的对话，维护个人记忆和认知边界

### 🧠 三层记忆系统
| 层级 | 用途 | 持久性 |
|------|------|--------|
| **核心层 (Core)** | 剧本骨架、角色设定、不可变事实 | 永久 |
| **场景层 (Scenario)** | 场景规划、当前剧情状态 | 场景级别 |
| **过程层 (Procedural)** | 对话记录、实时事件 | 临时 |

### 🔌 技术特性
- **WebSocket 实时通信**：Socket.IO 实现即时消息推送
- **多 LLM 支持**：OpenAI GPT、Anthropic Claude
- **Token 优化**：智能上下文压缩和记忆摘要
- **可视化界面**：React + TypeScript 前端，实时查看记忆状态和通信图
- **完整类型安全**：Zod 运行时验证 + TypeScript 编译时检查

---

## 🚀 快速开始

### 环境要求

- **Node.js**: v18 或更高版本
- **npm**: v9 或更高版本

```bash
node --version  # v18+
npm --version   # v9+
```

### 安装

1. **克隆项目**
```bash
git clone <repository-url>
cd drama-blackboard
```

2. **安装后端依赖**
```bash
npm install
```

3. **安装前端依赖**
```bash
cd frontend
npm install
cd ..
```

4. **配置环境变量**
```bash
cp .env.example .env  # 或手动创建
```

编辑 `.env` 文件：
```env
# 服务配置
PORT=3000
SOCKET_PORT=3001
LOG_LEVEL=info

# LLM API Keys (至少配置一个)
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# 数据目录
BLACKBOARD_DATA_DIR=./data
```

### 启动服务

**终端 1 - 启动后端（开发模式）**
```bash
npm run dev
```
后端服务：
- API: http://localhost:3000
- Socket.IO: http://localhost:3001

**终端 2 - 启动前端（开发模式）**
```bash
cd frontend
npm run dev
```
前端界面：http://localhost:5173

---

## 📁 项目结构

```
drama-blackboard/
├── src/                          # 后端源码
│   ├── services/                 # 核心业务服务
│   │   ├── director.ts          # 导演服务
│   │   ├── directorMemory.ts    # 导演记忆管理
│   │   ├── actor.ts             # 演员服务
│   │   ├── actorMemory.ts       # 演员记忆系统
│   │   ├── blackboard.ts        # 共享黑板服务
│   │   └── llm.ts               # LLM 调用封装
│   ├── types/                    # TypeScript 类型定义
│   │   ├── director.ts          # Director 类型
│   │   ├── actor.ts             # Actor 类型
│   │   ├── memory.ts            # 记忆系统类型
│   │   └── blackboard.ts        # 黑板类型
│   ├── routes/                   # API 路由
│   └── index.ts                 # 服务入口
├── frontend/                     # React 前端应用
│   ├── src/
│   │   ├── components/          # UI 组件
│   │   │   ├── config/          # 配置面板
│   │   │   ├── dashboard/       # 仪表盘组件
│   │   │   └── visualization/   # 可视化组件
│   │   ├── lib/                 # API 和 Socket 客户端
│   │   └── App.tsx             # 应用入口
│   └── package.json
├── config/                       # 配置文件
├── data/                         # 数据持久化目录
├── tests/                        # 测试用例
├── docs/                         # 文档
└── package.json
```

---

## 🎮 使用指南

### 创建剧本会话

1. 打开前端界面 http://localhost:5173
2. 点击左侧 "NEW SESSION" 按钮
3. 输入会话名称（主题）和场景描述
4. 配置 LLM 参数（在 LLM Config 标签页）

### 配置 LLM

在 **LLM Config** 标签页：
- 选择 Provider（OpenAI / Anthropic）
- 设置 Model（gpt-4o / claude-3-5-sonnet 等）
- 调整 Temperature 和 Max Tokens
- 配置 Rounds Per Scene（每场景轮数）

### 开始剧本场景

1. 选择会话后点击 "Start Scene"
2. Director 会生成场景规划和角色设定
3. Actors 会根据角色卡生成对话
4. 实时查看对话流和记忆状态

### 可视化面板

- **Agent Graph**: 查看智能体间通信关系
- **Memory State**: 实时展示三层记忆内容
- **Message Stream**: 对话消息流可视化

---

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Session UI  │  │ Dashboard   │  │ Visualization       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP / WebSocket
┌─────────────────────────────────────────────────────────────┐
│                      Backend (Express)                       │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   Director Service                   │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │    │
│  │  │  Backbone   │ │ Arbitration │ │ Fact Check  │    │    │
│  │  │  Planning   │ │  (冲突仲裁)  │ │ (事实核查)   │    │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    Actor Service                     │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │    │
│  │  │  Character  │ │  Dialogue   │ │   Memory    │    │    │
│  │  │    Card     │ │  Generation │ │  Management │    │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  Blackboard Service                  │    │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │    │
│  │  │ Core Layer  │ │Scenario Layer│ │Procedural   │    │    │
│  │  │ (事实骨架)   │ │  (场景状态)  │ │Layer(过程)  │    │    │
│  │  └─────────────┘ └─────────────┘ └─────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 核心数据流

1. **场景启动**: Director 读取 Core Layer → 生成场景规划 → 写入 Scenario Layer
2. **对话生成**: Actor 读取 Scenario + Procedural Layers → 生成对话 → 写入 Procedural Layer
3. **冲突仲裁**: Director 检测冲突 → 仲裁决议 → 更新 Core/Scenario Layer
4. **事实核查**: Director 验证一致性 → 标记矛盾 → 通知相关 Actor

---

## 🛠️ API 接口

### 会话管理

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/sessions` | 获取所有会话 |
| POST | `/api/sessions` | 创建新会话 |
| GET | `/api/sessions/:id` | 获取会话详情 |
| POST | `/api/sessions/:id/start` | 启动场景 |
| POST | `/api/sessions/:id/pause` | 暂停场景 |
| POST | `/api/sessions/:id/resume` | 恢复场景 |

### 健康检查

```bash
curl http://localhost:3000/api/health
```

响应：
```json
{
  "status": "ok",
  "version": "1.2.0"
}
```

---

## 🧪 测试

```bash
# 运行所有测试
npm test

# 监视模式
npm run test:watch
```

---

## 📦 生产部署

### 后端编译

```bash
npm run build
npm start
```

### 前端编译

```bash
cd frontend
npm run build
npm run preview
```

---

## 📝 配置说明

### 环境变量

| 变量 | 默认值 | 描述 |
|------|--------|------|
| `PORT` | 3000 | API 服务端口 |
| `SOCKET_PORT` | 3001 | WebSocket 端口 |
| `LOG_LEVEL` | info | 日志级别 |
| `BLACKBOARD_DATA_DIR` | ./data | 数据持久化目录 |
| `OPENAI_API_KEY` | - | OpenAI API 密钥 |
| `ANTHROPIC_API_KEY` | - | Anthropic API 密钥 |

### LLM 配置

在 `config/llm.json` 中可配置：
- 默认模型参数
- Token 预算设置
- 重试策略

---

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

---

## 📄 许可证

[MIT](./LICENSE)

---

## 🔗 相关文档

- [启动指南](./STARTUP_GUIDE.md) - 详细启动教程
- [CHANGELOG](./CHANGELOG.md) - 版本更新日志
- [docs/](./docs/) - 架构设计文档

---

## 💡 常见问题

**Q: 前端无法连接后端？**
A: 确保后端服务已启动，并检查 `frontend/vite.config.ts` 中的代理配置是否正确指向后端端口。

**Q: LLM 调用失败？**
A: 检查 `.env` 中的 API Key 是否配置正确，并确认账户有足够的额度。

**Q: 如何清理数据？**
A: 删除 `data/` 目录下的内容（保留 `.gitkeep`），重启服务即可重置。
