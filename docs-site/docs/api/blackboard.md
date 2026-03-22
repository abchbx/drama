# Blackboard Operations

## Read Layer Snapshot

Reads a full layer snapshot.

### Request

```http
GET /blackboard/layers/:layer/entries
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

## Read Single Entry

Reads a single entry by ID.

### Request

```http
GET /blackboard/layers/:layer/entries/:id
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

## Write Entry

Writes a new entry into a blackboard layer.

### Request

```http
POST /blackboard/layers/:layer/entries
Authorization: Bearer <jwt>
X-Agent-ID: actor-1
Content-Type: application/json

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

## Delete Entry

Deletes an entry from a layer.

### Request

```http
DELETE /blackboard/layers/:layer/entries/:id
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

## TypeScript Types

```typescript
interface LayerResponse {
  layer: string;
  currentVersion: number;
  tokenCount: number;
  tokenBudget: number;
  budgetUsedPct: number;
  entries: LayerEntry[];
}

interface LayerEntry {
  id: string;
  agentId: string;
  messageId: string;
  timestamp: string;
  content: string;
  tokenCount: number;
  version: number;
}

interface WriteEntryRequest {
  content: string;
  expectedVersion?: number;
  messageId?: string;
}
```
