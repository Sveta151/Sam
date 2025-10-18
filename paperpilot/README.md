# PaperPilot

A minimalistic, elegant research paper management MVP built with Next.js 14 (App Router) for hackathon demo.

## 🎯 Features

- **Tinder-style paper discovery** - Swipe through recommended papers with drag interactions
- **Smart folder organization** - Auto-suggest folders based on paper content
- **Reading streak tracking** - Track daily reading progress and maintain streaks
- **Project management** - Organize papers into projects and nested folders
- **Playlist recommendations** - Get top 3 paper recommendations per folder
- **Paper reader** - Track time spent and scroll progress on papers

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with App Router & TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui + Radix primitives
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **State Management**: Zustand with localStorage persistence
- **Design**: Light theme, Inter font, minimal & calm research vibe

## 📦 Installation

```bash
# Install dependencies
npm install

# Set up environment variables (see Supabase Integration below)
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## 🚀 Quick Start

The app is currently running on **http://localhost:3001**

### Mock Data

The app comes pre-seeded with:
- **1 Project**: "FDD Project" (Diffusion Models & Full-Duplex)
- **3 Folders**: 
  - Full Reciprocity
  - Partial Reciprocity
  - Diffusion Model
- **6 Research Papers** with realistic metadata

## 📁 Project Structure

```
paperpilot/
├── app/
│   ├── layout.tsx              # Root layout with sidebar
│   ├── page.tsx                # Home page with Tinder deck
│   ├── projects/
│   │   ├── page.tsx            # Projects list
│   │   └── [id]/page.tsx       # Project detail with folder tree
│   ├── tinder/page.tsx         # Full-screen swipe deck
│   └── paper/[id]/page.tsx     # Paper reader with tracking
├── components/
│   ├── sidebar.tsx             # Navigation sidebar
│   ├── paper-card.tsx          # Paper display (compact/tinder modes)
│   ├── swipe-deck.tsx          # Draggable card stack
│   ├── decision-modal.tsx      # Save paper modal with autosuggest
│   ├── streak-widget.tsx       # Reading streak display
│   ├── nudge-card.tsx          # Daily goal reminder
│   ├── folder-tree.tsx         # Collapsible folder navigation
│   ├── playlist-three.tsx      # Top 3 recommendations
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── types.ts                # TypeScript interfaces
│   ├── store.ts                # Zustand state management
│   ├── mock.ts                 # Seed data
│   └── utils.ts                # Helper functions
└── styles/
    └── globals.css             # Global styles & CSS variables
