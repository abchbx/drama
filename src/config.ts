import 'dotenv/config';
import { z } from 'zod';

// Server config schema
const ServerConfigSchema = z.object({
  PORT: z.coerce.number().default(3000),
  SOCKET_PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

// JWT config schema
const JwtConfigSchema = z.object({
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('24h'),
});

// Capability config schema
const CapabilityConfigSchema = z.object({
  CAPABILITY_ACTOR: z.string().default('semantic,procedural'),
  CAPABILITY_DIRECTOR: z.string().default('core,scenario,semantic,procedural'),
  CAPABILITY_ADMIN: z.string().default('core,scenario,semantic,procedural'),
});

// LLM config schema
const LlmConfigSchema = z.object({
  LLM_PROVIDER: z.enum(['openai', 'anthropic']).default('openai'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4-turbo'),
  OPENAI_BASE_URL: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-3-opus-20240229'),
});

// Blackboard config schema
const BlackboardConfigSchema = z.object({
  BLACKBOARD_DATA_DIR: z.string().default('./data'),
  CORE_LAYER_TOKEN_BUDGET: z.coerce.number().default(2048),
  SCENARIO_LAYER_TOKEN_BUDGET: z.coerce.number().default(8192),
  SEMANTIC_LAYER_TOKEN_BUDGET: z.coerce.number().default(16384),
  PROCEDURAL_LAYER_TOKEN_BUDGET: z.coerce.number().default(4096),
});

// Routing config schema
const RoutingConfigSchema = z.object({
  HEARTBEAT_INTERVAL_MS: z.coerce.number().default(5000),
  ACTOR_TIMEOUT_MS: z.coerce.number().default(30000),
  ACTOR_RETRY_TIMEOUT_MS: z.coerce.number().default(15000),
  SOCKET_GRACE_PERIOD_MS: z.coerce.number().default(10000),
  SCENE_TIMEOUT_MS: z.coerce.number().default(300000),
});

// Complete config schema
const ConfigSchema = z.object({
  ...ServerConfigSchema.shape,
  ...LlmConfigSchema.shape,
  ...BlackboardConfigSchema.shape,
  ...RoutingConfigSchema.shape,
  ...JwtConfigSchema.shape,
  ...CapabilityConfigSchema.shape,
});

// Infer type from schema
export type Config = z.infer<typeof ConfigSchema>;

// Validate and export config
export function loadConfig(): Config {
  try {
    const config = ConfigSchema.parse(process.env);
    validateConfigDependencies(config);
    return config;
  } catch (error) {
    console.error('❌ Configuration validation failed:', error);
    process.exit(1);
  }
}

function validateConfigDependencies(config: Config): void {
  // API key validation is optional for testing purposes or if we're using mock provider
  const isTesting = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

  // Don't require API keys - we'll use mock provider if needed
  if (!isTesting) {
    // Still log a warning if API key is missing but don't throw error
    if (config.LLM_PROVIDER === 'openai' && !config.OPENAI_API_KEY) {
      console.warn('Warning: OPENAI_API_KEY is missing. Will use mock LLM provider.');
    }
    if (config.LLM_PROVIDER === 'anthropic' && !config.ANTHROPIC_API_KEY) {
      console.warn('Warning: ANTHROPIC_API_KEY is missing. Will use mock LLM provider.');
    }
  }
}

// Export default instance
export const config = loadConfig();
