/**
 * Storage utility helpers for Supabase
 */

import { sb } from './supabase/client';

/**
 * Get the public URL for a file in a Supabase storage bucket
 * @param bucket - The bucket name (papers, audio, video, thumbs, json)
 * @param path - The file path within the bucket
 * @returns The public URL
 */
export function publicUrl(bucket: string, path: string): string {
  const { data } = sb.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Get file extension from MIME type
 * @param mime - MIME type (e.g., 'audio/mpeg', 'video/mp4')
 * @returns File extension without dot (e.g., 'mp3', 'mp4')
 */
export function extFromMime(mime: string): string {
  const mimeMap: Record<string, string> = {
    // Audio
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/webm': 'webm',
    
    // Video
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogv',
    'video/quicktime': 'mov',
    
    // Images (for thumbnails)
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    
    // Documents
    'application/pdf': 'pdf',
    'application/json': 'json',
    'text/plain': 'txt',
    'text/markdown': 'md',
  };

  const ext = mimeMap[mime.toLowerCase()];
  if (ext) return ext;

  // Fallback: try to extract from mime type (e.g., 'video/mp4' -> 'mp4')
  const parts = mime.split('/');
  if (parts.length === 2) {
    return parts[1].split(';')[0]; // Remove any parameters like charset
  }

  return 'bin'; // Default fallback
}

/**
 * Generate a unique filename with timestamp and random suffix
 * @param extension - File extension (with or without dot)
 * @returns Unique filename
 */
export function generateUniqueFilename(extension: string): string {
  const ext = extension.startsWith('.') ? extension : `.${extension}`;
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}_${random}${ext}`;
}

/**
 * Get bucket name for asset kind
 * @param kind - Asset kind
 * @returns Bucket name
 */
export function bucketForKind(
  kind: 'audio' | 'video' | 'thumb' | 'transcript' | 'json'
): string {
  switch (kind) {
    case 'audio':
      return 'audio';
    case 'video':
      return 'video';
    case 'thumb':
      return 'thumbs';
    case 'transcript':
    case 'json':
      return 'json';
    default:
      return 'json';
  }
}

/**
 * Validate PDF file
 * @param file - File to validate
 * @returns True if valid PDF
 */
export function isValidPDF(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

/**
 * Format file size in human-readable format
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., '1.5 MB')
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

