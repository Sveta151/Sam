// v1 Synthesis routes

import type { FastifyInstance } from 'fastify';
import { SynthRequestSchema } from '../types.js';
import { store } from '../store/fs-json.js';
import { getLLMProvider } from '../llm/index.js';
import { SYNTH_SYSTEM, SYNTH_USER } from '../prompts.js';
import { logger } from '../utils/logger.js';
import type { Message } from '../types.js';

const log = logger.child('route:synthesis');

export async function synthesisRoute(fastify: FastifyInstance) {
  // POST /v1/synthesis - Multi-paper synthesis
  fastify.post('/v1/synthesis', {
    schema: {
      tags: ['synthesis'],
      description: 'Synthesize multiple papers',
      body: {
        type: 'object',
        required: ['paperIds'],
        properties: {
          projectId: { type: 'string' },
          paperIds: {
            type: 'array',
            items: { type: 'string' },
            minItems: 3,
            maxItems: 10,
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            storyline: { type: 'string' },
            deltas: { type: 'string' },
            tableMarkdown: { type: 'string' },
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
      const body = SynthRequestSchema.parse(request.body);
      const { projectId, paperIds } = body;

      log.info(`Synthesizing ${paperIds.length} papers`);

      // Get papers
      const paperDataList = await Promise.all(
        paperIds.map(id => store.getPaper(id))
      );

      // Check if all papers exist
      const missingPapers = paperDataList.filter(pd => pd === null);
      if (missingPapers.length > 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Some papers not found',
        });
      }

      // If projectId is provided but no paperIds, get recent papers from project
      if (projectId && paperIds.length === 0) {
        const papers = await store.listPapers({ projectId });
        // Take top N recent papers (up to 10)
        const recentPapers = papers.slice(0, 10);
        if (recentPapers.length < 3) {
          return reply.code(400).send({
            error: 'Bad Request',
            message: 'Project has fewer than 3 papers',
          });
        }
        paperIds.push(...recentPapers.map(p => p.id));
      }

      // Select representative chunks for each paper (3-5 chunks)
      const excerpts: string[] = [];

      for (const paperData of paperDataList) {
        if (!paperData) continue;

        const { paper, chunks } = paperData;

        // Select diverse chunks (simple approach: evenly spaced)
        const selectedIndices = selectRepresentativeIndices(chunks.length, 4);
        const selectedChunks = selectedIndices.map(i => chunks[i]);

        // Build excerpt with metadata
        const paperExcerpt = [
          `## Paper: ${paper.title}`,
          `Authors: ${paper.authors.join(', ')}`,
          paper.year ? `Year: ${paper.year}` : '',
          paper.venue ? `Venue: ${paper.venue}` : '',
          '',
          ...selectedChunks.map(c => `[${paper.id}#${c.index}]\n${c.text}`),
        ]
          .filter(Boolean)
          .join('\n');

        excerpts.push(paperExcerpt);
      }

      const allExcerpts = excerpts.join('\n\n---\n\n');

      // Call LLM for synthesis
      const llm = getLLMProvider();
      const messages: Message[] = [
        { role: 'system', content: SYNTH_SYSTEM },
        { role: 'user', content: SYNTH_USER(allExcerpts) },
      ];

      const response = await llm.chat(messages, {
        maxTokens: 3000,
        temperature: 0.3,
      });

      // Parse response (expect three sections)
      const sections = parseSynthResponse(response);

      log.info(`Synthesis complete for ${paperIds.length} papers`);

      return reply.send({
        storyline: sections.storyline,
        deltas: sections.deltas,
        tableMarkdown: sections.table,
      });
    } catch (error) {
      log.error('Synthesis failed', error);
      return reply.status(500 as any).send({
        error: 'Internal Server Error',
        message: String(error),
      });
    }
  });
}

function selectRepresentativeIndices(total: number, target: number): number[] {
  if (total <= target) {
    return Array.from({ length: total }, (_, i) => i);
  }

  const indices: number[] = [];
  const step = total / target;

  for (let i = 0; i < target; i++) {
    indices.push(Math.floor(i * step));
  }

  return indices;
}

function parseSynthResponse(response: string): {
  storyline: string;
  deltas: string;
  table: string;
} {
  // Simple parsing: look for sections
  const storylineMatch = response.match(/(?:Collective Storyline|1\))([\s\S]*?)(?:Delta Map|2\)|$)/i);
  const deltasMatch = response.match(/(?:Delta Map|2\))([\s\S]*?)(?:Markdown Table|3\)|$)/i);
  const tableMatch = response.match(/(?:Markdown Table|3\))([\s\S]*?)$/i);

  return {
    storyline: storylineMatch?.[1]?.trim() || 'Not found',
    deltas: deltasMatch?.[1]?.trim() || 'Not found',
    table: tableMatch?.[1]?.trim() || 'Not found',
  };
}

