// In-memory vector store with filesystem persistence

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import type { Paper, Chunk, ProjectStore } from '../types.js';
import { env } from '../env.js';
import { logger } from '../utils/logger.js';

const log = logger.child('store');

class MemoryStore {
  private stores: Map<string, ProjectStore> = new Map();
  private dataDir: string;

  constructor() {
    this.dataDir = env.DATA_DIR;
    this.ensureDataDir();
  }

  private async ensureDataDir() {
    if (!existsSync(this.dataDir)) {
      await mkdir(this.dataDir, { recursive: true });
      log.info(`Created data directory: ${this.dataDir}`);
    }
  }

  private getStorePath(projectId: string): string {
    return join(this.dataDir, `${projectId}.json`);
  }

  /**
   * Load a project store from disk or create new
   */
  async loadProject(projectId: string): Promise<ProjectStore> {
    if (this.stores.has(projectId)) {
      return this.stores.get(projectId)!;
    }

    const storePath = this.getStorePath(projectId);
    
    if (existsSync(storePath)) {
      log.info(`Loading project ${projectId} from disk`);
      const data = await readFile(storePath, 'utf-8');
      const store: ProjectStore = JSON.parse(data);
      this.stores.set(projectId, store);
      return store;
    }

    // Create new store
    log.info(`Creating new project store: ${projectId}`);
    const store: ProjectStore = { papers: [], chunks: [] };
    this.stores.set(projectId, store);
    return store;
  }

  /**
   * Save a project store to disk
   */
  async saveProject(projectId: string): Promise<void> {
    const store = this.stores.get(projectId);
    if (!store) {
      throw new Error(`Project ${projectId} not found in memory`);
    }

    const storePath = this.getStorePath(projectId);
    await writeFile(storePath, JSON.stringify(store, null, 2), 'utf-8');
    log.info(`Saved project ${projectId} to disk (${store.papers.length} papers, ${store.chunks.length} chunks)`);
  }

  /**
   * Add a paper and its chunks to a project
   */
  async addPaper(projectId: string, paper: Paper, chunks: Chunk[]): Promise<void> {
    const store = await this.loadProject(projectId);
    
    // Check if paper already exists
    const existingIndex = store.papers.findIndex(p => p.id === paper.id);
    if (existingIndex >= 0) {
      // Replace existing paper
      store.papers[existingIndex] = paper;
      // Remove old chunks
      store.chunks = store.chunks.filter(c => c.paperId !== paper.id);
    } else {
      store.papers.push(paper);
    }
    
    store.chunks.push(...chunks);
    
    await this.saveProject(projectId);
  }

  /**
   * Get a paper by ID
   */
  async getPaper(projectId: string, paperId: string): Promise<Paper | null> {
    const store = await this.loadProject(projectId);
    return store.papers.find(p => p.id === paperId) || null;
  }

  /**
   * Get all papers in a project
   */
  async getPapers(projectId: string, paperIds?: string[]): Promise<Paper[]> {
    const store = await this.loadProject(projectId);
    if (!paperIds) {
      return store.papers;
    }
    return store.papers.filter(p => paperIds.includes(p.id));
  }

  /**
   * Get chunks for a paper
   */
  async getChunks(projectId: string, paperId: string): Promise<Chunk[]> {
    const store = await this.loadProject(projectId);
    return store.chunks.filter(c => c.paperId === paperId);
  }

  /**
   * Get all chunks for multiple papers
   */
  async getAllChunks(projectId: string, paperIds?: string[]): Promise<Chunk[]> {
    const store = await this.loadProject(projectId);
    if (!paperIds) {
      return store.chunks;
    }
    return store.chunks.filter(c => paperIds.includes(c.paperId));
  }

  /**
   * Update chunk embeddings
   */
  async updateChunkEmbeddings(projectId: string, chunkId: string, embedding: number[]): Promise<void> {
    const store = await this.loadProject(projectId);
    const chunk = store.chunks.find(c => c.id === chunkId);
    if (!chunk) {
      throw new Error(`Chunk ${chunkId} not found`);
    }
    chunk.embedding = embedding;
    // Note: We'll save in batch after all embeddings are updated
  }

  /**
   * Get store statistics
   */
  async getStats(projectId: string): Promise<{ papers: number; chunks: number }> {
    const store = await this.loadProject(projectId);
    return {
      papers: store.papers.length,
      chunks: store.chunks.length,
    };
  }
}

// Singleton instance
export const memoryStore = new MemoryStore();

