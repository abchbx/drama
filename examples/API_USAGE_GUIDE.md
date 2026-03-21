# 戏剧对话系统使用指南

## 概述

这是一个多代理协作创作系统，通过黑板模式实现角色间的对话创作。

## 核心角色

- **Director (导演)**: 规划剧情、调解冲突、事实检查
  - 权限: core, scenario, procedural 层 (不能写 semantic 层)
  - 职责: 写剧情框架、仲裁冲突、事实核查

- **Actor (演员)**: 扮演角色、生成对话
  - 权限: semantic, procedural 层 (不能写 core/scenario 层)
  - 职责: 根据角色卡片生成符合人设的对话

- **Admin (管理员)**: 全权限
  - 权限: 所有层

## 黑板四层结构

1. **Core Layer (核心层)**: 客观事实、设定（不可改变）
2. **Scenario Layer (场景层)**: 当前场景的进展、剧情发展
3. **Semantic Layer (语义层)**: 角色卡片、情感记忆
4. **Procedural Layer (流程层)**: 流程标记、系统信号

## 完整使用流程

### 步骤 1: 创建会话

```bash
# 创建新的戏剧会话
curl -X POST http://localhost:3000/session

# 响应示例:
# {
#   "dramaId": "9544f754-5793-4078-9556-6c6daccdd773",
#   "status": "created"
# }
```

### 步骤 2: 注册代理

#### 注册导演
```bash
curl -X POST http://localhost:3000/blackboard/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "director-main",
    "role": "Director"
  }'

# 响应:
# {
#   "token": "eyJhbGciOiJIUzI1NiIs...",
#   "agentId": "director-main",
#   "role": "Director"
# }
```

#### 注册演员
```bash
curl -X POST http://localhost:3000/blackboard/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "hamlet",
    "role": "Actor"
  }'

curl -X POST http://localhost:3000/blackboard/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "claudius",
    "role": "Actor"
  }'
```

### 步骤 3: 设置角色卡片 (写入 Semantic 层)

角色卡片格式:
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

示例请求:
```bash
# 保存哈姆雷特的角色卡片
HAMLET_TOKEN="your-actor-token-here"

curl -X POST http://localhost:3000/blackboard/layers/semantic/entries \
  -H "Authorization: Bearer $HAMLET_TOKEN" \
  -H "X-Agent-ID: hamlet" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "{\"id\":\"hamlet\",\"name\":\"哈姆雷特\",\"role\":\"王子\",\"backstory\":\"丹麦王子，父亲被叔叔谋杀\",\"objectives\":[\"复仇\",\"揭露真相\"],\"voice\":{\"vocabularyRange\":[\"formal\",\"reflective\"],\"sentenceLength\":\"long\",\"emotionalRange\":[\"conflicted\",\"melancholy\"],\"speechPatterns\":[\"rhetorical questions\"],\"forbiddenTopics\":[\"forgiveness\"],\"forbiddenWords\":[\"happy\"]}}",
    "messageId": "character-card-hamlet"
  }'
```

### 步骤 4: 导演规划剧情 (写入 Core 层)

```bash
DIRECTOR_TOKEN="your-director-token-here"

# 写入剧情框架
curl -X POST http://localhost:3000/blackboard/layers/core/entries \
  -H "Authorization: Bearer $DIRECTOR_TOKEN" \
  -H "X-Agent-ID: director-main" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "埃尔西诺城堡的深夜。国王克劳迪斯在大厅中踱步，王后格特鲁德忧心忡忡。哈姆雷特从阴影中走出，眼中闪烁着怀疑的光芒。[ACTOR DISCRETION: Hamlet confronts Claudius about the murder]",
    "messageId": "backbone-1"
  }'
```

### 步骤 5: 设置场景 (写入 Procedural 层)

```bash
# 发送场景开始信号
curl -X POST http://localhost:3000/blackboard/layers/procedural/entries \
  -H "Authorization: Bearer $DIRECTOR_TOKEN" \
  -H "X-Agent-ID: director-main" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "{\"type\":\"scene_start\",\"sceneId\":\"scene-1\",\"directorId\":\"director-main\",\"timestamp\":\"2026-03-21T00:00:00Z\"}",
    "messageId": "scene-start-1"
  }'
```

### 步骤 6: 演员生成对话 (写入 Semantic 层)

```bash
# 哈姆雷特说话
curl -X POST http://localhost:3000/blackboard/layers/semantic/entries \
  -H "Authorization: Bearer $HAMLET_TOKEN" \
  -H "X-Agent-ID: hamlet" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "生存还是毁灭，这是一个值得思考的问题。默然忍受命运的暴虐的毒箭，或是挺身反抗人世的无涯的苦难，通过斗争把它们扫清，这两种行为，哪一种更高贵？",
    "messageId": "dialogue-hamlet-1"
  }'
```

### 步骤 7: 读取对话

