'use client';

import { useState, use, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { FolderTree } from '@/components/folder-tree';
import { PlaylistThree } from '@/components/playlist-three';
import { PaperCard } from '@/components/paper-card';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const projects = useStore((state) => state.projects);
  const folders = useStore((state) => state.folders);
  const papers = useStore((state) => state.papers);
  const recs = useStore((state) => state.recs);
  const deleteProject = useStore((state) => state.deleteProject);

  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<'all' | 'folder'>('folder');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dirInputRef = useRef<HTMLInputElement | null>(null);

  const project = projects.find((p) => p.id === id);
  const projectFolders = folders.filter((f) => f.projectId === id);
  const folderCounts = useMemo(() => {
    const byParent: Record<string, string[]> = {};
    projectFolders.forEach((f) => {
      const key = f.parentId || '__root__';
      (byParent[key] ||= []).push(f.id);
    });

    // Collect descendants for a given folder id
    const collect = (fid: string, acc: Set<string>) => {
      acc.add(fid);
      (byParent[fid] || []).forEach((child) => collect(child, acc));
      return acc;
    };

    const counts: Record<string, number> = {};
    projectFolders.forEach((f) => {
      const ids = Array.from(collect(f.id, new Set<string>()));
      counts[f.id] = papers.filter((p) => p.folderId && ids.includes(p.folderId)).length;
    });
    return counts;
  }, [projectFolders, papers]);
  
  const selectedFolder = selectedFolderId 
    ? folders.find((f) => f.id === selectedFolderId)
    : null;

  const folderPapers = selectedFolderId
    ? papers.filter((p) => p.folderId === selectedFolderId)
    : papers.filter((p) => p.projectId === id && !p.folderId);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const paperMatches = (p: typeof papers[number]) => {
    if (!normalizedQuery) return true;
    const hay = `${p.title} ${(p.authors||[]).join(' ')} ${(p.labels||[]).join(' ')}`.toLowerCase();
    return hay.includes(normalizedQuery);
  };

  const scopedPapers = searchScope === 'folder'
    ? folderPapers
    : papers.filter((p) => p.projectId === id || projectFolders.some((f) => f.id === p.folderId));

  const visiblePapers = (selectedFolderId || searchScope === 'all')
    ? scopedPapers.filter(paperMatches)
    : [];

  const playlistPapers = useMemo(() => {
    if (!selectedFolderId) return [];
    
    const folderRecs = recs
      .filter((r) => r.suggestedFolderId === selectedFolderId && r.source === 'playlist')
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return folderRecs
      .map((rec) => papers.find((p) => p.id === rec.paperId))
      .filter((p): p is typeof papers[number] => Boolean(p));
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
            <Button
              variant="destructive"
              className="w-full mt-3"
              onClick={() => {
                const ok = window.confirm(`Delete project "${project.name}"? This removes all folders and papers in it.`);
                if (!ok) return;
                deleteProject(project.id);
                toast.success('Project deleted');
                router.push('/projects');
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete project
            </Button>
          </div>
          
          <Separator className="my-4" />
          
          <div className="space-y-3">
            <Input
              placeholder="Search folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Folders
            </h3>
            <FolderTree
              folders={projectFolders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={setSelectedFolderId}
              query={searchQuery}
              counts={folderCounts}
            />
            {selectedFolder && (
              <Button
                variant="destructive"
                className="w-full mt-2"
                onClick={() => {
                  useStore.getState().deleteFolder(selectedFolder.id);
                  setSelectedFolderId('');
                  toast.success('Folder deleted');
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete folder
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Center: Papers List (spans 6 columns) */}
      <div className="col-span-6">
        {selectedFolder ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">{selectedFolder.name}</h2>
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  {folderPapers.length} paper{folderPapers.length !== 1 ? 's' : ''}
                </p>
                <Tabs
                  value={searchScope}
                  onValueChange={(v) => setSearchScope(v === 'all' ? 'all' : 'folder')}
                >
                  <TabsList>
                    <TabsTrigger value="folder">Folder</TabsTrigger>
                    <TabsTrigger value="all">All in project</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="ml-auto flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    hidden
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      useStore.getState().addPapersFromFiles(files, selectedFolderId, project.id);
                      toast.success(`Uploaded ${files.length} file(s)`);
                      e.currentTarget.value = '';
                    }}
                  />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Upload files</Button>
                  <input
                    ref={dirInputRef}
                    type="file"
                  // @ts-expect-error non-standard attribute supported by Chromium-based and Safari
                    webkitdirectory=""
                    directory=""
                    multiple
                    hidden
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      useStore.getState().addPapersFromFiles(files as File[], selectedFolderId, project.id);
                      toast.success(`Uploaded ${files.length} item(s) from folder`);
                      e.currentTarget.value = '';
                    }}
                  />
                  <Button onClick={() => dirInputRef.current?.click()}>Upload folder</Button>
                </div>
              </div>
            </div>

            <div className="mt-2">
              <Input
                placeholder="Search papers by title, author, or label..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {visiblePapers.length > 0 ? (
              <div className="space-y-3">
                {visiblePapers.map((paper) => (
                  <div key={paper.id} className="relative group">
                    <PaperCard paper={paper} mode="compact" />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          useStore.getState().deletePaper(paper.id);
                          toast.success('Paper deleted');
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="p-8 border-border/40 text-center">
                <p className="text-muted-foreground">
                  {normalizedQuery ? 'No results match your search' : 'No papers in this scope yet'}
                </p>
              </Card>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">Project root</h2>
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  {folderPapers.length} paper{folderPapers.length !== 1 ? 's' : ''}
                </p>
                <div className="ml-auto flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    hidden
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      useStore.getState().addPapersFromFiles(files, '', project.id);
                      toast.success(`Uploaded ${files.length} file(s)`);
                      e.currentTarget.value = '';
                    }}
                  />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>Upload files</Button>
                  <input
                    ref={dirInputRef}
                    type="file"
                  // @ts-expect-error non-standard attribute supported by Chromium-based and Safari
                    webkitdirectory=""
                    directory=""
                    multiple
                    hidden
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      useStore.getState().addPapersFromFiles(files as File[], '', project.id);
                      toast.success(`Uploaded ${files.length} item(s) from folder`);
                      e.currentTarget.value = '';
                    }}
                  />
                  <Button onClick={() => dirInputRef.current?.click()}>Upload folder</Button>
                </div>
              </div>
            </div>

            <div className="mt-2">
              <Input
                placeholder="Search papers by title, author, or label..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {visiblePapers.length > 0 ? (
              <div className="space-y-3">
                {visiblePapers.map((paper) => (
                  <div key={paper.id} className="relative group">
                    <PaperCard paper={paper} mode="compact" />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          useStore.getState().deletePaper(paper.id);
                          toast.success('Paper deleted');
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="p-8 border-border/40 text-center">
                <p className="text-muted-foreground">
                  {normalizedQuery ? 'No results match your search' : 'No papers in this scope yet'}
                </p>
              </Card>
            )}
          </div>
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

