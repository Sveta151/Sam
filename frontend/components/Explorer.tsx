"use client";

import { useEffect, useMemo, useRef, useState } from 'react';

type DirNode = { name: string; path: string; children: DirNode[] };
type FsItem = { name: string; path: string; type: 'file' | 'dir'; size?: number; mtime?: number };

async function fetchTree(path = ''): Promise<DirNode> {
  const q = path ? `?path=${encodeURIComponent(path)}` : '';
  const res = await fetch(`/api/fs/tree${q}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load tree');
  return await res.json();
}
async function fetchList(path = ''): Promise<{ path: string; items: FsItem[] }> {
  const q = path ? `?path=${encodeURIComponent(path)}` : '';
  const res = await fetch(`/api/fs/list${q}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load list');
  return await res.json();
}
async function search(q: string): Promise<FsItem[]> {
  const res = await fetch(`/api/fs/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error('Search failed');
  const data = await res.json();
  return data.results as FsItem[];
}
async function mkdir(dirPath: string) {
  await fetch('/api/fs/mkdir', { method: 'POST', body: JSON.stringify({ path: dirPath }) });
}
async function del(target: string) {
  await fetch('/api/fs/delete', { method: 'POST', body: JSON.stringify({ path: target }) });
}
async function uploadFile(dirPath: string, file: File) {
  const form = new FormData();
  form.set('file', file);
  const q = dirPath ? `?path=${encodeURIComponent(dirPath)}` : '';
  await fetch(`/api/fs/upload${q}`, { method: 'POST', body: form });
}

export default function Explorer() {
  const [tree, setTree] = useState<DirNode | null>(null);
  const [cwd, setCwd] = useState<string>('');
  const [list, setList] = useState<FsItem[]>([]);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<FsItem[] | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FsItem | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<FsItem | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string>('');

  async function refreshAll(targetPath = cwd) {
    const [t, l] = await Promise.all([fetchTree(''), fetchList(targetPath)]);
    setTree(t);
    setCwd(l.path);
    setList(l.items);
  }

  useEffect(() => { refreshAll(''); }, []);

  const crumbs = useMemo(() => {
    const parts = cwd ? cwd.split('/').filter(Boolean) : [];
    const acc: { label: string; path: string }[] = [{ label: 'root', path: '' }];
    let running = '';
    for (const p of parts) { running = running ? `${running}/${p}` : p; acc.push({ label: p, path: running }); }
    return acc;
  }, [cwd]);

  async function onSearchChange(value: string) {
    setQ(value);
    if (!value.trim()) { setResults(null); return; }
    const r = await search(value);
    setResults(r);
  }

  async function onSelectDir(dirPath: string) {
    const l = await fetchList(dirPath);
    setCwd(l.path);
    setList(l.items);
    setResults(null);
  }

  async function onCreateDir(name: string) {
    if (!name.trim()) return;
    const target = cwd ? `${cwd}/${name}` : name;
    await mkdir(target);
    await refreshAll();
  }

  async function onDeleteConfirm() {
    if (!deleteTarget) return;
    await del(deleteTarget.path);
    setShowDelete(false);
    setDeleteTarget(null);
    await refreshAll();
  }

  function isPreviewable(it: FsItem) {
    const lower = it.name.toLowerCase();
    return it.type === 'file' && (lower.endsWith('.pdf') || lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg'));
  }

  async function onConfirmUpload() {
    const file = fileInput.current?.files?.[0];
    if (!file) return;
    await uploadFile(uploadTarget || cwd, file);
    setShowUpload(false);
    if (fileInput.current) fileInput.current.value = '';
    await refreshAll(uploadTarget || cwd);
  }

  function Dir({ node }: { node: DirNode }) {
    const [open, setOpen] = useState(node.path === ''); // root open by default
    return (
      <div>
        <div className="dir-row">
          <button className="link" onClick={() => onSelectDir(node.path)}>{node.name}</button>
          {node.children.length > 0 && (
            <button className="link" onClick={() => setOpen(!open)} style={{ color: '#98a2b3' }}>{open ? '−' : '+'}</button>
          )}
        </div>
        {open && (
          <div className="dir-children">
            {node.children.map((c) => (
              <Dir key={c.path} node={c} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="explorer">
      <aside className="explorer-sidebar">
        <div className="sidebar-header">
          <input
            className="input"
            placeholder="Search files & folders"
            value={q}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <button className="btn small" onClick={() => { setUploadTarget(cwd); setShowUpload(true); }}>Upload</button>
        </div>
        <div className="sidebar-tree">
          {tree && <Dir node={tree} />}
        </div>
      </aside>
      <section className="explorer-main">
        <div className="explorer-crumbs">
          {crumbs.map((c, i) => (
            <span key={c.path}>
              <button className="link" onClick={() => onSelectDir(c.path)}>{c.label}</button>
              {i < crumbs.length - 1 ? <span className="sep">/</span> : null}
            </span>
          ))}
        </div>
        <div className="fm-list">
          {(results ?? list).length === 0 ? (
            <div className="muted">{q ? 'No results' : 'This folder is empty'}</div>
          ) : (
            (results ?? list).map((it) => (
              <div className="fm-row" key={it.path}>
                <div className="fm-col name">
                  {it.type === 'dir' ? (
                    <button className="link" onClick={() => onSelectDir(it.path)}>{it.name}</button>
                  ) : (
                    <span>{it.name}</span>
                  )}
                </div>
                <div className="fm-col type">{it.type}</div>
                <div className="fm-col size">{it.type === 'file' ? `${Math.round((it.size || 0) / 1024)} KB` : ''}</div>
                <div className="fm-col modified">{it.mtime ? new Date(it.mtime).toLocaleString() : ''}</div>
                <div className="fm-col actions" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  {it.type === 'file' && (
                    <>
                      {isPreviewable(it) && (
                        <button className="btn small" onClick={() => { setPreviewTarget(it); setShowPreview(true); }}>Preview</button>
                      )}
                      <a className="btn small" href={`/api/fs/file?path=${encodeURIComponent(it.path)}`} target="_blank" rel="noreferrer">Open</a>
                    </>
                  )}
                  <button className="btn danger small" onClick={() => { setDeleteTarget(it); setShowDelete(true); }}>Remove</button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Upload file</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input className="input" placeholder="Target directory" value={uploadTarget} onChange={(e) => setUploadTarget(e.target.value)} />
              <button className="btn small" onClick={() => setUploadTarget(cwd)}>Use current</button>
            </div>
            <div style={{ marginTop: 12 }}>
              <input ref={fileInput} type="file" className="file" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="btn" onClick={() => setShowUpload(false)}>Cancel</button>
              <button className="btn primary" onClick={async () => {
                try {
                  await onConfirmUpload();
                } catch (e) {
                  alert('Upload failed');
                }
              }}>Upload</button>
            </div>
          </div>
        </div>
      )}

      {showDelete && deleteTarget && (
        <div className="modal-overlay" onClick={() => setShowDelete(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Delete {deleteTarget.type}</h3>
            <p style={{ color: '#b91c1c', marginTop: 0 }}>
              {deleteTarget.type === 'dir'
                ? 'This will permanently delete this folder and all its contents.'
                : 'This will permanently delete this file.'}
            </p>
            <p style={{ marginBottom: 0 }}>Target: <strong>{deleteTarget.name}</strong></p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button className="btn" onClick={() => setShowDelete(false)}>Cancel</button>
              <button className="btn danger" onClick={onDeleteConfirm}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {showPreview && previewTarget && (
        <div className="modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="modal large" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{previewTarget.name}</h3>
            <div className="modal-body">
              {previewTarget.name.toLowerCase().endsWith('.pdf') ? (
                <iframe className="preview" src={`/api/fs/file?path=${encodeURIComponent(previewTarget.path)}`}></iframe>
              ) : (
                <img className="preview-img" src={`/api/fs/file?path=${encodeURIComponent(previewTarget.path)}`} />
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button className="btn" onClick={() => setShowPreview(false)}>Close</button>
              <a className="btn primary" href={`/api/fs/file?path=${encodeURIComponent(previewTarget.path)}`} target="_blank" rel="noreferrer">Open</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


