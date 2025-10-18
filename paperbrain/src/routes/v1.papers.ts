// v1 Papers routes

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { store } from '../store/fs-json.js';
import { PaperSchema } from '../types.js';
import { extractPdf } from '../pdf.js';
import { chunkText } from '../chunk.js';
import { getEmbeddingProvider } from '../embed/index.js';
import { saveUploadedFile } from '../utils/file.js';
import { logger } from '../utils/logger.js';
import { join } from 'path';

const log = logger.child('route:papers');

const UpdatePaperSchema = z.object({
  title: z.string().optional(),
  authors: z.array(z.string()).optional(),
  venue: z.string().optional(),
  year: z.number().optional(),
  citations: z.number().optional(),
  folderId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function papersRoute(fastify: FastifyInstance) {
  // GET /v1/papers - List papers
  fastify.get<{
    Querystring: { projectId?: string; folderId?: string; includeSubfolders?: string };
  }>('/v1/papers', {
    schema: {
      tags: ['papers'],
      description: 'List papers with optional filters',
      querystring: {
        type: 'object',
        properties: {
          projectId: { type: 'string' },
          folderId: { type: 'string' },
          includeSubfolders: { type: 'string', enum: ['true', 'false'] },
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
    const { projectId, folderId, includeSubfolders } = request.query;

    const papers = await store.listPapers({
      projectId,
      folderId,
      includeSubfolders: includeSubfolders === 'true',
    });

    return papers;
  });

  // GET /v1/papers/:id - Get a paper by ID
  fastify.get<{
    Params: { id: string };
  }>('/v1/papers/:id', {
    schema: {
      tags: ['papers'],
      description: 'Get a paper by ID',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
      response: {
        200: {
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
    const { id } = request.params;
    const paperData = await store.getPaper(id);

    if (!paperData) {
      return reply.code(404).send({
        error: 'Not Found',
        message: `Paper ${id} not found`,
      });
    }

    return paperData.paper;
  });

  // DELETE /v1/papers/:id - Delete a paper
  fastify.delete<{
    Params: { id: string };
  }>('/v1/papers/:id', {
    schema: {
      tags: ['papers'],
      description: 'Delete a paper',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
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
    const { id } = request.params;

    try {
      await store.deletePaper(id);
      log.info(`Deleted paper: ${id}`);
      return { ok: true };
    } catch (error) {
      return reply.code(404).send({
        error: 'Not Found',
        message: `Paper ${id} not found`,
      });
    }
  });

  // POST /v1/papers/ingest - Ingest a PDF
  fastify.post('/v1/papers/ingest', {
    schema: {
      tags: ['papers'],
      description: 'Ingest a PDF file',
      consumes: ['multipart/form-data'],
      response: {
        200: {
          type: 'object',
          properties: {
            paper: {
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
              },
            },
            chunks: { type: 'number' },
          },
        },
        400: {
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
      const data = await request.file();

      if (!data) {
        return reply.code(400).send({ error: 'Bad Request', message: 'No file uploaded' });
      }

      // Get fields
      const projectIdField = data.fields.projectId;
      const projectId = projectIdField && 'value' in projectIdField ? projectIdField.value as string : undefined;

      if (!projectId) {
        return reply.code(400).send({ error: 'Bad Request', message: 'projectId field required' });
      }

      const folderIdField = data.fields.folderId;
      const folderId = folderIdField && 'value' in folderIdField ? folderIdField.value as string : undefined;

      const filenameField = data.fields.filename;
      const customFilename = filenameField && 'value' in filenameField ? filenameField.value as string : undefined;

      const filename = customFilename || data.filename;
      const buffer = await data.toBuffer();

      // Save temporarily (use a single timestamp to avoid mismatched filenames)
      const timestamp = Date.now();
      const tempName = `upload_${timestamp}_${filename}`;
      const tempPath = join('/tmp', tempName);
      await saveUploadedFile(buffer, '/tmp', tempName);

      log.info(`Processing PDF: ${filename} for project ${projectId}`);

      // Extract PDF
      const { paper, fullText } = await extractPdf(tempPath, filename, projectId, folderId);

      // Save PDF to permanent location
      const pdfPath = join(store.getFilesDir(), `${paper.id}.pdf`);
      await saveUploadedFile(buffer, store.getFilesDir(), `${paper.id}.pdf`);
      paper.sourcePath = pdfPath;

      // Chunk text
      const chunks = chunkText(paper.id, fullText);

      // Generate embeddings
      log.info(`Generating embeddings for ${chunks.length} chunks`);
      const embedProvider = getEmbeddingProvider();

      for (const chunk of chunks) {
        chunk.embedding = await embedProvider.embed(chunk.text);
      }

      // Store paper + chunks
      await store.upsertPaper(paper, chunks);

      log.info(`Ingested paper ${paper.id} with ${chunks.length} chunks`);

      return reply.send({
        paper,
        chunks: chunks.length,
      });
    } catch (error) {
      log.error('Ingest failed', error);
      return reply.status(500 as any).send({ error: 'Internal Server Error', message: String(error) });
    }
  });

  // PATCH /v1/papers/:id - Update a paper
  fastify.patch<{
    Params: { id: string };
    Body: z.infer<typeof UpdatePaperSchema>;
  }>('/v1/papers/:id', {
    schema: {
      tags: ['papers'],
      description: 'Update a paper',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          authors: { type: 'array', items: { type: 'string' } },
          venue: { type: 'string' },
          year: { type: 'number' },
          citations: { type: 'number' },
          folderId: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
      response: {
        200: {
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
    const { id } = request.params;
    const body = UpdatePaperSchema.parse(request.body);

    const paperData = await store.getPaper(id);
    if (!paperData) {
      return reply.code(404).send({
        error: 'Not Found',
        message: `Paper ${id} not found`,
      });
    }

    const paper = paperData.paper;

    if (body.title !== undefined) paper.title = body.title;
    if (body.authors !== undefined) paper.authors = body.authors;
    if (body.venue !== undefined) paper.venue = body.venue;
    if (body.year !== undefined) paper.year = body.year;
    if (body.citations !== undefined) paper.citations = body.citations;
    if (body.folderId !== undefined) paper.folderId = body.folderId;
    if (body.tags !== undefined) paper.tags = body.tags;

    await store.upsertPaper(paper, paperData.chunks);
    log.info(`Updated paper: ${id}`);
    return paper;
  });

  // GET /v1/papers/:id/chunks - Get chunks for a paper
  fastify.get<{
    Params: { id: string };
    Querystring: { offset?: string; limit?: string };
  }>('/v1/papers/:id/chunks', {
    schema: {
      tags: ['papers'],
      description: 'Get chunks for a paper',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          offset: { type: 'string' },
          limit: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  index: { type: 'number' },
                  text: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request) => {
    const { id } = request.params;
    const offset = parseInt(request.query.offset || '0', 10);
    const limit = parseInt(request.query.limit || '50', 10);

    const result = await store.getChunks(id, offset, limit);

    // Return simplified chunks (without embeddings)
    return {
      total: result.total,
      items: result.items.map(c => ({
        index: c.index,
        text: c.text,
      })),
    };
  });
}

