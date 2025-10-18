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