```bash
# 读取 Semantic 层的所有内容
curl -X GET http://localhost:3000/blackboard/layers/semantic/entries \
  -H "Authorization: Bearer $HAMLET_TOKEN"

# 响应示例:
# {
#   "layer": "semantic",
#   "currentVersion": 3,
#   "tokenCount": 150,
#   "tokenBudget": 8000,
#   "budgetUsedPct": 0.02,
#   "entries": [
#     {
#       "id": "entry-1",
#       "agentId": "hamlet",
#       "timestamp": "2026-03-21T...",
#       "content": "生存还是毁灭...",
#       "tokenCount": 45,
#       "version": 1
#     }
#   ]
# }
```

### 步骤 8: 导演结束场景

```bash
# 发送场景结束信号
curl -X POST http://localhost:3000/blackboard/layers/procedural/entries \
  -H "Authorization: Bearer $DIRECTOR_TOKEN" \
  -H "X-Agent-ID: director-main" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "{\"type\":\"scene_end\",\"sceneId\":\"scene-1\",\"directorId\":\"director-main\",\"timestamp\":\"2026-03-21T00:05:00Z\",\"status\":\"completed\",\"beats\":[\"Hamlet: 生存还是毁灭...\"],\"conflicts\":[],\"plotAdvancement\":\"Scene completed\"}",
    "messageId": "scene-end-1"
  }'
```

## 查看审计日志

```bash
# 查看所有审计记录
curl "http://localhost:3000/blackboard/audit?limit=50"

# 按代理筛选
curl "http://localhost:3000/blackboard/audit?agentId=hamlet"

# 按层筛选
curl "http://localhost:3000/blackboard/audit?layer=semantic"
```

## 完整示例: 创建一个简单的两人对话

```bash
#!/bin/bash

# 1. 创建会话
SESSION=$(curl -s -X POST http://localhost:3000/session)
DRAMA_ID=$(echo $SESSION | jq -r '.dramaId')
echo "会话创建成功: $DRAMA_ID"

# 2. 注册导演
DIRECTOR_RESP=$(curl -s -X POST http://localhost:3000/blackboard/agents/register \
  -H "Content-Type: application/json" \
  -d '{"agentId":"director-1","role":"Director"}')
DIRECTOR_TOKEN=$(echo $DIRECTOR_RESP | jq -r '.token')

# 3. 注册演员 1
ACTOR1_RESP=$(curl -s -X POST http://localhost:3000/blackboard/agents/register \
  -H "Content-Type: application/json" \
  -d '{"agentId":"alice","role":"Actor"}')
ACTOR1_TOKEN=$(echo $ACTOR1_RESP | jq -r '.token')

# 4. 注册演员 2
ACTOR2_RESP=$(curl -s -X POST http://localhost:3000/blackboard/agents/register \
  -H "Content-Type: application/json" \
  -d '{"agentId":"bob","role":"Actor"}')
ACTOR2_TOKEN=$(echo $ACTOR2_RESP | jq -r '.token')

# 5. 导演写剧情框架
curl -X POST http://localhost:3000/blackboard/layers/core/entries \
  -H "Authorization: Bearer $DIRECTOR_TOKEN" \
  -H "X-Agent-ID: director-1" \
  -H "Content-Type: application/json" \
  -d '{"content":"咖啡馆的偶遇。Alice 和 Bob 多年未见，在街角的咖啡馆意外相逢。[ACTOR DISCRETION: Their conversation reveals old memories]","messageId":"backbone-cafe"}'

# 6. Alice 说话
curl -X POST http://localhost:3000/blackboard/layers/semantic/entries \
  -H "Authorization: Bearer $ACTOR1_TOKEN" \
  -H "X-Agent-ID: alice" \
  -H "Content-Type: application/json" \
  -d '{"content":"Bob？真的是你吗？这么多年没见了...","messageId":"alice-1"}'

# 7. Bob 回复
curl -X POST http://localhost:3000/blackboard/layers/semantic/entries \
  -H "Authorization: Bearer $ACTOR2_TOKEN" \
  -H "X-Agent-ID: bob" \
  -H "Content-Type: application/json" \
  -d '{"content":"Alice！天哪，真是太巧了。你这些年过得怎么样？","messageId":"bob-1"}'

# 8. 查看最终对话
echo "=== 最终对话 ==="
curl -s -X GET http://localhost:3000/blackboard/layers/semantic/entries \
  -H "Authorization: Bearer $ACTOR1_TOKEN" | jq '.entries[].content'
```

## 关键点总结

1. **角色权限很重要** - 不同角色只能写入特定的层
2. **Director 不写 Semantic 层** - 那是 Actors 的领域
3. **Core 层是事实** - 只放不可改变的设定
4. **用 MessageId 追踪** - 给每个条目一个有意义的 ID
5. **审计日志可以回溯** - 查看所有操作的历史记录
