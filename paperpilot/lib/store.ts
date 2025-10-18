'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Project, Folder, Paper, Recommendation, ReadStat } from './types';

interface StoreState {
  projects: Project[];
  folders: Folder[];
  papers: Paper[];
  recs: Recommendation[];
  reads: ReadStat[];
  
  // Actions
  addProject: (project: Project) => void;
  addFolder: (folder: Folder) => void;
  addPaper: (paper: Paper) => void;
  swipe: (paperId: string, action: 'save' | 'skip', folderId?: string) => void;
  autosuggestFolder: (paperId: string) => string | null;
  markReadProgress: (paperId: string, seconds: number, scrollPct: number) => void;
  getPlaylistForFolder: (folderId: string) => Paper[];
  getTinderFeed: () => Paper[];
  getTodayMinutes: () => number;
  getStreak: () => number;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      projects: [],
      folders: [],
      papers: [],
      recs: [],
      reads: [],

      addProject: (project) =>
        set((state) => ({ projects: [...state.projects, project] })),

      addFolder: (folder) =>
        set((state) => ({ folders: [...state.folders, folder] })),

      addPaper: (paper) =>
        set((state) => ({ papers: [...state.papers, paper] })),

      swipe: (paperId, action, folderId) => {
        if (action === 'save' && folderId) {
          set((state) => ({
            papers: state.papers.map((p) =>
              p.id === paperId ? { ...p, folderId } : p
            ),
          }));
        }
        // Remove from tinder feed by marking as processed
        set((state) => ({
          recs: state.recs.filter((r) => r.paperId !== paperId),
        }));
      },

      autosuggestFolder: (paperId) => {
        const state = get();
        const paper = state.papers.find((p) => p.id === paperId);
        if (!paper) return null;

        // Simple fuzzy match: compute similarity between paper title and folder name/tags
        let bestFolderId: string | null = null;
        let bestScore = 0;

        state.folders.forEach((folder) => {
          const folderText = `${folder.name} ${folder.tags.join(' ')}`.toLowerCase();
          const paperText = paper.title.toLowerCase();

          // Count matching words
          const paperWords = paperText.split(/\s+/);
          const matchCount = paperWords.filter((word) =>
            folderText.includes(word)
          ).length;

          const score = paperWords.length > 0 ? matchCount / paperWords.length : 0;

          if (score > bestScore) {
            bestScore = score;
            bestFolderId = folder.id;
          }
        });

        // Return best match if score > 0.2, else null (ask user)
        return bestScore > 0.2 ? bestFolderId : null;
      },

      markReadProgress: (paperId, seconds, scrollPct) => {
        const today = new Date().toISOString().split('T')[0];
        set((state) => {
          const existing = state.reads.find(
            (r) => r.paperId === paperId && r.dateISO === today
          );
          if (existing) {
            return {
              reads: state.reads.map((r) =>
                r.paperId === paperId && r.dateISO === today
                  ? {
                      ...r,
                      secondsActive: r.secondsActive + seconds,
                      maxScrollPct: Math.max(r.maxScrollPct, scrollPct),
                    }
                  : r
              ),
            };
          } else {
            return {
              reads: [
                ...state.reads,
                { paperId, secondsActive: seconds, maxScrollPct: scrollPct, dateISO: today },
              ],
            };
          }
        });
      },

      getPlaylistForFolder: (folderId) => {
        const state = get();
        // Get papers recommended for this folder (mock: top 3 by score)
        const folderRecs = state.recs
          .filter((r) => r.suggestedFolderId === folderId && r.source === 'playlist')
          .sort((a, b) => b.score - a.score)
          .slice(0, 3);

        return folderRecs
          .map((rec) => state.papers.find((p) => p.id === rec.paperId))
          .filter(Boolean) as Paper[];
      },

      getTinderFeed: () => {
        const state = get();
        // Get papers from tinder/hot recommendations that aren't already saved
        const tinderRecs = state.recs
          .filter((r) => (r.source === 'tinder' || r.source === 'hot'))
          .sort((a, b) => b.score - a.score);

        return tinderRecs
          .map((rec) => state.papers.find((p) => p.id === rec.paperId))
          .filter((p) => p && !p.folderId) as Paper[];
      },

      getTodayMinutes: () => {
        const state = get();
        const today = new Date().toISOString().split('T')[0];
        const todayReads = state.reads.filter((r) => r.dateISO === today);
        const totalSeconds = todayReads.reduce((sum, r) => sum + r.secondsActive, 0);
        return Math.floor(totalSeconds / 60);
      },

      getStreak: () => {
        const state = get();
        // Calculate consecutive days with reads
        const dates = [...new Set(state.reads.map((r) => r.dateISO))].sort().reverse();
        
        if (dates.length === 0) return 0;

        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < dates.length; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(today.getDate() - i);
          const checkDateStr = checkDate.toISOString().split('T')[0];

          if (dates.includes(checkDateStr)) {
            streak++;
          } else {
            break;
          }
        }

        return streak;
      },
    }),
    {
      name: 'paperpilot-storage',
    }
  )
);

