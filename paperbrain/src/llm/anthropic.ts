// Anthropic Claude implementation

import Anthropic from '@anthropic-ai/sdk';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';
import type { Message } from '../types.js';
import type { ChatOptions } from './index.js';

const log = logger.child('llm:anthropic');

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return client;
}

export async function chatAnthropic(
  messages: Message[],
  options: ChatOptions = {}
): Promise<string> {
  const client = getClient();
  
  const { maxTokens = 1200, temperature = 0.2 } = options;
  
  // Extract system message if present
  let systemMessage = '';
  const userMessages = messages.filter(m => {
    if (m.role === 'system') {
      systemMessage = m.content;
      return false;
    }
    return true;
  });
  
  try {
    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: maxTokens,
      temperature,
      system: systemMessage || undefined,
      messages: userMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });
    
    const content = response.content[0];
    if (content.type === 'text') {
      return content.text;
    }
    
    throw new Error('Unexpected response type from Claude');
  } catch (error) {
    log.error('Anthropic chat failed', error);
    throw error;
  }
}

