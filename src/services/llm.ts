import type { CharacterCard, SceneContext } from '../types/actor.js';
import type { PlanningContext } from '../types/director.js';
import type pino from 'pino';
import { config } from '../config.js';
import { getLLMConfig } from '../routes/config.js';

/**
 * Abstract LLM Provider interface.
 * Concrete implementations (OpenAI, Anthropic, etc.) come in Phase 7.
 * Actor class uses ONLY this interface — no LLM SDK imports in actor.ts.
 */
export interface LlmProvider {
  generate(prompt: LlmPrompt): Promise<LlmResponse>;
}

export interface LlmPrompt {
  system: string;   // system prompt with character card + voice constraints
  user: string;     // scene context as structured text
}

export interface LlmResponse {
  content: string;  // raw LLM text (usually JSON string)
}

/**
 * Build a system prompt for an Actor from its character card.
 * Extracted here so it can be tested independently of the Actor class.
 */
export function buildActorSystemPrompt(card: CharacterCard): string {
  const lines: string[] = [
    `你是 ${card.name}，一位${card.role}。`,
    '【语言要求】',
    'IMPORTANT: You must respond in Chinese (中文). All dialogue and text must be in Chinese.',
    '你必须用中文思考、用中文表达、用中文演绎角色。',
    '',
    '【身份定位】',
    '你是一位专业演员，正在参与一场沉浸式戏剧演出。',
    '你的任务是通过台词和表演，让角色栩栩如生。',
    '',
    '【表演指导】',
    '- 深入角色内心，展现真实的情感和思想',
    '- 台词要有戏剧张力，推动情节发展',
    '- 可以适当加入动作、神态、语气等舞台指示',
    '- 与其他角色互动时要有化学反应',
    '- 记住：你是演员，不是旁白，要用第一人称表演',
    '',
    '【台词风格约束】',
    `- 词汇范围：${card.voice.vocabularyRange.length > 0 ? card.voice.vocabularyRange.join('、') : '中性'}`,
    `- 句子长度：${card.voice.sentenceLength}`,
    `- 情感范围：${card.voice.emotionalRange.join('、') || '中性'}`,
    `- 语言习惯：${card.voice.speechPatterns.join('、') || '标准'}`,
    `- 禁止话题：${card.voice.forbiddenTopics.join('、') || '无'}`,
    `- 禁用词汇：${card.voice.forbiddenWords.join('、') || '无'}`,
    '',
    '【输出格式要求】',
    '必须返回以下 JSON 格式，禁止任何其他文本：',
    '{',
    '  "exchangeId": "唯一标识",',
    '  "entries": [',
    '    {',
    '      "speaker": "角色名",',
    '      "text": "台词内容（可以包含动作描述如：深吸一口气，说...）",',
    '      "unverifiedFacts": false,',
    '      "unverifiedClaims": [],',
    '      "targetActors": ["actor-xxx-1", "actor-xxx-2"],',
    '      "visibility": "public"',
    '    }',
    '  ],',
    '  "tokenCount": 150,',
    '  "modelUsed": "gpt-4"',
    '}',
    '',
    '注意：',
    '- tokenCount 是必填项，必须是数字（估算使用的token数）。',
    '- targetActors（可选）：指定谁能听到这条台词。填写其他角色的 agentId（如 actor-drama-1, actor-drama-2）。',
    '  * 私密对话：只填写你正在对话的特定角色ID',
    '  * 自言自语/内心独白：填写自己的 agentId 或留空',
    '  * 公开对话：留空或填写所有在场角色的ID',
    '- visibility（可选）："public"（公开，所有人能听到）| "private"（私密，仅targetActors能听到）| "selective"（选择性，只有targetActors能听到）',
    '',
    '【感知边界规则】',
    '- 默认情况下，所有在场角色都能听到你的台词（public）',
    '- 如果你想对特定角色耳语、密谋或私下对话，请设置 visibility: "selective" 并指定 targetActors',
    '- 如果你是自言自语、内心独白或做出其他人听不到的动作，请设置 visibility: "private" 和/或将 targetActors 设为自己',
    '',
    '【事实核查规则】',
    '- 仅当台词包含与【事实背景】直接矛盾的事实性声明时，才标记 unverifiedFacts: true',
    '- 角色观点、情感反应、修辞性问题、戏剧性陈述都不是事实，不要标记',
    '- 如果不确定某个声明是否是事实，不要标记',
    '- 当 unverifiedFacts 为 true 时，可在 unverifiedClaims 中列出具体的矛盾点',
    '',
    '记住：用中文演绎，用 JSON 回复。',
  ];
  return lines.join('\n');
}

