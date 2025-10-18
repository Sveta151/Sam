'use client';

import { useState, useEffect } from 'react';
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
  
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');

  useEffect(() => {
    if (paper && open) {
      const suggested = autosuggestFolder(paper.id);
      setSelectedFolderId(suggested || '');
    }
  }, [paper, open, autosuggestFolder]);

  const handleConfirm = () => {
    if (!paper || !selectedFolderId) return;

    swipe(paper.id, 'save', selectedFolderId);
    
    const folder = folders.find((f) => f.id === selectedFolderId);
    toast.success(`Saved to ${folder?.name || 'folder'}`, {
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
            <label className="text-sm font-medium">Select Folder</label>
            <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a folder..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => {
                  const projectFolders = folders.filter(
                    (f) => f.projectId === project.id && !f.parentId
                  );
                  
                  if (projectFolders.length === 0) return null;
                  
                  return (
                    <div key={project.id}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {project.name}
                      </div>
                      {projectFolders.map((folder) => (
                        <SelectItem key={folder.id} value={folder.id}>
                          {folder.name}
                        </SelectItem>
                      ))}
                    </div>
                  );
                })}
              </SelectContent>
            </Select>
            
            {selectedFolderId && (
              <p className="text-xs text-muted-foreground">
                {autosuggestFolder(paper.id) === selectedFolderId && (
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
          <Button onClick={handleConfirm} disabled={!selectedFolderId}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

