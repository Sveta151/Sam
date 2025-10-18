// v1 Podcast routes

import type { FastifyInstance } from 'fastify';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { store } from '../store/fs-json.js';
import { getLLMProvider } from '../llm/index.js';
import { PODCAST_SCRIPT } from '../prompts.js';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';

const log = logger.child('route:podcast');

export async function podcastRoute(fastify: FastifyInstance) {
  // POST /v1/papers/:id/podcast - Generate podcast for a paper
  fastify.post<{
    Params: { id: string };
  }>('/v1/papers/:id/podcast', {
    schema: {
      tags: ['podcast'],
      description: 'Generate audio podcast summary for a paper',
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
            url: { type: 'string' },
            audioBase64: { type: 'string' },
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
      const { id: paperId } = request.params;

      log.info(`Generating podcast for paper ${paperId}`);

      // Get paper
      const paperData = await store.getPaper(paperId);
      if (!paperData) {
        return reply.code(404).send({
          error: 'Not Found',
          message: `Paper ${paperId} not found`,
        });
      }

      const paper = paperData.paper;

      // Generate script using LLM
      const llm = getLLMProvider();
      const prompt = PODCAST_SCRIPT(paper, 180);

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
        });
      }

      const audioBuffer = await generateAudio(script);

      // Save audio file
      const audioPath = join(store.getAudioDir(), `${paperId}.mp3`);
      await writeFile(audioPath, audioBuffer);

      log.info(`Podcast saved to ${audioPath} (${audioBuffer.length} bytes)`);

      return reply.send({
        url: `/audio/${paperId}.mp3`,
        audioBase64: audioBuffer.toString('base64'),
      });
    } catch (error) {
      log.error('Podcast generation failed', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: String(error),
      });
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