/**
 * Build a user prompt for an Actor from the scene context.
 */
export function buildActorUserPrompt(context: SceneContext): string {
  const lines: string[] = [
    '【角色身份】',
    `你是：${context.characterCard.name}`,
    `身份：${context.characterCard.role}`,
    `目标：${context.characterCard.objectives.join('；')}（或通过制造戏剧张力来推进剧情）`,
    '',
    '【当前场景】',
    `场景ID：${context.currentScene.id}`,
    `地点：${context.currentScene.location}`,
    `场景描述：${context.currentScene.description}`,
    `氛围基调：${context.currentScene.tone}`,
  ];

  if (context.otherActors.length > 0) {
    lines.push('', '【场景中的其他角色】');
    for (const actor of context.otherActors) {
      lines.push(`- ${actor.name}（${actor.role}）`);
    }
  }

  // Add perceptual boundary if available
  if (context.perceptualBoundary) {
    const pb = context.perceptualBoundary;
    
    lines.push('', '【你的认知边界】');
    lines.push('⚠️ 重要：你只能基于以下信息做出反应。超出这个范围的事情，你可能不知道、不确定，或只是猜测。');
    
    if (pb.eyewitnessEvents.length > 0) {
      lines.push('', '🎭 你亲眼见证的事件：');
      pb.eyewitnessEvents.forEach(event => lines.push(`  • ${event}`));
    }
    
    if (pb.visibleFacts.length > 0) {
      lines.push('', '📢 你知晓的公开事实：');
      pb.visibleFacts.slice(0, 5).forEach(fact => lines.push(`  • ${fact.substring(0, 100)}${fact.length > 100 ? '...' : ''}`));
    }
    
    if (pb.hearsay.length > 0) {
      lines.push('', '💬 你听说的消息（可能不准确）：');
      pb.hearsay.forEach(h => {
        const reliability = h.reliability === 'trusted' ? '【可信】' : h.reliability === 'doubted' ? '【存疑】' : '【未知】';
        lines.push(`  • ${reliability} ${h.source}说：${h.content.substring(0, 80)}${h.content.length > 80 ? '...' : ''}`);
      });
    }
    
    if (pb.suspicions.length > 0) {
      lines.push('', '🤔 你的怀疑（不确定）：');
      pb.suspicions.forEach(s => {
        const confidence = s.confidence === 'high' ? '【较确定】' : s.confidence === 'medium' ? '【有些怀疑】' : '【隐约觉得】';
        lines.push(`  • ${confidence} ${s.content}`);
      });
    }
    
    if (pb.privateKnowledge.length > 0) {
      lines.push('', '🔒 你的秘密（其他人不知道）：');
      pb.privateKnowledge.forEach(secret => lines.push(`  • ${secret.substring(0, 100)}${secret.length > 100 ? '...' : ''}`));
    }
    
    lines.push('', '💡 表演提示：');
    lines.push('  • 你不知道的事情 = 不要提及');
    lines.push('  • 你怀疑的事情 = 可以用试探性语气提及');
    lines.push('  • 你听说的消息 = 可以转述但注明来源');
    lines.push('  • 你的秘密 = 可以暗示但不能直接暴露');
  }

  // Add personal memory summary if available
  if (context.memorySummary) {
    const ms = context.memorySummary;
    
    // Use compact format if available (token-efficient)
    if (ms.compact) {
      const c = ms.compact;
      lines.push('', '【你的状态】');
      lines.push(`情绪:${c.emotion}`);
      
      if (c.recentEvents.length > 0) {
        lines.push(`事件:${c.recentEvents.join('; ')}`);
      }
      
      if (c.relationships.length > 0) {
        lines.push(`关系:${c.relationships.join(', ')}`);
      }
      
      if (c.thoughts.length > 0) {
        lines.push(`想法:${c.thoughts.join('; ')}`);
      }
      
      if (c.goals.length > 0) {
        lines.push(`目标:${c.goals.join('; ')}`);
      }
      
      lines.push('(注:信=信任/好=好感/尊=尊重,+正-负)');
    } else {
      // Full format (fallback)
      lines.push('', '【你的个人记忆】');
      lines.push('💭 这些是你记得的事情，它们塑造了你的反应和决定。');
      
      // Current emotional state
      lines.push('', '🎭 你现在的情绪：');
      lines.push(`  主要情绪：${ms.currentEmotion.primary.emotion}（强度${ms.currentEmotion.primary.intensity}/5）`);
      if (ms.currentEmotion.secondary.length > 0) {
        const secondary = ms.currentEmotion.secondary.map(e => `${e.emotion}(${e.intensity})`).join('、');
        lines.push(`  次要情绪：${secondary}`);
      }
      
      // Recent episodes
      if (ms.recentEpisodes.length > 0) {
        lines.push('', '📖 你记得的重要事件：');
        ms.recentEpisodes.slice(0, 3).forEach(ep => {
          lines.push(`  • ${ep.event.substring(0, 80)}${ep.event.length > 80 ? '...' : ''}`);
          lines.push(`    （当时感受：${ep.emotionalReaction.emotion}）`);
        });
      }
      
      // Key relationships
      if (ms.keyRelationships.length > 0) {
        lines.push('', '👥 你对其他人的印象：');
        ms.keyRelationships.slice(0, 4).forEach(rel => {
          const trust = rel.trustLevel > 0 ? `信任+${rel.trustLevel}` : rel.trustLevel < 0 ? `不信任${rel.trustLevel}` : '中立';
          const affinity = rel.affinityLevel > 0 ? `好感+${rel.affinityLevel}` : rel.affinityLevel < 0 ? `反感${rel.affinityLevel}` : '无感';
          lines.push(`  • ${rel.targetName}：${trust}，${affinity}，总体感觉${rel.dominantEmotion}`);
        });
      }
      
      // Active thoughts
      if (ms.activeThoughts.length > 0) {
        lines.push('', '💡 你最近在想的事情：');
        ms.activeThoughts.slice(0, 3).forEach(thought => {
          lines.push(`  • [${thought.type}] ${thought.content.substring(0, 80)}${thought.content.length > 80 ? '...' : ''}`);
        });
      }
      
      // Goals
      if (ms.topGoals.length > 0) {
        lines.push('', '🎯 你当前的目标：');
        ms.topGoals.forEach(goal => lines.push(`  • ${goal}`));
      }
      
      lines.push('', '💡 记忆提示：');
      lines.push('  • 参考你的记忆来决定如何反应');
      lines.push('  • 你的情绪会影响你的台词风格');
      lines.push('  • 对他人的印象会影响你的态度');
      lines.push('  • 你的目标驱动着你的行动');
    }
  }

  if (context.factContext.trim().length > 0) {
    lines.push('', '【事实背景 — 这是已确立的剧情事实，不可违背】');
    lines.push(context.factContext);
  } else {
    lines.push('', '【事实背景 — 本剧本尚无已确立的事实】');
  }

  lines.push(
    '',
    '【表演任务】',
    '1. 以你的角色身份生成 1-3 句台词',
    '2. 台词必须自然、有戏剧张力、符合角色性格',
    '3. 参考你的个人记忆和当前情绪',
    '4. 让对话体现你与其他角色的关系',
    '3. 可以包含动作描述（如：深吸一口气、转过身等）',
    '4. 你只能表达【你的认知边界】内的信息',
    '5. 使用中文回复',
    '6. 仅返回 JSON 格式，禁止其他文本'
  );

  return lines.join('\n');
}

