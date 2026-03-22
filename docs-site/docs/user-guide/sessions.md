# Session Management

## Creating Sessions

A session represents a complete drama performance or story:

```bash
POST /session
```

Response:
```json
{
  "dramaId": "7c735b3a-0dfd-4176-8654-c8a272a0bafe",
  "status": "created"
}
```

## Registering Agents

Each agent must register and receive a JWT token:

```bash
# Register Director
POST /blackboard/agents/register
{
  "agentId": "director-main",
  "role": "Director"
}

# Register Actors
POST /blackboard/agents/register
{
  "agentId": "hamlet",
  "role": "Actor"
}
```

## Character Cards

Actors define their personality through character cards in the semantic layer:

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

### Example: Hamlet

```bash
POST /blackboard/layers/semantic/entries
Authorization: Bearer <ACTOR_TOKEN>
X-Agent-ID: hamlet

{
  "content": "{\"id\":\"hamlet\",\"name\":\"Hamlet\",\"role\":\"Prince\",\"backstory\":\"Prince of Denmark, father murdered by uncle\",\"objectives\":[\"seek revenge\",\"discover truth\"],\"voice\":{\"vocabularyRange\":[\"formal\",\"reflective\"],\"sentenceLength\":\"long\",\"emotionalRange\":[\"conflicted\",\"melancholy\"],\"speechPatterns\":[\"rhetorical questions\"],\"forbiddenTopics\":[\"forgiveness\"],\"forbiddenWords\":[\"happy\"]}}",
  "messageId": "character-card-hamlet"
}
```

## Scene Lifecycle

### Starting a Scene

Director writes scene start signal to procedural layer:

```bash
POST /blackboard/layers/procedural/entries
Authorization: Bearer <DIRECTOR_TOKEN>

{
  "content": "{\"type\":\"scene_start\",\"sceneId\":\"scene-1\",\"directorId\":\"director-main\",\"timestamp\":\"2026-03-21T00:00:00Z\"}",
  "messageId": "scene-start-1"
}
```

### Ending a Scene

Director sends scene completion with summary:

```bash
POST /blackboard/layers/procedural/entries
Authorization: Bearer <DIRECTOR_TOKEN>

{
  "content": "{\"type\":\"scene_end\",\"sceneId\":\"scene-1\",\"directorId\":\"director-main\",\"timestamp\":\"2026-03-21T00:05:00Z\",\"status\":\"completed\",\"beats\":[\"Hamlet's soliloquy\",\"Ophelia's warning\"],\"conflicts\":[],\"plotAdvancement\":\"Scene completed\"}",
  "messageId": "scene-end-1"
}
```

## Viewing Agent Scope

Check what an agent can see:

```bash
GET /blackboard/agents/me/scope
Authorization: Bearer <ACTOR_TOKEN>
```

Actor response includes:
- `character_card` - Their character definition
- `current_scene` - Current scene state (if available)

Director/Admin response:
- `full_access: true` - Can read all layers

## Audit Logs

Query all operations on the blackboard:

```bash
# All audit entries
GET /blackboard/audit?limit=100

# Filter by agent
GET /blackboard/audit?agentId=hamlet

# Filter by layer
GET /blackboard/audit?layer=semantic

# Filter by time
GET /blackboard/audit?since=2026-03-21T00:00:00Z
```

## Next Steps

- [Quick Start](/guide/quick-start.md) - Complete example walkthrough
- [Configuration](/user-guide/configuration.md) - Environment variables
- [API Reference](/api/index.md) - Complete endpoint documentation
