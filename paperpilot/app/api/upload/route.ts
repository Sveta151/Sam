/**
 * PDF Upload API Route
 * 
 * POST /api/upload
 * Accepts multipart/form-data with:
 * - projectId: string (required)
 * - folderId: string (optional)
 * - file: PDF file (required)
 * 
 * Returns: { paperId, publicUrl, storagePath }
 */

import { NextRequest, NextResponse } from 'next/server';
import { sbServer } from '@/lib/supabase/client';
import { createPaper } from '@/lib/data';
import { isValidPDF, generateUniqueFilename } from '@/lib/storage';

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const projectId = formData.get('projectId') as string;
    const folderId = formData.get('folderId') as string | null;
    const file = formData.get('file') as File | null;

    // Validate inputs
    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: 'file is required' },
        { status: 400 }
      );
    }

    // Validate PDF
    if (!isValidPDF(file)) {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    // Generate storage path
    const uniqueFilename = generateUniqueFilename('pdf');
    const folderPath = folderId || 'root';
    const storagePath = `${projectId}/${folderPath}/${uniqueFilename}`;

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to Supabase storage
    const { error: uploadError } = await sbServer.storage
      .from('papers')
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
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
      .from('papers')
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    // Extract title from filename (remove extension)
    const title = file.name.replace(/\.pdf$/i, '');

    // Create paper record in database
    const paper = await createPaper({
      projectId,
      folderId: folderId || undefined,
      title,
      authors: [],
      storagePath,
      publicUrl,
    });

    if (!paper) {
      // Cleanup: delete uploaded file if DB insert fails
      await sbServer.storage.from('papers').remove([storagePath]);
      return NextResponse.json(
        { error: 'Failed to create paper record' },
        { status: 500 }
      );
    }

    // Return success response
    return NextResponse.json({
      paperId: paper.id,
      publicUrl: paper.public_url,
      storagePath: paper.storage_path,
      title: paper.title,
    });
  } catch (error) {
    console.error('Upload route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

