export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const base = process.env.SEARCH_BASE_URL || 'http://127.0.0.1:8000';
    // default limit 20
    const res = await fetch(`${base}/trend?limit=20`, { method: 'GET', cache: 'no-store' });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text || 'Upstream trend failed' }, { status: res.status });
    }
    const json = await res.json();
    return NextResponse.json(json);
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || error) }, { status: 500 });
  }
}


