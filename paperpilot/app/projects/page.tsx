'use client';

import { useRouter } from 'next/navigation';
import { FolderOpen, Sparkles } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Card } from '@/components/ui/card';

export default function ProjectsPage() {
  const router = useRouter();
  const projects = useStore((state) => state.projects);

  return (
    <div className="content-grid">
      <div className="col-span-12">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Saved Papers</h1>
            <p className="text-muted-foreground">
              Your research projects and organized folders
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="p-6 border-border/40 hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => router.push(`/projects/${project.id}`)}
              >
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
    </div>
  );
}

