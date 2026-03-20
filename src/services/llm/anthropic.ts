import { LlmProvider, LlmPrompt, LlmResponse } from '../llm.js';
import Anthropic from '@anthropic-ai/sdk';
import type pino from 'pino';

export interface AnthropicConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class AnthropicLlmProvider implements LlmProvider {
  private readonly client: Anthropic;
  private readonly model: string;
  private readonly temperature: number;
  private readonly maxTokens: number;
  private readonly logger: pino.Logger;

  constructor(config: AnthropicConfig, logger: pino.Logger) {
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.client = new Anthropic({
      apiKey: config.apiKey,
    });

    this.model = config.model ?? 'claude-3-opus-20240229';
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 4096;
    this.logger = logger;
  }

  async generate(prompt: LlmPrompt): Promise<LlmResponse> {
    this.logger.debug({ model: this.model, systemLength: prompt.system.length }, 'AnthropicLlmProvider.generate: calling API');

    try {
      const completion = await this.client.messages.create({
        model: this.model,
        system: prompt.system,
        messages: [
          { role: 'user', content: prompt.user },
        ],
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        stream: false,
      });

      let content = '';
      for (const block of completion.content) {
        if (block.type === 'text') {
          content += block.text;
        }
      }

      if (!content) {
        throw new Error('Anthropic returned empty response');
      }

      this.logger.debug({ model: this.model, contentLength: content.length }, 'AnthropicLlmProvider.generate: API call successful');

      return { content };
    } catch (error) {
      this.logger.error({ err: error, model: this.model }, 'AnthropicLlmProvider.generate: API call failed');
      throw new Error(`Anthropic API error: ${error}`);
    }
  }
}
