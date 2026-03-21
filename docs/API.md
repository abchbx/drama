# API Documentation

This document describes the HTTP API exposed by the Multi-Agent Drama System as implemented in the current codebase.

## Base URL

- HTTP API: `http://localhost:3000` by default
- Socket.IO transport is initialized separately by the server runtime using `SOCKET_PORT`, but the documented endpoints below are HTTP endpoints.

## Authentication Model

The API uses two different access patterns:

1. **Public endpoints**
   - `GET /health`
   - `POST /session`
   - `POST /blackboard/agents/register`

2. **Bearer-token protected endpoints**
   - `GET /blackboard/agents/me/scope`
   - `GET /blackboard/layers/:layer/entries`
   - `GET /blackboard/layers/:layer/entries/:id`
   - `POST /blackboard/layers/:layer/entries`
   - `DELETE /blackboard/layers/:layer/entries/:id`

### Bearer token format

Protected endpoints expect:

```http
Authorization: Bearer <jwt>
```

JWTs are issued by `POST /blackboard/agents/register` and encode:
- `agentId`
- `role` (`Actor`, `Director`, `Admin`)

Capability enforcement is applied server-side based on role and configured layer permissions.

## Layer Names

Valid blackboard layers are:

- `core`
- `scenario`
- `semantic`
- `procedural`

## Endpoints

---

## GET /health

Canonical implementation source:
- [src/routes/health.ts](../src/routes/health.ts)
- mounted by [src/app.ts](../src/app.ts)

Returns process-level health information, snapshot presence, service connectivity summary, and basic config visibility.

### Response 200

```json
{
  "status": "ok",
  "timestamp": "2026-03-21T08:00:00.000Z",
  "snapshotLoaded": true,
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

### Notes

- `snapshotLoaded` reflects whether `<BLACKBOARD_DATA_DIR>/blackboard.json` currently exists.
- This endpoint is unauthenticated.

---

## POST /session

Implementation source:
- [src/index.ts](../src/index.ts)

Creates a new `DramaSession` instance and returns the generated `dramaId`.

### Request body

Currently no request body is required.

### Response 200

```json
{
  "dramaId": "7c735b3a-0dfd-4176-8654-c8a272a0bafe",
  "status": "created"
}
```

### Error 500

```json
{
  "error": "Failed to create session"
}
```

### Notes

- This endpoint is currently unauthenticated.
- It is registered directly in startup code rather than in a route module.

---

## POST /blackboard/agents/register

Implementation source:
- [src/routes/agents.ts](../src/routes/agents.ts)

Issues a JWT for an agent.

### Request body

```json
{
  "agentId": "actor-1",
  "role": "Actor"
}
```

### Allowed roles

- `Actor`
- `Director`
- `Admin`

### Response 200

```json
{
  "token": "<jwt>",
  "agentId": "actor-1",
  "role": "Actor"
}
```

### Error 400

```json
{
  "error": "Bad Request",
  "message": "...zod validation error..."
}
```

### Error 500

```json
{
  "error": "Internal Server Error",
  "message": "Capability service not initialized"
}
```

---

## GET /blackboard/agents/me/scope

Implementation source:
- [src/routes/agents.ts](../src/routes/agents.ts)

Returns the requester's scoped view.

### Headers

```http
Authorization: Bearer <jwt>
```

### Actor response 200

```json
{
  "character_card": {
    "id": "actor-1",
    "name": "Hamlet",
    "role": "prince",
    "backstory": "...",
    "objectives": ["seek truth"],
    "voice": {
      "vocabularyRange": ["formal"],
      "sentenceLength": "medium",
      "emotionalRange": ["conflicted"],
      "speechPatterns": ["questions"],
      "forbiddenTopics": [],
      "forbiddenWords": []
    }
  },
  "current_scene": {
    "entry": {
      "id": "current_scene",
      "agentId": "system",
      "timestamp": "2026-03-21T08:00:00.000Z",
      "content": "...",
      "tokenCount": 42,
      "version": 1
    },
    "currentVersion": 3
  }
}
```

### Director/Admin response 200

```json
{
  "full_access": true
}
```

### Error 401

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing token"
}
```

### Error 500

```json
{
  "error": "Internal Server Error",
  "message": "Capability service not initialized"
}
```

### Notes

- For actors, `character_card` may be `null` if no semantic-layer card exists.
- For actors, `current_scene` may be `null` if the entry is absent.

---

## GET /blackboard/audit

Implementation source:
- [src/routes/audit.ts](../src/routes/audit.ts)

Queries audit log entries.

### Query parameters

- `agentId` (optional)
- `layer` (optional)
- `since` (optional, ISO timestamp string)
- `limit` (optional, default `100`)

### Example

```http
GET /blackboard/audit?agentId=actor-1&layer=semantic&limit=50
```

### Response 200

```json
{
  "entries": [
    {
      "timestamp": "2026-03-21T08:00:00.000Z",
      "agentId": "actor-1",
      "layer": "semantic",
      "entryId": "entry-123",
      "operation": "write"
    }
  ],
  "count": 1
}
```

### Error 503

```json
{
  "error": "Service Unavailable",
  "message": "Audit log not initialized"
}
```

### Error 500

```json
{
  "error": "Internal Server Error",
  "message": "..."
}
```

### Notes

- This endpoint is currently unauthenticated.

