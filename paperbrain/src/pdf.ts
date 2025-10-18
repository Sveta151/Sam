// PDF text extraction and metadata parsing

import pdfParse from 'pdf-parse';
import { readFile } from 'fs/promises';
import type { Paper } from './types.js';
import { paperId } from './utils/id.js';
import { logger } from './utils/logger.js';

const log = logger.child('pdf');

interface ExtractResult {
  paper: Paper;
  fullText: string;
}

/**
 * Extract text and metadata from a PDF file
 */
export async function extractPdf(
  filePath: string,
  filename: string,
  projectId: string,
  folderId?: string
): Promise<ExtractResult> {
  log.info(`Extracting PDF: ${filename}`);
  
  const dataBuffer = await readFile(filePath);
  const data = await pdfParse(dataBuffer);
  
  const fullText = data.text;
  const firstPage = fullText.split('\n').slice(0, 50).join('\n');
  
  // Try to extract metadata
  const metadata = parseMetadata(firstPage, data.info, filename);
  
  const paper: Paper = {
    id: paperId(),
    projectId,
    folderId,
    title: metadata.title,
    authors: metadata.authors,
    year: metadata.year,
    venue: metadata.venue,
    sourcePath: filePath,
  };
  
  log.info(`Extracted paper: ${paper.title} (${paper.authors.length} authors)`);
  
  return { paper, fullText };
}

interface ParsedMetadata {
  title: string;
  authors: string[];
  year?: number;
  venue?: string;
}

/**
 * Parse metadata from first page text and PDF info
 */
function parseMetadata(firstPage: string, info: any, filename: string): ParsedMetadata {
  let title = '';
  let authors: string[] = [];
  let year: number | undefined;
  let venue: string | undefined;
  
  // Try to extract title (usually first few lines, all caps or title case)
  const lines = firstPage.split('\n').filter(l => l.trim().length > 0);
  
  // Look for title in first 5 lines
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();
    if (line.length > 10 && line.length < 200) {
      // Skip common header patterns
      if (!/^(abstract|introduction|arxiv|ieee|acm|proceedings)/i.test(line)) {
        title = line;
        break;
      }
    }
  }
  
  // Fallback to filename if no title found
  if (!title) {
    title = filename.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
  }
  
  // Try to extract authors (look for patterns like "Name1, Name2, and Name3")
  const authorPattern = /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?(?:,|\sand\s))+/g;
  const authorMatches = firstPage.match(authorPattern);
  if (authorMatches && authorMatches.length > 0) {
    const authorLine = authorMatches[0];
    authors = authorLine
      .split(/,|\sand\s/)
      .map(a => a.trim())
      .filter(a => a.length > 0 && a.length < 50);
  }
  
  // Try to extract year (4-digit number, likely 19xx or 20xx)
  const yearMatch = firstPage.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    year = parseInt(yearMatch[0], 10);
  }
  
  // Try to extract venue (look for conference/journal names)
  const venuePatterns = [
    /(?:IEEE|ACM|Proceedings of|Conference on|Journal of)\s+[A-Z][^.\n]{10,80}/,
  ];
  for (const pattern of venuePatterns) {
    const match = firstPage.match(pattern);
    if (match) {
      venue = match[0].trim();
      break;
    }
  }
  
  return { title, authors, year, venue };
}

