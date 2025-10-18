/**
 * Proxy Upload API Route for Generated Assets
 * 
 * POST /api/assets/proxy-upload
 * Body: {
 *   url: string,           // Remote URL to fetch from (e.g., paperbrain output)
 *   paperId: string,       // Paper ID to associate asset with
 *   kind: 'audio' | 'video' | 'thumb' | 'transcript' | 'json'
 * }
 * 
 * Returns: { publicUrl, storagePath, assetId }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sbServer } from '@/lib/supabase/client';
import { createPaperAsset } from '@/lib/data';
import { bucketForKind, extFromMime, generateUniqueFilename } from '@/lib/storage';

// Request validation schema
const ProxyUploadSchema = z.object({
  url: z.string().url(),
  paperId: z.string().uuid(),
  kind: z.enum(['audio', 'video', 'thumb', 'transcript', 'json']),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = ProxyUploadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { url, paperId, kind } = validation.data;

    // Fetch the remote file
    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch file from URL: ${response.statusText}` },
        { status: 400 }
      );
    }

    // Get content type and determine extension
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const ext = extFromMime(contentType);

    // Get the file as buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const bytes = buffer.length;

    // Determine bucket and generate storage path
    const bucket = bucketForKind(kind);
    const uniqueFilename = generateUniqueFilename(ext);
    const storagePath = `${paperId}/${uniqueFilename}`;

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await sbServer.storage
      .from(bucket)
      .upload(storagePath, buffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = sbServer.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    // Create paper asset record in database
    const asset = await createPaperAsset({
      paperId,
      kind,
      storagePath,
      publicUrl,
      bytes,
      etag: uploadData.path, // Use path as etag for now
    });

    if (!asset) {
      // Cleanup: delete uploaded file if DB insert fails
      await sbServer.storage.from(bucket).remove([storagePath]);
      return NextResponse.json(
        { error: 'Failed to create asset record' },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json({
      assetId: asset.id,
      publicUrl: asset.public_url,
      storagePath: asset.storage_path,
      kind: asset.kind,
      bytes: asset.bytes,
    });
  } catch (error) {
    console.error('Proxy upload route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

