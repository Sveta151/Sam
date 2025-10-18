# Supabase Integration - Complete Implementation

## ✅ Implementation Status

All Supabase integration tasks have been completed successfully!

### What Was Built

1. **Database Schema** (`supabase/schema.sql`)
   - ✅ `projects` table - Research projects
   - ✅ `folders` table - Hierarchical folder structure
   - ✅ `papers` table - Paper metadata with storage references
   - ✅ `paper_assets` table - Generated assets (audio, video, etc.)
   - ✅ Indexes for performance optimization
   - ✅ RLS disabled for hackathon (documented for future)

2. **Storage Buckets** (via `scripts/supabase-setup.ts`)
   - ✅ `papers` - PDF uploads
   - ✅ `audio` - Podcast MP3s
   - ✅ `video` - Summary videos
   - ✅ `thumbs` - Thumbnails
   - ✅ `json` - Transcripts and metadata

3. **Backend Infrastructure**
   - ✅ `lib/supabase/client.ts` - Client and server Supabase helpers
   - ✅ `lib/data.ts` - Server-side query functions
   - ✅ `lib/storage.ts` - Storage utility helpers
   - ✅ `lib/hooks/useSupabaseUploads.ts` - Client-side upload hooks

4. **API Routes**
   - ✅ `POST /api/upload` - PDF upload endpoint
   - ✅ `POST /api/assets/proxy-upload` - Generated asset proxy
   - ✅ `GET /api/papers/[id]/assets` - List paper assets

5. **UI Components**
   - ✅ `components/upload-dropzone.tsx` - Drag-and-drop PDF uploader
   - ✅ `components/action-tiles.tsx` - Generate podcast/video buttons (with Supabase integration hooks)
   - ✅ Updated `app/paper/[id]/page.tsx` - Paper reader with asset generation
   - ✅ Updated `app/projects/[id]/page.tsx` - Project view with upload dropzone

6. **Documentation**
   - ✅ Comprehensive README section
   - ✅ SQL schema with comments
   - ✅ API documentation
   - ✅ Setup instructions
   - ✅ Troubleshooting guide

## 🚀 Quick Start Guide

### 1. Install Dependencies

```bash
cd paperpilot
npm install
```

Dependencies installed:
- `@supabase/supabase-js` - Supabase client
- `zod` - Schema validation
- `tsx` - TypeScript execution (dev)

### 2. Set Up Supabase

#### Create Project
1. Go to https://app.supabase.com
2. Create a new project
3. Wait for setup to complete

#### Configure Environment
Create `.env.local` in the `paperpilot/` directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Get these values from: **Supabase Dashboard → Settings → API**

#### Run Database Schema
1. Open Supabase SQL Editor
2. Copy contents of `supabase/schema.sql`
3. Execute the SQL

#### Create Storage Buckets
```bash
npx tsx scripts/supabase-setup.ts
```

### 3. Start Development

```bash
npm run dev
```

Visit http://localhost:3000 (or your configured port)

## 📁 File Structure

```
paperpilot/
├── .env.local                          # Environment variables (create this)
├── supabase/
│   └── schema.sql                      # Database schema
├── scripts/
│   └── supabase-setup.ts               # Bucket creation script
├── lib/
│   ├── supabase/
│   │   └── client.ts                   # Supabase clients (sb, sbServer)
│   ├── data.ts                         # Server-side queries
│   ├── storage.ts                      # Storage utilities
│   └── hooks/
│       └── useSupabaseUploads.ts       # Upload hooks
├── app/
│   ├── api/
│   │   ├── upload/
│   │   │   └── route.ts                # PDF upload endpoint
│   │   ├── assets/
│   │   │   └── proxy-upload/
│   │   │       └── route.ts            # Asset proxy endpoint
│   │   └── papers/
│   │       └── [id]/
│   │           └── assets/
│   │               └── route.ts        # List assets endpoint
│   ├── paper/
│   │   └── [id]/
│   │       └── page.tsx                # Paper reader (updated)
│   └── projects/
│       └── [id]/
│           └── page.tsx                # Project view (updated)
└── components/
    ├── upload-dropzone.tsx             # PDF upload component
    └── action-tiles.tsx                # Asset generation (updated)
```

## 🔄 Data Flow

### PDF Upload Flow

```
User drops PDF
    ↓
UploadDropzone component
    ↓
useSupabaseUploads.uploadPdf()
    ↓
POST /api/upload
    ↓
1. Validate PDF
2. Upload to Supabase Storage (papers bucket)
3. Create record in papers table
4. Return paper metadata
    ↓
UI updates with success toast
```

