// Simple ID generation utilities

export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

export function paperId(): string {
  return generateId('paper');
}

export function chunkId(paperId: string, index: number): string {
  return `${paperId}_chunk_${index}`;
}

export function projectId(): string {
  return generateId('proj');
}

