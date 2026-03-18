# Stack Research

**Domain:** Multi-agent LLM-based collaborative drama creation with shared blackboard architecture
**Researched:** 2026-03-18
**Confidence:** MEDIUM -- Grounded in AutoGen, CrewAI, LangGraph/LangChain multi-agent architecture documentation; blackboard pattern academic literature (Corkill 1991, Jennings 1996); and Node.js LLM integration ecosystem. Live web verification was unavailable at time of writing. Re-verify LLM SDK compatibility and blackboard library versions against current documentation before Phase 2 implementation.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Node.js | 20 LTS | Runtime for all agent processes and services | Native async/await handles concurrent agent I/O; npm ecosystem covers every need; mature enough for long-running agent sessions; straightforward multiprocess spawning for Director and Actor agents. Bun is an option but ecosystem support is thinner for the libraries below. |
| TypeScript | 5.x | Type-safe agent and service code | Catches boundary violation bugs at compile time (critical for cognitive layer enforcement); self-documenting interfaces for message protocol and blackboard schema; enables strict mode for extra safety in v1. |
| `openai` (official SDK) | ^4.x | OpenAI GPT API integration | Official maintained client; streaming support; tool/function calling for structured agent actions; handles retry/backoff automatically; also works with any OpenAI-compatible API server (LocalAI, LM Studio, Ollama with openai-compatible endpoint). |
| `anthropic` (official SDK) | ^0.x | Anthropic Claude API integration | Official client for Claude models (planned Actor agents); streaming support; built-in beta header management; same retry semantics as the OpenAI SDK. |
| Socket.IO | ^4.x | Real-time message routing hub transport | WebSocket abstraction with automatic fallback to HTTP long-polling; rooms/namespaces map directly to broadcast, peer-to-peer, and multicast routing modes; built-in heartbeat/ping-pong for deadlock detection (Pitfall 6: Message Routing Deadlock); client libraries available for any language. |
| Express.js | ^4.x | HTTP server for blackboard service and agent health endpoints | Minimal, unopinionated HTTP layer; widely understood; middleware ecosystem (CORS, body parsing, logging); serves as the blackboard REST API in front of Socket.IO. |
| Zod | ^3.x | Runtime schema validation for all JSON messages | Enforces the message protocol contract at runtime; prevents malformed messages from entering the system (critical for Pitfall 4: Cognitive Boundary Layer Leakage); integrates cleanly with TypeScript inference so you define a schema once and get both compile-time types and runtime validation. |
| uuid | ^9.x | Generate message IDs, scene IDs, agent session IDs | UUID v4 gives collision-free IDs for the audit trail; required for attributing every blackboard write to a specific agent (Pitfall 14: Implicit Agent Identity). |
| pino | ^8.x | Structured JSON logging for all agent processes | 3-5x faster than winston; JSON output plugs directly into log aggregation tools; child loggers make it easy to attach agent identity to every log line for debugging multi-agent sessions. |
| `tokenizers` (from `@httptoolkit/tokenizers`) or `tiktoken` | latest | Token budget estimation for four-layer memory | Required to implement hard token budgets per blackboard layer (Pitfall 1: Blackboard Content Explosion); tiktoken is the de-facto OpenAI-compatible tokenizer; `tiktoken-node` works well in Node.js without a Python runtime. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `dotenv` | ^16.x | Load environment variables from `.env` | Every environment; store LLM API keys, service ports, log levels. Never hardcode secrets. |
| `socket.io-client` | ^4.x | Browser/client SDK for the message routing hub | Only needed if a frontend UI is added later; not required for v1 node-based agents. |
| `ws` | ^8.x | Low-level WebSocket server (alternative to Socket.IO) | Only if Socket.IO's fallback polling overhead is unacceptable; Socket.IO is the safer default for v1 because the built-in reconnection and heartbeat prevent the silent deadlocks described in Pitfall 6. |
| `lru-cache` | ^7.x | In-memory scene/semantic layer cache | Speed up semantic layer lookups without hitting the blackboard store on every read; especially useful for Director's context-pulling operations. |
| `ajv` | ^8.x | JSON Schema validation (complement to Zod) | Useful if the message protocol schema needs to be shared across non-TypeScript components (e.g., a future Python actor); Zod is the primary choice for TypeScript code. |
| `tsx` | ^4.x | TypeScript execution without a build step | Run agent scripts directly during development (`npx tsx src/agents/director.ts`); eliminates the compile step from the inner dev loop. |
| `vitest` | ^1.x | Unit and integration testing | Test cognitive boundary enforcement, memory folding logic, and message routing; faster than Jest and built for TypeScript-native projects. |
| `ms` | ^2.x | Human-readable duration parsing for timeouts | Express timeout values as `ms('30s')` instead of raw milliseconds; makes timeout configuration readable in `.env` files. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `typescript` + `ts-node` / `tsx` | TypeScript compilation and REPL | Use `tsx` for development scripts; use `tsc` with `tsconfig.json` for production builds. Enable `strict: true` to catch null/undefined errors in boundary enforcement code. |
| `nodemon` | Watch-and-restart for development | Restart agent processes on file changes; pair with `tsx` for TypeScript support: `nodemon --exec tsx src/agents/director.ts`. |
| ESLint + `typescript-eslint` | Linting | Catch unused variables, incorrect types, and code smells before runtime; critical for multi-agent code where subtle bugs (e.g., a missed null check in blackboard access) cause cascade failures. |
| Prettier | Code formatting | Keep formatting consistent across all agents; run in CI to prevent style-diff PRs. |
| `concurrently` | Run multiple agent processes in one terminal | Run Director + multiple Actor agents + blackboard service simultaneously during development: `concurrently "npm run director" "npm run actors" "npm run blackboard"`. |
| `cross-env` | Set environment variables cross-platform | Set `NODE_ENV=development` on both Windows and Unix in `npm scripts`. |

