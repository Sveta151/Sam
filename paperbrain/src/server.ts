// Fastify server bootstrap

import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import { env } from './env.js';
import { logger } from './utils/logger.js';
import { ingestRoute } from './routes/ingest.js';
import { chatRoute } from './routes/chat.js';
import { podcastRoute } from './routes/podcast.js';
import { videoScriptRoute } from './routes/video-script.js';
import { generateVideoRoute } from './routes/generate-video.js';
import { synthRoute } from './routes/synth.js';

const log = logger.child('server');

async function start() {
  const fastify = Fastify({
    logger: false, // Use our custom logger
    bodyLimit: 50 * 1024 * 1024, // 50MB for PDFs
  });

  // Register multipart for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
  });

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register routes
  await ingestRoute(fastify);
  await chatRoute(fastify);
  await podcastRoute(fastify);
  await videoScriptRoute(fastify);
  await generateVideoRoute(fastify);
  await synthRoute(fastify);

  // Start server
  const port = parseInt(env.PORT, 10);
  const host = env.HOST;

  try {
    await fastify.listen({ port, host });
    log.info(`🚀 paperbrain server running on http://${host}:${port}`);
    log.info(`   Embeddings: ${env.EMBEDDINGS_PROVIDER}`);
    log.info(`   LLM: ${env.LLM_PROVIDER}`);
    log.info(`   Data: ${env.DATA_DIR}`);
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

