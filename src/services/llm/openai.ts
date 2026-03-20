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

export class OpenAiLlmProvider implements LlmProvider {
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly temperature: number;
  private readonly maxTokens: number;
  private readonly logger: pino.Logger;

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
    this.logger.debug({ model: this.model, systemLength: prompt.system.length }, 'OpenAiLlmProvider.generate: calling API');

    try {
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

      this.logger.debug({ model: this.model, contentLength: content.length }, 'OpenAiLlmProvider.generate: API call successful');

      return { content };
    } catch (error) {
      this.logger.error({ err: error, model: this.model }, 'OpenAiLlmProvider.generate: API call failed');
      throw new Error(`OpenAI API error: ${error}`);
    }
  }
}
