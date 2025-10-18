// Core data types for paperbrain

import { z } from 'zod';

// ============ Zod Schemas ============

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  domainFocus: z.string().optional(),
});

export const FolderSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  parentId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const PaperSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  folderId: z.string().optional(),
  title: z.string(),
  authors: z.array(z.string()),
  venue: z.string().optional(),
  year: z.number().optional(),
  citations: z.number().optional(),
  sourcePath: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const ChunkSchema = z.object({
  id: z.string(),
  paperId: z.string(),
  text: z.string(),
  index: z.number(),
  tokens: z.number(),
  embedding: z.array(z.number()),
});

export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

export const CitationSchema = z.object({
  paperId: z.string(),
  chunkIndex: z.number(),
});

export const ChatRequestSchema = z.object({
  paperId: z.string(),
  messages: z.array(MessageSchema),
  topK: z.number().optional().default(8),
});

export const ChatResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(CitationSchema),
});

export const SynthRequestSchema = z.object({
  projectId: z.string().optional(),
  paperIds: z.array(z.string()).min(3).max(10),
});

export const SynthResponseSchema = z.object({
  storyline: z.string(),
  deltas: z.string(),
  tableMarkdown: z.string(),
});

export const VideoChapterSchema = z.object({
  t: z.number(),
  heading: z.string(),
  bulletPoints: z.array(z.string()),
});

export const VideoScriptResponseSchema = z.object({
  title: z.string(),
  hook: z.string(),
  chapters: z.array(VideoChapterSchema),
  outro: z.string(),
});

export const PodcastResponseSchema = z.object({
  url: z.string(),
});

export const VideoResponseSchema = z.object({
  url: z.string(),
});

export const IngestResponseSchema = z.object({
  paper: PaperSchema,
  chunks: z.number(),
});

// ============ TypeScript Types ============

export type Project = z.infer<typeof ProjectSchema>;
export type Folder = z.infer<typeof FolderSchema>;
export type Paper = z.infer<typeof PaperSchema>;
export type Chunk = z.infer<typeof ChunkSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type Citation = z.infer<typeof CitationSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export type SynthRequest = z.infer<typeof SynthRequestSchema>;
export type SynthResponse = z.infer<typeof SynthResponseSchema>;
export type VideoChapter = z.infer<typeof VideoChapterSchema>;
export type VideoScriptResponse = z.infer<typeof VideoScriptResponseSchema>;
export type PodcastResponse = z.infer<typeof PodcastResponseSchema>;
export type VideoResponse = z.infer<typeof VideoResponseSchema>;
export type IngestResponse = z.infer<typeof IngestResponseSchema>;

// ============ Store Types ============

export interface MetaData {
  projects: Project[];
  folders: Folder[];
  papers: Paper[];
}

export interface PaperData {
  paper: Paper;
  chunks: Chunk[];
}

export interface RetrievalResult {
  chunk: Chunk;
  score: number;
}

// Legacy types for backward compatibility
export interface ProjectStore {
  papers: Paper[];
  chunks: Chunk[];
}

export interface SynthReport {
  folderId: string;
  storyline: string;
  deltas: string;
  tableMarkdown: string;
}

export type VideoScript = VideoScriptResponse;

