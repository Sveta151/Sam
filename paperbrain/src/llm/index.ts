// LLM provider interface and router

import { env } from '../env.js';
import { logger } from '../utils/logger.js';
import type { Message } from '../types.js';
import { chatAnthropic } from './anthropic.js';
import { chatGroq } from './groq.js';

const log = logger.child('llm');

export interface LLMProvider {
  chat(messages: Message[], options?: ChatOptions): Promise<string>;
}

export interface ChatOptions {
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

/**
 * Get the configured LLM provider
 */
export function getLLMProvider(): LLMProvider {
  const provider = env.LLM_PROVIDER;
  
  log.info(`Using LLM provider: ${provider}`);
  
  switch (provider) {
    case 'anthropic':
      return { chat: chatAnthropic };
    case 'groq':
      return { chat: chatGroq };
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

