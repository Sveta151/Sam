import { listDirectory } from '@/lib/server/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') || '';
  try {
    const data = await listDirectory(path);
    return Response.json(data, { status: 200 });
  } catch (err: any) {
    return Response.json({ error: err?.message || 'Failed to list' }, { status: 400 });
  }
}


