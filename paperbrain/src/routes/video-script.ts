// POST /video-script - Generate video script with chapters

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { memoryStore } from '../store/memory.js';
import { getLLMProvider } from '../llm/index.js';
import { VIDEO_SCRIPT } from '../prompts.js';
import { logger } from '../utils/logger.js';
import type { VideoScript } from '../types.js';

const log = logger.child('route:video-script');

const videoScriptSchema = z.object({
  paperId: z.string(),
  projectId: z.string().optional().default('default'),
});

export async function videoScriptRoute(fastify: FastifyInstance) {
  fastify.post<{
    Body: z.infer<typeof videoScriptSchema>;
  }>('/video-script', async (request, reply) => {
    try {
      const { paperId, projectId } = videoScriptSchema.parse(request.body);
      
      log.info(`Generating video script for paper ${paperId}`);
      
      // Get paper metadata
      const paper = await memoryStore.getPaper(projectId, paperId);
      if (!paper) {
        return reply.code(404).send({ error: 'Paper not found' });
      }
      
      // Generate script using LLM
      const llm = getLLMProvider();
      const prompt = VIDEO_SCRIPT(paper);
      
      const response = await llm.chat(
        [{ role: 'user', content: prompt }],
        { maxTokens: 1000, temperature: 0.5 }
      );
      
      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON from LLM response');
      }
      
      const script: VideoScript = JSON.parse(jsonMatch[0]);
      
      log.info(`Generated video script with ${script.chapters.length} chapters`);
      
      return reply.send(script);
    } catch (error) {
      log.error('Video script generation failed', error);
      return reply.code(500).send({ error: String(error) });
    }
  });
}

