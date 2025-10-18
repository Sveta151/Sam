import { searchStorage } from '@/lib/server/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  try {
    const results = await searchStorage(q);
    return Response.json({ results }, { status: 200 });
  } catch (err: any) {
    return Response.json({ error: err?.message || 'Search failed' }, { status: 400 });
  }
}


