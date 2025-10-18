"use client";

import { useEffect, useMemo, useRef, useState } from 'react';

type FsItem = { name: string; path: string; type: 'file' | 'dir'; size?: number };

async function apiList(pathParam: string) {
  const q = pathParam ? `?path=${encodeURIComponent(pathParam)}` : '';
  const res = await fetch(`/api/fs/list${q}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load');
  return (await res.json()) as { path: string; items: FsItem[] };
}

async function apiMkdir(dirPath: string) {
  const res = await fetch(`/api/fs/mkdir`, { method: 'POST', body: JSON.stringify({ path: dirPath }) });
  if (!res.ok) throw new Error('Failed to create directory');
}

async function apiDelete(targetPath: string) {
  const res = await fetch(`/api/fs/delete`, { method: 'POST', body: JSON.stringify({ path: targetPath }) });
  if (!res.ok) throw new Error('Failed to delete');
}

async function apiUpload(dirPath: string, file: File) {
  const form = new FormData();
  form.set('file', file);
  const q = dirPath ? `?path=${encodeURIComponent(dirPath)}` : '';
  const res = await fetch(`/api/fs/upload${q}`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Upload failed');
}

export default function FileManager() {
  const [cwd, setCwd] = useState<string>('');
  const [items, setItems] = useState<FsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const dirNameRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetDir, setTargetDir] = useState<string>('');

  const crumbs = useMemo(() => {
    const parts = cwd ? cwd.split('/').filter(Boolean) : [];
    const acc: { label: string; path: string }[] = [{ label: 'root', path: '' }];
    let running = '';
    for (const p of parts) {
      running = running ? `${running}/${p}` : p;
      acc.push({ label: p, path: running });
    }
    return acc;
  }, [cwd]);

  async function refresh(pathParam = cwd) {
    setLoading(true);
    setError(null);
    try {
      const data = await apiList(pathParam);
      setCwd(data.path || '');
      setItems(data.items);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep upload target in sync with current directory by default
  useEffect(() => {
    setTargetDir(cwd);
  }, [cwd]);

  function goUp() {
    if (!cwd) return;
    const parts = cwd.split('/').filter(Boolean);
    parts.pop();
    refresh(parts.join('/'));
  }

  async function onCreateDir() {
    const name = dirNameRef.current?.value?.trim();
    if (!name) return;
    const target = cwd ? `${cwd}/${name}` : name;
    await apiMkdir(target);
    if (dirNameRef.current) dirNameRef.current.value = '';
    refresh();
  }

  async function onDelete(item: FsItem) {
    if (!confirm(`Delete ${item.type} '${item.name}'?`)) return;
    await apiDelete(item.path);
    refresh();
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await apiUpload(targetDir, file);
    if (fileInputRef.current) fileInputRef.current.value = '';
    refresh();
  }

  return (
    <div className="fm-card">
      <div className="fm-header">
        <div className="fm-breadcrumbs">
          {crumbs.map((c, i) => (
            <span key={c.path}>
              <button className="link" onClick={() => refresh(c.path)}>{c.label}</button>
              {i < crumbs.length - 1 ? <span className="sep">/</span> : null}
            </span>
          ))}
        </div>
        <div className="fm-actions">
          <input ref={dirNameRef} className="input" placeholder="New directory name" />
          <button className="btn small" onClick={onCreateDir}>Create</button>
          <input
            className="input"
            placeholder="Upload target directory (optional)"
            value={targetDir}
            onChange={(e) => setTargetDir(e.target.value)}
          />
          <button className="btn small" onClick={() => setTargetDir(cwd)}>Use current</button>
          <input ref={fileInputRef} type="file" className="file" onChange={onPickFile} />
        </div>
      </div>

      {error && <div className="error" style={{ color: '#ff6b81', padding: '8px 18px' }}>{error}</div>}
      <div className="fm-list">
        {loading ? (
          <div className="muted">Loading...</div>
        ) : items.length === 0 ? (
          <div className="muted">Empty</div>
        ) : (
          items.map((it) => (
            <div className="fm-row" key={it.path}>
              <div className="fm-col name">
                {it.type === 'dir' ? (
                  <button className="link" onClick={() => refresh(it.path)}>{it.name}</button>
                ) : (
                  <span>{it.name}</span>
                )}
              </div>
              <div className="fm-col type">{it.type}</div>
              <div className="fm-col size">{it.size ? `${Math.round(it.size / 1024)} KB` : ''}</div>
              <div className="fm-col actions">
                <button className="btn danger small" onClick={() => onDelete(it)}>Remove</button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="fm-footer">
        <button className="btn" onClick={goUp} disabled={!cwd}>Up</button>
      </div>
    </div>
  );
}


