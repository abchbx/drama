# Agents

## Agent Scope

Returns the requester's scoped view based on their role and layer permissions.

### Request

```http
GET /blackboard/agents/me/scope
Authorization: Bearer <jwt>
```

### Actor Response 200

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

### Director/Admin Response 200

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

## Character Card Format

Character cards define an actor's personality, voice, and objectives:

```typescript
interface CharacterCard {
  id: string;
  name: string;
  role: string;
  backstory: string;
  objectives: string[];
  voice: {
    vocabularyRange: string[];
    sentenceLength: 'short' | 'medium' | 'long' | 'variable';
    emotionalRange: string[];
    speechPatterns: string[];
    forbiddenTopics: string[];
    forbiddenWords: string[];
  };
}
```

## TypeScript Types

```typescript
interface ScopeResponse {
  character_card?: CharacterCard;
  current_scene?: {
    entry: LayerEntry;
    currentVersion: number;
  };
  full_access?: boolean;
}
```
