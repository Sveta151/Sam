export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const incoming = await req.formData();
    const projectId = incoming.get('projectId');
    const file = incoming.get('file');

    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json({ error: 'projectId field required' }, { status: 400 });
    }
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: 'file field required' }, { status: 400 });
    }

    const form = new FormData();
    form.set('projectId', projectId);
    form.set('file', file, 'upload.pdf');

    const base = process.env.PAPERBRAIN_BASE_URL || 'http://127.0.0.1:3001';
    const res = await fetch(`${base}/ingest`, { method: 'POST', body: form });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text || 'Upstream ingest failed' }, { status: res.status });
    }

    const json = await res.json();
    return NextResponse.json(json);
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}


