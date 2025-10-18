// Groq implementation

import Groq from 'groq-sdk';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';
import type { Message } from '../types.js';
import type { ChatOptions } from './index.js';

const log = logger.child('llm:groq');

let client: Groq | null = null;

function getClient(): Groq {
  if (!client) {
    if (!env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY not configured');
    }
    client = new Groq({ apiKey: env.GROQ_API_KEY });
  }
  return client;
}

export async function chatGroq(
  messages: Message[],
  options: ChatOptions = {}
): Promise<string> {
  const client = getClient();
  
  const { maxTokens = 1200, temperature = 0.2 } = options;
  
  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: maxTokens,
      temperature,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });
    
    return response.choices[0]?.message?.content || '';
  } catch (error) {
    log.error('Groq chat failed', error);
    throw error;
  }
}

