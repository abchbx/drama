import { LlmProvider, LlmPrompt, LlmResponse } from '../llm.js';
import { OpenAI } from 'openai';
import type pino from 'pino';

export interface OpenAiConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

// Sleep helper for delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class OpenAiLlmProvider implements LlmProvider {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly temperature: number;
  private readonly maxTokens: number;
  private readonly logger: pino.Logger;
  private lastRequestTime: number = 0;
  private readonly minRequestInterval: number = 1000; // 1 second between requests

  constructor(config: OpenAiConfig, logger: pino.Logger) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });

    this.model = config.model ?? 'gpt-4-turbo';
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 4096;
    this.logger = logger;
  }

  async generate(prompt: LlmPrompt): Promise<LlmResponse> {
    // Rate limiting: ensure minimum interval between requests
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      this.logger.debug({ delayMs: delay }, 'Rate limiting: waiting before request');
      await sleep(delay);
    }

    // Try with exponential backoff
    let lastError: Error | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) {
          const backoffDelay = Math.pow(2, attempt) * 1000; // 2s, 4s
          this.logger.info({ attempt, backoffDelayMs: backoffDelay }, 'Retrying after rate limit error');
          await sleep(backoffDelay);
        }

        this.logger.debug({ model: this.model, systemLength: prompt.system.length, attempt }, 'OpenAiLlmProvider.generate: calling API');
        
        const completion = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            { role: 'system', content: prompt.system },
            { role: 'user', content: prompt.user },
          ],
          temperature: this.temperature,
          max_tokens: this.maxTokens,
          stream: false,
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new Error('OpenAI returned empty response');
        }

        this.lastRequestTime = Date.now();
        this.logger.debug({ model: this.model, contentLength: content.length }, 'OpenAiLlmProvider.generate: API call successful');

        return { content };
      } catch (error: any) {
        lastError = error;
        const statusCode = error?.status || error?.statusCode;
        
        // If it's a rate limit error (429), retry with backoff
        if (statusCode === 429 || error?.code === '1302' || error?.message?.includes('速率限制')) {
          this.logger.warn({ attempt, error: error?.message }, 'Rate limit hit, will retry');
          continue; // Retry
        }
        
        // For other errors, throw immediately
        this.logger.error({ err: error, model: this.model, attempt }, 'OpenAiLlmProvider.generate: API call failed');
        throw new Error(`OpenAI API error: ${error}`);
      }
    }

    // All retries exhausted
    this.logger.error({ err: lastError, model: this.model }, 'OpenAiLlmProvider.generate: All retries exhausted');
    throw new Error(`OpenAI API error (rate limit): ${lastError}`);
  }
}
