# Getting Started

This guide will help you set up and run Multi-Agent Drama System on your local machine.

## Prerequisites

- **Node.js 22 LTS** or later
- **npm** or **yarn** package manager
- **OpenAI API key** or **Anthropic API key** (for LLM providers)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/abchbx/drama.git
cd drama
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and add your API credentials:

```bash
# LLM Provider Configuration
LLM_PROVIDER=openai  # or "anthropic"
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o
OPENAI_BASE_URL=https://api.openai.com/v1

# Or for Anthropic:
# ANTHROPIC_API_KEY=your-anthropic-api-key
# ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# Server Configuration
PORT=3000
SOCKET_PORT=3001
LOG_LEVEL=info

# JWT Secret (minimum 32 characters)
JWT_SECRET=your-super-secret-jwt-key-change-this

# Blackboard Configuration
BLACKBOARD_DATA_DIR=./data/blackboard
CORE_LAYER_TOKEN_BUDGET=2000
SCENARIO_LAYER_TOKEN_BUDGET=4000
SEMANTIC_LAYER_TOKEN_BUDGET=8000
PROCEDURAL_LAYER_TOKEN_BUDGET=1000
```

### 4. Start Development Server

```bash
npm run dev
```

The server will start on:
- **HTTP API:** http://localhost:3000
- **Socket.IO:** http://localhost:3001

## Verification

Check that the server is running:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2026-03-22T...",
  "snapshotLoaded": false,
  "services": {
    "blackboard": "connected",
    "router": "connected",
    "capability": "connected",
    "memory": "connected"
  },
  "config": {
    "llmProvider": "openai",
    "logLevel": "info"
  }
}
```

## Next Steps

- [Quick Start Guide](/guide/quick-start.md) - Create your first drama session
- [Core Concepts](/guide/concepts.md) - Understand the blackboard architecture
- [API Reference](/api/index.md) - Complete HTTP API documentation

## Troubleshooting

### Port Already in Use

If you see "Port 3000 is already in use", change the `PORT` in `.env`:

```bash
PORT=3001
```

### API Key Invalid

Make sure your API key is valid and has sufficient quota:

```bash
curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Build Errors

Clear dependencies and reinstall:

```bash
rm -rf node_modules package-lock.json
npm install
```
