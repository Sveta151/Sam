# Migration Guide: PaperBrain v1 API

This document describes the changes from the original PaperBrain API to the new v1 versioned API.

## Overview of Changes

### ✅ What's New

- **Versioned API** - All endpoints now under `/v1/` prefix
- **Project & Folder Management** - Hierarchical organization of papers
- **OpenAPI Documentation** - Interactive docs at `/docs`
- **CORS Support** - Configurable CORS for frontend integration
- **Improved Error Handling** - Consistent error responses
- **File-based Store** - Better data persistence with `meta.json` + individual paper files

### 🔄 Breaking Changes

1. **Endpoint Paths** - All endpoints moved to `/v1/` namespace
2. **Data Model** - Papers now require `projectId` and support `folderId`
3. **Store Structure** - New file-based store replaces in-memory store
4. **Response Formats** - Standardized response schemas

## Endpoint Migration

### Health Check

**Before:**
```
GET /health
```

**After:**
```
GET /health  (unchanged)
```

### Ingest

**Before:**
```bash
POST /ingest
Form data:
  - projectId: string
  - file: PDF
```

**After:**
```bash
POST /v1/papers/ingest
Form data:
  - projectId: string (required)
  - folderId: string (optional)
  - filename: string (optional)
  - pdf: PDF file
```

**Response Change:**
```json
// Before
{
  "paperId": "...",
  "chunks": 42
}

// After
{
  "paper": {
    "id": "...",
    "projectId": "...",
    "folderId": "...",
    "title": "...",
    "authors": [...],
    ...
  },
  "chunks": 42
}
```

### Chat

**Before:**
```bash
POST /chat
{
  "paperId": "...",
  "messages": [...],
  "topK": 8,
  "projectId": "default"
}
```

**After:**
```bash
POST /v1/chat
{
  "paperId": "...",
  "messages": [...],
  "topK": 8
}

# Or use the alias:
POST /v1/papers/{paperId}/chat
{
  "messages": [...],
  "topK": 8
}
```

**Note:** `projectId` is no longer needed in the request body.

### Synthesis

**Before:**
```bash
POST /synthesize
{
  "projectId": "...",
  "paperIds": [...]
}
```

**After:**
```bash
POST /v1/synthesis
{
  "projectId": "...",  # optional
  "paperIds": [...]    # 3-10 papers required
}
```

**Response Change:**
```json
// Before
{
  "folderId": "...",
  "storyline": "...",
  "deltas": "...",
  "tableMarkdown": "..."
}

// After
{
  "storyline": "...",
  "deltas": "...",
  "tableMarkdown": "..."
}
```

### Podcast

**Before:**
```bash
POST /podcast
{
  "paperId": "...",
  "style": "neutral",
  "duration": 180,
  "projectId": "default"
}
```

**After:**
```bash
POST /v1/papers/{paperId}/podcast
# No body required
```

**Response Change:**
```json
// Before
{
  "url": "/data/audio/paper_123.mp3",
  "bytesLength": 12345
}

// After
{
  "url": "/audio/paper_123.mp3"
}
```

### Video Script

**Before:**
```bash
POST /video-script
{
  "paperId": "...",
  "projectId": "default"
}
```

**After:**
```bash
POST /v1/papers/{paperId}/video-script
# No body required
```

### Generate Video

**Before:**
```bash
POST /generate-video
{
  "paperId": "...",
  "projectId": "default",
  "videoScript": {...},
  "duration": 60
}
```

**After:**
```bash
POST /v1/papers/{paperId}/generate-video
{
  "includeAudio": false  # optional
}
```

**Note:** Video script is now generated automatically.

## New Endpoints

### Projects

```bash
GET    /v1/projects
POST   /v1/projects
GET    /v1/projects/{id}
PATCH  /v1/projects/{id}
DELETE /v1/projects/{id}
```

### Folders

```bash
GET    /v1/folders
POST   /v1/folders
GET    /v1/folders/{id}
PATCH  /v1/folders/{id}
DELETE /v1/folders/{id}
GET    /v1/folders/{id}/papers
```

### Papers

```bash
GET    /v1/papers
GET    /v1/papers/{id}
PATCH  /v1/papers/{id}
DELETE /v1/papers/{id}
GET    /v1/papers/{id}/chunks
```

### Search

```bash
GET    /v1/search?query=...&projectId=...
```

## Data Model Changes

### Paper Object

**Before:**
```typescript
interface Paper {
  id: string;
  title: string;
  authors: string[];
  venue?: string;
  year?: number;
  citations?: number;
  sourcePath?: string;
}
```

**After:**
```typescript
interface Paper {
  id: string;
  projectId: string;        // NEW: Required
  folderId?: string;        // NEW: Optional
  title: string;
  authors: string[];
  venue?: string;
  year?: number;
  citations?: number;
  sourcePath?: string;
  tags?: string[];          // NEW: Optional
}
```

### Project Object (NEW)

