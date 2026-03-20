# Phase 5 Research: Message Routing Hub

## Socket.IO Architecture

### Server Integration
Integrate Socket.IO into existing Express app via `socket.io` adapter:
```typescript
import { createServer } from 'http';
import { Server } from 'socket.io';
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
```

### Room-Based Routing
- `director` room — Director agent (1 socket)
- `actors` room — all actors (dynamic membership)
- `scene:{id}` room — actors in specific scene
- `actor:{id}` room — individual actor p2p

### Message Protocol (Zod Schema)
```typescript
const MessageSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['scene_start','scene_end','your_turn','dialogue','reaction','heartbeat','fallback']),
  from: z.string(),           // agent ID
  to: z.array(z.string()),   // recipient agent IDs or room names
  payload: z.record(z.unknown()),
  scenePhase: z.enum(['setup','rising','climax','falling','resolution']).optional(),
  cognitiveState: z.object({ tokensUsed: z.number() }).optional(),
  timestamp: z.number(),
  sequenceNum: z.number(),    // FIFO sequence number per sender
});
```

### Connection Lifecycle
1. Agent connects with `agentId` in handshake auth
2. Server registers socket in appropriate rooms
3. Director joins `director` room; actors join `actors` + `scene:{id}` rooms
4. Heartbeat ping every N seconds (configurable per agent, default 5s)
5. Disconnect: mark agent unavailable, notify Director, pause timeouts

### Heartbeat Implementation
- Server emits `heartbeat:ping` to all agents every N seconds
- Agent responds with `heartbeat:pong` + timestamp
- Server tracks last pong per agent; if 3 consecutive pings unanswered → mark dead
- Use Socket.IO pingInterval/pingTimeout options (server-side)

### Timeout & Fallback Mechanism
- `Director.signalYourTurn(actorId, timeout)` — starts per-actor timer
- Timer stored in Map: `actorId → { timer, retries }`
- On timeout: if retries < 1 → retry with `timeout * 0.5`; else → skip, log, continue
- Scene-level hard timeout: global timer, wraps up scene regardless

### Reconnection with Message Buffering
- On disconnect: pause all timers for that agent, start grace period (10s default)
- Buffer messages addressed to agent during grace period
- On reconnect: replay buffered messages in FIFO order, resume timers
- Use Socket.IO `socket.recover()` + custom buffer map

### Key Implementation Points
1. **Express app unchanged** — Socket.IO attaches to same httpServer
2. **FIFO per sender** — track `sequenceNum` per sender, client buffers out-of-order
3. **Grace period** — configurable via `SOCKET_GRACE_PERIOD_MS` env var
4. **Heartbeat interval** — configurable per agent via `HEARTBEAT_INTERVAL_MS`
5. **No external state store** — all routing state in memory (acceptable for single-process)
