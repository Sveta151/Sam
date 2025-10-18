/**
 * Paper Assets API Route
 * 
 * GET /api/papers/[id]/assets
 * Returns list of assets for a paper, ordered by created_at desc
 * 
 * Returns: { assets: PaperAsset[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { listPaperAssets } from '@/lib/data';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate paper ID (basic UUID check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid paper ID format' },
        { status: 400 }
      );
    }

    // Fetch assets
    const assets = await listPaperAssets(id);

    return NextResponse.json({ assets });
  } catch (error) {
    console.error('List assets route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

