// Embedding provider interface and router

import { env } from '../env.js';
import { logger } from '../utils/logger.js';
import { embedOpenAI } from './openai.js';
import { embedVoyage } from './voyage.js';
import { embedJina } from './jina.js';

const log = logger.child('embed');

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  dimension: number;
}

/**
 * Get the configured embedding provider
 */
export function getEmbeddingProvider(): EmbeddingProvider {
  const provider = env.EMBEDDINGS_PROVIDER;
  
  log.info(`Using embedding provider: ${provider}`);
  
  switch (provider) {
    case 'openai':
      return {
        embed: embedOpenAI,
        embedBatch: async (texts) => {
          const results = await Promise.all(texts.map(t => embedOpenAI(t)));
          return results;
        },
        dimension: 1536,
      };
    case 'voyage':
      return {
        embed: embedVoyage,
        embedBatch: async (texts) => {
          const results = await Promise.all(texts.map(t => embedVoyage(t)));
          return results;
        },
        dimension: 1024,
      };
    case 'jina':
      return {
        embed: embedJina,
        embedBatch: async (texts) => {
          const results = await Promise.all(texts.map(t => embedJina(t)));
          return results;
        },
        dimension: 1024,
      };
    default:
      throw new Error(`Unknown embedding provider: ${provider}`);
  }
}