```typescript
interface Project {
  id: string;
  name: string;
  domainFocus?: string;
}
```

### Folder Object (NEW)

```typescript
interface Folder {
  id: string;
  projectId: string;
  name: string;
  parentId?: string;
  tags?: string[];
}
```

## Store Migration

### Old Store Structure

```
data/
└── {projectId}.json    # All papers + chunks in one file
```

### New Store Structure

```
data/
├── meta.json           # Projects, folders, papers metadata
├── papers/
│   └── {paperId}.json  # Individual paper + chunks
├── files/
│   └── {paperId}.pdf   # PDF files
├── audio/
│   └── {paperId}.mp3   # Audio files
└── video/
    └── {paperId}.mp4   # Video files
```

### Migration Script

To migrate from the old store to the new store:

```typescript
// migrate-store.ts
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

async function migrate() {
  const oldDataDir = './data';
  const newDataDir = './data';
  
  // Create new directories
  await mkdir(join(newDataDir, 'papers'), { recursive: true });
  await mkdir(join(newDataDir, 'files'), { recursive: true });
  
  // Read old project file
  const oldData = JSON.parse(
    await readFile(join(oldDataDir, 'default.json'), 'utf-8')
  );
  
  // Create meta.json
  const meta = {
    projects: [{
      id: 'default',
      name: 'Default Project',
    }],
    folders: [],
    papers: oldData.papers.map(p => ({
      ...p,
      projectId: 'default',
    })),
  };
  
  await writeFile(
    join(newDataDir, 'meta.json'),
    JSON.stringify(meta, null, 2)
  );
  
  // Create individual paper files
  for (const paper of oldData.papers) {
    const chunks = oldData.chunks.filter(c => c.paperId === paper.id);
    const paperData = { paper: { ...paper, projectId: 'default' }, chunks };
    
    await writeFile(
      join(newDataDir, 'papers', `${paper.id}.json`),
      JSON.stringify(paperData, null, 2)
    );
  }
  
  console.log('Migration complete!');
}

migrate();
```

## Environment Variables

### New Variables

- `CORS_ORIGIN` - CORS origin (default: `http://localhost:3000`)
- `PORT` - Changed default from `3001` to `8787`

### Unchanged

- `HOST`, `DATA_DIR`, `EMBEDDINGS_PROVIDER`, `LLM_PROVIDER`
- All API keys remain the same

## Code Examples

### Before: Ingest + Chat

```typescript
// Ingest
const formData = new FormData();
formData.append('projectId', 'default');
formData.append('file', pdfFile);

const { paperId } = await fetch('http://localhost:3001/ingest', {
  method: 'POST',
  body: formData,
}).then(r => r.json());

// Chat
const response = await fetch('http://localhost:3001/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paperId,
    messages: [{ role: 'user', content: 'What is this paper about?' }],
    projectId: 'default',
  }),
}).then(r => r.json());
```

### After: Ingest + Chat

```typescript
// Create project first
const { id: projectId } = await fetch('http://localhost:8787/v1/projects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'My Research' }),
}).then(r => r.json());

// Ingest
const formData = new FormData();
formData.append('projectId', projectId);
formData.append('pdf', pdfFile);

const { paper } = await fetch('http://localhost:8787/v1/papers/ingest', {
  method: 'POST',
  body: formData,
}).then(r => r.json());

// Chat
const response = await fetch('http://localhost:8787/v1/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paperId: paper.id,
    messages: [{ role: 'user', content: 'What is this paper about?' }],
  }),
}).then(r => r.json());
```

## Testing the Migration

1. **Build the new version:**
   ```bash
   npm run build
   ```

2. **Start the server:**
   ```bash
   npm run dev
   ```

3. **Check OpenAPI docs:**
   Open `http://localhost:8787/docs` to explore all endpoints

4. **Test basic workflow:**
   ```bash
   # Create project
   PROJECT_ID=$(curl -X POST http://localhost:8787/v1/projects \
     -H 'Content-Type: application/json' \
     -d '{"name":"Test"}' | jq -r '.id')
   
   # Ingest paper
   PAPER_ID=$(curl -X POST http://localhost:8787/v1/papers/ingest \
     -F "projectId=$PROJECT_ID" \
     -F "pdf=@test.pdf" | jq -r '.paper.id')
   
   # Chat
   curl -X POST http://localhost:8787/v1/chat \
     -H 'Content-Type: application/json' \
     -d "{\"paperId\":\"$PAPER_ID\",\"messages\":[{\"role\":\"user\",\"content\":\"Summarize this paper\"}]}"
   ```

## Rollback Plan

If you need to rollback to the old version:

1. Keep a backup of your `data/` directory
2. Checkout the previous commit: `git checkout <old-commit>`
3. Restore the old data directory
4. Run `npm install` and `npm run dev`

## Support

For issues or questions:
- Check the [API_README.md](./API_README.md) for full documentation
- Review the OpenAPI docs at `/docs`
- Check the example code in the README

