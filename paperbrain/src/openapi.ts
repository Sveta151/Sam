// OpenAPI documentation setup

import type { FastifyInstance } from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';

export async function setupOpenAPI(fastify: FastifyInstance) {
  // Register Swagger
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'PaperBrain API',
        description: 'NotebookLM-style context-aware research assistant API',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:8787',
          description: 'Development server',
        },
      ],
      tags: [
        { name: 'health', description: 'Health check endpoints' },
        { name: 'projects', description: 'Project management' },
        { name: 'folders', description: 'Folder organization' },
        { name: 'papers', description: 'Paper management and ingestion' },
        { name: 'chat', description: 'RAG-powered chat' },
        { name: 'synthesis', description: 'Multi-paper synthesis' },
        { name: 'podcast', description: 'Podcast generation' },
        { name: 'video', description: 'Video generation' },
        { name: 'search', description: 'Paper search' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
          },
        },
      },
    },
  });

  // Register Swagger UI
  await fastify.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    staticCSP: true,
  });
}

