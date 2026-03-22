# Export

The Multi-Agent Drama System supports exporting generated scripts in multiple formats.

## Export Formats

### JSON Export

Complete structured data including:
- All layer entries
- Agent information
- Scene structure
- Audit log

### Markdown Export

Human-readable format with:
- Scene headers
- Dialogue formatting
- Character names
- Timestamps

### PDF Export

Professional document with:
- Title page
- Scene breaks
- Dialogue formatting
- Metadata

## Exporting from Frontend

The web interface provides export controls:

1. Navigate to the **Export** tab
2. Select format: JSON, Markdown, or PDF
3. Click **Export** button
4. File downloads automatically

## Export API Endpoints

### POST /export/json

Export script as JSON file:

```bash
curl -X POST http://localhost:3000/export/json \
  -H "Content-Type: application/json" \
  -d '{"dramaId":"<your-drama-id>"}' \
  -o script.json
```

### POST /export/markdown

Export script as Markdown file:

```bash
curl -X POST http://localhost:3000/export/markdown \
  -H "Content-Type: application/json" \
  -d '{"dramaId":"<your-drama-id>"}' \
  -o script.md
```

### POST /export/pdf

Export script as PDF file:

```bash
curl -X POST http://localhost:3000/export/pdf \
  -H "Content-Type: application/json" \
  -d '{"dramaId":"<your-drama-id>"}' \
  -o script.pdf
```

## Example Export Workflow

```bash
# 1. Create session
SESSION=$(curl -s -X POST http://localhost:3000/session)
DRAMA_ID=$(echo $SESSION | jq -r '.dramaId')

# 2. Run scene and generate content...
# (Scene execution code here)

# 3. Export as JSON
curl -X POST http://localhost:3000/export/json \
  -H "Content-Type: application/json" \
  -d "{\"dramaId\":\"$DRAMA_ID\"}" \
  -o drama-script.json

# 4. Export as Markdown
curl -X POST http://localhost:3000/export/markdown \
  -H "Content-Type: application/json" \
  -d "{\"dramaId\":\"$DRAMA_ID\"}" \
  -o drama-script.md

# 5. Export as PDF
curl -X POST http://localhost:3000/export/pdf \
  -H "Content-Type: application/json" \
  -d "{\"dramaId\":\"$DRAMA_ID\"}" \
  -o drama-script.pdf
```

## Export Data Format

### JSON Structure

```json
{
  "dramaId": "7c735b3a-0dfd-4176-8654-c8a272a0bafe",
  "createdAt": "2026-03-22T10:00:00Z",
  "exportedAt": "2026-03-22T12:00:00Z",
  "layers": {
    "core": { ... },
    "scenario": { ... },
    "semantic": { ... },
    "procedural": { ... }
  },
  "agents": [
    { "agentId": "director-main", "role": "Director" },
    { "agentId": "alice", "role": "Actor" },
    { "agentId": "bob", "role": "Actor" }
  ],
  "auditLog": [ ... ]
}
```

### Markdown Format

```markdown
# Drama Script

**Drama ID:** 7c735b3a-0dfd-4176-8654-c8a272a0bafe
**Created:** 2026-03-22 10:00:00
**Exported:** 2026-03-22 12:00:00

## Scene 1

### Scene Start
*Signal: scene_start at 2026-03-22T10:05:00Z*

### Dialogue

**Alice:** Bob? Is that really you? It has been so long...

**Bob:** Alice! Oh my god, what a coincidence. How have you been?

### Scene End
*Signal: scene_end at 2026-03-22T10:10:00Z*
*Status: completed*
```

## Next Steps

- [Quick Start](/guide/quick-start.md) - Create your first drama
- [User Guide](/user-guide/sessions.md) - Session management
- [API Reference](/api/index.md) - Complete endpoint documentation
