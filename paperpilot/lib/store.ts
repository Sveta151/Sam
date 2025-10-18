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
  addPapersFromFiles: (
    files: File[],
    targetFolderId: string,
    projectId: string
  ) => void;
  deleteProject: (projectId: string) => void;
  deletePaper: (paperId: string) => void;
  deleteFolder: (folderId: string) => void;
  swipe: (
    paperId: string,
    action: 'save' | 'skip',
    folderId?: string,
    projectId?: string
  ) => void;
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

      addPapersFromFiles: (files, targetFolderId, projectId) =>
        set((state) => {
          const ensureFolder = (
            name: string,
            parentId: string | undefined
          ): string => {
            const existing = state.folders.find(
              (f) => f.name === name && f.parentId === parentId && f.projectId === projectId
            );
            if (existing) return existing.id;
            const newId = crypto.randomUUID();
            state.folders.push({
              id: newId,
              name,
              projectId,
              parentId,
              tags: [],
            });
            return newId;
          };

          const newPapers: Paper[] = [];

          const fileToDataUrl = (file: File): Promise<string> =>
            new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve((reader.result as string) || '');
              reader.readAsDataURL(file);
            });

          // We cannot await here in set callback; gather sync and fill dataUrl later
          files.forEach((file: File & { webkitRelativePath?: string }) => {
            let folderId = targetFolderId;
            const relative = file.webkitRelativePath || '';
            if (relative && relative.includes('/')) {
              // Build nested folders under selected folder for directory uploads
              const parts = relative.split('/');
              // Drop last part (filename)
              parts.pop();
              let currentParent = targetFolderId || undefined;
              parts.forEach((segment) => {
                if (!segment) return;
                const id = ensureFolder(segment, currentParent);
                currentParent = id;
                folderId = id;
              });
            }

            const id = crypto.randomUUID();
            const titleFromName = file.name.replace(/\.[^/.]+$/, '');
            const url = URL.createObjectURL(file);

            newPapers.push({
              id,
              title: titleFromName,
              authors: [],
              folderId: folderId || undefined,
              projectId,
              fileUrl: url,
              mimeType: file.type,
              originalFileName: file.name,
              sizeBytes: file.size,
            });

            // Persist a data URL asynchronously for in-session preview only.
            // Guard against exceeding localStorage quota by stripping heavy fields during persistence (see partialize below)
            fileToDataUrl(file).then((dataUrl) => {
              try {
                set((inner) => ({
                  papers: inner.papers.map((p) => (p.id === id ? { ...p, fileDataUrl: dataUrl } : p)),
                }));
              } catch (err) {
                // QuotaExceeded or other storage errors should not break uploads; keep working without persisted previews
                console.warn('[paperpilot] Skipping persisted preview due to storage error', err);
              }
            });
          });

          return {
            folders: state.folders,
            papers: [...state.papers, ...newPapers],
          };
        }),

      deleteProject: (projectId) =>
        set((state) => {
          const remainingFolders = state.folders.filter((f) => f.projectId !== projectId);
          const deletedFolderIds = new Set(
            state.folders.filter((f) => f.projectId === projectId).map((f) => f.id)
          );
          const remainingPapers = state.papers.filter(
            (p) => !deletedFolderIds.has(p.folderId || '') && p.projectId !== projectId
          );
          const remainingRecs = state.recs.filter((r) => remainingPapers.some((p) => p.id === r.paperId));
          return {
            projects: state.projects.filter((p) => p.id !== projectId),
            folders: remainingFolders,
            papers: remainingPapers,
            recs: remainingRecs,
          };
        }),

      deletePaper: (paperId) =>
        set((state) => ({
          papers: state.papers.filter((p) => p.id !== paperId),
          recs: state.recs.filter((r) => r.paperId !== paperId),
        })),

      deleteFolder: (folderId) =>
        set((state) => {
          // Collect all descendant folders
          const collect = (id: string, all: string[]) => {
            all.push(id);
            state.folders
              .filter((f) => f.parentId === id)
              .forEach((f) => collect(f.id, all));
            return all;
          };
          const toDelete = collect(folderId, []);
          const keepFolders = state.folders.filter((f) => !toDelete.includes(f.id));
          const keepPapers = state.papers.filter((p) => !toDelete.includes(p.folderId || ''));
          const keepRecs = state.recs.filter((r) => keepPapers.some((p) => p.id === r.paperId));
          return { folders: keepFolders, papers: keepPapers, recs: keepRecs };
        }),

      swipe: (paperId, action, folderId, projectId) => {
        if (action === 'save') {
          set((state) => {
            let targetProjectId = projectId;
            if (!targetProjectId && folderId) {
              const folder = state.folders.find((f) => f.id === folderId);
              targetProjectId = folder?.projectId;
            }
            return {
              papers: state.papers.map((p) =>
                p.id === paperId
                  ? {
                      ...p,
                      folderId: folderId || undefined,
                      projectId: targetProjectId || p.projectId,
                    }
                  : p
              ),
            };
          });
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
          .filter((p) => p && !(p.folderId || p.projectId)) as Paper[];
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
      // Exclude large/ephemeral fields from persistence to avoid localStorage quota issues
      partialize: (state) => ({
        projects: state.projects,
        folders: state.folders,
        recs: state.recs,
        reads: state.reads,
        papers: state.papers.map(({ fileDataUrl, fileUrl, ...rest }) => rest),
      }),
    }
  )
);

