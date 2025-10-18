'use client';

import { useState, useEffect, useMemo } from 'react';
import { Check } from 'lucide-react';
import { Paper } from '@/lib/types';
import { useStore } from '@/lib/store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { PaperCard } from './paper-card';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

interface DecisionModalProps {
  paper: Paper | null;
  open: boolean;
  onClose: () => void;
}

export function DecisionModal({ paper, open, onClose }: DecisionModalProps) {
  const folders = useStore((state) => state.folders);
  const projects = useStore((state) => state.projects);
  const swipe = useStore((state) => state.swipe);
  const autosuggestFolder = useStore((state) => state.autosuggestFolder);
  
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDomain, setProjectDomain] = useState('');

  const projectFolders = useMemo(() => {
    return folders.filter((f) => f.projectId === selectedProjectId && !f.parentId);
  }, [folders, selectedProjectId]);

  useEffect(() => {
    if (paper && open) {
      const suggested = autosuggestFolder(paper.id);
      if (suggested) {
        const folder = folders.find((f) => f.id === suggested);
        if (folder) {
          setSelectedProjectId(folder.projectId);
          setSelectedFolderId(folder.id);
          return;
        }
      }
      setSelectedFolderId('');
      setSelectedProjectId('');
    }
  }, [paper, open, autosuggestFolder, folders]);

  const handleConfirm = () => {
    if (!paper) return;
    if (selectedFolderId) {
      swipe(paper.id, 'save', selectedFolderId);
    } else if (selectedProjectId) {
      swipe(paper.id, 'save', undefined, selectedProjectId);
    } else {
      return;
    }
    
    const folder = folders.find((f) => f.id === selectedFolderId);
    const project = projects.find((p) => p.id === selectedProjectId);
    toast.success(`Saved to ${folder?.name || project?.name || 'project'}`, {
      icon: <Check className="w-4 h-4" />,
    });
    
    onClose();
  };

  if (!paper) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add to Project</DialogTitle>
          <DialogDescription>
            Choose which folder to save this paper to
          </DialogDescription>
        </DialogHeader>

        <div className="my-4">
          <PaperCard paper={paper} mode="compact" onClick={() => {}} />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Project</label>
            <Select value={selectedProjectId} onValueChange={(v) => { setSelectedProjectId(v); setSelectedFolderId(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label className="text-sm font-medium">Select Folder (optional)</label>
            <Select value={selectedFolderId} onValueChange={setSelectedFolderId} disabled={!selectedProjectId}>
              <SelectTrigger>
                <SelectValue placeholder={!selectedProjectId ? 'Choose a project first' : 'Save to project root or pick a folder'} />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{projects.find(p=>p.id===selectedProjectId)?.name || 'Folders'}</div>
                {projectFolders.length > 0 ? (
                  projectFolders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-2 py-1 text-xs text-muted-foreground">No folders yet — will save to project root</div>
                )}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="px-2" onClick={() => setCreating((v) => !v)}>
                {creating ? 'Cancel' : 'Create new project'}
              </Button>
            </div>

            {creating && (
              <div className="mt-2 space-y-2 border rounded-lg p-3">
                <div>
                  <label className="text-xs">Project name</label>
                  <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g., New Research" />
                </div>
                <div>
                  <label className="text-xs">Domain focus</label>
                  <Input value={projectDomain} onChange={(e) => setProjectDomain(e.target.value)} placeholder="e.g., LLMs" />
                </div>
                <div className="text-xs text-muted-foreground">
                  After creating, select a folder in the project details to organize.
                </div>
              </div>
            )}
            
            {(selectedFolderId || selectedProjectId) && (
              <p className="text-xs text-muted-foreground">
                {selectedFolderId && autosuggestFolder(paper.id) === selectedFolderId && (
                  <span className="text-primary font-medium">✨ Auto-suggested</span>
                )}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {creating ? (
            <Button
              onClick={() => {
                if (!projectName.trim() || !paper) return;
                const id = crypto.randomUUID();
                const addProject = useStore.getState().addProject;
                // 1) Create project
                addProject({ id, name: projectName.trim(), domainFocus: projectDomain.trim() || 'General' });
                // 2) Save to project root
                useStore.getState().swipe(paper.id, 'save', undefined, id);
                // 3) Cleanup and close
                setCreating(false);
                setProjectName('');
                setProjectDomain('');
                toast.success('Project created and paper saved to project root', { icon: <Check className="w-4 h-4" /> });
                onClose();
              }}
            >
              Create project
            </Button>
          ) : (
            <Button onClick={handleConfirm} disabled={!selectedProjectId}>
              Confirm
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

