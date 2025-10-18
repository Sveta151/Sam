// Voyage AI embeddings implementation

import { env } from '../env.js';
import { logger } from '../utils/logger.js';

const log = logger.child('embed:voyage');

export async function embedVoyage(text: string): Promise<number[]> {
  if (!env.VOYAGE_API_KEY) {
    throw new Error('VOYAGE_API_KEY not configured');
  }
  
  try {
    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.VOYAGE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'voyage-3-lite',
        input: text,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Voyage API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as any;
    return data.data[0].embedding;
  } catch (error) {
    log.error('Voyage embedding failed', error);
    throw error;
  }
}

