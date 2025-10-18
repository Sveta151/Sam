import { makeDirectory } from '@/lib/server/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const dirPath = (body?.path as string) || '';
    if (!dirPath) return Response.json({ error: 'Path is required' }, { status: 400 });
    await makeDirectory(dirPath);
    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json({ error: err?.message || 'Failed to create directory' }, { status: 400 });
  }
}


