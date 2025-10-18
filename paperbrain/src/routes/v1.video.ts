// v1 Video routes

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { store } from '../store/fs-json.js';
import { getLLMProvider } from '../llm/index.js';
import { VIDEO_SCRIPT } from '../prompts.js';
import { logger } from '../utils/logger.js';
import type { VideoScript } from '../types.js';

const execAsync = promisify(exec);
const log = logger.child('route:video');

export async function videoRoute(fastify: FastifyInstance) {
  // POST /v1/papers/:id/video-script - Generate video script
  fastify.post<{
    Params: { id: string };
  }>('/v1/papers/:id/video-script', {
    schema: {
      tags: ['video'],
      description: 'Generate video script for a paper',
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
            title: { type: 'string' },
            hook: { type: 'string' },
            chapters: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  t: { type: 'number' },
                  heading: { type: 'string' },
                  bulletPoints: { type: 'array', items: { type: 'string' } },
                },
              },
            },
            outro: { type: 'string' },
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

      log.info(`Generating video script for paper ${paperId}`);

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
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: String(error),
      });
    }
  });

  // POST /v1/papers/:id/generate-video - Generate video
  fastify.post<{
    Params: { id: string };
    Body: { includeAudio?: boolean };
  }>('/v1/papers/:id/generate-video', {
    schema: {
      tags: ['video'],
      description: 'Generate video for a paper',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          includeAudio: { type: 'boolean' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            url: { type: 'string' },
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
      const { includeAudio } = request.body || {};

      log.info(`Generating video for paper ${paperId}`);

      // Get paper
      const paperData = await store.getPaper(paperId);
      if (!paperData) {
        return reply.code(404).send({
          error: 'Not Found',
          message: `Paper ${paperId} not found`,
        });
      }

      const paper = paperData.paper;

      // First, generate video script
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

      const videoScript: VideoScript = JSON.parse(jsonMatch[0]);

      const videoPath = join(store.getVideoDir(), `${paperId}.mp4`);
      const tempDir = join(store.getVideoDir(), 'temp');

      // Create temp directory
      await execAsync(`mkdir -p "${tempDir}"`);

      // Generate slides as text files for ffmpeg
      const slides: Array<{ text: string; duration: number }> = [];

      // Title slide
      slides.push({
        text: `${videoScript.title}\\n\\n${paper.authors.join(', ')}`,
        duration: 5,
      });

      // Hook slide
      slides.push({
        text: videoScript.hook,
        duration: 3,
      });

      // Chapter slides
      const duration = 60;
      for (const chapter of videoScript.chapters) {
        const bulletText = chapter.bulletPoints
          .map((bp: string, i: number) => `  ${i + 1}. ${bp}`)
          .join('\\n');

        slides.push({
          text: `${chapter.heading}\\n\\n${bulletText}`,
          duration: duration / videoScript.chapters.length,
        });
      }

      // Outro slide
      slides.push({
        text: videoScript.outro,
        duration: 3,
      });

      log.info(`Creating ${slides.length} slides`);

      // Build ffmpeg command with drawtext filters
      const filters: string[] = [];
      let currentTime = 0;

      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const escapedText = slide.text
          .replace(/'/g, "'\\\\\\''")
          .replace(/:/g, '\\\\:');

        // Create a drawtext filter for each slide with fade in/out
        filters.push(
          `drawtext=` +
          `fontfile=/System/Library/Fonts/Helvetica.ttc:` +
          `text='${escapedText}':` +
          `fontcolor=white:` +
          `fontsize=48:` +
          `box=1:` +
          `boxcolor=black@0.7:` +
          `boxborderw=20:` +
          `x=(w-text_w)/2:` +
          `y=(h-text_h)/2:` +
          `enable='between(t,${currentTime},${currentTime + slide.duration})'`
        );

        currentTime += slide.duration;
      }

      const totalDuration = currentTime;
      const filterComplex = filters.join(',');

      // Generate video with ffmpeg
      const ffmpegCmd = `ffmpeg -y \\
        -f lavfi -i color=c=black:s=1920x1080:d=${totalDuration} \\
        -vf "${filterComplex}" \\
        -c:v libx264 \\
        -preset fast \\
        -pix_fmt yuv420p \\
        -r 30 \\
        "${videoPath}"`;

      log.info('Running ffmpeg...');
      await execAsync(ffmpegCmd);

      // Cleanup temp files
      await execAsync(`rm -rf "${tempDir}"`);

      log.info(`Video saved to ${videoPath}`);

      return reply.send({
        url: `/video/${paperId}.mp4`,
      });
    } catch (error) {
      log.error('Video generation failed', error);
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: String(error),
      });
    }
  });
}