---

## GET /blackboard/layers/:layer/entries

Implementation source:
- [src/routes/blackboard.ts](../src/routes/blackboard.ts)

Reads a full layer snapshot.

### Headers

```http
Authorization: Bearer <jwt>
```

### Response 200

```json
{
  "layer": "semantic",
  "currentVersion": 12,
  "tokenCount": 320,
  "tokenBudget": 8000,
  "budgetUsedPct": 0.04,
  "entries": [
    {
      "id": "entry-1",
      "agentId": "actor-1",
      "messageId": "msg-1",
      "timestamp": "2026-03-21T08:00:00.000Z",
      "content": "...",
      "tokenCount": 20,
      "version": 1
    }
  ]
}
```

### Error 400

```json
{
  "error": "Bad Request",
  "message": "Invalid layer: invalid. Must be one of: core, scenario, semantic, procedural"
}
```

### Error 401

```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid Authorization header"
}
```

or

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing token"
}
```

### Error 403

```json
{
  "error": "Forbidden",
  "violationType": "CAPABILITY_CLOSED",
  "targetLayer": "core",
  "operation": "read",
  "allowedLayers": ["semantic", "procedural"],
  "message": "Boundary violation: read on 'core' denied — CAPABILITY_CLOSED"
}
```

---

## GET /blackboard/layers/:layer/entries/:id

Implementation source:
- [src/routes/blackboard.ts](../src/routes/blackboard.ts)

Reads a single entry by ID.

### Headers

```http
Authorization: Bearer <jwt>
```

### Response 200

```json
{
  "entry": {
    "id": "entry-1",
    "agentId": "actor-1",
    "messageId": "msg-1",
    "timestamp": "2026-03-21T08:00:00.000Z",
    "content": "...",
    "tokenCount": 20,
    "version": 1
  },
  "currentVersion": 12
}
```

### Error 404

```json
{
  "error": "Not Found",
  "message": "Entry 'entry-1' not found in layer 'semantic'"
}
```

Other error behaviors mirror the layer-read endpoint.

---

## POST /blackboard/layers/:layer/entries

Implementation source:
- [src/routes/blackboard.ts](../src/routes/blackboard.ts)

Writes a new entry into a blackboard layer.

### Headers

```http
Authorization: Bearer <jwt>
X-Agent-ID: actor-1
Content-Type: application/json
```

### Request body

```json
{
  "content": "Ophelia hesitates before answering.",
  "expectedVersion": 3,
  "messageId": "msg-42"
}
```

### Response 201

```json
{
  "entry": {
    "id": "generated-id",
    "agentId": "actor-1",
    "messageId": "msg-42",
    "timestamp": "2026-03-21T08:00:00.000Z",
    "content": "Ophelia hesitates before answering.",
    "tokenCount": 8,
    "version": 4
  },
  "layerVersion": 4
}
```

### Error 400

```json
{
  "error": "Bad Request",
  "message": "...zod or validation error..."
}
```

### Error 401

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing token"
}
```

### Error 403

```json
{
  "error": "Forbidden",
  "violationType": "CAPABILITY_CLOSED",
  "targetLayer": "core",
  "operation": "write",
  "allowedLayers": ["semantic", "procedural"],
  "message": "Boundary violation: write on 'core' denied — CAPABILITY_CLOSED"
}
```

### Error 409

```json
{
  "error": "Conflict",
  "message": "Version mismatch",
  "currentVersion": 4,
  "expectedVersion": 3
}
```

### Error 413

```json
{
  "error": "Payload Too Large",
  "message": "Token budget exceeded for layer 'semantic': budget=8000, current=7990, attempted=40",
  "tokenBudget": 8000,
  "currentTokenCount": 7990,
  "attemptedEntryTokens": 40
}
```

### Notes

- Successful writes mark the snapshot service as dirty and append audit log entries when audit logging is initialized.
- Boundary violations are also audit logged.

---

## DELETE /blackboard/layers/:layer/entries/:id

Implementation source:
- [src/routes/blackboard.ts](../src/routes/blackboard.ts)

Deletes an entry from a layer.

### Headers

```http
Authorization: Bearer <jwt>
```

### Response 204

No response body.

### Error 404

```json
{
  "error": "Not Found",
  "message": "Entry 'entry-1' not found in layer 'semantic'"
}
```

Other auth/layer/capability errors mirror the write endpoint.

---

## Common Error Shapes

### Unauthorized

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing token"
}
```

### Forbidden / boundary violation

```json
{
  "error": "Forbidden",
  "violationType": "CAPABILITY_CLOSED",
  "targetLayer": "core",
  "operation": "write",
  "allowedLayers": ["semantic", "procedural"],
  "message": "Boundary violation: write on 'core' denied — CAPABILITY_CLOSED"
}
```

### Bad request

```json
{
  "error": "Bad Request",
  "message": "...validation details..."
}
```

## Related Runtime Sources

- [src/app.ts](../src/app.ts)
- [src/index.ts](../src/index.ts)
- [src/routes/health.ts](../src/routes/health.ts)
- [src/routes/agents.ts](../src/routes/agents.ts)
- [src/routes/blackboard.ts](../src/routes/blackboard.ts)
- [src/routes/audit.ts](../src/routes/audit.ts)
- [src/types/blackboard.ts](../src/types/blackboard.ts)
