import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // The search backend is a separate FastAPI service by default
    const base = process.env.SEARCH_BASE_URL || 'http://127.0.0.1:8000';

    const res = await fetch(`${base}/search`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text || 'Upstream search failed' }, { status: res.status });
    }

    const json = await res.json();
    return NextResponse.json(json);
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}


