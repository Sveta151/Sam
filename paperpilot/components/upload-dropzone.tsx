/**
 * Upload Dropzone Component
 * 
 * Drag-and-drop file upload for PDFs
 * Integrates with Supabase via useSupabaseUploads hook
 */

'use client';

import { useState, useCallback, DragEvent } from 'react';
import { useSupabaseUploads } from '@/lib/hooks/useSupabaseUploads';
import { Upload, FileText, Loader2 } from 'lucide-react';

interface UploadDropzoneProps {
  projectId: string;
  folderId?: string;
  onUploadComplete?: (paperId: string) => void;
  className?: string;
}

export function UploadDropzone({
  projectId,
  folderId,
  onUploadComplete,
  className = '',
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { uploadPdf, isUploading, uploadProgress } = useSupabaseUploads();

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const pdfFiles = files.filter(
        (file) =>
          file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      );

      if (pdfFiles.length === 0) {
        alert('Please drop PDF files only');
        return;
      }

      // Upload each PDF
      for (const file of pdfFiles) {
        const result = await uploadPdf({ file, projectId, folderId });
        if (result && onUploadComplete) {
          onUploadComplete(result.paperId);
        }
      }
    },
    [projectId, folderId, uploadPdf, onUploadComplete]
  );

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      const pdfFiles = files.filter(
        (file) =>
          file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      );

      if (pdfFiles.length === 0) {
        alert('Please select PDF files only');
        return;
      }

      // Upload each PDF
      for (const file of pdfFiles) {
        const result = await uploadPdf({ file, projectId, folderId });
        if (result && onUploadComplete) {
          onUploadComplete(result.paperId);
        }
      }

      // Reset input
      e.target.value = '';
    },
    [projectId, folderId, uploadPdf, onUploadComplete]
  );

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg transition-colors ${
        isDragging
          ? 'border-blue-500 bg-blue-50/10'
          : 'border-gray-700 hover:border-gray-600'
      } ${isUploading ? 'pointer-events-none opacity-50' : ''} ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        id="pdf-upload"
        className="hidden"
        accept=".pdf,application/pdf"
        multiple
        onChange={handleFileInput}
        disabled={isUploading}
      />

      <label
        htmlFor="pdf-upload"
        className="flex flex-col items-center justify-center p-8 cursor-pointer"
      >
        {isUploading ? (
          <>
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
            <p className="text-sm text-gray-400 mb-2">Uploading...</p>
            <div className="w-48 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </>
        ) : (
          <>
            {isDragging ? (
              <FileText className="w-12 h-12 text-blue-500 mb-4" />
            ) : (
              <Upload className="w-12 h-12 text-gray-500 mb-4" />
            )}
            <p className="text-sm text-gray-300 mb-2">
              {isDragging ? 'Drop PDFs here' : 'Drag & drop PDFs here'}
            </p>
            <p className="text-xs text-gray-500">or click to browse</p>
          </>
        )}
      </label>
    </div>
  );
}