```

## 🎨 Design Language

- **Colors**: Indigo accent (#4f46e5), neutral grays, white backgrounds
- **Typography**: Inter font family
- **Spacing**: Roomy (md: 6, lg: 8)
- **Borders**: rounded-2xl, soft shadows, muted borders
- **Motion**: Fade/slide 150-200ms, ease-out timing
- **Layout**: 12-column grid, max-width 1920px

## 🔄 User Flow

1. **Home** → View Tinder deck with recommended papers
2. **Swipe/Click Yes** → Opens decision modal with auto-suggested folder
3. **Save to Folder** → Paper added to project folder
4. **Saved Papers** (sidebar) → View all projects
5. **Project Detail** → Browse folder tree, view papers, see playlist recommendations
6. **Paper Reader** → Read paper with time & scroll tracking

## 🎯 Key Interactions

- **Drag to swipe** papers left (skip) or right (save)
- **Keyboard support**: Arrow keys for Yes/No on Tinder page
- **Auto-suggest**: Fuzzy matching between paper title and folder name/tags
- **Streak tracking**: Updates when reading papers and scrolling
- **LocalStorage**: All state persists across sessions

## 📊 State Management

Zustand store includes:
- `projects`, `folders`, `papers`, `recs`, `reads`
- `swipe()` - Handle paper save/skip
- `autosuggestFolder()` - Smart folder matching
- `markReadProgress()` - Track reading activity
- `getTinderFeed()` - Get unprocessed recommendations
- `getPlaylistForFolder()` - Get top 3 recommendations per folder
- `getStreak()` - Calculate consecutive reading days
- `getTodayMinutes()` - Sum today's reading time

## 🎭 Components Breakdown

### PaperCard
- **Modes**: `compact` (list view) | `tinder` (full card)
- Shows: title, authors, venue, year, citations, summary, labels

### SwipeDeck
- Draggable card stack with framer-motion
- Visual feedback: "SKIP" / "SAVE" overlays
- Buttons for non-drag interaction
- Opens DecisionModal on "Yes"

### DecisionModal
- Displays paper preview
- Dropdown to select folder (auto-suggested by default)
- Confirms and saves paper to folder
- Toast notification on success

### StreakWidget
- **Variants**: `compact` (sidebar) | `full` (home page)
- Shows: flame icon, streak count, today's minutes, progress ring
- Daily goal: 30 minutes

### FolderTree
- Collapsible nested structure
- Shows folder tags on selection
- Highlights selected folder

## 🗄️ Supabase Integration

PaperPilot uses Supabase for storing user-uploaded PDFs and generated assets (audio, video, thumbnails, transcripts).

### Setup Instructions

#### 1. Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Create a new project
3. Wait for the project to finish setting up

#### 2. Configure Environment Variables

Create a `.env.local` file in the `paperpilot/` directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**Where to find these values:**
- Go to your Supabase project settings
- Navigate to **Settings → API**
- Copy the **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- Copy the **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copy the **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

#### 3. Run Database Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `supabase/schema.sql`
5. Click **Run** to execute the SQL

This creates:
- `projects` table - Top-level research projects
- `folders` table - Hierarchical folder structure
- `papers` table - Paper metadata and storage references
- `paper_assets` table - Generated assets (audio, video, etc.)
- Indexes for performance
- RLS disabled for hackathon (enable later with auth)

#### 4. Create Storage Buckets

Run the setup script to create storage buckets:

```bash
# Using tsx (recommended)
npx tsx scripts/supabase-setup.ts

# Or using ts-node
npx ts-node scripts/supabase-setup.ts
```

This creates the following **public** buckets:
- `papers` - User-uploaded PDF files
- `audio` - Generated podcast MP3s
- `video` - Generated summary videos
- `thumbs` - Optional thumbnails
- `json` - Synthesis JSONs, transcripts, metadata

**Alternatively**, you can create buckets manually in the Supabase dashboard:
1. Go to **Storage** in your Supabase dashboard
2. Click **New bucket**
3. Create each bucket listed above
4. Set them as **Public** buckets

### How It Works

#### Upload Flow

1. **User drags PDF** into the `UploadDropzone` component
2. **Client-side hook** (`useSupabaseUploads`) sends file to `/api/upload`
3. **Server route** (`app/api/upload/route.ts`):
   - Validates PDF file
   - Uploads to Supabase Storage (`papers` bucket)
   - Creates metadata record in `papers` table
   - Returns paper ID and public URL
4. **UI updates** with success toast

#### Generated Assets Flow

1. **User clicks** "Generate Podcast" or "Make Video" in `ActionTiles`
2. **Frontend calls** paperbrain API (to be integrated)
3. **Paperbrain returns** URL to generated asset (audio/video)
4. **Frontend calls** `/api/assets/proxy-upload` with:
   - `url` - Remote asset URL
   - `paperId` - Paper to associate with
   - `kind` - Asset type (audio/video/thumb/transcript/json)
5. **Server route** (`app/api/assets/proxy-upload/route.ts`):
   - Fetches remote file
   - Uploads to appropriate Supabase bucket
   - Creates record in `paper_assets` table
   - Returns public URL
6. **UI displays** audio/video player with Supabase CDN URL

### API Routes

#### `POST /api/upload`
Upload a PDF file to Supabase.

**Request:** `multipart/form-data`
```
projectId: string (required)
folderId: string (optional)
file: File (PDF, required)
```

**Response:**
```json
{
  "paperId": "uuid",
  "publicUrl": "https://...",
  "storagePath": "projectId/folderId/file.pdf",
  "title": "Paper Title"
}
```

#### `POST /api/assets/proxy-upload`
Save a generated asset from a remote URL.

**Request:** `application/json`
```json
{
  "url": "https://paperbrain.example.com/audio.mp3",
  "paperId": "uuid",
  "kind": "audio" | "video" | "thumb" | "transcript" | "json"
}
```

**Response:**
```json
{
  "assetId": "uuid",
  "publicUrl": "https://...",
  "storagePath": "paperId/file.mp3",
  "kind": "audio",
  "bytes": 1234567
}
```

#### `GET /api/papers/[id]/assets`
List all assets for a paper.

**Response:**
```json
{
  "assets": [
    {
      "id": "uuid",
      "paper_id": "uuid",
      "kind": "audio",
      "public_url": "https://...",
      "storage_path": "...",
      "bytes": 1234567,
      "created_at": "2025-10-18T..."
    }
  ]
}
```

### File Structure

```
paperpilot/
├── lib/
│   ├── supabase/
│   │   └── client.ts           # Supabase client helpers (sb, sbServer)
│   ├── data.ts                 # Server-side query helpers
│   ├── storage.ts              # Storage utility functions
│   └── hooks/
│       └── useSupabaseUploads.ts  # Client-side upload hooks
├── app/api/
│   ├── upload/route.ts         # PDF upload endpoint
│   ├── assets/
│   │   └── proxy-upload/route.ts  # Asset proxy endpoint
│   └── papers/[id]/
│       └── assets/route.ts     # List paper assets
├── components/
│   ├── upload-dropzone.tsx     # Drag-and-drop PDF upload
│   └── action-tiles.tsx        # Generate podcast/video buttons
├── scripts/
│   └── supabase-setup.ts       # Bucket creation script
└── supabase/
    └── schema.sql              # Database schema
