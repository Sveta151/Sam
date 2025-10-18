// Filesystem-backed JSON store implementation

import { readFile, writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { Store, PaperFilter } from './index.js';
import type { Project, Folder, Paper, Chunk, MetaData, PaperData } from '../types.js';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';

const log = logger.child('store:fs-json');

export class FSJSONStore implements Store {
  private dataDir: string;
  private metaPath: string;
  private papersDir: string;
  private filesDir: string;
  private audioDir: string;
  private videoDir: string;

  constructor() {
    this.dataDir = env.DATA_DIR;
    this.metaPath = join(this.dataDir, 'meta.json');
    this.papersDir = join(this.dataDir, 'papers');
    this.filesDir = join(this.dataDir, 'files');
    this.audioDir = join(this.dataDir, 'audio');
    this.videoDir = join(this.dataDir, 'video');
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    for (const dir of [this.dataDir, this.papersDir, this.filesDir, this.audioDir, this.videoDir]) {
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
        log.info(`Created directory: ${dir}`);
      }
    }
  }

  // ============ Meta Operations ============

  async loadMeta(): Promise<MetaData> {
    try {
      if (!existsSync(this.metaPath)) {
        const emptyMeta: MetaData = { projects: [], folders: [], papers: [] };
        await this.saveMeta(emptyMeta);
        return emptyMeta;
      }

      const data = await readFile(this.metaPath, 'utf-8');
      return JSON.parse(data) as MetaData;
    } catch (error) {
      log.error('Failed to load meta', error);
      throw error;
    }
  }

  async saveMeta(meta: MetaData): Promise<void> {
    try {
      await writeFile(this.metaPath, JSON.stringify(meta, null, 2), 'utf-8');
      log.debug(`Saved meta: ${meta.projects.length} projects, ${meta.folders.length} folders, ${meta.papers.length} papers`);
    } catch (error) {
      log.error('Failed to save meta', error);
      throw error;
    }
  }

  // ============ Paper Operations ============

  async getPaper(paperId: string): Promise<PaperData | null> {
    try {
      const paperPath = join(this.papersDir, `${paperId}.json`);
      if (!existsSync(paperPath)) {
        return null;
      }

      const data = await readFile(paperPath, 'utf-8');
      return JSON.parse(data) as PaperData;
    } catch (error) {
      log.error(`Failed to get paper ${paperId}`, error);
      throw error;
    }
  }

  async upsertPaper(paper: Paper, chunks: Chunk[]): Promise<void> {
    try {
      // Save paper + chunks
      const paperData: PaperData = { paper, chunks };
      const paperPath = join(this.papersDir, `${paper.id}.json`);
      await writeFile(paperPath, JSON.stringify(paperData, null, 2), 'utf-8');

      // Update meta
      const meta = await this.loadMeta();
      const existingIndex = meta.papers.findIndex(p => p.id === paper.id);
      if (existingIndex >= 0) {
        meta.papers[existingIndex] = paper;
      } else {
        meta.papers.push(paper);
      }
      await this.saveMeta(meta);

      log.info(`Upserted paper ${paper.id} with ${chunks.length} chunks`);
    } catch (error) {
      log.error(`Failed to upsert paper ${paper.id}`, error);
      throw error;
    }
  }

  async listPapers(filter: PaperFilter): Promise<Paper[]> {
    try {
      const meta = await this.loadMeta();
      let papers = meta.papers;

      // Filter by projectId
      if (filter.projectId) {
        papers = papers.filter(p => p.projectId === filter.projectId);
      }

      // Filter by folderId
      if (filter.folderId) {
        if (filter.includeSubfolders) {
          // Get all descendant folder IDs
          const folderIds = await this.getDescendantFolderIds(filter.folderId, meta.folders);
          folderIds.push(filter.folderId);
          papers = papers.filter(p => p.folderId && folderIds.includes(p.folderId));
        } else {
          papers = papers.filter(p => p.folderId === filter.folderId);
        }
      }

      return papers;
    } catch (error) {
      log.error('Failed to list papers', error);
      throw error;
    }
  }

  async movePaper(paperId: string, folderId?: string): Promise<void> {
    try {
      const meta = await this.loadMeta();
      const paper = meta.papers.find(p => p.id === paperId);
      if (!paper) {
        throw new Error(`Paper ${paperId} not found`);
      }

      paper.folderId = folderId;
      await this.saveMeta(meta);
      log.info(`Moved paper ${paperId} to folder ${folderId || 'root'}`);
    } catch (error) {
      log.error(`Failed to move paper ${paperId}`, error);
      throw error;
    }
  }

  async deletePaper(paperId: string): Promise<void> {
    try {
      // Remove from meta
      const meta = await this.loadMeta();
      meta.papers = meta.papers.filter(p => p.id !== paperId);
      await this.saveMeta(meta);

      // Remove paper file
      const paperPath = join(this.papersDir, `${paperId}.json`);
      if (existsSync(paperPath)) {
        await unlink(paperPath);
      }

      // Remove PDF file
      const pdfPath = join(this.filesDir, `${paperId}.pdf`);
      if (existsSync(pdfPath)) {
        await unlink(pdfPath);
      }

      // Remove audio file
      const audioPath = join(this.audioDir, `${paperId}.mp3`);
      if (existsSync(audioPath)) {
        await unlink(audioPath);
      }

      // Remove video file
      const videoPath = join(this.videoDir, `${paperId}.mp4`);
      if (existsSync(videoPath)) {
        await unlink(videoPath);
      }

      log.info(`Deleted paper ${paperId} and associated files`);
    } catch (error) {
      log.error(`Failed to delete paper ${paperId}`, error);
      throw error;
    }
  }

  // ============ Chunk Operations ============

  async getChunks(paperId: string, offset = 0, limit = 50): Promise<{ total: number; items: Chunk[] }> {
    try {
      const paperData = await this.getPaper(paperId);
      if (!paperData) {
        return { total: 0, items: [] };
      }

      const total = paperData.chunks.length;
      const items = paperData.chunks.slice(offset, offset + limit);
      return { total, items };
    } catch (error) {
      log.error(`Failed to get chunks for paper ${paperId}`, error);
      throw error;
    }
  }

  // ============ Helper Methods ============

  private async getDescendantFolderIds(folderId: string, folders: Folder[]): Promise<string[]> {
    const descendants: string[] = [];
    const queue = [folderId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = folders.filter(f => f.parentId === currentId);
      for (const child of children) {
        descendants.push(child.id);
        queue.push(child.id);
      }
    }

    return descendants;
  }

  // ============ Public Getters ============

  getFilesDir(): string {
    return this.filesDir;
  }

  getAudioDir(): string {
    return this.audioDir;
  }

  getVideoDir(): string {
    return this.videoDir;
  }
}

// Singleton instance
export const store = new FSJSONStore();

