declare module 'pdf-parse/lib/pdf-parse.js' {
  import type { Buffer } from 'node:buffer';
  interface PDFInfo {
    [key: string]: any;
  }
  interface PDFMetadata {
    [key: string]: any;
  }
  interface PDFParseResult {
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata?: PDFMetadata;
    version?: string;
    text: string;
  }
  function pdfParse(dataBuffer: Buffer | Uint8Array): Promise<PDFParseResult>;
  export default pdfParse;
}

// Fallback declaration for tooling that doesn't pick up the above types
declare module 'pdf-parse/lib/pdf-parse.js';


