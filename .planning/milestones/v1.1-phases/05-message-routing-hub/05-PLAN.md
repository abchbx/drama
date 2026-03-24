# Phase 5 Plan: Message Routing Hub

## Overview
Integrate Socket.IO into the existing Express server to enable real-time Director↔Actor communication with heartbeat, timeout, and reconnect support.

## Requirements
ROUTE-01 (broadcast), ROUTE-02 (p2p), ROUTE-03 (multicast), ROUTE-04 (heartbeat), ROUTE-05 (timeout), ROUTE-06 (fallback)

## Files to Create

| File | Purpose |
|------|---------|
| `src/services/router.ts` | RouterService class — Socket.IO server, room management, routing |
| `src/services/messageBuffer.ts` | MessageBuffer — FIFO per-sender buffering for reconnect replay |
| `src/services/timeoutManager.ts` | TimeoutManager — per-actor timers, retry logic, scene-level ceiling |
| `src/types/routing.ts` | Zod schemas for all message types |
| `src/services/heartbeat.ts` | HeartbeatService — ping/pong tracking, dead-agent detection |
| `src/index.ts` | Modify: attach Socket.IO to httpServer |

## Files to Modify

| File | Change |
|------|--------|
| `src/index.ts` | Replace `app.listen` with `httpServer.listen`, attach Socket.IO |
| `src/app.ts` | No changes |
| `src/services/director.ts` | Add `sendYourTurn(actorId)`, `sendBroadcast(event)` methods |
| `src/services/actor.ts` | Add Socket.IO client connect/disconnect handling |
| `package.json` | Add `socket.io` and `socket.io-client` deps |

## Task Breakdown

### Wave 1: Foundation
1. Install `socket.io` and `socket.io-client`
2. Define Zod schemas in `src/types/routing.ts`
3. Create `src/index.ts` modification: httpServer + Socket.IO attachment
4. Create `RouterService` skeleton with room management

### Wave 2: Core Routing
5. Implement broadcast (ROUTE-01): Director → all actors via `io.to('actors')`
6. Implement p2p (ROUTE-02): Actor → Actor via `io.to('actor:{id}')`
7. Implement multicast (ROUTE-03): Director → explicit recipient list
8. Implement FIFO sequencing: sequenceNum on every message
9. Wire Director methods to RouterService calls

### Wave 3: Resilience
10. Implement TimeoutManager (ROUTE-05): per-actor timers, retry with 50% timeout, skip on 2nd timeout
11. Implement scene-level ceiling timer
12. Implement Director fallback (ROUTE-06): skip silent actor, continue scene
13. Implement HeartbeatService (ROUTE-04): configurable interval, 3-miss dead detection
14. Implement MessageBuffer + reconnect replay (grace period with paused timers)
15. Implement disconnect → grace period → mark unavailable → notify Director

## Dependency Graph

```
Wave 1
  schema → index-modify → router-skeleton

Wave 2
  router-skeleton → broadcast → p2p → multicast → FIFO

Wave 3
  broadcast+p2p → timeout-manager → director-fallback
  router-skeleton → heartbeat → reconnect-buffer
```

## Test Plan

| # | Test | Verify |
|---|------|--------|
| T1 | Director broadcast | All connected actors receive within 100ms |
| T2 | Actor p2p | Target actor receives within 100ms |
| T3 | Multicast | Only selected actors receive |
| T4 | Silence timeout | Retry fires at 50% timeout, skip at 2nd |
| T5 | Disconnect/reconnect | Socket.IO auto-reconnects, buffered msgs replay |
| T6 | Heartbeat | Alive signal emitted every 5s (configurable) |
| T7 | Dead agent | 3 missed pongs → marked unavailable |
| T8 | Scene ceiling | Scene ends after N seconds regardless |

## Environment Variables

```
SOCKET_PORT=3001
HEARTBEAT_INTERVAL_MS=5000
ACTOR_TIMEOUT_MS=30000
ACTOR_RETRY_TIMEOUT_MS=15000
SOCKET_GRACE_PERIOD_MS=10000
SCENE_TIMEOUT_MS=300000
```
