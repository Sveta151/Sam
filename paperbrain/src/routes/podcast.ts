// POST /podcast - Generate audio podcast summary

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { memoryStore } from '../store/memory.js';
import { getLLMProvider } from '../llm/index.js';
import { PODCAST_SCRIPT } from '../prompts.js';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';
import type { Message, PodcastResponse } from '../types.js';

const log = logger.child('route:podcast');

const podcastSchema = z.object({
  paperId: z.string(),
  style: z.enum(['neutral', 'explainer']).optional().default('neutral'),
  duration: z.number().optional().default(180),
  projectId: z.string().optional().default('default'),
});

export async function podcastRoute(fastify: FastifyInstance) {
  fastify.post<{
    Body: z.infer<typeof podcastSchema>;
  }>('/podcast', async (request, reply) => {
    try {
      const { paperId, duration, projectId } = podcastSchema.parse(request.body);
      
      log.info(`Generating podcast for paper ${paperId}`);
      
      // Get paper metadata
      const paper = await memoryStore.getPaper(projectId, paperId);
      if (!paper) {
        return reply.code(404).send({ error: 'Paper not found' });
      }
      
      // Generate script using LLM
      const llm = getLLMProvider();
      const prompt = PODCAST_SCRIPT(paper, duration);
      
      const script = await llm.chat(
        [{ role: 'user', content: prompt }],
        { maxTokens: 1500, temperature: 0.7 }
      );
      
      log.info(`Generated podcast script (${script.length} chars)`);
      
      // Generate audio with ElevenLabs
      if (!env.ELEVENLABS_API_KEY) {
        // Return script only if no TTS key
        log.warn('ELEVENLABS_API_KEY not set, returning script only');
        return reply.send({
          url: 'script-only',
          bytesLength: script.length,
          script,
        });
      }
      
      const audioBuffer = await generateAudio(script);
      
      // Save audio file
      const audioPath = join(env.DATA_DIR, 'audio', `${paperId}.mp3`);
      await writeFile(audioPath, audioBuffer);
      
      const response: PodcastResponse = {
        url: audioPath,
        bytesLength: audioBuffer.length,
      };
      
      log.info(`Podcast saved to ${audioPath} (${audioBuffer.length} bytes)`);
      
      return reply.send(response);
    } catch (error) {
      log.error('Podcast generation failed', error);
      return reply.code(500).send({ error: String(error) });
    }
  });
}

async function generateAudio(text: string): Promise<Buffer> {
  const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': env.ELEVENLABS_API_KEY!,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5,
      },
    }),
  });
  
  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

