# Frontend Integration Guide

How to connect paperbrain to the paperpilot Next.js frontend.

## Overview

paperbrain runs as a standalone backend service. The frontend communicates via REST API.

## Architecture

```
paperpilot (Next.js)  ←→  paperbrain (Fastify)
     :3000                    :3001
```

## Setup

### 1. Start paperbrain

```bash
cd paperbrain
npm run dev
```

Runs on `http://localhost:3001`

### 2. Configure Frontend

In `paperpilot/.env.local`:

```env
NEXT_PUBLIC_PAPERBRAIN_URL=http://localhost:3001
```

### 3. Create API Client

Create `paperpilot/lib/paperbrain.ts`:

```typescript
const BASE_URL = process.env.NEXT_PUBLIC_PAPERBRAIN_URL || 'http://localhost:3001';

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year?: number;
  venue?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Citation {
  paperId: string;
  chunkIndex: number;
}

// Ingest a PDF
export async function ingestPDF(projectId: string, file: File) {
  const formData = new FormData();
  formData.append('projectId', projectId);
  formData.append('file', file);

  const response = await fetch(`${BASE_URL}/ingest`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Ingest failed: ${response.statusText}`);
  }

  return response.json() as Promise<{ paperId: string; chunks: number }>;
}

// Chat with a paper
export async function chatWithPaper(
  projectId: string,
  paperId: string,
  messages: ChatMessage[]
) {
  const response = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, paperId, messages }),
  });

  if (!response.ok) {
    throw new Error(`Chat failed: ${response.statusText}`);
  }

  return response.json() as Promise<{
    answer: string;
    citations: Citation[];
  }>;
}

// Generate podcast
export async function generatePodcast(
  projectId: string,
  paperId: string,
  duration: number = 180
) {
  const response = await fetch(`${BASE_URL}/podcast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, paperId, duration }),
  });

  if (!response.ok) {
    throw new Error(`Podcast generation failed: ${response.statusText}`);
  }

  return response.json() as Promise<{
    url: string;
    bytesLength: number;
  }>;
}

// Generate video script
export async function generateVideoScript(
  projectId: string,
  paperId: string
) {
  const response = await fetch(`${BASE_URL}/video-script`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, paperId }),
  });

  if (!response.ok) {
    throw new Error(`Video script generation failed: ${response.statusText}`);
  }

  return response.json();
}

// Synthesize multiple papers
export async function synthesizePapers(
  projectId: string,
  paperIds: string[]
) {
  const response = await fetch(`${BASE_URL}/synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, paperIds }),
  });

  if (!response.ok) {
    throw new Error(`Synthesis failed: ${response.statusText}`);
  }

  return response.json() as Promise<{
    folderId: string;
    storyline: string;
    deltas: string;
    tableMarkdown: string;
  }>;
}
```

## Usage Examples

### Upload PDF Component

```typescript
'use client';

import { useState } from 'react';
import { ingestPDF } from '@/lib/paperbrain';

export function UploadPDF({ projectId }: { projectId: string }) {
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await ingestPDF(projectId, file);
      console.log('Uploaded:', result);
      // Update your state/store with the new paper
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input
        type="file"
        accept=".pdf"
        onChange={handleUpload}
        disabled={uploading}
      />
      {uploading && <p>Uploading and processing...</p>}
    </div>
  );
}
```

### Chat Component

```typescript
'use client';

import { useState } from 'react';
import { chatWithPaper, type ChatMessage } from '@/lib/paperbrain';

export function PaperChat({
  projectId,
  paperId,
}: {
  projectId: string;
  paperId: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!input.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await chatWithPaper(projectId, paperId, newMessages);
      setMessages([
        ...newMessages,
        { role: 'assistant', content: response.answer },
      ]);
    } catch (error) {
      console.error('Chat failed:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="messages">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role}>
            {msg.content}
          </div>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        disabled={loading}
      />
      <button onClick={handleSend} disabled={loading}>
        Send
      </button>
    </div>
  );
}
```

### Podcast Generation

```typescript
'use client';

import { useState } from 'react';
import { generatePodcast } from '@/lib/paperbrain';

export function PodcastButton({
  projectId,
  paperId,
}: {
  projectId: string;
  paperId: string;
}) {
  const [generating, setGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const result = await generatePodcast(projectId, paperId, 180);
      setAudioUrl(result.url);
    } catch (error) {
      console.error('Podcast generation failed:', error);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <button onClick={handleGenerate} disabled={generating}>
        {generating ? 'Generating...' : 'Generate Podcast'}
      </button>
      {audioUrl && (
        <audio controls src={audioUrl}>
          Your browser does not support audio.
        </audio>
      )}
    </div>
  );
}
```

## State Management

Integrate with your existing store (e.g., Zustand):

```typescript
// lib/store.ts
import { create } from 'zustand';

interface PaperState {
  papers: Map<string, Paper>;
  addPaper: (paper: Paper) => void;
  // ... other methods
}

export const usePaperStore = create<PaperState>((set) => ({
  papers: new Map(),
  addPaper: (paper) =>
    set((state) => ({
      papers: new Map(state.papers).set(paper.id, paper),
    })),
}));
```

## CORS Configuration

If running on different domains, add CORS to paperbrain:

```bash
npm install @fastify/cors
```

In `src/server.ts`:

```typescript
import cors from '@fastify/cors';

// After creating fastify instance
await fastify.register(cors, {
  origin: 'http://localhost:3000', // Your frontend URL
});
```

## Production Deployment

### Option 1: Same Server

Deploy both on the same server, use nginx reverse proxy:

```nginx
location /api/brain/ {
  proxy_pass http://localhost:3001/;
}
```

Frontend calls: `/api/brain/ingest`, `/api/brain/chat`, etc.

### Option 2: Separate Services

- Frontend: Vercel/Netlify
- Backend: Railway/Render/Fly.io

Set `NEXT_PUBLIC_PAPERBRAIN_URL` to your backend URL.

## Error Handling

Wrap API calls with proper error handling:

```typescript
try {
  const result = await ingestPDF(projectId, file);
  // Success
} catch (error) {
  if (error instanceof Error) {
    toast.error(error.message);
  }
}
```

## Loading States

Show progress for long operations:

```typescript
const [status, setStatus] = useState<'idle' | 'uploading' | 'processing'>('idle');

async function upload(file: File) {
  setStatus('uploading');
  try {
    await ingestPDF(projectId, file);
    setStatus('idle');
  } catch (error) {
    setStatus('idle');
    throw error;
  }
}
```

## Next Steps

1. Create the API client in your frontend
2. Add upload functionality to your file manager
3. Integrate chat into paper detail pages
4. Add podcast/video generation buttons
5. Show synthesis results in project views

---

For questions or issues, check the main [README.md](README.md).

