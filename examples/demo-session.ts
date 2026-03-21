/**
 * 戏剧对话演示示例
 * 展示如何构造角色、分配角色、运行会话
 */

import 'dotenv/config';
import { pino } from 'pino';
import { loadConfig } from '../src/config.js';
import { BlackboardService } from '../src/services/blackboard.js';
import { CapabilityService } from '../src/services/capability.js';
import { MemoryManagerService } from '../src/services/memoryManager.js';
import { createLlmProvider } from '../src/services/llm.js';
import { DramaSession, CharacterCard } from '../src/session.js';

const logger = pino({ level: 'info' });

// 步骤1: 定义角色卡片
const characterCards: CharacterCard[] = [
  {
    id: 'hamlet',
    name: '哈姆雷特',
    role: '王子',
    backstory: '丹麦王子，父亲被叔叔谋杀，母亲改嫁叔叔',
    objectives: ['为父亲复仇', '揭露真相'],
    voice: {
      vocabularyRange: ['formal', 'reflective', 'philosophical'],
      sentenceLength: 'long',
      emotionalRange: ['conflicted', 'melancholy', 'determined'],
      speechPatterns: ['rhetorical questions', 'soliloquy style'],
      forbiddenTopics: ['peaceful resignation', 'forgiveness of Claudius'],
      forbiddenWords: ['happy', 'content', 'trust']
    }
  },
  {
    id: 'claudius',
    name: '克劳迪斯',
    role: '国王',
    backstory: '谋杀了自己的哥哥，篡夺了王位',
    objectives: ['巩固权力', '掩盖罪行'],
    voice: {
      vocabularyRange: ['regal', 'calculating', 'diplomatic'],
      sentenceLength: 'medium',
      emotionalRange: ['ambitious', 'guarded', 'menacing'],
      speechPatterns: ['political statements', 'implied threats'],
      forbiddenTopics: ['murder', 'regicide'],
      forbiddenWords: ['sin', 'blood', 'guilt']
    }
  },
  {
    id: 'gertrude',
    name: '格特鲁德',
    role: '王后',
    backstory: '哈姆雷特的母亲，丈夫死后很快改嫁克劳迪斯',
    objectives: ['维持和平', '保护哈姆雷特'],
    voice: {
      vocabularyRange: ['maternal', 'conciliatory', 'elegant'],
      sentenceLength: 'medium',
      emotionalRange: ['anxious', 'compassionate', 'torn'],
      speechPatterns: ['soothing statements', 'attempts at reconciliation'],
      forbiddenTopics: ['comparing husbands', 'the past'],
      forbiddenWords: ['former', 'death', 'delay']
    }
  }
];

async function main() {
  console.log('🎭 戏剧对话系统演示');
  console.log('================================\n');

  const config = loadConfig();

  // 步骤2: 创建服务
  console.log('📦 初始化服务...');
  const blackboard = new BlackboardService();
  const capabilityService = new CapabilityService();
  const memoryManager = new MemoryManagerService({
    blackboard,
    llmProvider: await createLlmProvider(logger),
    logger
  });
  const llmProvider = await createLlmProvider(logger);

  // 步骤3: 创建戏剧会话
  console.log('🎬 创建戏剧会话...');
  const session = new DramaSession({
    config: {
      sceneTimeoutMs: 300000,
      actorTimeoutMs: 30000
    },
    blackboard,
    router: {} as any,
    memoryManager,
    llmProvider,
    capabilityService,
    logger
  });

  console.log(`   会话 ID: ${session.dramaId}`);

  // 步骤4: 初始化会话 - 添加角色
  console.log('\n👥 初始化角色...');
  await session.initialize(characterCards);

  console.log('   角色列表:');
  characterCards.forEach(card => {
    console.log(`   - ${card.name} (${card.role})`);
  });

  // 步骤5: 创建场景
  console.log('\n🎪 定义第一场: 城堡大厅对峙');
  const scene1 = {
    id: 'scene-1',
    location: '埃尔西诺城堡大厅',
    description: '夜色深沉，大厅灯火通明。克劳迪斯坐在王座上，格特鲁德在旁。哈姆雷特站在下方，眼中满是愤怒与怀疑。',
    tone: 'tense',
    actorIds: ['hamlet', 'claudius', 'gertrude']
  };

  console.log('\n⏳ 运行场景中...');
  const result = await session.runScene(scene1);

  console.log('\n📋 场景结果:');
  console.log(`   状态: ${result.status}`);
  console.log(`   对话条数: ${result.entryCount}`);
  console.log('\n   对话节拍:');
  result.beats.forEach((beat, i) => {
    console.log(`   ${i + 1}. ${beat}`);
  });

  console.log('\n✅ 演示完成!');
  console.log('\n📝 关键概念:');
  console.log('   - Director: 规划剧情、调解冲突、事实检查');
  console.log('   - Actor: 根据角色卡片生成对话');
  console.log('   - Blackboard: 共享的4层信息存储 (core/scenario/semantic/procedural)');
  console.log('   - LLM: 提供AI生成对话支持');
}

main().catch(err => {
  console.error('❌ 演示出错:', err);
  process.exit(1);
});
