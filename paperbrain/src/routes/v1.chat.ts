// v1 Chat routes

import type { FastifyInstance } from 'fastify';
import { ChatRequestSchema, ChatResponseSchema } from '../types.js';
import { store } from '../store/fs-json.js';
import { ragPipeline, extractCitations } from '../rag.js';
import { getLLMProvider } from '../llm/index.js';
import { CHAT_SYSTEM, CHAT_USER } from '../prompts.js';
import { logger } from '../utils/logger.js';
import type { Message } from '../types.js';

const log = logger.child('route:chat');

export async function chatRoute(fastify: FastifyInstance) {
  // POST /v1/chat - Chat with a paper
  fastify.post('/v1/chat', {
    schema: {
      tags: ['chat'],
      description: 'Chat with a paper using RAG',
      body: {
        type: 'object',
        required: ['paperId', 'messages'],
        properties: {
          paperId: { type: 'string' },
          messages: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                role: { type: 'string', enum: ['user', 'assistant', 'system'] },
                content: { type: 'string' },
              },
            },
          },
          topK: { type: 'number' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            answer: { type: 'string' },
            citations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  paperId: { type: 'string' },
                  chunkIndex: { type: 'number' },
                },
              },
            },
          },
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const body = ChatRequestSchema.parse(request.body);
      const { paperId, messages, topK } = body;

      // Get the last user message as the query
      const userMessages = messages.filter(m => m.role === 'user');
      if (userMessages.length === 0) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'No user message found',
        });
      }

      const query = userMessages[userMessages.length - 1].content;

      log.info(`Chat query for paper ${paperId}: "${query.substring(0, 50)}..."`);

      // Retrieve paper and chunks
      const paperData = await store.getPaper(paperId);
      if (!paperData) {
        return reply.code(404).send({
          error: 'Not Found',
          message: `Paper ${paperId} not found`,
        });
      }

      if (paperData.chunks.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Paper has no chunks',
        });
      }

      // RAG pipeline
      const { context } = await ragPipeline(query, paperData.chunks, topK, 5);

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

      log.info(`Chat response generated with ${citations.length} citations`);

      return reply.send({
        answer,
        citations,
      });
    } catch (error) {
      log.error('Chat failed', error);
      return reply.status(500 as any).send({
        error: 'Internal Server Error',
        message: String(error),
      });
    }
  });

  // POST /v1/papers/:id/chat - Alias for chat (convenience)
  fastify.post<{
    Params: { id: string };
    Body: { messages: Message[]; topK?: number };
  }>('/v1/papers/:id/chat', {
    schema: {
      tags: ['chat'],
      description: 'Chat with a paper (alias)',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['messages'],
        properties: {
          messages: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                role: { type: 'string', enum: ['user', 'assistant', 'system'] },
                content: { type: 'string' },
              },
            },
          },
          topK: { type: 'number' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            answer: { type: 'string' },
            citations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  paperId: { type: 'string' },
                  chunkIndex: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params;
    const { messages, topK } = request.body;

    // Forward to main chat endpoint
    return fastify.inject({
      method: 'POST',
      url: '/v1/chat',
      payload: {
        paperId: id,
        messages,
        topK,
      },
    }).then(res => reply.code(res.statusCode).send(res.json()));
  });
}

