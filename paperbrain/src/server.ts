// Fastify server bootstrap

import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { env } from './env.js';
import { logger } from './utils/logger.js';
import { setupHTTP } from './http.js';
import { setupOpenAPI } from './openapi.js';

// Route imports
import { healthRoute } from './routes/health.js';
import { projectsRoute } from './routes/v1.projects.js';
import { foldersRoute } from './routes/v1.folders.js';
import { papersRoute } from './routes/v1.papers.js';
import { chatRoute } from './routes/v1.chat.js';
import { synthesisRoute } from './routes/v1.synthesis.js';
import { podcastRoute } from './routes/v1.podcast.js';
import { videoRoute } from './routes/v1.video.js';
import { searchRoute } from './routes/v1.search.js';

const log = logger.child('server');

async function start() {
  const fastify = Fastify({
    logger: false, // Use our custom logger
    bodyLimit: 40 * 1024 * 1024, // 40MB for PDFs
  });

  // Setup HTTP middleware (CORS, error handling)
  await setupHTTP(fastify);

  // Setup OpenAPI documentation
  await setupOpenAPI(fastify);

  // Register multipart for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 40 * 1024 * 1024, // 40MB
    },
  });

  // Register routes
  await healthRoute(fastify);
  await projectsRoute(fastify);
  await foldersRoute(fastify);
  await papersRoute(fastify);
  await chatRoute(fastify);
  await synthesisRoute(fastify);
  await podcastRoute(fastify);
  await videoRoute(fastify);
  await searchRoute(fastify);

  // Start server
  const port = parseInt(env.PORT, 10);
  const host = env.HOST;

  try {
    await fastify.listen({ port, host });
    log.info(`🚀 PaperBrain API running on http://${host}:${port}`);
    log.info(`📚 OpenAPI docs available at http://${host}:${port}/docs`);
    log.info(`   Embeddings: ${env.EMBEDDINGS_PROVIDER}`);
    log.info(`   LLM: ${env.LLM_PROVIDER}`);
    log.info(`   Data: ${env.DATA_DIR}`);
    log.info(`   CORS: ${env.CORS_ORIGIN}`);
  } catch (err) {
    log.error('Failed to start server', err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

start();