---

## Installation

```bash
# Core runtime
npm install node@20 npm

# Core agent and service dependencies
npm install express socket.io zod uuid pino dotenv lru-cache ajv ms

# LLM API clients
npm install openai anthropic

# Token counting for memory layer budgets
npm install tiktoken  # openai's tokenizer, works in Node.js

# Development tools
npm install -D typescript tsx nodemon concurrently cross-env
npm install -D @types/node @types/express @types/uuid @types/ms
npm install -D eslint prettier eslint-plugin-typescript-eslint
npm install -D vitest @vitest/ui
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Node.js + TypeScript | Python + FastAPI / LangChain | Python has stronger LLM framework support (LangChain, LlamaIndex, AutoGen itself are Python-first). However, the project requires a JSON-native message hub and blackboard service where JavaScript's object model is a natural fit. If the team is Python-fluent and wants to integrate AutoGen primitives directly, Python is a viable alternative -- but it requires separate infrastructure for the Node.js-style message routing. |
| Socket.IO | MQTT (e.g., `mqtt.js`) | MQTT is purpose-built for pub/sub with QoS guarantees, making it excellent for production message routing. However, it requires a broker (Mosquitto) to be running, adding infrastructure complexity for v1. Socket.IO's built-in rooms map cleanly to multicast groups and peer-to-peer routing without a separate broker. |
| Socket.IO | Raw `ws` library | `ws` is faster and has a smaller footprint. Use it instead of Socket.IO only when WebSocket compatibility is guaranteed (no corporate proxies blocking WebSocket upgrades) and reconnection/heartbeat logic is implemented manually. For v1, Socket.IO's built-in heartbeat is the simplest path to preventing the deadlock pitfall. |
| In-memory + file persistence for blackboard | Redis | Redis provides atomic operations, pub/sub, and persistence -- making it excellent for production blackboard implementations. However, it requires a Redis server to be running, adding ops complexity. Start with an in-memory EventEmitter-backed blackboard that serializes to JSON files; migrate to Redis when the concurrency control requirements outgrow file-based locking. |
| `openai` + `anthropic` SDKs | LiteLLM | LiteLLM proxies calls to 100+ LLM providers through a single OpenAI-compatible API. Useful if the project needs to switch models frequently or use many providers simultaneously without per-SDK integration. The tradeoff: it adds a proxy service to operate and hides SDK-level features. For v1 with a known set of providers, direct SDKs give more control and fewer dependencies. |
| Zod | TypeBox / JSON Schema + Ajv | TypeBox generates TypeScript types from JSON Schema, which is more standards-compliant. Zod is simpler for ad-hoc validation and has better TypeScript inference for the message protocol. Use TypeBox if the project needs to generate and share JSON Schema documentation externally. |
| Pino | Winston | Winston has a larger plugin ecosystem and more transport options. Pino is significantly faster (critical for high-throughput message routing). Use Winston only if you need specific integrations (e.g., Slack logging, specialized cloud log sinks) not covered by Pino's core. |
| Vitest | Jest | Jest has broader community adoption and more migration documentation. Vitest is faster, has Vite-based HMR for test reloading, and shares configuration style with modern TypeScript projects. Jest is the better choice if the team has existing Jest experience. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **LangChain agents / LangChain for agent orchestration** | LangChain is a general-purpose LLM framework designed for single-agent chains and retrieval pipelines. Its multi-agent primitives (LangGraph) are Python-first, complex, and add significant abstraction overhead that obscures the blackboard and routing logic the drama system needs to own explicitly. LangChain also has a history of breaking API changes and deprecation cycles that would slow down an already exploratory project. The drama system needs full control over the blackboard pattern and cognitive boundary enforcement -- not a framework that abstracts it away. | Direct SDK calls (`openai`, `anthropic`) + explicit blackboard service + Socket.IO routing. |
| **AutoGen / AutoGen.NET** | AutoGen is Microsoft's multi-agent framework, but its primitives are optimized for task-solving workflows (code generation, data analysis), not narrative drama creation. It assumes a fixed task definition and worker pool. The drama system's shared blackboard and dynamic Director/Actor role contract cannot be cleanly expressed in AutoGen's conversation patterns without fighting the framework. | Explicit multi-process Node.js architecture with the blackboard as the source of truth. |
| **CrewAI** | CrewAI is Python-only and optimized for role-based agent crews solving operational tasks (research, analysis). Its notion of "agents with tools" does not map well to drama agents where the "tool" is collaborative dialogue generation against shared state. The Python-only constraint also conflicts with the project's Node.js direction. | Node.js-based explicit agent implementation with blackboard. |
| **MongoDB or any document database for blackboard** | MongoDB adds significant operational overhead (database server, schema management, connection pooling) for a storage problem that starts as a JSON document store. The blackboard's concurrency requirements (Pitfall 3: race conditions) are not solved by MongoDB alone -- you still need application-level locking. Starting with in-memory + file persistence avoids this overhead until the blackboard needs horizontal scaling. | In-memory EventEmitter blackboard + JSON file snapshots; migrate to Redis when needed. |
| **PostgreSQL for message storage** | Relational schema is a poor fit for the hierarchical four-layer blackboard model (core/scenario/semantic/procedural). JOINing across layers adds unnecessary complexity. A document store or key-value store is the natural model. PostgreSQL is appropriate once blackboard content is normalized and cross-layer queries are needed. | In-memory + file for v1; consider PostgreSQL only for a future analytics/query layer. |
| **Synchronous HTTP polling for message routing** | Polling creates artificial latency (agents waiting for the next poll cycle) and wastes CPU/bandwidth. It also makes deadlock detection harder because there is no persistent connection to attach a heartbeat to. Every Pitfall 6 (deadlock) incident becomes harder to debug without persistent connections. | Socket.IO with WebSocket transport and built-in heartbeat. |
| **Single global context object passed to all agents** | The instinct to pass a "shared context" object into every agent call is the exact pattern that leads to Pitfall 1 (context overflow) and Pitfall 4 (boundary leakage). The blackboard exists precisely to avoid this -- agents pull only the slices of state they need. | Blackboard service with scoped reads: agents request their layer(s) only. |
| **JSON.stringify for message serialization in production** | JSON.stringify silently drops `undefined`, `Function`, and `Symbol` values. It also does not preserve object prototype chains, which can cause subtle bugs if blackboard entries use class instances. For v1, JSON is acceptable with a validation schema (Zod), but be aware of these edge cases. | Zod schema validation on both ends of every message; consider MessagePack or protobuf if bandwidth becomes a concern. |
| **Promises without explicit timeout wrappers** | Un-awaited or unresolved Promises are the primary cause of Pitfall 6 (deadlock). An agent waiting on an LLM response with no timeout will block indefinitely if the LLM API fails silently. | Explicit `Promise.race` with timeout wrappers on every async operation that waits on external input. |
| **Storing LLM API keys in source code or environment variables checked into git** | Exposed API keys lead to unauthorized usage and cost overruns. This is especially dangerous in multi-agent systems where multiple processes may log environment variable expansion. | `dotenv` with a `.env` file listed in `.gitignore`; use a secrets manager (e.g., Doppler, AWS Secrets Manager) for production deployments. |

---

## Stack Patterns by Variant

**If targeting rapid architecture validation (YOLO v1):**
- Use in-memory EventEmitter blackboard + JSON file snapshots
- Use direct SDK calls (no abstraction layer)
- Use `tsx` for zero-build TypeScript execution
- Skip Redis, skip Zod schema codegen, skip CI
- Because: speed of iteration is the only metric; operational sophistication comes after the architecture is validated

**If scaling to multiple machines (distributed agents):**
- Replace in-memory blackboard with Redis (atomic writes, pub/sub, TTL-based layer eviction)
- Replace `tsx` with compiled TypeScript (`tsc`) + Docker containers per agent
- Add a Redis Streams consumer group for message delivery guarantees (QoS)
- Because: in-memory blackboard does not share state across machines; Redis becomes the single source of truth

**If using Claude as the primary Actor model (Anthropic focus):**
- Use `anthropic` SDK for all Actor agent calls (streaming is well-supported)
- Note: Anthropic API does not support function calling / tools in the same way OpenAI does -- Actor agents must use a text-based instruction protocol rather than tool-calling
- Because: Claude's strength is long-context narrative coherence, which fits Actor agent dialogue generation well

**If using local models (Ollama, LM Studio, LocalAI):**
- All OpenAI-compatible endpoints work with the `openai` SDK by setting `baseURL` to the local server URL
- Use `tiktoken` for token counting even for non-OpenAI models (approximate; different tokenizers will vary)
- Note: local models typically lack the creative writing capability of frontier models; Actor agents may need more explicit style constraints in their prompts
- Because: avoids API costs and latency for development iteration

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `openai@^4.x` | `node@>=18` | Requires Node.js 18 or later for native Fetch API support. Node.js 20 LTS is recommended. |
| `anthropic@^0.x` | `node@>=18` | Same Node.js 18+ requirement for native Fetch. Alpha/beta status -- pin to a specific version in production. |
| `socket.io@^4.x` | `node@>=18` | Server and client must match major version. Do not mix socket.io 3.x and 4.x. |
| `zod@^3.x` | `node@>=14` | TypeScript 4.x+ recommended for `satisfies` operator support. Fully backward compatible. |
| `vitest@^1.x` | `vite@^5.x`, `node@>=18` | Vitest 1.x requires Vite 5.x. If upgrading, check Vite compatibility. |
| `tsx@^4.x` | `node@>=18` | Uses native ESM loaders. Node.js 20 avoids many ESM resolution edge cases. |
| `tiktoken@^1.x` | `node@>=18` | Pre-built binary blobs for common platforms (darwin, linux, win32). May require `npm rebuild` on first install if binaries are missing for your platform. |
| `pino@^8.x` | `node@>=14` | Uses native `AsyncLocalStorage` for tracing (Node.js 16+). Fully backward compatible with Node.js 14 for non-tracing use. |
| `express@^4.x` | `node@>=18` | Express 5 (beta) has breaking changes to error handling. Pin to `express@^4` for v1. |

---

## Sources

- **MEDIUM**: AutoGen (Microsoft) multi-agent framework GitHub -- documents Director/Worker role confusion as the primary failure mode in multi-agent LLM systems. https://github.com/microsoft/autogen
- **MEDIUM**: CrewAI documentation -- documents role boundary erosion patterns in multi-actor agent systems. https://docs.crewai.com
- **MEDIUM**: LangGraph / LangChain multi-agent architecture guides -- documents state management failures in shared-memory multi-agent designs. https://python.langchain.com/docs/concepts/agentic-systems
- **MEDIUM**: Blackboard pattern academic literature -- Corkill (1991), Jennings et al. (1996); decades of documented failures around concurrency control and content management in shared-blackboard architectures.
- **MEDIUM**: Socket.IO documentation -- rooms, namespaces, and heartbeat mechanism for multi-agent message routing patterns. https://socket.io/docs/v4
- **MEDIUM**: Zod documentation -- schema validation patterns applicable to multi-agent JSON message contracts. https://zod.dev
- **MEDIUM**: Pino logging benchmarks -- performance comparison with Winston for high-throughput logging. https://getpino.io
- **MEDIUM**: Tiktoken Node.js integration guide -- token counting for context window management. https://github.com/openai/tiktoken
- **Note**: Verify all SDK versions and Node.js compatibility against current documentation before Phase 2 implementation begins. The LLM agent ecosystem evolves rapidly; pinned versions in this document may be outdated by the time of reading.

---

## Stack Research Validation Checklist

Before Phase 2 implementation begins, validate:

- [ ] Node.js 20 LTS is compatible with all planned packages (run `npm install` dry-run)
- [ ] `anthropic` SDK alpha/beta status and stability for production use
- [ ] Socket.IO room/namespace routing maps cleanly to broadcast, peer-to-peer, and multicast message modes from PROJECT.md
- [ ] Zod schema covers all fields in the Dynamic Communication Protocol (speaker ID, cognitive state, scene phase, turn context)
- [ ] `tiktoken` works on Windows (win32 binaries present; if not, fall back to `gpt2` tokenizer or approximate character-based token estimation)
- [ ] `pino` JSON logging integrates with any log aggregation tooling planned for production
- [ ] All LLM API keys are accessible via environment variables (no hardcoding)
- [ ] Concurrency control plan for blackboard writes is documented before Phase 4 begins (Pitfall 3 mitigation)

---

*Stack research for: Multi-agent LLM-based collaborative drama creation with shared blackboard architecture*
*Researched: 2026-03-18*