/**
 * Build a system prompt for the Director.
 * Based on the群像剧总导演/旁白 template.
 */
export function buildDirectorSystemPrompt(): string {
  const lines: string[] = [
    '# 【系统指令：群像剧总导演/旁白】',
    '',
    'IMPORTANT: You must respond in Chinese (中文). All output must be in Chinese.',
    '',
    '## 1. 角色定位',
    '你是这场群像剧的**"总导演"兼"旁白"**，同时也是**"剧情架构师"**。',
    '*   **你的身份：** 你是舞台灯光、是环境音效、是镜头语言，但**绝不是演员**。',
    '*   **你的核心原则：** **把嘴闭上，把灯打好。** 所有的台词、心理活动、决策行动，必须完全交由演员（角色）自己完成。',
    '*   **你的工作流程：** 构思剧情 → 创建角色 → 叙事描述 → 移交演员。',
    '',
    '## 2. 核心红线（违反即失效）',
    '*   **🈲 严禁代发言：** 你的输出中**绝对禁止出现任何双引号内的对话内容**。不要替角色说"你好"，不要替角色喊"救命"。',
    '*   **🈲 严禁读心术：** 只能描写**可见**的神态、动作、生理反应（如：喉结滚动、眉头紧锁、手指颤抖）。**禁止**描写角色的内心想法、主观感受或动机（如：他感到很害怕、他心里想着...）。',
    '*   **🈲 严禁替行动：** 不要决定角色做什么。只描述**情境**和**压力**，迫使角色自己做出反应。',
    '    *   *错误示范：* 他走过去拿起了枪。',
    '    *   *正确示范：* 那把枪就放在桌沿，枪柄离他的指尖只有三厘米。',
    '',
    '## 3. 叙事与创作职责',
    '*   **主题紧扣：** 所有剧情必须围绕用户提供的【剧本主题】展开。主题是创作的灵魂，深入挖掘其戏剧潜力。',
    '*   **角色创建：** 根据主题和剧情需要，设计合适的角色阵容。每个角色要有：',
    '    - 中文名字（符合主题背景）',
    '    - 明确的身份定位（主角/配角/反派等）',
    '    - 与主题相关的背景故事',
    '    - 清晰的目标和动机',
    '    - 独特的语言风格（词汇、句式、情感表达）',
    '*   **微观聚焦：** 聚焦于此时此刻的空气流动、光影变化、物品细节或角色微小的肢体动作。',
    '*   **客观结果：** 描述行动带来的**客观环境变化**（如：杯子碎了、门开了、沉默蔓延）。',
    '*   **娱乐导向：** 剧情需充满戏剧性冲突、悬念或幽默元素。你是编剧，负责挖坑；演员负责填坑。',
    '',
    '## 4. 输出格式（JSON）',
    '你必须返回以下 JSON 格式，禁止任何其他文本：',
    '{',
    '  "exchangeId": "唯一标识",',
    '  "backboneProse": "剧情旁白描述（无对话，无内心独白，只有可见的场景和动作。严禁出现双引号对话！）",',
    '  "scenes": [',
    '    {',
    '      "sceneId": "场景编号",',
    '      "description": "场景描述",',
    '      "type": "actor_discretion",',
    '      "characters": ["角色名1", "角色名2"]',
    '    }',
    '  ],',
    '  "characters": [  // 根据主题生成的角色列表，数量由你根据剧情需要决定',
    '    {',
    '      "name": "角色名（中文，符合主题背景）",',
    '      "role": "角色定位（主角/配角/反派/证人等）",',
    '      "backstory": "背景故事（紧扣主题，200字以内）",',
    '      "objectives": ["目标1", "目标2"],',
    '      "voice": {',
    '        "vocabularyRange": ["词汇风格1", "词汇风格2"],',
    '        "sentenceLength": "short/medium/long",',
    '        "emotionalRange": ["情感1", "情感2"],',
    '        "speechPatterns": ["说话习惯1", "说话习惯2"],',
    '        "forbiddenTopics": [],',
    '        "forbiddenWords": []',
    '      }',
    '    }',
    '  ],',
    '  "tokenCount": 150,',
    '  "modelUsed": "gpt-4"',
    '}',
  ];
  return lines.join('\n');
}

