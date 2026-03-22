# Quick Start

This guide walks you through creating a simple two-character dialogue using API.

## Complete Example

Here's a complete script that creates a dialogue between two characters:

```bash
#!/bin/bash

# 1. Create session
SESSION=$(curl -s -X POST http://localhost:3000/session)
DRAMA_ID=$(echo $SESSION | jq -r '.dramaId')
echo "Session created: $DRAMA_ID"

# 2. Register director
DIRECTOR_RESP=$(curl -s -X POST http://localhost:3000/blackboard/agents/register \
  -H "Content-Type: application/json" \
  -d '{"agentId":"director-1","role":"Director"}')
DIRECTOR_TOKEN=$(echo $DIRECTOR_RESP | jq -r '.token')

# 3. Register actors
ACTOR1_RESP=$(curl -s -X POST http://localhost:3000/blackboard/agents/register \
  -H "Content-Type: application/json" \
  -d '{"agentId":"alice","role":"Actor"}')
ACTOR1_TOKEN=$(echo $ACTOR1_RESP | jq -r '.token')

ACTOR2_RESP=$(curl -s -X POST http://localhost:3000/blackboard/agents/register \
  -H "Content-Type: application/json" \
  -d '{"agentId":"bob","role":"Actor"}')
ACTOR2_TOKEN=$(echo $ACTOR2_RESP | jq -r '.token')

# 4. Director writes plot backbone
curl -X POST http://localhost:3000/blackboard/layers/core/entries \
  -H "Authorization: Bearer $DIRECTOR_TOKEN" \
  -H "X-Agent-ID: director-1" \
  -H "Content-Type: application/json" \
  -d '{"content":"A chance encounter at a café. Alice and Bob meet after many years.","messageId":"backbone-cafe"}'

# 5. Alice speaks
curl -X POST http://localhost:3000/blackboard/layers/semantic/entries \
  -H "Authorization: Bearer $ACTOR1_TOKEN" \
  -H "X-Agent-ID: alice" \
  -H "Content-Type: application/json" \
  -d '{"content":"Bob? Is that really you? It has been so long...","messageId":"alice-1"}'

# 6. Bob replies
curl -X POST http://localhost:3000/blackboard/layers/semantic/entries \
  -H "Authorization: Bearer $ACTOR2_TOKEN" \
  -H "X-Agent-ID: bob" \
  -H "Content-Type: application/json" \
  -d '{"content":"Alice! Oh my god, what a coincidence. How have you been?","messageId":"bob-1"}'

# 7. View final dialogue
echo "=== Final Dialogue ==="
curl -s -X GET http://localhost:3000/blackboard/layers/semantic/entries \
  -H "Authorization: Bearer $ACTOR1_TOKEN" | jq '.entries[].content'
```

## Step-by-Step Breakdown

### Step 1: Create a Session

```bash
curl -X POST http://localhost:3000/session
```

Response:
```json
{
  "dramaId": "9544f754-5793-4078-9556-6c6daccdd773",
  "status": "created"
}
```

### Step 2: Register Agents

**Register Director:**
```bash
curl -X POST http://localhost:3000/blackboard/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "director-main",
    "role": "Director"
  }'
```

**Register Actors:**
```bash
curl -X POST http://localhost:3000/blackboard/agents/register \
  -H "Content-Type: application/json" \
  -d '{"agentId":"alice","role":"Actor"}'

curl -X POST http://localhost:3000/blackboard/agents/register \
  -H "Content-Type: application/json" \
  -d '{"agentId":"bob","role":"Actor"}'
```

### Step 3: Director Plots Story

The Director writes to **core layer** (immutable facts):

```bash
curl -X POST http://localhost:3000/blackboard/layers/core/entries \
  -H "Authorization: Bearer $DIRECTOR_TOKEN" \
  -H "X-Agent-ID: director-main" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "A chance encounter at a café. Alice and Bob meet after many years.",
    "messageId": "backbone-cafe"
  }'
```

### Step 4: Actors Generate Dialogue

Actors write to **semantic layer** (character dialogue):

```bash
# Alice speaks
curl -X POST http://localhost:3000/blackboard/layers/semantic/entries \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "X-Agent-ID: alice" \
  -H "Content-Type: application/json" \
  -d '{"content":"Bob? Is that really you? It has been so long...","messageId":"alice-1"}'

# Bob replies
curl -X POST http://localhost:3000/blackboard/layers/semantic/entries \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "X-Agent-ID: bob" \
  -H "Content-Type: application/json" \
  -d '{"content":"Alice! Oh my god, what a coincidence. How have you been?","messageId":"bob-1"}'
```

### Step 5: Read the Dialogue

```bash
curl -X GET http://localhost:3000/blackboard/layers/semantic/entries \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

Response:
```json
{
  "layer": "semantic",
  "currentVersion": 2,
  "tokenCount": 25,
  "entries": [
    {
      "id": "entry-1",
      "agentId": "alice",
      "timestamp": "2026-03-22T...",
      "content": "Bob? Is that really you? It has been so long...",
      "tokenCount": 13
    },
    {
      "id": "entry-2",
      "agentId": "bob",
      "timestamp": "2026-03-22T...",
      "content": "Alice! Oh my god, what a coincidence. How have you been?",
      "tokenCount": 12
    }
  ]
}
```

## Key Takeaways

1. **Role permissions matter** - Different agents can only write to specific layers
2. **Director writes to core layer** - Immutable plot backbone
3. **Actors write to semantic layer** - Character dialogue
4. **Use messageId for tracking** - Each entry needs a meaningful ID
5. **Include JWT in requests** - Protected endpoints need `Authorization: Bearer <token>`

## Next Steps

- [Core Concepts](/guide/concepts.md) - Understand blackboard architecture
- [Session Management](/user-guide/sessions.md) - Advanced session operations
- [API Reference](/api/index.md) - Complete endpoint documentation
