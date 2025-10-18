import { Project, Folder, Paper, Recommendation } from './types';

export const mockProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'FDD Project',
    domainFocus: 'Diffusion Models & Full-Duplex',
  },
];

export const mockFolders: Folder[] = [
  {
    id: 'folder-1',
    name: 'Full Reciprocity',
    projectId: 'proj-1',
    tags: ['reciprocity', 'full-duplex', 'wireless'],
    centroid: [0.8, 0.3, 0.5],
  },
  {
    id: 'folder-2',
    name: 'Partial Reciprocity',
    projectId: 'proj-1',
    tags: ['partial', 'reciprocity', 'channel'],
    centroid: [0.6, 0.5, 0.4],
  },
  {
    id: 'folder-3',
    name: 'Diffusion Model',
    projectId: 'proj-1',
    tags: ['diffusion', 'generative', 'model'],
    centroid: [0.3, 0.7, 0.8],
  },
];

export const mockPapers: Paper[] = [
  {
    id: 'paper-1',
    title: 'Full-Duplex Wireless Communications: Challenges and Opportunities',
    authors: ['Zhang, J.', 'Liu, Y.', 'Wang, X.'],
    venue: 'IEEE Trans. Wireless Commun.',
    year: 2023,
    citations: 142,
    summary2: 'Comprehensive survey of full-duplex wireless systems. Discusses self-interference cancellation techniques and practical deployment challenges.',
    labels: ['full-duplex', 'wireless', 'survey'],
    folderId: 'folder-1',
  },
  {
    id: 'paper-2',
    title: 'Channel Reciprocity in Massive MIMO Systems',
    authors: ['Chen, S.', 'Li, M.'],
    venue: 'IEEE GLOBECOM',
    year: 2022,
    citations: 87,
    summary2: 'Analyzes channel reciprocity assumptions in massive MIMO. Proposes calibration methods for TDD systems with hardware impairments.',
    labels: ['reciprocity', 'MIMO', 'calibration'],
    folderId: 'folder-2',
  },
  {
    id: 'paper-3',
    title: 'Denoising Diffusion Probabilistic Models',
    authors: ['Ho, J.', 'Jain, A.', 'Abbeel, P.'],
    venue: 'NeurIPS',
    year: 2020,
    citations: 3421,
    summary2: 'Introduces DDPM framework for high-quality image synthesis. Demonstrates competitive performance with GANs using iterative denoising.',
    labels: ['diffusion', 'generative', 'deep-learning'],
    folderId: 'folder-3',
  },
  {
    id: 'paper-4',
    title: 'Self-Interference Cancellation in Full-Duplex Radios',
    authors: ['Kumar, A.', 'Patel, R.'],
    venue: 'IEEE Trans. Signal Process.',
    year: 2023,
    citations: 64,
    summary2: 'Novel digital cancellation algorithm for residual self-interference. Achieves 90dB isolation in practical hardware implementations.',
    labels: ['full-duplex', 'cancellation', 'signal-processing'],
  },
  {
    id: 'paper-5',
    title: 'Partial Channel Reciprocity Calibration for FDD Systems',
    authors: ['Wang, H.', 'Zhou, T.'],
    venue: 'IEEE ICASSP',
    year: 2023,
    citations: 31,
    summary2: 'Addresses partial reciprocity in FDD massive MIMO. Proposes low-overhead calibration using pilot contamination mitigation.',
    labels: ['FDD', 'reciprocity', 'calibration'],
  },
  {
    id: 'paper-6',
    title: 'Score-Based Generative Modeling through Stochastic Differential Equations',
    authors: ['Song, Y.', 'Sohl-Dickstein, J.', 'Kingma, D.P.'],
    venue: 'ICLR',
    year: 2021,
    citations: 1876,
    summary2: 'Unifies score-based models and diffusion models via SDEs. Enables flexible sampling and likelihood computation for generative tasks.',
    labels: ['diffusion', 'score-based', 'SDE'],
  },
];

export const mockRecommendations: Recommendation[] = [
  {
    id: 'rec-1',
    paperId: 'paper-4',
    source: 'tinder',
    score: 0.92,
    suggestedFolderId: 'folder-1',
  },
  {
    id: 'rec-2',
    paperId: 'paper-5',
    source: 'tinder',
    score: 0.88,
    suggestedFolderId: 'folder-2',
  },
  {
    id: 'rec-3',
    paperId: 'paper-6',
    source: 'hot',
    score: 0.95,
    suggestedFolderId: 'folder-3',
  },
  {
    id: 'rec-4',
    paperId: 'paper-4',
    source: 'playlist',
    score: 0.89,
    suggestedFolderId: 'folder-1',
  },
  {
    id: 'rec-5',
    paperId: 'paper-5',
    source: 'playlist',
    score: 0.85,
    suggestedFolderId: 'folder-2',
  },
  {
    id: 'rec-6',
    paperId: 'paper-6',
    source: 'playlist',
    score: 0.91,
    suggestedFolderId: 'folder-3',
  },
];

export function initializeMockData() {
  if (typeof window === 'undefined') return;
  
  const stored = localStorage.getItem('paperpilot-storage');
  if (!stored) {
    // First time: seed the store
    const initialState = {
      state: {
        projects: mockProjects,
        folders: mockFolders,
        papers: mockPapers,
        recs: mockRecommendations,
        reads: [],
      },
      version: 0,
    };
    localStorage.setItem('paperpilot-storage', JSON.stringify(initialState));
  }
}