### Generated Asset Flow

```
User clicks "Generate Podcast"
    ↓
ActionTiles component
    ↓
Call paperbrain API (TODO: integrate)
    ↓
Paperbrain returns asset URL
    ↓
useSupabaseUploads.saveGeneratedAsset()
    ↓
POST /api/assets/proxy-upload
    ↓
1. Fetch remote file
2. Upload to Supabase Storage (audio/video bucket)
3. Create record in paper_assets table
4. Return public URL
    ↓
UI displays audio/video player
```

## 🔌 API Reference

### Upload PDF

**Endpoint:** `POST /api/upload`

**Request:** `multipart/form-data`
- `projectId` (string, required) - Project UUID
- `folderId` (string, optional) - Folder UUID
- `file` (File, required) - PDF file

**Response:**
```json
{
  "paperId": "550e8400-e29b-41d4-a716-446655440000",
  "publicUrl": "https://xyz.supabase.co/storage/v1/object/public/papers/...",
  "storagePath": "projectId/folderId/filename.pdf",
  "title": "Paper Title"
}
```

**Errors:**
- `400` - Missing required fields or invalid PDF
- `500` - Upload or database error

### Save Generated Asset

**Endpoint:** `POST /api/assets/proxy-upload`

**Request:** `application/json`
```json
{
  "url": "https://paperbrain.example.com/output/audio.mp3",
  "paperId": "550e8400-e29b-41d4-a716-446655440000",
  "kind": "audio"
}
```

**Kind values:**
- `audio` - Podcast MP3s
- `video` - Summary videos
- `thumb` - Thumbnails
- `transcript` - Text transcripts
- `json` - Metadata/synthesis

**Response:**
```json
{
  "assetId": "660e8400-e29b-41d4-a716-446655440001",
  "publicUrl": "https://xyz.supabase.co/storage/v1/object/public/audio/...",
  "storagePath": "paperId/filename.mp3",
  "kind": "audio",
  "bytes": 1234567
}
```

**Errors:**
- `400` - Invalid request or failed to fetch URL
- `500` - Upload or database error

### List Paper Assets

**Endpoint:** `GET /api/papers/[id]/assets`

**Response:**
```json
{
  "assets": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "paper_id": "550e8400-e29b-41d4-a716-446655440000",
      "kind": "audio",
      "public_url": "https://...",
      "storage_path": "paperId/file.mp3",
      "bytes": 1234567,
      "etag": "...",
      "created_at": "2025-10-18T12:00:00Z"
    }
  ]
}
```

## 🎯 Integration Points

### Where to Add PaperBrain Integration

#### 1. ActionTiles Component (`components/action-tiles.tsx`)

Replace TODO comments with actual API calls:

```typescript
// Example: Generate Podcast
const handleGeneratePodcast = async () => {
  setLoading('podcast');
  try {
    // Call paperbrain API
    const response = await fetch(`http://localhost:3001/api/v1/podcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paperId }),
    });
    
    const data = await response.json();
    
    // Save to Supabase
    await saveGeneratedAsset({
      paperId,
      url: data.audioUrl,
      kind: 'audio',
    });
    
    toast.success('Podcast generated and saved!');
  } catch (error) {
    toast.error('Failed to generate podcast');
  } finally {
    setLoading(null);
  }
};
```

#### 2. Paper Reader (`app/paper/[id]/page.tsx`)

Add asset display:

```typescript
import { fetchPaperAssets } from '@/lib/hooks/useSupabaseUploads';

// In component
const [assets, setAssets] = useState([]);

useEffect(() => {
  fetchPaperAssets(id).then(setAssets);
}, [id]);

// In render
{assets.filter(a => a.kind === 'audio').map(asset => (
  <audio key={asset.id} controls src={asset.public_url} />
))}

{assets.filter(a => a.kind === 'video').map(asset => (
  <video key={asset.id} controls src={asset.public_url} />
))}
```

#### 3. Upload Callback

Refresh papers list after upload:

```typescript
<UploadDropzone 
  projectId={project.id} 
  folderId={selectedFolderId}
  onUploadComplete={(paperId) => {
    // Fetch updated papers from Supabase
    // Or use SWR/React Query to auto-refresh
    router.refresh();
  }}
