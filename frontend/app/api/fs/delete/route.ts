import { deleteEntry } from '@/lib/server/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const target = (body?.path as string) || '';
    if (!target) return Response.json({ error: 'Path is required' }, { status: 400 });
    await deleteEntry(target);
    return Response.json({ ok: true });
  } catch (err: any) {
    return Response.json({ error: err?.message || 'Failed to delete' }, { status: 400 });
  }
}


