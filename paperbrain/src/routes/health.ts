// GET /health - Health check endpoint

import type { FastifyInstance } from 'fastify';

export async function healthRoute(fastify: FastifyInstance) {
  fastify.get('/health', {
    schema: {
      tags: ['health'],
      description: 'Health check endpoint',
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            time: { type: 'string' },
          },
        },
      },
    },
  }, async () => {
    return {
      ok: true,
      time: new Date().toISOString(),
    };
  });
}

