'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ImportPage() {
  const router = useRouter();
  const search = useSearchParams();
  const addPaper = useStore((s) => s.addPaper);
  const addProject = useStore((s) => s.addProject);
  const addFolder = useStore((s) => s.addFolder);
  const projects = useStore((s) => s.projects);
  const folders = useStore((s) => s.folders);
  const papers = useStore((s) => s.papers);
  const [importedId, setImportedId] = useState<string | null>(null);

  const payload = useMemo(() => {
    const qp = (k: string) => (search.get(k) || '').trim();
    const title = qp('title') || 'Untitled paper';
    const url = qp('url');
    const pdfUrl = qp('pdfUrl');
    const doi = qp('doi');
    const arxivId = qp('arxivId');
    const authorsStr = qp('authors');
    const projectId = qp('projectId');
    const folderId = qp('folderId');
    const projectName = qp('projectName');
    const folderName = qp('folderName');
    const yearStr = qp('year');
    const labelsStr = qp('labels');
    const summary2 = qp('summary');

    const authors = authorsStr
      ? authorsStr.split(',').map((a) => a.trim()).filter(Boolean)
      : [];
    const labels = labelsStr
      ? labelsStr.split(',').map((l) => l.trim()).filter(Boolean)
      : undefined;
    const year = yearStr ? Number(yearStr) : undefined;

    return {
      title,
      url,
      pdfUrl,
      doi,
      arxivId,
      authors,
      projectId: projectId || undefined,
      folderId: folderId || undefined,
      projectName: projectName || undefined,
      folderName: folderName || undefined,
      year,
      labels,
      summary2: summary2 || undefined,
    };
  }, [search]);

  useEffect(() => {
    if (importedId) return; // avoid double-imports on fast refresh

    const already = papers.find((p) => {
      if (payload.doi && (p as any).doi && (p as any).doi === payload.doi) return true;
      if (payload.arxivId && (p as any).arxivId && (p as any).arxivId === payload.arxivId) return true;
      if (payload.title && p.title === payload.title && payload.projectId === p.projectId && payload.folderId === p.folderId) return true;
      return false;
    });
    if (already) {
      setImportedId(already.id);
      toast.info('Paper already exists.');
      return;
    }

    const save = async () => {
      // Resolve target project/folder
      let targetProjectId = payload.projectId;
      let targetFolderId = payload.folderId;

      if (!targetProjectId) {
        const desiredName = payload.projectName || 'Extension Inbox';
        const existing = projects.find((p) => p.name === desiredName);
        if (existing) {
          targetProjectId = existing.id;
        } else {
          const newId = crypto.randomUUID();
          addProject({ id: newId, name: desiredName, domainFocus: 'Browser imports' });
          targetProjectId = newId;
        }
      }

      if (!targetFolderId) {
        const desiredFolder = payload.folderName || 'Quick Saves';
        const existingFolder = folders.find((f) => f.name === desiredFolder && f.projectId === targetProjectId);
        if (existingFolder) {
          targetFolderId = existingFolder.id;
        } else {
          const newFid = crypto.randomUUID();
          addFolder({ id: newFid, name: desiredFolder, projectId: targetProjectId!, tags: [] });
          targetFolderId = newFid;
        }
      }
      let fileDataUrl: string | undefined;
      // Best-effort: fetch PDF and convert to data URL if pdfUrl provided and CORS allows
      if (payload.pdfUrl) {
        try {
          const res = await fetch(payload.pdfUrl, { mode: 'cors' });
          const blob = await res.blob();
          // Only attempt if it's reasonably small; otherwise skip
          if (blob.size <= 25 * 1024 * 1024) {
            fileDataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve((reader.result as string) || '');
              reader.readAsDataURL(blob);
            });
          }
        } catch {
          // Ignore failures (CORS/size); URL will still be stored
        }
      }

      const id = crypto.randomUUID();
      addPaper({
        id,
        title: payload.title,
        authors: payload.authors,
        projectId: targetProjectId,
        folderId: targetFolderId,
        year: payload.year,
        labels: payload.labels,
        summary2: payload.summary2,
        // Store references for later enrichment
        fileUrl: payload.pdfUrl || payload.url,
        fileDataUrl,
        ...(payload.doi ? { /* @ts-ignore demo field */ doi: payload.doi } : {}),
        ...(payload.arxivId ? { /* @ts-ignore demo field */ arxivId: payload.arxivId } : {}),
      });

      setImportedId(id);
      toast.success('Paper saved');

      if (targetProjectId) {
        router.replace(`/projects/${targetProjectId}`);
      } else {
        router.replace('/');
      }
    };

    void save();
  }, [addPaper, papers, payload, importedId, router]);

  return (
    <div className="content-grid">
      <div className="col-span-12">
        <Card className="p-6 border-border/40">
          <h1 className="text-xl font-semibold mb-2">Importing paper...</h1>
          <p className="text-sm text-muted-foreground">
            If you are not redirected automatically, use the button below.
          </p>
          <div className="mt-4">
            <Button onClick={() => {
              if (payload.projectId) router.push(`/projects/${payload.projectId}`);
              else router.push('/');
            }}>Go now</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}


