# Troubleshooting

## Common Issues

### Port Already in Use

**Error:** `Error: listen EADDRINUSE: address already in use :::3000`

**Solution:** Change the port in `.env`:
```bash
PORT=3001
SOCKET_PORT=3002
```

Or find and kill the process using the port:
```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Invalid or Missing API Key

**Error:** `401 Unauthorized` or `Invalid API key`

**Solution:** Verify your API key is correct:

```bash
# Test OpenAI API key
curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"

# Test Anthropic API key
curl https://api.anthropic.com/v1/messages -H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01" -d '{}'
```

Ensure you have sufficient quota and the key is not expired.

### Capability Violation (403 Forbidden)

**Error:** `Boundary violation: write on 'core' denied — CAPABILITY_CLOSED`

**Cause:** Actor attempting to write to a layer they don't have permission for.

**Solution:** Check agent role and layer permissions:
- **Actors** can only write to `semantic` and `procedural` layers
- **Directors** can write to `core`, `scenario`, and `procedural` layers
- **Admins** can write to all layers

Register the agent with the correct role:
```bash
POST /blackboard/agents/register
{
  "agentId": "my-actor",
  "role": "Actor"  # or "Director" or "Admin"
}
```

### Token Budget Exceeded (413 Payload Too Large)

**Error:** `Token budget exceeded for layer 'semantic': budget=8000, current=7990, attempted=40`

**Cause:** Layer exceeded its token budget.

**Solution:**

1. **Wait for automatic fold** - System will fold content when exceeded
2. **Reduce entry size** - Write shorter, more focused content
3. **Monitor budget usage** - Check layer endpoint response for `budgetUsedPct`:

```bash
curl -X GET /blackboard/layers/semantic/entries \
  -H "Authorization: Bearer $TOKEN"

# Response includes:
{
  "tokenCount": 320,
  "tokenBudget": 8000,
  "budgetUsedPct": 0.04
}
```

### Version Mismatch (409 Conflict)

**Error:** `Version mismatch: currentVersion=4, expectedVersion=3`

**Cause:** Optimistic locking detected concurrent writes.

**Solution:** Re-read layer to get current version:

```bash
# 1. Read current version
curl -X GET /blackboard/layers/semantic/entries \
  -H "Authorization: Bearer $TOKEN"

# Response includes "currentVersion": 4

# 2. Retry write with correct version
curl -X POST /blackboard/layers/semantic/entries \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Agent-ID: my-agent" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "New content here",
    "expectedVersion": 4,
    "messageId": "my-message"
  }'
```

### Socket.IO Connection Failed

**Error:** Cannot connect to Socket.IO server

**Solution:**

1. **Check server is running:**
```bash
curl http://localhost:3000/health
```

2. **Verify Socket.IO port** (default 3001):
```bash
netstat -an | grep 3001
```

3. **Check firewall settings** - Ensure WebSocket connections are allowed

4. **Verify SOCKET_PORT in .env** matches what client is using

### Blackboard Data Not Persisting

**Issue:** Data lost after server restart

**Solution:**

1. **Check data directory exists:**
```bash
ls -la $BLACKBOARD_DATA_DIR
```

2. **Verify write permissions:**
```bash
chmod 755 $BLACKBOARD_DATA_DIR
```

3. **Check .env BLACKBOARD_DATA_DIR setting:**
```bash
BLACKBOARD_DATA_DIR=./data/blackboard
```

4. **Ensure snapshots are being saved** - Check for `blackboard.json` in data directory

### Memory Not Folding

**Issue:** Semantic layer keeps growing without automatic folding

**Solution:**

1. **Check token budget settings:**
```bash
SEMANTIC_LAYER_TOKEN_BUDGET=8000
```

2. **Verify memory manager is initialized:**
```bash
curl http://localhost:3000/health

# Response should include:
{
  "services": {
    "memory": "connected"
  }
}
```

3. **Check logs for fold events:**
```bash
npm run dev 2>&1 | grep -i "fold"
```

### Slow Performance

**Issue:** API responses are slow

**Solution:**

1. **Reduce token budget** - Less content to process
2. **Use faster LLM model** - e.g., gpt-3.5-turbo instead of gpt-4
3. **Enable debug logging** to identify bottlenecks:
```bash
LOG_LEVEL=debug npm run dev
```

### Debug Logging

Enable detailed logging for troubleshooting:

```bash
# In .env
LOG_LEVEL=debug

# Or as environment variable
LOG_LEVEL=debug npm run dev
```

Debug logs show:
- All API requests and responses
- Blackboard operations
- Memory fold events
- Capability violations
- Socket.IO connections

## Getting Help

If you continue to experience issues:

1. Check the [GitHub Issues](https://github.com/abchbx/drama/issues)
2. Review [API Reference](/api/index.md) for correct endpoint usage
3. Enable debug logging and review logs
4. Verify all environment variables are set correctly

## Next Steps

- [Getting Started](/guide/getting-started.md) - Setup instructions
- [Configuration](/user-guide/configuration.md) - Environment variables
- [API Reference](/api/index.md) - Complete endpoint documentation
