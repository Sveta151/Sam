// RAG: Retrieval with cosine search + MMR diversification

import type { Chunk, RetrievalResult, Citation } from './types.js';
import { cosineSimilarity } from './utils/cosine.js';
import { logger } from './utils/logger.js';
import { getEmbeddingProvider } from './embed/index.js';

const log = logger.child('rag');

/**
 * Retrieve relevant chunks using cosine similarity
 */
export async function retrieveChunks(
  query: string,
  chunks: Chunk[],
  topK: number = 8
): Promise<RetrievalResult[]> {
  log.info(`Retrieving chunks for query (topK=${topK})`);
  
  // Embed the query
  const embedProvider = getEmbeddingProvider();
  const queryEmbedding = await embedProvider.embed(query);
  
  // Calculate cosine similarity for all chunks
  const results: RetrievalResult[] = chunks
    .filter(c => c.embedding && c.embedding.length > 0)
    .map(chunk => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
  
  log.info(`Retrieved ${results.length} chunks (scores: ${results.map(r => r.score.toFixed(3)).join(', ')})`);
  
  return results;
}

/**
 * Apply MMR (Maximal Marginal Relevance) for diversity
 */
export function applyMMR(
  results: RetrievalResult[],
  targetCount: number = 5,
  lambda: number = 0.7
): RetrievalResult[] {
  if (results.length <= targetCount) {
    return results;
  }
  
  const selected: RetrievalResult[] = [];
  const remaining = [...results];
  
  // Start with the highest scoring result
  selected.push(remaining.shift()!);
  
  // Iteratively select results that maximize MMR score
  while (selected.length < targetCount && remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = -Infinity;
    
    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      
      // Calculate max similarity to already selected chunks
      const maxSim = Math.max(
        ...selected.map(s =>
          cosineSimilarity(candidate.chunk.embedding, s.chunk.embedding)
        )
      );
      
      // MMR score: balance relevance and diversity
      const mmrScore = lambda * candidate.score - (1 - lambda) * maxSim;
      
      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIdx = i;
      }
    }
    
    selected.push(remaining.splice(bestIdx, 1)[0]);
  }
  
  log.info(`MMR diversification: ${results.length} → ${selected.length} chunks`);
  
  return selected;
}

/**
 * Build context string with inline citations
 */
export function buildContext(results: RetrievalResult[]): string {
  const snippets = results.map((r, idx) => {
    const { chunk } = r;
    return `[CIT:${chunk.paperId}#${chunk.index}]\n${chunk.text}`;
  });
  
  return snippets.join('\n\n---\n\n');
}

/**
 * Extract citations from LLM response
 */
export function extractCitations(text: string): Citation[] {
  const citationPattern = /\[CIT:([^#]+)#(\d+)\]/g;
  const citations: Citation[] = [];
  const seen = new Set<string>();
  
  let match;
  while ((match = citationPattern.exec(text)) !== null) {
    const paperId = match[1];
    const chunkIndex = parseInt(match[2], 10);
    const key = `${paperId}#${chunkIndex}`;
    
    if (!seen.has(key)) {
      citations.push({ paperId, chunkIndex });
      seen.add(key);
    }
  }
  
  return citations;
}

/**
 * Full RAG pipeline: retrieve, diversify, build context
 */
export async function ragPipeline(
  query: string,
  chunks: Chunk[],
  topK: number = 8,
  finalK: number = 5
): Promise<{ context: string; results: RetrievalResult[] }> {
  const results = await retrieveChunks(query, chunks, topK);
  const diversified = applyMMR(results, finalK);
  const context = buildContext(diversified);
  
  return { context, results: diversified };
}

