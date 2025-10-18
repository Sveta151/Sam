export interface Project {
  id: string;
  name: string;
  domainFocus: string;
}

export interface Folder {
  id: string;
  name: string;
  projectId: string;
  parentId?: string;
  tags: string[];
  centroid?: number[];
}

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  venue?: string;
  year?: number;
  citations?: number;
  summary2?: string;
  labels?: string[];
  folderId?: string;
  // When a paper is saved at the project root (no folder)
  projectId?: string;
  // Optional local preview information when user uploads files
  fileUrl?: string; // blob or http(s) url for preview
  mimeType?: string;
  originalFileName?: string;
  sizeBytes?: number;
  // Persisted data URL for reliable preview across reloads
  fileDataUrl?: string;
}

export interface Recommendation {
  id: string;
  paperId: string;
  source: 'playlist' | 'tinder' | 'hot';
  score: number;
  suggestedFolderId?: string;
}

export interface ReadStat {
  paperId: string;
  secondsActive: number;
  maxScrollPct: number;
  dateISO: string;
}