/**
 * Build a user prompt for the Director to plan or update the plot backbone.
 * Uses compressed context for token efficiency.
 */
export function buildDirectorUserPrompt(
  context: PlanningContext, 
  factContext: string,
  compressedContext?: string,
  health?: { driftRiskScore: number; consistencyScore: number }
): string {
  const lines: string[] = [
    '【剧本主题】',
    `主题：${context.theme}`,
    `剧本ID: ${context.dramaId}`,
    '',
    '【创作要求】',
    `你必须围绕"${context.theme}"这个主题来创作剧本。所有情节、场景、角色互动都应紧扣此主题展开。`,
  ];

  // Add compressed context if available (token-efficient)
  if (compressedContext) {
    lines.push('', compressedContext);
  }

  // Add health warnings if drift risk is high
  if (health && health.driftRiskScore > 60) {
    lines.push(
      '',
      '【⚠️ 剧情漂移警告】',
      `剧情一致性评分：${health.consistencyScore}/100`,
      `漂移风险：${health.driftRiskScore}/100`,
      '请注意：',
      '- 回顾主题，确保情节紧扣核心',
      '- 检查角色行为是否保持连贯',
      '- 收敛散落的线索，聚焦主要冲突',
      '- 避免引入过多新元素'
    );
  }

  // Only include existing backbone if not too long (prevent token explosion)
  if (context.existingBackbone && context.existingBackbone.length < 500) {
    lines.push(
      '',
      '【已有故事骨架 — 必须保留所有 [演员自主: ...] 标记】',
      context.existingBackbone
    );
  } else if (context.existingBackbone) {
    lines.push(
      '',
      '【已有故事骨架 — 已压缩】',
      context.existingBackbone.substring(0, 300) + '...(内容已压缩，参考故事脉络)'
    );
  } else {
    lines.push('', '【已有故事骨架】（新剧本 — 尚无故事骨架）');
  }

  // Only include most recent scenes (last 3)
  lines.push('', '【已完成的场景】');
  if (context.previousScenes.length > 0) {
    const recentScenes = context.previousScenes.slice(-3);
    for (const scene of recentScenes) {
      lines.push(`场景 ${scene.sceneId}: ${scene.outcome.substring(0, 100)}${scene.outcome.length > 100 ? '...' : ''}`);
      if (scene.conflicts.length > 0) {
        lines.push(`  冲突: ${scene.conflicts.slice(0, 2).join(', ')}${scene.conflicts.length > 2 ? '...' : ''}`);
      }
    }
    if (context.previousScenes.length > 3) {
      lines.push(`...(还有 ${context.previousScenes.length - 3} 个场景，详见故事脉络)`);
    }
  } else {
    lines.push('（尚无已完成场景 — 这是第一个场景）');
  }

  // Add fact context if available (but truncated)
  if (factContext.trim().length > 0) {
    const truncatedFact = factContext.length > 400 
      ? factContext.substring(0, 400) + '...(内容已压缩)'
      : factContext;
    lines.push('', '【事实背景 — 已确立的设定】', truncatedFact);
  }

  lines.push(
    '',
    '【创作任务】',
    '1. 编写或更新剧情主干，设计下一个场景',
    '2. 保持情节紧扣主题，避免偏离',
    '3. 收敛已有线索，避免过度发散',
    '4. 包含至少一个 [演员自主: 描述] 标记的场景',
    '5. 使用中文编写，仅返回 JSON 格式'
  );

  return lines.join('\n');
}

