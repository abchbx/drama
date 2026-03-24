import { Router } from 'express';
import { createLlmProvider, LlmPrompt } from '../services/llm.js';
import { pino } from 'pino';
// Static imports for test endpoint to avoid dynamic import overhead
import { MockLlmProvider } from '../services/llm/mock.js';
import { OpenAiLlmProvider } from '../services/llm/openai.js';
import { AnthropicLlmProvider } from '../services/llm/anthropic.js';

export type LLMProvider = 'openai' | 'anthropic' | 'mock';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey?: string;
  baseURL?: string;
  model?: string;
  temperature?: number;
}

export interface SessionParams {
  sceneDurationMinutes: number;
  agentCount: number;
  maxTokens?: number;
  maxTurns?: number;
  heartbeatInterval?: number;
  timeoutSeconds?: number;
}

export interface AppConfig {
  llmConfig: LLMConfig;
  sessionParams: SessionParams;
}

// In-memory storage for configuration
let appConfig: AppConfig = {
  llmConfig: {
    provider: 'mock',
    model: 'gpt-4',
    temperature: 0.7,
  },
  sessionParams: {
    sceneDurationMinutes: 30,
    agentCount: 3,
    maxTokens: 4000,
    maxTurns: 10,
  },
};

// Export getter for services to access current config
export function getLLMConfig(): LLMConfig {
  return { ...appConfig.llmConfig };
}

export const configRouter = Router();

// GET /config - returns current AppConfig
configRouter.get('/', (_req, res) => {
  res.json(appConfig);
});

// PUT /config - updates entire config
configRouter.put('/', (req, res) => {
  const newConfig = req.body as Partial<AppConfig>;

  if (newConfig.llmConfig) {
    appConfig.llmConfig = { ...appConfig.llmConfig, ...newConfig.llmConfig };
  }
  if (newConfig.sessionParams) {
    appConfig.sessionParams = { ...appConfig.sessionParams, ...newConfig.sessionParams };
  }

  res.json(appConfig);
});

// PUT /config/llm - updates LLMConfig
configRouter.put('/llm', (req, res) => {
  const llmConfigUpdate = req.body as Partial<LLMConfig>;
  
  console.log('[API PUT /config/llm] Received update:', { 
    provider: llmConfigUpdate.provider,
    hasApiKey: !!llmConfigUpdate.apiKey,
    apiKeyLength: llmConfigUpdate.apiKey?.length,
    model: llmConfigUpdate.model,
    baseURL: llmConfigUpdate.baseURL
  });

  // Validate provider if provided
  if (llmConfigUpdate.provider && !['openai', 'anthropic', 'mock'].includes(llmConfigUpdate.provider)) {
    res.status(400).json({ error: 'Invalid provider. Must be one of: openai, anthropic, mock' });
    return;
  }

  // Validate temperature if provided
  if (llmConfigUpdate.temperature !== undefined && (llmConfigUpdate.temperature < 0 || llmConfigUpdate.temperature > 2)) {
    res.status(400).json({ error: 'Temperature must be between 0 and 2' });
    return;
  }

  appConfig.llmConfig = { ...appConfig.llmConfig, ...llmConfigUpdate };
  
  console.log('[API PUT /config/llm] Updated config:', {
    provider: appConfig.llmConfig.provider,
    hasApiKey: !!appConfig.llmConfig.apiKey,
    model: appConfig.llmConfig.model
  });
  
  res.json(appConfig.llmConfig);
});

// PUT /config/session - updates SessionParams
configRouter.put('/session', (req, res) => {
  const sessionParamsUpdate = req.body as Partial<SessionParams>;

  // Validate required fields
  if (sessionParamsUpdate.sceneDurationMinutes !== undefined && sessionParamsUpdate.sceneDurationMinutes < 1) {
    res.status(400).json({ error: 'sceneDurationMinutes must be at least 1' });
    return;
  }
  if (sessionParamsUpdate.agentCount !== undefined && sessionParamsUpdate.agentCount < 1) {
    res.status(400).json({ error: 'agentCount must be at least 1' });
    return;
  }

  appConfig.sessionParams = { ...appConfig.sessionParams, ...sessionParamsUpdate };
  res.json(appConfig.sessionParams);
});

// POST /config/test - test LLM configuration
configRouter.post('/test', async (req, res) => {
  const logger = pino({ level: 'info' });
  const startTime = Date.now();
  
  try {
    // Get test config from request body, or use current saved config
    const testConfig: LLMConfig = req.body?.testConfig || appConfig.llmConfig;
    
    // Create temporary config getter for testing
    const getTestLLMConfig = () => ({ ...testConfig });
    
    const isTesting = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
    const provider = testConfig.provider;
    
    // Use API key from test config
    const openaiApiKey = testConfig.apiKey || process.env.OPENAI_API_KEY;
    const anthropicApiKey = testConfig.apiKey || process.env.ANTHROPIC_API_KEY;
    
    // Use model from test config
    const openaiModel = testConfig.model || process.env.OPENAI_MODEL || 'gpt-4-turbo';
    const anthropicModel = testConfig.model || process.env.ANTHROPIC_MODEL || 'claude-3-opus-20240229';
    
    // Use baseURL from test config
    const openaiBaseUrl = testConfig.baseURL || process.env.OPENAI_BASE_URL;
    
    // Determine which provider to use (using statically imported classes)
    let llmProvider;
    
    if (isTesting ||
        (provider === 'mock') ||
        (provider === 'openai' && !openaiApiKey) ||
        (provider === 'anthropic' && !anthropicApiKey)) {
      if (!isTesting) {
        logger.warn({ provider, reason: provider === 'mock' ? 'explicitly selected' : 'API key missing' }, 'Using mock LLM provider');
      }
      llmProvider = new MockLlmProvider({ responseDelayMs: 100 }, logger);
    } else if (provider === 'openai') {
      llmProvider = new OpenAiLlmProvider({
        apiKey: openaiApiKey!,
        model: openaiModel,
        baseUrl: openaiBaseUrl,
      }, logger);
    } else if (provider === 'anthropic') {
      llmProvider = new AnthropicLlmProvider({
        apiKey: anthropicApiKey!,
        model: anthropicModel,
      }, logger);
    } else {
      throw new Error(`Unsupported LLM provider: ${provider}`);
    }
    
    // Simple test prompt - use Director style for simpler response parsing
    const testPrompt: LlmPrompt = {
      system: 'You are the Director. Reply with a simple JSON response.',
      user: 'Send a test message saying the configuration is working.',
    };
    
    // Attempt to generate response
    const response = await llmProvider.generate(testPrompt);
    const latency = Date.now() - startTime;
    
    // Parse response (mock returns JSON string, real APIs return text)
    let content = response.content;
    try {
      const parsed = JSON.parse(content);
      content = parsed.entries?.[0]?.text || parsed.backboneProse || JSON.stringify(parsed);
    } catch {
      // Not JSON, use as-is
    }
    
    res.json({
      success: true,
      provider: testConfig.provider,
      model: testConfig.model,
      latency,
      response: content.substring(0, 200), // Limit response length
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    res.status(500).json({
      success: false,
      provider: req.body?.testConfig?.provider || appConfig.llmConfig.provider,
      model: req.body?.testConfig?.model || appConfig.llmConfig.model,
      latency,
      error: errorMessage,
    });
  }
});
