// POST /synthesize - Multi-paper synthesis

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { memoryStore } from '../store/memory.js';
import { getLLMProvider } from '../llm/index.js';
import { SYNTH_SYSTEM, SYNTH_USER } from '../prompts.js';
import { logger } from '../utils/logger.js';
import type { SynthReport, Message } from '../types.js';

const log = logger.child('route:synth');

const synthSchema = z.object({
  projectId: z.string(),
  paperIds: z.array(z.string()).min(2).max(10),
});

export async function synthRoute(fastify: FastifyInstance) {
  fastify.post<{
    Body: z.infer<typeof synthSchema>;
  }>('/synthesize', async (request, reply) => {
    try {
      const { projectId, paperIds } = synthSchema.parse(request.body);
      
      log.info(`Synthesizing ${paperIds.length} papers in project ${projectId}`);
      
      // Get papers and chunks
      const papers = await memoryStore.getPapers(projectId, paperIds);
      if (papers.length !== paperIds.length) {
        return reply.code(404).send({ error: 'Some papers not found' });
      }
      
      // Select representative chunks for each paper (3-5 chunks)
      const excerpts: string[] = [];
      
      for (const paper of papers) {
        const chunks = await memoryStore.getChunks(projectId, paper.id);
        
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
      
      const report: SynthReport = {
        folderId: projectId,
        storyline: sections.storyline,
        deltas: sections.deltas,
        tableMarkdown: sections.table,
      };
      
      log.info(`Synthesis complete for project ${projectId}`);
      
      return reply.send(report);
    } catch (error) {
      log.error('Synthesis failed', error);
      return reply.code(500).send({ error: String(error) });
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