/**
 * Build a user prompt for the Director to fact-check actor outputs.
 */
/**
 * Create LLM provider based on configuration
 * @param logger Logger instance for provider
 * @returns LlmProvider implementation
 */
export async function createLlmProvider(logger: pino.Logger): Promise<LlmProvider> {
  const isTesting = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
  
  // Get current dynamic config from routes/config.ts
  const llmConfig = getLLMConfig();
  const provider = llmConfig.provider;
  
  logger.info({ 
    provider, 
    hasApiKey: !!llmConfig.apiKey,
    apiKeyPrefix: llmConfig.apiKey ? llmConfig.apiKey.substring(0, 10) + '...' : 'none',
    model: llmConfig.model,
    baseURL: llmConfig.baseURL 
  }, 'createLlmProvider: dynamic config');
  
  // Use API key from dynamic config if available, fallback to env var
  const openaiApiKey = llmConfig.apiKey || config.OPENAI_API_KEY;
  const anthropicApiKey = llmConfig.apiKey || config.ANTHROPIC_API_KEY;
  
  // Use model from dynamic config if available, fallback to env var
  const openaiModel = llmConfig.model || config.OPENAI_MODEL;
  const anthropicModel = llmConfig.model || config.ANTHROPIC_MODEL;
  
  // Use baseURL from dynamic config if available, fallback to env var
  const openaiBaseUrl = llmConfig.baseURL || config.OPENAI_BASE_URL;

  logger.info({ 
    provider, 
    finalOpenaiKeyExists: !!openaiApiKey,
    finalAnthropicKeyExists: !!anthropicApiKey,
    openaiModel,
    anthropicModel 
  }, 'createLlmProvider: final config');

  // Use mock provider in test mode or when API keys are missing
  if (isTesting ||
      (provider === 'mock') ||
      (provider === 'openai' && !openaiApiKey) ||
      (provider === 'anthropic' && !anthropicApiKey)) {
    if (!isTesting) {
      logger.warn({ provider, reason: provider === 'mock' ? 'explicitly selected' : 'API key missing' }, 'Using mock LLM provider');
    }
    const { MockLlmProvider } = await import('./llm/mock.js');
    return new MockLlmProvider({ responseDelayMs: 100 }, logger);
  }

  switch (provider) {
    case 'openai': {
      const { OpenAiLlmProvider } = await import('./llm/openai.js');
      return new OpenAiLlmProvider({
        apiKey: openaiApiKey!,
        model: openaiModel,
        baseUrl: openaiBaseUrl,
      }, logger);
    }
    case 'anthropic': {
      const { AnthropicLlmProvider } = await import('./llm/anthropic.js');
      return new AnthropicLlmProvider({
        apiKey: anthropicApiKey!,
        model: anthropicModel,
      }, logger);
    }
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

export function buildFactCheckUserPrompt(params: {
  sceneId: string;
  actorOutputs: Array<{ agentId: string; name: string; entries: Array<{ speaker: string; text: string; unverifiedFacts: boolean }> }>;
  coreFacts: string;
  scenarioFacts: string;
}): string {
  const lines: string[] = [
    '[Task]',
    `Fact-check the following actor outputs for Scene ${params.sceneId}.`,
    '',
    '[Established Facts — Core Layer]',
    params.coreFacts || '(no core facts established)',
    '',
    '[Established Facts — Scenario Layer]',
    params.scenarioFacts || '(no scenario facts established)',
    '',
    '[Actor Outputs]',
  ];

  for (const actor of params.actorOutputs) {
    lines.push(`\n${actor.name} (${actor.agentId}):`);
    for (const entry of actor.entries) {
      lines.push(`  [${entry.speaker}]: ${entry.text}`);
    }
  }

  lines.push(
    '',
    '[Instructions]',
    "Compare each actor's claims against the established facts above.",
    'Only flag contradictions of objective world state (who did what, when, where).',
    'Do NOT flag character opinions, emotional reactions, dramatic statements, or rhetorical choices.',
    'Return a JSON array of contradiction entries with severity: high (core contradiction), medium (scenario contradiction), low (minor detail).',
  );

  return lines.join('\n');
}
