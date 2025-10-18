'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FolderOpen, Sparkles, Plus, Trash2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function ProjectsPage() {
  const router = useRouter();
  const projects = useStore((state) => state.projects);
  const addProject = useStore((state) => state.addProject);
  // No default folder creation; user will organize later
  const deleteProject = useStore((state) => state.deleteProject);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');

  return (
    <div className="content-grid">
      <div className="col-span-12">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Saved Papers</h1>
            <p className="text-muted-foreground">
              Your research projects and organized folders
            </p>
            <div className="mt-4">
              <Button onClick={() => setOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> New project
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="relative p-6 border-border/40 hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const ok = window.confirm(`Delete project "${project.name}"? This removes all folders and papers in it.`);
                      if (!ok) return;
                      deleteProject(project.id);
                      toast.success('Project deleted');
                    }}
                    aria-label="Delete project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <FolderOpen className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">
                        {project.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {project.domainFocus}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="w-4 h-4" />
                    <span>View folders & papers</span>
                  </div>
                </div>
              </Card>
            ))}

            {projects.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">
                  No projects yet. Start saving papers to create your first project.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-sm">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Full Reciprocity" />
            </div>
            <div>
              <label className="text-sm">Domain focus</label>
              <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g., Wireless communications" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!name.trim()) return;
                const id = crypto.randomUUID();
                addProject({ id, name: name.trim(), domainFocus: domain.trim() || 'General' });
                setOpen(false);
                setName('');
                setDomain('');
                router.push(`/projects/${id}`);
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

