// v1 Search routes

import type { FastifyInstance } from 'fastify';
import { store } from '../store/fs-json.js';
import { logger } from '../utils/logger.js';

const log = logger.child('route:search');

export async function searchRoute(fastify: FastifyInstance) {
  // GET /v1/search - Simple keyword search
  fastify.get<{
    Querystring: { query?: string; projectId?: string };
  }>('/v1/search', {
    schema: {
      tags: ['search'],
      description: 'Search papers by keyword',
      querystring: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          projectId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              projectId: { type: 'string' },
              folderId: { type: 'string' },
              title: { type: 'string' },
              authors: { type: 'array', items: { type: 'string' } },
              venue: { type: 'string' },
              year: { type: 'number' },
              citations: { type: 'number' },
              sourcePath: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
  }, async (request) => {
    const { query, projectId } = request.query;

    log.info(`Search query: "${query}" in project: ${projectId || 'all'}`);

    // Get all papers (optionally filtered by project)
    const papers = await store.listPapers({ projectId });

    // If no query, return all papers
    if (!query) {
      return papers;
    }

    // Simple keyword search on title and authors
    const lowerQuery = query.toLowerCase();
    const results = papers.filter(paper => {
      const titleMatch = paper.title.toLowerCase().includes(lowerQuery);
      const authorMatch = paper.authors.some(author =>
        author.toLowerCase().includes(lowerQuery)
      );
      const venueMatch = paper.venue?.toLowerCase().includes(lowerQuery);
      return titleMatch || authorMatch || venueMatch;
    });

    log.info(`Found ${results.length} results for query: "${query}"`);

    return results;
  });
}

