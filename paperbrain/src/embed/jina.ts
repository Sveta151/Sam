// Jina AI embeddings implementation

import { env } from '../env.js';
import { logger } from '../utils/logger.js';

const log = logger.child('embed:jina');

export async function embedJina(text: string): Promise<number[]> {
  if (!env.JINA_API_KEY) {
    throw new Error('JINA_API_KEY not configured');
  }
  
  try {
    const response = await fetch('https://api.jina.ai/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.JINA_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'jina-embeddings-v3',
        input: [text],
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Jina API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as any;
    return data.data[0].embedding;
  } catch (error) {
    log.error('Jina embedding failed', error);
    throw error;
  }
}

