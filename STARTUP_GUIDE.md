# DramaFlow 启动指南

本文档介绍如何启动 DramaFlow 多智能体剧本系统的后端服务和前端界面。

## 目录

- [环境要求](#环境要求)
- [项目结构](#项目结构)
- [安装依赖](#安装依赖)
- [配置](#配置)
- [启动服务](#启动服务)
- [验证运行](#验证运行)
- [常见问题](#常见问题)

---

## 环境要求

- **Node.js**: v18 或更高版本
- **npm**: v9 或更高版本
- **操作系统**: Linux, macOS, 或 Windows

检查环境版本：

```bash
node --version
npm --version
```

---

## 项目结构

```
drama-blackboard/
├── src/                    # 后端源码
├── frontend/               # 前端应用
├── config/                 # 配置文件
├── data/                   # 数据存储目录
├── dist/                   # 编译输出
├── package.json            # 后端依赖
└── README.md
```

---

## 安装依赖

### 1. 安装后端依赖

在项目根目录执行：

```bash
cd /workspace
npm install
```

### 2. 安装前端依赖

```bash
cd /workspace/frontend
npm install
```

---

## 配置

### 环境变量

在项目根目录创建 `.env` 文件：

```bash
cd /workspace
cp .env.example .env  # 如果存在示例文件
```

或手动创建 `.env` 文件：

```env
# 服务配置
PORT=3000
SOCKET_PORT=3001
LOG_LEVEL=info

# LLM 配置 (可选)
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here

# 数据目录
BLACKBOARD_DATA_DIR=./data
```

### 配置文件

检查 `config/` 目录下的配置文件：

```bash
ls -la /workspace/config/
```

---

## 启动服务

### 方式一：同时启动前后端（推荐开发使用）

#### 终端 1 - 启动后端服务

```bash
cd /workspace
npm run dev
```

后端服务将在以下地址运行：
- **API 服务**: http://localhost:3000
- **Socket.IO**: http://localhost:3001

#### 终端 2 - 启动前端开发服务器

```bash
cd /workspace/frontend
npm run dev
```

前端开发服务器通常运行在：
- **前端界面**: http://localhost:5173

### 方式二：生产环境启动

#### 1. 编译后端

```bash
cd /workspace
npm run build
```

#### 2. 启动后端服务

```bash
npm start
```

#### 3. 编译并启动前端

```bash
cd /workspace/frontend
npm run build
npm run preview
```

---

## 验证运行

### 1. 检查后端健康状态

```bash
curl http://localhost:3000/api/health
```

预期响应：

```json
{
  "status": "ok",
  "version": "1.2.0"
}
```

### 2. 检查 API 接口

获取会话列表：

```bash
curl http://localhost:3000/api/sessions
```

### 3. 打开前端界面

在浏览器中访问：http://localhost:5173

界面应显示：
- 左侧导航栏（Sessions, Dashboard, Visualization 等）
- 会话列表区域
- 新建会话按钮

---

## 常用命令速查

| 命令 | 说明 | 运行目录 |
|------|------|----------|
| `npm run dev` | 启动后端开发模式（热重载） | `/workspace` |
| `npm start` | 启动后端生产模式 | `/workspace` |
| `npm run build` | 编译后端 TypeScript | `/workspace` |
| `npm test` | 运行后端测试 | `/workspace` |
| `npm run dev` | 启动前端开发服务器 | `/workspace/frontend` |
| `npm run build` | 编译前端生产包 | `/workspace/frontend` |
| `npm run preview` | 预览前端生产包 | `/workspace/frontend` |

---

## 常见问题

### 1. 端口被占用

**问题**: `Error: listen EADDRINUSE: address already in use :::3000`

**解决**:

```bash
# 查找占用端口的进程
lsof -i :3000
# 或
netstat -tulpn | grep 3000

# 终止进程
kill -9 <PID>
```

或在 `.env` 中修改端口：

```env
PORT=3002
SOCKET_PORT=3003
```

### 2. 前端无法连接后端

**问题**: 前端界面空白或报错无法连接 API

**解决**:

检查 `frontend/src/lib/api.ts` 中的 API 基础 URL：

```typescript
const API_BASE_URL = '/api';  // 默认使用相对路径
```

确保 Vite 代理配置正确（`frontend/vite.config.ts`）：

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
}
```

### 3. 依赖安装失败

**问题**: `npm install` 报错

**解决**:

```bash
# 清除缓存重新安装
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### 4. 编译错误

**问题**: TypeScript 编译报错

**解决**:

```bash
# 检查 TypeScript 配置
npx tsc --noEmit

# 查看详细错误
npm run build
```

---

## 下一步

服务启动后，您可以：

1. **创建会话**: 点击左侧 "NEW SESSION" 创建新的剧本会话
2. **配置 LLM**: 在 "LLM Config" 标签页配置大模型参数
3. **开始场景**: 选择会话后点击 "Start Scene" 开始剧本场景
4. **查看可视化**: 在 "Visualization" 标签页查看记忆状态可视化

更多详细信息请参考 [README.md](./README.md)。
