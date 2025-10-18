// Token-aware text chunking with overlap

import type { Chunk } from './types.js';
import { chunkId } from './utils/id.js';
import { logger } from './utils/logger.js';

const log = logger.child('chunk');

const TARGET_TOKENS = 1200;
const OVERLAP_TOKENS = 200;
const CHARS_PER_TOKEN = 4; // Rough estimate

/**
 * Split text into overlapping chunks
 */
export function chunkText(paperId: string, text: string): Chunk[] {
  log.info(`Chunking text for paper ${paperId}`);
  
  // Clean and normalize text
  const cleanText = text
    .replace(/\r\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Split into paragraphs first
  const paragraphs = cleanText.split(/\n\n+/).filter(p => p.trim().length > 0);
  
  const chunks: Chunk[] = [];
  let currentChunk = '';
  let currentTokens = 0;
  let chunkIndex = 0;
  
  for (const para of paragraphs) {
    const paraTokens = estimateTokens(para);
    
    // If adding this paragraph would exceed target, save current chunk
    if (currentTokens + paraTokens > TARGET_TOKENS && currentChunk.length > 0) {
      chunks.push(createChunk(paperId, currentChunk, chunkIndex));
      chunkIndex++;
      
      // Keep overlap from previous chunk
      const overlapText = getOverlapText(currentChunk, OVERLAP_TOKENS);
      currentChunk = overlapText + ' ' + para;
      currentTokens = estimateTokens(currentChunk);
    } else {
      currentChunk += (currentChunk ? ' ' : '') + para;
      currentTokens += paraTokens;
    }
    
    // If single paragraph is too large, split by sentences
    if (currentTokens > TARGET_TOKENS * 1.5) {
      const sentenceChunks = splitBySentences(currentChunk, TARGET_TOKENS, OVERLAP_TOKENS);
      for (const sc of sentenceChunks) {
        chunks.push(createChunk(paperId, sc, chunkIndex));
        chunkIndex++;
      }
      currentChunk = '';
      currentTokens = 0;
    }
  }
  
  // Add final chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(createChunk(paperId, currentChunk, chunkIndex));
  }
  
  log.info(`Created ${chunks.length} chunks for paper ${paperId}`);
  
  return chunks;
}

function createChunk(paperId: string, text: string, index: number): Chunk {
  const cleanText = text.trim();
  return {
    id: chunkId(paperId, index),
    paperId,
    text: cleanText,
    index,
    tokens: estimateTokens(cleanText),
    embedding: [], // Will be filled later
  };
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function getOverlapText(text: string, overlapTokens: number): string {
  const overlapChars = overlapTokens * CHARS_PER_TOKEN;
  if (text.length <= overlapChars) return text;
  
  // Try to break at sentence boundary
  const overlapStart = text.length - overlapChars;
  const sentenceEnd = text.lastIndexOf('. ', text.length - 1);
  
  if (sentenceEnd > overlapStart) {
    return text.substring(sentenceEnd + 2);
  }
  
  return text.substring(overlapStart);
}

function splitBySentences(text: string, targetTokens: number, overlapTokens: number): string[] {
  // Split by sentence boundaries
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  const chunks: string[] = [];
  let currentChunk = '';
  let currentTokens = 0;
  
  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);
    
    if (currentTokens + sentenceTokens > targetTokens && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      
      // Keep overlap
      const overlapText = getOverlapText(currentChunk, overlapTokens);
      currentChunk = overlapText + ' ' + sentence;
      currentTokens = estimateTokens(currentChunk);
    } else {
      currentChunk += sentence;
      currentTokens += sentenceTokens;
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

