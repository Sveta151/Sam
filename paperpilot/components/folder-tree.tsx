'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';
import { Folder as FolderType } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FolderTreeProps {
  folders: FolderType[];
  selectedFolderId?: string;
  onSelectFolder: (folderId: string) => void;
}

export function FolderTree({ folders, selectedFolderId, onSelectFolder }: FolderTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (folderId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const rootFolders = folders.filter((f) => !f.parentId);
  
  const getChildFolders = (parentId: string) => {
    return folders.filter((f) => f.parentId === parentId);
  };

  const renderFolder = (folder: FolderType, depth: number = 0) => {
    const isExpanded = expandedIds.has(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const children = getChildFolders(folder.id);
    const hasChildren = children.length > 0;
    const FolderIcon = isExpanded ? FolderOpen : Folder;

    return (
      <div key={folder.id}>
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors group',
            isSelected
              ? 'bg-primary/10 text-primary font-medium'
              : 'hover:bg-secondary text-foreground'
          )}
          style={{ paddingLeft: `${depth * 1.5 + 0.75}rem` }}
          onClick={() => onSelectFolder(folder.id)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(folder.id);
              }}
              className="p-0.5 hover:bg-secondary rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          
          {!hasChildren && <div className="w-5" />}
          
          <FolderIcon className="w-4 h-4 flex-shrink-0" />
          
          <span className="flex-1 text-sm truncate">{folder.name}</span>
          
          {folder.tags && folder.tags.length > 0 && (
            <Badge variant="secondary" className="text-xs ml-auto">
              {folder.tags.length}
            </Badge>
          )}
        </div>

        {/* Tags */}
        {isSelected && folder.tags && folder.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 py-2 ml-8">
            {folder.tags.map((tag, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Children */}
        {isExpanded && hasChildren && (
          <div>
            {children.map((child) => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {rootFolders.map((folder) => renderFolder(folder))}
    </div>
  );
}

