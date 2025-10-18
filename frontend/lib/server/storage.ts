import 'server-only';
import path from 'node:path';
import fs from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';

const STORAGE_DIR_NAME = 'storage';

function getStorageRoot(): string {
  return path.join(process.cwd(), STORAGE_DIR_NAME);
}

export async function ensureStorageRoot(): Promise<string> {
  const root = getStorageRoot();
  try {
    await fs.access(root, fsConstants.W_OK);
  } catch {
    await fs.mkdir(root, { recursive: true });
  }
  return root;
}

export function resolveWithinStorage(relativePath: string | undefined | null): { root: string; absPath: string; relPath: string } {
  const rel = (relativePath || '').replace(/^\/+|\/+$/g, '');
  const root = getStorageRoot();
  const abs = path.normalize(path.join(root, rel));
  if (!abs.startsWith(root)) {
    throw new Error('Invalid path');
  }
  return { root, absPath: abs, relPath: rel };
}

export type FsItem = { name: string; path: string; type: 'file' | 'dir'; size?: number; mtime?: number };

export async function listDirectory(relativePath?: string): Promise<{ path: string; items: FsItem[] }>
{
  await ensureStorageRoot();
  const { absPath, relPath, root } = resolveWithinStorage(relativePath || '');
  try {
    const stats = await fs.stat(absPath).catch(() => fs.stat(root));
    if (!stats.isDirectory()) throw new Error('Not a directory');
  } catch {
    // If path does not exist, fall back to root
  }
  const listingPath = (await fs.stat(absPath).catch(() => fs.stat(root))).isDirectory() ? absPath : root;
  const entries = await fs.readdir(listingPath, { withFileTypes: true }).catch(() => []);
  const items: FsItem[] = [];
  for (const entry of entries) {
    const entryAbs = path.join(listingPath, entry.name);
    const entryRel = path.relative(root, entryAbs);
    if (entry.isDirectory()) {
      const stat = await fs.stat(entryAbs).catch(() => null);
      items.push({ name: entry.name, path: entryRel, type: 'dir', mtime: stat?.mtimeMs });
    } else {
      const stat = await fs.stat(entryAbs).catch(() => null);
      items.push({ name: entry.name, path: entryRel, type: 'file', size: stat?.size, mtime: stat?.mtimeMs });
    }
  }
  const relOut = path.relative(root, listingPath);
  return { path: relOut, items };
}

export async function makeDirectory(relativePath: string): Promise<void> {
  await ensureStorageRoot();
  const { absPath } = resolveWithinStorage(relativePath);
  await fs.mkdir(absPath, { recursive: true });
}

export async function deleteEntry(relativePath: string): Promise<void> {
  await ensureStorageRoot();
  const { absPath } = resolveWithinStorage(relativePath);
  const stat = await fs.stat(absPath);
  if (stat.isDirectory()) {
    await fs.rm(absPath, { recursive: true, force: true });
  } else {
    await fs.unlink(absPath);
  }
}

export async function saveFile(relativeDirPath: string, file: File): Promise<{ savedPath: string }>
{
  await ensureStorageRoot();
  const { absPath: dirAbs, root } = resolveWithinStorage(relativeDirPath);
  await fs.mkdir(dirAbs, { recursive: true });
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  // Basic filename sanitization
  const cleanName = path.basename(file.name).replace(/\s+/g, '_');
  const targetAbs = path.join(dirAbs, cleanName);
  if (!targetAbs.startsWith(root)) throw new Error('Invalid target path');
  await fs.writeFile(targetAbs, buffer);
  const relSaved = path.relative(root, targetAbs);
  return { savedPath: relSaved };
}

export type DirNode = { name: string; path: string; children: DirNode[] };

export async function getDirectoryTree(relativePath?: string): Promise<DirNode> {
  await ensureStorageRoot();
  const { root, absPath } = resolveWithinStorage(relativePath || '');
  async function walk(dirAbs: string): Promise<DirNode> {
    const rel = path.relative(root, dirAbs);
    const name = rel === '' ? 'root' : path.basename(dirAbs);
    const entries = await fs.readdir(dirAbs, { withFileTypes: true }).catch(() => []);
    const children: DirNode[] = [];
    for (const e of entries) {
      if (e.isDirectory()) {
        children.push(await walk(path.join(dirAbs, e.name)));
      }
    }
    return { name, path: rel, children };
  }
  return await walk(absPath);
}

export async function searchStorage(query: string): Promise<FsItem[]> {
  await ensureStorageRoot();
  const { root } = resolveWithinStorage('');
  const q = query.trim().toLowerCase();
  const results: FsItem[] = [];
  async function walk(dirAbs: string) {
    const entries = await fs.readdir(dirAbs, { withFileTypes: true }).catch(() => []);
    for (const e of entries) {
      const abs = path.join(dirAbs, e.name);
      const rel = path.relative(root, abs);
      if (e.isDirectory()) {
        if (e.name.toLowerCase().includes(q)) results.push({ name: e.name, path: rel, type: 'dir' });
        await walk(abs);
      } else {
        if (e.name.toLowerCase().includes(q)) {
          const stat = await fs.stat(abs).catch(() => null);
          results.push({ name: e.name, path: rel, type: 'file', size: stat?.size });
        }
      }
    }
  }
  if (q) await walk(root);
  return results;
}