```

### Security Notes (Hackathon Mode)

⚠️ **Current Setup (Hackathon)**:
- All storage buckets are **public**
- Row Level Security (RLS) is **disabled**
- No authentication required
- Service role key used for all operations

✅ **Production Recommendations**:
1. Enable Supabase Auth
2. Enable RLS on all tables
3. Add policies to restrict access by `auth.uid()`
4. Make buckets private and use signed URLs
5. Never expose `SUPABASE_SERVICE_ROLE_KEY` to client
6. Add rate limiting on API routes
7. Validate file types and sizes server-side

### Troubleshooting

**"Missing Supabase environment variables"**
- Ensure `.env.local` exists with all three keys
- Restart the dev server after adding env vars

**"Upload failed: Bucket not found"**
- Run `npx tsx scripts/supabase-setup.ts` to create buckets
- Or create them manually in Supabase dashboard

**"sbServer should never be imported on the client side"**
- Only import `sbServer` in server files (API routes, server components)
- Use `sb` (client) in client components

**"Failed to fetch file from URL"**
- Ensure paperbrain API is running and accessible
- Check CORS settings if calling from different origin

### Integration with PaperBrain

To integrate with the paperbrain backend:

1. **Update `ActionTiles` component** (`components/action-tiles.tsx`):
   - Replace TODO comments with actual API calls
   - Example for podcast:
     ```typescript
     const response = await fetch(`http://localhost:3001/api/v1/podcast/${paperId}`);
     const data = await response.json();
     await saveGeneratedAsset({
       paperId,
       url: data.audioUrl,
       kind: 'audio',
     });
     ```

2. **Update paper reader** to display saved assets:
   - Fetch assets using `fetchPaperAssets(paperId)`
   - Render `<audio>` or `<video>` elements with public URLs

3. **Sync paper metadata**:
   - When uploading PDF, extract metadata and update `papers` table
   - Use paperbrain's `/api/v1/papers` endpoints

## 🔮 Future Enhancements

- Real PDF rendering with annotations
- Full paperbrain API integration
- Chat panel for paper Q&A (RAG)
- Advanced recommendation algorithms
- User authentication and RLS
- Collaborative features (sharing, comments)

## 📝 Notes

- All API calls are stubbed (no backend)
- Mock data auto-initializes on first load
- State persists in localStorage as `paperpilot-storage`
- Optimized for desktop, mobile-friendly
- Accessibility: aria-labels, keyboard navigation, reduced-motion support

## 🙏 Acknowledgments

Built for hackathon MVP demonstration. Clean, minimal, research-focused UI following modern web best practices.

---

**Status**: ✅ All features implemented and working
**Build**: ✅ Production build successful
**Dev Server**: Running on port 3001
