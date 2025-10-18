// OpenAI embeddings implementation

import OpenAI from 'openai';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';

const log = logger.child('embed:openai');

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    if (!env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return client;
}

export async function embedOpenAI(text: string): Promise<number[]> {
  const client = getClient();
  
  try {
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    log.error('OpenAI embedding failed', error);
    throw error;
  }
}

