# Data Flow

This section documents the request/response flows through the system.

## Session Creation Flow

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant Blackboard

    Client->>Server: POST /session
    Server->>Server: Create DramaSession instance
    Server-->>Client: Return dramaId
    Note over Client,Server: dramaId used for all<br/>subsequent operations
```

### Sequence

1. Client sends `POST /session` request
2. Server creates new `DramaSession` instance
3. Server generates unique `dramaId`
4. Server returns `dramaId` to client
5. Client uses `dramaId` for all subsequent operations

### Request

```http
POST /session
Content-Type: application/json
```

### Response

```json
{
  "dramaId": "7c735b3a-0dfd-4176-8654-c8a272a0bafe",
  "status": "created"
}
```

## Agent Registration Flow

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant Capability

    Client->>Server: POST /blackboard/agents/register
    Server->>Capability: Validate role
    Capability-->>Server: Role valid
    Server->>Server: Generate JWT token
    Server-->>Client: Return JWT token
```

### Sequence

1. Client sends registration request with `agentId` and `role`
2. Server validates role with Capability service
3. Capability service checks role is one of: Actor, Director, Admin
4. Server generates JWT token encoding `agentId` and `role`
5. Server returns token to client
6. Client includes token in `Authorization` header for future requests

### Request

```http
POST /blackboard/agents/register
Content-Type: application/json

{
  "agentId": "actor-1",
  "role": "Actor"
}
```

### Response

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "agentId": "actor-1",
  "role": "Actor"
}
```

## Entry Write Flow

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant Capability
    participant Blackboard
    participant Memory

    Client->>Server: POST /blackboard/layers/:layer/entries
    Server->>Capability: Check write permission
    Capability-->>Server: Permission granted
    Server->>Blackboard: Check token budget
    Blackboard-->>Server: Budget OK
    Server->>Blackboard: Check version (optimistic lock)
    Blackboard-->>Server: Version OK
    Server->>Blackboard: Write entry
    Blackboard->>Memory: Update token count
    Memory-->>Blackboard: Count updated
    Blackboard-->>Server: Entry written
    Server-->>Client: Return entry with version
```

### Sequence

1. Client sends write request with `Authorization: Bearer <token>`
2. Server validates token and extracts `agentId` and `role`
3. Capability service checks if role can write to requested layer
4. Blackboard service checks layer has remaining token budget
5. Blackboard service performs optimistic locking version check
6. Entry is written to layer
7. Memory manager updates layer token count
8. Server returns entry with new version number

### Request

```http
POST /blackboard/layers/semantic/entries
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
X-Agent-ID: actor-1
Content-Type: application/json

{
  "content": "Dialogue goes here",
  "expectedVersion": 3,
  "messageId": "dialogue-1"
}
```

### Response

```json
{
  "entry": {
    "id": "entry-1",
    "agentId": "actor-1",
    "messageId": "dialogue-1",
    "timestamp": "2026-03-22T10:00:00.000Z",
    "content": "Dialogue goes here",
    "tokenCount": 15,
    "version": 4
  },
  "layerVersion": 4
}
```

### Error Cases

**403 Forbidden** - Role cannot write to layer:

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

**409 Conflict** - Version mismatch (concurrent write):

```json
{
  "error": "Conflict",
  "message": "Version mismatch",
  "currentVersion": 4,
  "expectedVersion": 3
}
```

**413 Payload Too Large** - Token budget exceeded:

```json
{
  "error": "Payload Too Large",
  "message": "Token budget exceeded for layer 'semantic': budget=8000, current=7990, attempted=40",
  "tokenBudget": 8000,
  "currentTokenCount": 7990,
  "attemptedEntryTokens": 40
}
```

## Memory Fold Flow

```mermaid
sequenceDiagram
    participant Memory
    participant Blackboard
    participant Scenario
    participant Semantic

    Memory->>Semantic: Check budget (100%)
    Semantic-->>Memory: Budget exceeded
    Memory->>Memory: Generate summary
    Memory->>Scenario: Write summary
    Scenario-->>Memory: Summary written
    Memory->>Semantic: Remove old entries
    Semantic-->>Memory: Entries removed
    Memory-->>Memory: Fold complete
```

### Sequence

1. Memory manager checks semantic layer token usage
2. Budget exceeds 100% threshold
3. Memory manager generates compressed summary of current entries
4. Summary is written to scenario layer
5. Old semantic layer entries are removed
6. Token count is reset
7. Audit log records fold event

**Note:** Core layer never folds (hard guarantee)

## Layer Read Flow

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant Capability
    participant Blackboard

    Client->>Server: GET /blackboard/layers/:layer/entries
    Server->>Capability: Check read permission
    Capability-->>Server: Permission granted
    Server->>Blackboard: Read layer snapshot
    Blackboard-->>Server: Return entries
    Server-->>Client: Return layer with entries
```

### Sequence

1. Client sends read request with `Authorization: Bearer <token>`
2. Server validates token and extracts role
3. Capability service checks if role can read requested layer
4. Blackboard service reads layer snapshot
5. Server returns layer with entries and metadata

### Request

```http
GET /blackboard/layers/semantic/entries
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Response

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
      "messageId": "dialogue-1",
      "timestamp": "2026-03-22T10:00:00.000Z",
      "content": "Dialogue goes here",
      "tokenCount": 15,
      "version": 4
    }
  ]
}
```

## Next Steps

- [Components](/architecture/components.md) - Detailed component documentation
- [Architecture Overview](/architecture/overview.md) - System design
- [API Reference](/api/index.md) - HTTP API documentation
