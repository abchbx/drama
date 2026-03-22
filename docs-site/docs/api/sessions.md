# Sessions

## Create Session

Creates a new drama session and returns a unique `dramaId`.

### Request

```http
POST /session
```

No request body required.

### Response

```json
{
  "dramaId": "7c735b3a-0dfd-4176-8654-c8a272a0bafe",
  "status": "created"
}
```

### Error Response

```json
{
  "error": "Internal Server Error",
  "message": "Failed to create session"
}
```

## Using dramaId

The `dramaId` is used to:
- Associate all agents and messages with the same drama
- Persist session state to blackboard snapshots
- Export the complete script at session end

## TypeScript Types

```typescript
interface SessionResponse {
  dramaId: string;
  status: string;
}
```
