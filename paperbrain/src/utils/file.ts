// File utility functions

import { writeFile } from 'fs/promises';
import { join } from 'path';
import mime from 'mime';

export async function saveUploadedFile(
  buffer: Buffer,
  directory: string,
  filename: string
): Promise<string> {
  const filepath = join(directory, filename);
  await writeFile(filepath, buffer);
  return filepath;
}

export function getMimeType(filename: string): string | null {
  return mime.getType(filename) || null;
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

