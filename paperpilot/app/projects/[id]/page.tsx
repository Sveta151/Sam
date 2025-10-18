'use client';

import { useState, use, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { FolderTree } from '@/components/folder-tree';
import { PlaylistThree } from '@/components/playlist-three';
import { PaperCard } from '@/components/paper-card';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const projects = useStore((state) => state.projects);
  const folders = useStore((state) => state.folders);
  const papers = useStore((state) => state.papers);
  const recs = useStore((state) => state.recs);

  const [selectedFolderId, setSelectedFolderId] = useState<string>('');

  const project = projects.find((p) => p.id === id);
  const projectFolders = folders.filter((f) => f.projectId === id);
  
  const selectedFolder = selectedFolderId 
    ? folders.find((f) => f.id === selectedFolderId)
    : null;

  const folderPapers = selectedFolderId
    ? papers.filter((p) => p.folderId === selectedFolderId)
    : [];

  const playlistPapers = useMemo(() => {
    if (!selectedFolderId) return [];
    
    const folderRecs = recs
      .filter((r) => r.suggestedFolderId === selectedFolderId && r.source === 'playlist')
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return folderRecs
      .map((rec) => papers.find((p) => p.id === rec.paperId))
      .filter(Boolean);
  }, [selectedFolderId, recs, papers]);

  if (!project) {
    return (
      <div className="content-grid">
        <div className="col-span-12 text-center py-12">
          <p className="text-muted-foreground">Project not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content-grid">
      {/* Left: Folder Tree (spans 3 columns) */}
      <div className="col-span-3">
        <Card className="p-4 border-border/40">
          <div className="mb-4">
            <h2 className="font-semibold text-lg mb-1">{project.name}</h2>
            <p className="text-sm text-muted-foreground">{project.domainFocus}</p>
          </div>
          
          <Separator className="my-4" />
          
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Folders
            </h3>
            <FolderTree
              folders={projectFolders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
            />
          </div>
        </Card>
      </div>

      {/* Center: Papers List (spans 6 columns) */}
      <div className="col-span-6">
        {selectedFolder ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">{selectedFolder.name}</h2>
              <p className="text-sm text-muted-foreground">
                {folderPapers.length} paper{folderPapers.length !== 1 ? 's' : ''}
              </p>
            </div>

            {folderPapers.length > 0 ? (
              <div className="space-y-3">
                {folderPapers.map((paper) => (
                  <PaperCard key={paper.id} paper={paper} mode="compact" />
                ))}
              </div>
            ) : (
              <Card className="p-8 border-border/40 text-center">
                <p className="text-muted-foreground">
                  No papers in this folder yet
                </p>
              </Card>
            )}
          </div>
        ) : (
          <Card className="p-8 border-border/40 text-center">
            <p className="text-muted-foreground">
              Select a folder to view papers
            </p>
          </Card>
        )}
      </div>

      {/* Right: Playlist & Actions (spans 3 columns) */}
      <div className="col-span-3 space-y-6">
        {selectedFolderId && (
          <>
            <PlaylistThree papers={playlistPapers} />
            
            <Card className="p-6 border-border/40">
              <h3 className="font-semibold mb-3">Actions</h3>
              <Button 
                className="w-full" 
                variant="outline" 
                disabled
              >
                Synthesize (Coming Soon)
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Generate insights from papers in this folder
              </p>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

