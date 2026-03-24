import { LlmProvider, LlmPrompt, LlmResponse } from '../llm.js';
import type pino from 'pino';

export interface MockLlmConfig {
  responseDelayMs?: number;
}

export class MockLlmProvider implements LlmProvider {
  private readonly logger: pino.Logger;
  private readonly responseDelayMs: number;

  constructor(config: MockLlmConfig, logger: pino.Logger) {
    this.logger = logger;
    this.responseDelayMs = config.responseDelayMs ?? 100;
  }

  async generate(prompt: LlmPrompt): Promise<LlmResponse> {
    this.logger.info('MockLlmProvider.generate: simulating LLM response');

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, this.responseDelayMs));

    // Detect which type of response to generate based on prompt content
    // Director prompt contains "导演", Actor prompt contains "演员" or character name
    const isDirectorPrompt = prompt.system.includes('导演') || prompt.system.includes('Director of this multi-agent drama');
    this.logger.info(`MockLlmProvider.generate: isDirectorPrompt=${isDirectorPrompt}`);
    this.logger.info(`MockLlmProvider.generate: system prompt starts with: ${prompt.system.substring(0, 100)}`);

    let mockResponse: unknown;

    if (isDirectorPrompt) {
      // Extract theme from user prompt to generate contextually relevant content
      const themeMatch = prompt.user.match(/剧本主题[：:]\s*(.+?)(?:\n|$)/);
      const theme = themeMatch ? themeMatch[1].trim() : '未知主题';
      
      // Generate content based on theme
      let backboneProse: string;
      let characterName: string;
      let location: string;
      
      if (theme.includes('彩票') || theme.includes('中奖') || theme.includes('财富')) {
        backboneProse = '彩票站内的空气仿佛凝固了。电子屏上那串数字无情地闪烁着，与手中那张皱巴巴的彩票完全一致。窗外的阳光突然变得刺眼，周围嘈杂的人声像是从很远的地方传来。那个穿着褪色工装的男人站在原地，喉结滚动了一下，手指无意识地摩挲着彩票边缘。';
        characterName = '周建国';
        location = '彩票站';
      } else if (theme.includes('宫廷') || theme.includes('宫斗') || theme.includes('后宫')) {
        backboneProse = '紫禁城的黄昏来得格外早。长春宫的雕花窗棂外，最后一缕夕阳正缓缓沉入琉璃瓦的缝隙。殿内，一盏孤灯摇曳，将两位妃嫔的影子拉得很长。紫檀木桌上，那碗还冒着热气的参汤散发着若有若无的药香。';
        characterName = '淑妃';
        location = '长春宫';
      } else if (theme.includes('科幻') || theme.includes('太空') || theme.includes('未来')) {
        backboneProse = '空间站的观察舱内，地球的弧线在脚下缓缓转动。红色的警报灯光将每个人的脸映得忽明忽暗。主控屏幕上，那串不断跳动的数据意味着补给舱的轨迹正在偏离，而氧气储备显示只剩下不到72小时。';
        characterName = '林舰长';
        location = '空间站';
      } else if (theme.includes('悬疑') || theme.includes('推理') || theme.includes('侦探')) {
        backboneProse = '雨夜的庄园笼罩在一片死寂中。书房的门虚掩着，壁炉里的火早已熄灭，只剩下几缕青烟。地板上，那滩暗红色的液体在昏暗的灯光下显得格外刺眼。窗外，一道闪电划过，照亮了书桌上那封未写完的信。';
        characterName = '陈侦探';
        location = '庄园书房';
      } else if (theme.includes('职场') || theme.includes('商战') || theme.includes('办公室')) {
        backboneProse = '会议室的玻璃墙外，城市的夜景灯火通明。长桌两端，两份合同静静地躺着，墨迹还未干透。投影仪的蓝光打在PPT最后一页那个刺眼的数字上——公司本季度的亏损额。空调开得很低，但所有人的额头都渗出了细密的汗珠。';
        characterName = '张总';
        location = '公司会议室';
      } else {
        // Default theme-based content
        backboneProse = `${theme}的故事在这个平凡的日子里悄然展开。空气中弥漫着一种说不清道不明的紧张感，仿佛暴风雨前的宁静。每个人都在自己的位置上，等待着命运齿轮的转动。窗外的天色渐暗，而屋内的人心，却比这夜色更加难测。`;
        characterName = '主角';
        location = '未知地点';
      }
      
      this.logger.info({ theme, location, characterName }, 'MockLlmProvider.generate: generating theme-based director response');
      
      // Director response format for planBackbone - in Chinese with generated characters
      mockResponse = {
        exchangeId: 'mock-director-' + Date.now(),
        backboneProse,
        scenes: [
          {
            sceneId: 'scene-1',
            description: `${location}内的关键时刻`,
            type: 'actor_discretion' as const,
            characters: [characterName, '配角A', '配角B', '配角C']
          }
        ],
        characters: [
          {
            name: characterName,
            role: '主角',
            backstory: `一个在${theme}背景下展开的角色的故事。性格复杂，动机明确，面临着人生的重要抉择。`,
            objectives: ['推动剧情发展', '与其他角色互动', '完成自己的使命'],
            voice: {
              vocabularyRange: ['戏剧性', '个性化', '情感丰富'],
              sentenceLength: 'medium',
              emotionalRange: ['紧张', '期待', '坚定'],
              speechPatterns: ['富有表现力', '符合角色身份'],
              forbiddenTopics: [],
              forbiddenWords: []
            }
          },
          {
            name: '配角A',
            role: '配角',
            backstory: '主角的盟友或对手，性格鲜明，有自己的目标和动机。',
            objectives: ['支持或阻碍主角', '实现自己的利益'],
            voice: {
              vocabularyRange: ['标准', '有特点'],
              sentenceLength: 'medium',
              emotionalRange: ['理性', '感性'],
              speechPatterns: ['自然流畅'],
              forbiddenTopics: [],
              forbiddenWords: []
            }
          },
          {
            name: '配角B',
            role: '配角',
            backstory: '剧情中的关键人物，掌握重要信息或资源。',
            objectives: ['传递信息', '制造冲突或转机'],
            voice: {
              vocabularyRange: ['专业', '口语'],
              sentenceLength: 'short',
              emotionalRange: ['冷静', '热情'],
              speechPatterns: ['简洁有力'],
              forbiddenTopics: [],
              forbiddenWords: []
            }
          },
          {
            name: '配角C',
            role: '配角',
            backstory: '故事中的观察者或参与者，提供不同视角。',
            objectives: ['观察局势', '适时介入'],
            voice: {
              vocabularyRange: ['通俗', '文艺'],
              sentenceLength: 'variable',
              emotionalRange: ['好奇', '谨慎'],
              speechPatterns: ['灵活多变'],
              forbiddenTopics: [],
              forbiddenWords: []
            }
          }
        ],
        tokenCount: 150,
        modelUsed: 'mock-director'
      };
      this.logger.info('MockLlmProvider.generate: returning DIRECTOR mock response with characters');
    } else {
      // Actor response format for dialogue generation - in Chinese
      mockResponse = {
        exchangeId: 'mock-actor-' + Date.now(),
        entries: [
          {
            speaker: '角色',
            text: '（环顾四周）这是模拟LLM提供商的中文回复。',
            unverifiedFacts: false,
            unverifiedClaims: []
          }
        ]
      };
      this.logger.info('MockLlmProvider.generate: returning ACTOR mock response');
    }

    const responseContent = JSON.stringify(mockResponse);
    this.logger.info(`MockLlmProvider.generate: response content: ${responseContent.substring(0, 200)}`);

    return { content: responseContent };
  }
}
