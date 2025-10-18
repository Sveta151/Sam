// POST /generate-video - Generate slideshow video from video script

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { memoryStore } from '../store/memory.js';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';
import type { VideoScript } from '../types.js';

const execAsync = promisify(exec);
const log = logger.child('route:generate-video');

const generateVideoSchema = z.object({
  paperId: z.string(),
  projectId: z.string().optional().default('default'),
  videoScript: z.object({
    title: z.string(),
    hook: z.string(),
    chapters: z.array(z.object({
      t: z.number(),
      heading: z.string(),
      bulletPoints: z.array(z.string()),
    })),
    outro: z.string(),
  }),
  duration: z.number().optional().default(60), // seconds per slide
});

export async function generateVideoRoute(fastify: FastifyInstance) {
  fastify.post<{
    Body: z.infer<typeof generateVideoSchema>;
  }>('/generate-video', async (request, reply) => {
    try {
      const { paperId, projectId, videoScript, duration } = generateVideoSchema.parse(request.body);
      
      log.info(`Generating video for paper ${paperId}`);
      
      // Get paper metadata
      const paper = await memoryStore.getPaper(projectId, paperId);
      if (!paper) {
        return reply.code(404).send({ error: 'Paper not found' });
      }
      
      const videoPath = join(env.DATA_DIR, 'video', `${paperId}.mp4`);
      const tempDir = join(env.DATA_DIR, 'video', 'temp');
      
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
      for (const chapter of videoScript.chapters) {
        const bulletText = chapter.bulletPoints
          .map((bp, i) => `  ${i + 1}. ${bp}`)
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
        videoPath,
        duration: totalDuration,
        slides: slides.length,
      });
    } catch (error) {
      log.error('Video generation failed', error);
      return reply.code(500).send({ error: String(error) });
    }
  });
}

