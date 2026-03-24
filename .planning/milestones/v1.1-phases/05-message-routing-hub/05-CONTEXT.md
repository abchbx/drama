# Phase 5 Context: Message Routing Hub

**Phase:** 5 — Message Routing Hub
**Created:** 2026-03-19
**Source:** discuss-phase decisions

---

## Decisions Summary

### Area 1: Message Delivery Patterns

| Decision | Choice |
|----------|--------|
| Scene start behavior | Director sends explicit "your turn" signals per Actor — explicit turn-by-turn orchestration |
| Peer-to-peer routing | Both paths: p2p for quick reactions, Director path for substantive plot contributions |
| Multicast selection | By explicit Director selection — Director specifies recipient list per message |
| Message ordering | Strict FIFO per sender — messages always arrive in send order, system buffers if needed |

### Area 2: Timeout & Fallback Behavior

| Decision | Choice |
|----------|--------|
| Silent Actor handling | Prompt the silent Actor once more with reduced timeout, then skip if still silent |
| Retry timeout value | Configurable, with reasonable default (50% of original) |
| Skipped turn fate | Lost entirely — scene continues without their contribution |
| Global deadlock prevention | Scene-level timeout — Director wraps up scene after N seconds regardless of state |

### Area 3: Connection Resilience

| Decision | Choice |
|----------|--------|
| Unexpected disconnect | Wait briefly for reconnect (grace period), then mark unavailable and notify Director |
| Timeout during grace | Paused — timeout clock stops during grace period |
| Messages to disconnected Actor | Buffered and delivered on reconnect — Actor gets full history when back |
| Reconnection retries | Unlimited automatic retries with exponential backoff |

### Area 4: Heartbeat & Health Monitoring

| Decision | Choice |
|----------|--------|
| Heartbeat interval | Configurable per agent — faster for critical agents, slower for others |
| Dead agent detection | Consecutive missed heartbeats — e.g., 3 in a row before marking dead |
| Heartbeat payload | Empty ping — minimal overhead, just presence signal |
| Dead agent response | Continue scene without the dead agent — same as disconnect handling |

---

## Implementation Constraints

1. **No WebSocket library yet** — Socket.IO must be integrated into the existing Express server
2. **Director and Actor classes exist** — They have methods like `signalSceneStart()`, `signalSceneEnd()`, `generate()`
3. **Pino logger already integrated** — Use existing logger infrastructure
4. **Zod used for validation** — Message schemas should use Zod
5. **Environment config via .env** — All timeouts, intervals configurable

---

## Codebase Context

**Key files:**
- `src/app.ts` — Express app setup, route mounting, middleware
- `src/index.ts` — Server entry point, service initialization
- `src/services/director.ts` — Director class with orchestration methods
- `src/services/actor.ts` — Actor class with generate() method

**No existing:**
- Socket.IO integration
- Real-time message routing
- Heartbeat mechanism

---

## Success Criteria (from ROADMAP.md)

1. Director broadcasts scene_start: all connected actors receive within 100ms
2. Actor p2p message: recipient receives within 100ms
3. Actor multicast: subset of actors receives correctly
4. Actor silence (no response): Director fallback triggers within defined timeout
5. Network disconnect + reconnect: Socket.IO reconnects automatically
6. Heartbeat: alive signal observed every 5s from all connected agents

---

## Requirements Coverage

- ROUTE-01: Socket.IO broadcast (Director → all actors)
- ROUTE-02: Peer-to-peer routing (Actor → Actor)
- ROUTE-03: Multicast routing (Director → subset)
- ROUTE-04: Heartbeat signals
- ROUTE-05: Explicit timeout with fallback
- ROUTE-06: Director unilateral fallback
