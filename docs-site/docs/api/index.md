# API Reference

The Multi-Agent Drama System exposes a RESTful HTTP API for session management, agent operations, and blackboard access.

## Base URL

- **HTTP API:** `http://localhost:3000` by default
- **Socket.IO:** Separate port (default `3001`)

## Authentication

The API uses two access patterns:

### Public Endpoints
No authentication required:
- `GET /health`
- `POST /session`
- `POST /blackboard/agents/register`
- `GET /blackboard/audit`

### Protected Endpoints
Require Bearer token:
- `GET /blackboard/agents/me/scope`
- `GET /blackboard/layers/:layer/entries`
- `GET /blackboard/layers/:layer/entries/:id`
- `POST /blackboard/layers/:layer/entries`
- `DELETE /blackboard/layers/:layer/entries/:id`

### Bearer Token Format

```http
Authorization: Bearer <jwt>
```

JWTs are issued by `POST /blackboard/agents/register` and encode:
- `agentId`
- `role` (Actor, Director, Admin)

## Layer Names

Valid blackboard layers:
- `core` - High-value narrative facts
- `scenario` - Current scene state
- `semantic` - Character cards and memories
- `procedural` - Execution state and control data

## Quick Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | Public | System health check |
| `/session` | POST | Public | Create new drama session |
| `/blackboard/agents/register` | POST | Public | Register agent, get JWT |
| `/blackboard/agents/me/scope` | GET | Protected | Get agent's scoped view |
| `/blackboard/audit` | GET | Public | Query audit log |
| `/blackboard/layers/:layer/entries` | GET | Protected | Read layer snapshot |
| `/blackboard/layers/:layer/entries/:id` | GET | Protected | Read single entry |
| `/blackboard/layers/:layer/entries` | POST | Protected | Write new entry |
| `/blackboard/layers/:layer/entries/:id` | DELETE | Protected | Delete entry |

## Error Responses

All errors follow this structure:

```json
{
  "error": "Error Type",
  "message": "Detailed error message"
}
```

Common error codes:
- `400` - Bad Request (validation failed)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (capability violation)
- `404` - Not Found (resource missing)
- `409` - Conflict (version mismatch)
- `413` - Payload Too Large (token budget exceeded)
- `500` - Internal Server Error

## Next Steps

- [Authentication](/api/authentication.md) - JWT tokens and agent roles
- [Sessions](/api/sessions.md) - Session management
- [Blackboard](/api/blackboard.md) - Layer operations
- [Agents](/api/agents.md) - Agent registration and scope
- [Endpoints](/api/endpoints.md) - Complete endpoint reference
