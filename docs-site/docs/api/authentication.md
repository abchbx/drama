# Authentication

## Agent Registration

Register an agent and receive a JWT token for authenticated requests.

### Request

```http
POST /blackboard/agents/register
Content-Type: application/json

{
  "agentId": "actor-1",
  "role": "Actor"
}
```

### Allowed Roles

- `Actor` - Generate dialogue, can write to semantic/procedural layers
- `Director` - Orchestrate scene, can write to core/scenario/procedural layers
- `Admin` - Full access to all layers

### Response

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "agentId": "actor-1",
  "role": "Actor"
}
```

### Error Responses

**400 Bad Request**
```json
{
  "error": "Bad Request",
  "message": "Invalid role: must be one of Actor, Director, Admin"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal Server Error",
  "message": "Capability service not initialized"
}
```

## Using the Token

Include JWT in `Authorization` header for protected endpoints:

```http
GET /blackboard/layers/semantic/entries
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## Role Permissions

### Actor Permissions
- **Can Read:** semantic, procedural layers
- **Can Write:** semantic, procedural layers
- **Cannot:** Read/write core, scenario layers

### Director Permissions
- **Can Read:** All layers
- **Can Write:** core, scenario, procedural layers
- **Cannot:** Write semantic layer (actor domain)

### Admin Permissions
- **Can Read:** All layers
- **Can Write:** All layers

## Capability Violations

When an agent attempts an operation outside their permissions:

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

## TypeScript Types

```typescript
interface AgentRole {
  agentId: string;
  role: 'Actor' | 'Director' | 'Admin';
}

interface AuthResponse {
  token: string;
  agentId: string;
  role: string;
}
```
