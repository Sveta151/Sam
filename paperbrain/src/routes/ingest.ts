// POST /ingest - Upload and process PDF

import type { FastifyInstance } from 'fastify';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { extractPdf } from '../pdf.js';
import { chunkText } from '../chunk.js';
import { getEmbeddingProvider } from '../embed/index.js';
import { memoryStore } from '../store/memory.js';
import { logger } from '../utils/logger.js';
import type { IngestResponse } from '../types.js';

const log = logger.child('route:ingest');

export async function ingestRoute(fastify: FastifyInstance) {
  fastify.post<{
    Body: {
      projectId: string;
      file: any;
    };
  }>('/ingest', async (request, reply) => {
    try {
      const data = await request.file();
      
      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }
      
      // Get projectId from fields
      const projectIdField = data.fields.projectId;
      const projectId = projectIdField && 'value' in projectIdField ? projectIdField.value as string : undefined;
      
      if (!projectId) {
        return reply.code(400).send({ error: 'projectId field required' });
      }
      
      const filename = data.filename;
      const buffer = await data.toBuffer();
      
      // Save temporarily
      const tempPath = join('/tmp', `upload_${Date.now()}_${filename}`);
      await writeFile(tempPath, buffer);
      
      log.info(`Processing PDF: ${filename} for project ${projectId}`);
      
      // Extract PDF
      const { paper, fullText } = await extractPdf(tempPath, filename);
      
      // Chunk text
      const chunks = chunkText(paper.id, fullText);
      
      // Generate embeddings
      log.info(`Generating embeddings for ${chunks.length} chunks`);
      const embedProvider = getEmbeddingProvider();
      
      for (const chunk of chunks) {
        chunk.embedding = await embedProvider.embed(chunk.text);
      }
      
      // Store in memory + persist
      await memoryStore.addPaper(projectId, paper, chunks);
      
      // Cleanup temp file
      await unlink(tempPath);
      
      const response: IngestResponse = {
        paperId: paper.id,
        chunks: chunks.length,
      };
      
      log.info(`Ingested paper ${paper.id} with ${chunks.length} chunks`);
      
      return reply.send(response);
    } catch (error) {
      log.error('Ingest failed', error);
      return reply.code(500).send({ error: String(error) });
    }
  });
}

