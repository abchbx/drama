import { Router } from 'express';

export type LLMProvider = 'openai' | 'anthropic' | 'mock';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey?: string;
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
