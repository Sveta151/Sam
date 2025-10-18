// Core data types for paperbrain

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  venue?: string;
  year?: number;
  citations?: number;
  sourcePath?: string;
}

export interface Chunk {
  id: string;
  paperId: string;
  text: string;
  index: number;
  tokens: number;
  embedding: number[];
}

export interface Project {
  id: string;
  name: string;
  folder?: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface SynthReport {
  folderId: string;
  storyline: string;
  deltas: string;
  tableMarkdown: string;
}

export interface Citation {
  paperId: string;
  chunkIndex: number;
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];
}

export interface IngestResponse {
  paperId: string;
  chunks: number;
}

export interface PodcastResponse {
  url: string;
  bytesLength: number;
}

export interface VideoScript {
  title: string;
  hook: string;
  chapters: VideoChapter[];
  outro: string;
}

export interface VideoChapter {
  t: number;
  heading: string;
  bulletPoints: string[];
}

export interface ProjectStore {
  papers: Paper[];
  chunks: Chunk[];
}

export interface RetrievalResult {
  chunk: Chunk;
  score: number;
}

