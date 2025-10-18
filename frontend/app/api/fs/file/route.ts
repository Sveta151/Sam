import { resolveWithinStorage } from '@/lib/server/storage';
import { NextRequest } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const rel = request.nextUrl.searchParams.get('path') || '';
    if (!rel) return new Response('Missing path', { status: 400 });
    const { absPath } = resolveWithinStorage(rel);
    const data = await fs.readFile(absPath);
    const ext = path.extname(absPath).toLowerCase();
    const type =
      ext === '.pdf' ? 'application/pdf' :
      ext === '.png' ? 'image/png' :
      ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
      'application/octet-stream';
    return new Response(data, { headers: { 'Content-Type': type } });
  } catch (e: any) {
    return new Response(e?.message || 'Failed to read file', { status: 400 });
  }
}


