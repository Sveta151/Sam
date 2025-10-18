// Store interface for paperbrain data persistence

import type { Project, Folder, Paper, Chunk, MetaData, PaperData } from '../types.js';

export interface PaperFilter {
  projectId?: string;
  folderId?: string;
  includeSubfolders?: boolean;
}

export interface Store {
  // Meta operations
  loadMeta(): Promise<MetaData>;
  saveMeta(meta: MetaData): Promise<void>;

  // Paper operations
  getPaper(paperId: string): Promise<PaperData | null>;
  upsertPaper(paper: Paper, chunks: Chunk[]): Promise<void>;
  listPapers(filter: PaperFilter): Promise<Paper[]>;
  movePaper(paperId: string, folderId?: string): Promise<void>;
  deletePaper(paperId: string): Promise<void>;

  // Chunk operations
  getChunks(paperId: string, offset?: number, limit?: number): Promise<{ total: number; items: Chunk[] }>;
}