/>
```

## 🔒 Security Considerations

### Current Setup (Hackathon Mode)

⚠️ **For demo purposes only:**
- All buckets are public
- No authentication required
- RLS disabled on all tables
- Service role key used for all operations

### Production Checklist

Before deploying to production:

1. **Enable Authentication**
   ```typescript
   // Add Supabase Auth
   import { Auth } from '@supabase/auth-ui-react';
   ```

2. **Enable RLS**
   ```sql
   ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
   
   CREATE POLICY "Users can view own projects"
     ON projects FOR SELECT
     USING (auth.uid() = user_id);
   ```

3. **Secure Buckets**
   - Make buckets private
   - Use signed URLs for access
   - Add RLS policies on storage

4. **Environment Variables**
   - Never commit `.env.local`
   - Use Vercel/platform secrets
   - Rotate service role key regularly

5. **Rate Limiting**
   - Add rate limiting to API routes
   - Use Vercel Edge Config or Upstash

6. **Validation**
   - Validate file sizes (max 100MB)
   - Check file types server-side
   - Sanitize filenames

## 🐛 Troubleshooting

### "Missing Supabase environment variables"

**Solution:**
1. Create `.env.local` in `paperpilot/` directory
2. Add all three environment variables
3. Restart dev server: `npm run dev`

### "Bucket not found"

**Solution:**
```bash
npx tsx scripts/supabase-setup.ts
```

Or create manually in Supabase dashboard: **Storage → New Bucket**

### "sbServer should never be imported on the client side"

**Cause:** Importing `sbServer` in a client component

**Solution:** 
- Only import `sbServer` in API routes and server components
- Use `sb` (client) in client components

### Upload fails silently

**Check:**
1. Supabase project is active
2. Environment variables are correct
3. Buckets exist and are public
4. Network tab in DevTools for errors

### Assets not displaying

**Check:**
1. Asset was saved successfully (check `paper_assets` table)
2. Public URL is accessible (open in new tab)
3. CORS is configured (usually not needed for public buckets)

## 📊 Database Schema

### Tables

#### `projects`
- `id` (uuid, PK)
- `name` (text)
- `domain_focus` (text, nullable)
- `created_at` (timestamptz)

#### `folders`
- `id` (uuid, PK)
- `project_id` (uuid, FK → projects)
- `name` (text)
- `parent_id` (uuid, FK → folders, nullable)
- `tags` (text[])
- `created_at` (timestamptz)

#### `papers`
- `id` (uuid, PK)
- `project_id` (uuid, FK → projects)
- `folder_id` (uuid, FK → folders, nullable)
- `title` (text)
- `authors` (text[])
- `venue` (text, nullable)
- `year` (int, nullable)
- `citations` (int, nullable)
- `storage_path` (text)
- `public_url` (text)
- `created_at` (timestamptz)

#### `paper_assets`
- `id` (uuid, PK)
- `paper_id` (uuid, FK → papers)
- `kind` (enum: audio, video, thumb, transcript, json)
- `storage_path` (text)
- `public_url` (text)
- `bytes` (bigint, nullable)
- `etag` (text, nullable)
- `created_at` (timestamptz)

### Indexes

- `idx_folders_project_id` on `folders(project_id)`
- `idx_folders_parent_id` on `folders(parent_id)`
- `idx_papers_project_id` on `papers(project_id)`
- `idx_papers_folder_id` on `papers(folder_id)`
- `idx_paper_assets_paper_id` on `paper_assets(paper_id)`
- `idx_paper_assets_kind` on `paper_assets(kind)`

## ✅ Acceptance Checklist

All requirements from the specification have been met:

- [x] Dependencies installed (@supabase/supabase-js, zod, sonner)
- [x] `.env.local` template created
- [x] Supabase client helpers (sb, sbServer) with safety checks
- [x] Bucket setup script with graceful error handling
- [x] Complete database schema with RLS disabled
- [x] PDF upload API route with validation
- [x] Asset proxy upload API route
- [x] List assets API route
- [x] Client-side upload hooks
- [x] Storage utility helpers
- [x] Server-side data query helpers
- [x] Upload dropzone component
- [x] ActionTiles updated with Supabase integration
- [x] Paper page updated to pass paperId
- [x] Project page updated with upload dropzone
- [x] Comprehensive README section
- [x] No linter errors
- [x] Service role key never exposed client-side
- [x] Project builds successfully

## 🎉 Next Steps

1. **Set up your Supabase project** following the Quick Start Guide
2. **Test PDF upload** by dragging a file into the dropzone
3. **Integrate paperbrain API** in ActionTiles component
4. **Display generated assets** in the paper reader
5. **Add authentication** when ready for production

## 📞 Support

For issues or questions:
- Check the Troubleshooting section
- Review Supabase documentation: https://supabase.com/docs
- Check Next.js App Router docs: https://nextjs.org/docs

---

**Implementation Date:** October 18, 2025  
**Status:** ✅ Complete and Ready for Integration

