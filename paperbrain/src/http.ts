// HTTP middleware: CORS, error handling

import type { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import { env } from './env.js';
import { logger } from './utils/logger.js';

const log = logger.child('http');

export async function setupHTTP(fastify: FastifyInstance) {
  // CORS
  await fastify.register(cors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global error handler
  fastify.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    log.error('Request error', {
      method: request.method,
      url: request.url,
      error: error.message,
      stack: error.stack,
    });

    // Validation errors (400)
    if (error.validation) {
      return reply.code(400).send({
        error: 'Validation Error',
        message: error.message,
        details: error.validation,
      });
    }

    // Not found (404)
    if (error.statusCode === 404) {
      return reply.code(404).send({
        error: 'Not Found',
        message: error.message,
      });
    }

    // Payload too large (413)
    if (error.statusCode === 413) {
      return reply.code(413).send({
        error: 'Payload Too Large',
        message: 'File size exceeds maximum allowed (40MB)',
      });
    }

    // Internal server error (500)
    const statusCode = error.statusCode || 500;
    return reply.code(statusCode).send({
      error: error.name || 'Internal Server Error',
      message: error.message || 'An unexpected error occurred',
    });
  });

  // Not found handler
  fastify.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
    });
  });
}

