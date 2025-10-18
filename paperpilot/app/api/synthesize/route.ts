import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const base = process.env.PAPERBRAIN_BASE_URL || 'http://127.0.0.1:3001';
    const res = await fetch(`${base}/synthesize`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text || 'Upstream synth failed' }, { status: res.status });
    }
    const json = await res.json();
    return NextResponse.json(json);
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}


