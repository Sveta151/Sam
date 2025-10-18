/**
 * Client-side hooks for Supabase uploads
 * 
 * Provides convenient hooks for uploading PDFs and saving generated assets
 */

'use client';

import { useState } from 'react';
import { toast } from 'sonner';

// Types
export interface UploadPdfParams {
  file: File;
  projectId: string;
  folderId?: string;
}

export interface UploadPdfResult {
  paperId: string;
  publicUrl: string;
  storagePath: string;
  title: string;
}

export interface SaveGeneratedAssetParams {
  paperId: string;
  url: string;
  kind: 'audio' | 'video' | 'thumb' | 'transcript' | 'json';
}

export interface SaveGeneratedAssetResult {
  assetId: string;
  publicUrl: string;
  storagePath: string;
  kind: string;
  bytes: number | null;
}

/**
 * Hook for uploading PDFs and managing generated assets
 */
export function useSupabaseUploads() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  /**
   * Upload a PDF file to Supabase
   */
  const uploadPdf = async (
    params: UploadPdfParams
  ): Promise<UploadPdfResult | null> => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', params.file);
      formData.append('projectId', params.projectId);
      if (params.folderId) {
        formData.append('folderId', params.folderId);
      }

      // Simulate progress (since we can't track actual upload progress easily)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      // Upload
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result: UploadPdfResult = await response.json();
      toast.success(`Uploaded: ${result.title}`);
      return result;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to upload PDF'
      );
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Save a generated asset (audio, video, etc.) from a remote URL
   */
  const saveGeneratedAsset = async (
    params: SaveGeneratedAssetParams
  ): Promise<SaveGeneratedAssetResult | null> => {
    try {
      const response = await fetch('/api/assets/proxy-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save asset');
      }

      const result: SaveGeneratedAssetResult = await response.json();
      
      // Show appropriate success message based on asset kind
      const kindLabels: Record<string, string> = {
        audio: 'Audio',
        video: 'Video',
        thumb: 'Thumbnail',
        transcript: 'Transcript',
        json: 'Data',
      };
      toast.success(`${kindLabels[params.kind] || 'Asset'} saved successfully`);
      
      return result;
    } catch (error) {
      console.error('Save asset error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to save asset'
      );
      return null;
    }
  };

  return {
    uploadPdf,
    saveGeneratedAsset,
    isUploading,
    uploadProgress,
  };
}

/**
 * Fetch assets for a paper
 */
export async function fetchPaperAssets(paperId: string) {
  try {
    const response = await fetch(`/api/papers/${paperId}/assets`);
    if (!response.ok) {
      throw new Error('Failed to fetch assets');
    }
    const data = await response.json();
    return data.assets || [];
  } catch (error) {
    console.error('Fetch assets error:', error);
    return [];
  }
}

