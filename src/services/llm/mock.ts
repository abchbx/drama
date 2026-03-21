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
    this.logger.debug('MockLlmProvider.generate: simulating LLM response');

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, this.responseDelayMs));

    // Mock response - return a simple JSON that matches the expected schema
    const mockResponse = {
      exchangeId: 'mock-exchange-' + Date.now(),
      entries: [
        {
          speaker: 'Mock Character',
          text: 'This is a mock response from the LLM provider.',
          unverifiedFacts: false,
          unverifiedClaims: []
        }
      ]
    };

    this.logger.debug('MockLlmProvider.generate: returning mock response');

    return { content: JSON.stringify(mockResponse) };
  }
}
