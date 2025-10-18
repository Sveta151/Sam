// POST /chat - RAG-powered Q&A over a single paper

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { memoryStore } from '../store/memory.js';
import { ragPipeline, extractCitations } from '../rag.js';
import { getLLMProvider } from '../llm/index.js';
import { CHAT_SYSTEM, CHAT_USER } from '../prompts.js';
import { logger } from '../utils/logger.js';
import type { Message, ChatResponse } from '../types.js';

const log = logger.child('route:chat');

const chatSchema = z.object({
  paperId: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    })
  ),
  topK: z.number().optional().default(8),
  projectId: z.string().optional().default('default'),
});

export async function chatRoute(fastify: FastifyInstance) {
  fastify.post<{
    Body: z.infer<typeof chatSchema>;
  }>('/chat', async (request, reply) => {
    try {
      const { paperId, messages, topK, projectId } = chatSchema.parse(request.body);
      
      // Get the last user message as the query
      const userMessages = messages.filter(m => m.role === 'user');
      if (userMessages.length === 0) {
        return reply.code(400).send({ error: 'No user message found' });
      }
      
      const query = userMessages[userMessages.length - 1].content;
      
      log.info(`Chat query for paper ${paperId}: "${query.substring(0, 50)}..."`);
      
      // Retrieve chunks for this paper
      const chunks = await memoryStore.getChunks(projectId, paperId);
      
      if (chunks.length === 0) {
        return reply.code(404).send({ error: 'Paper not found or has no chunks' });
      }
      
      // RAG pipeline
      const { context } = await ragPipeline(query, chunks, topK, 5);
      
      // Build prompt
      const systemMessage: Message = { role: 'system', content: CHAT_SYSTEM };
      const userMessage: Message = { role: 'user', content: CHAT_USER(query, context) };
      
      // Call LLM
      const llm = getLLMProvider();
      const answer = await llm.chat([systemMessage, userMessage], {
        maxTokens: 1200,
        temperature: 0.2,
      });
      
      // Extract citations
      const citations = extractCitations(answer);
      
      const response: ChatResponse = {
        answer,
        citations,
      };
      
      log.info(`Chat response generated with ${citations.length} citations`);
      
      return reply.send(response);
    } catch (error) {
      log.error('Chat failed', error);
      return reply.code(500).send({ error: String(error) });
    }
  });
}

