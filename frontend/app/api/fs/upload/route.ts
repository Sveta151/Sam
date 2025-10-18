import { saveFile } from '@/lib/server/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dir = searchParams.get('path') || '';
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }
    // Optional: restricting to pdf for POC
    // const type = file.type || '';
    // if (type !== 'application/pdf') return Response.json({ error: 'Only PDF allowed' }, { status: 400 });
    const result = await saveFile(dir, file);
    return Response.json({ ok: true, path: result.savedPath });
  } catch (err: any) {
    return Response.json({ error: err?.message || 'Upload failed' }, { status: 400 });
  }
}


