# Complete Endpoint Reference

## GET /health

Canonical implementation source:
- [src/routes/health.ts](../../src/routes/health.ts)
- mounted by [src/app.ts](../../src/app.ts)

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
- [src/index.ts](../../src/index.ts)

Creates a new `DramaSession` instance and returns a generated `dramaId`.

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

## GET /blackboard/audit

Implementation source:
- [src/routes/audit.ts](../../src/routes/audit.ts)

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

### Notes

- This endpoint is currently unauthenticated.

---

## POST /blackboard/agents/register

Implementation source:
- [src/routes/agents.ts](../../src/routes/agents.ts)

Issues a JWT for an agent.

### Request body

```json
{
  "agentId": "actor-1",
  "role": "Actor"
}
```

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
- [src/routes/agents.ts](../../src/routes/agents.ts)

Returns requester's scoped view.

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
- For actors, `current_scene` may be `null` if entry is absent.

---

## Related Runtime Sources

- [src/app.ts](../../src/app.ts)
- [src/index.ts](../../src/index.ts)
- [src/routes/health.ts](../../src/routes/health.ts)
- [src/routes/agents.ts](../../src/routes/agents.ts)
- [src/routes/blackboard.ts](../../src/routes/blackboard.ts)
- [src/routes/audit.ts](../../src/routes/audit.ts)
- [src/types/blackboard.ts](../../src/types/blackboard.ts)
