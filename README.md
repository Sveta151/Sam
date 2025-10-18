# Sam

## Repository overview
This repo is a small monorepo for the Sam hackathon project. It brings together a minimal Next.js frontend, a lightweight TypeScript backend for PDF/RAG/LLM operations, a set of Python helpers for paper discovery, and a simple browser extension. 

## Structure
```
.
├── paperpilot/     # Next.js (App Router, TypeScript) frontend UI + API proxy
├── paperbrain/     # Fastify-based TypeScript service for PDF/RAG/LLM APIs + local storage
├── search/         # Python FastAPI service to discover/fetch papers (HF, Scholar, Exa)
├── extension/      # Chrome extension to save papers via deep-link
└── README.md
```

### Major components and their roles
- **`paperpilot`** (frontend): Next.js UI for project/folder/paper management, PDF ingest, and display of generated assets (audio/video/summaries). API routes in `app/api/*` proxy requests to `paperbrain`. Uses Zustand for local state and mock data. See `paperpilot/README.md`.
- **`paperbrain`** (backend): Fastify service exposing REST APIs for PDF ingestion, RAG-based chat, podcast generation (ElevenLabs TTS), video script generation, and video rendering (ffmpeg). Stores papers, embeddings, and generated media locally under `paperbrain/data/`. Default port: `8787`. See `paperbrain/README.md`.
- **`search`** (Python): FastAPI service providing unified paper discovery across Hugging Face daily/weekly/monthly feeds, Exa websets, and MCP-based arXiv/Google Scholar tools. Default port: `8000`. See `search/README.md`.
- **`extension`**: Chrome extension (manifest v3) to save the current page as a paper via deep-link to PaperPilot.

## Integration architecture

### Frontend ↔ Backend
`paperpilot` API routes (`app/api/*`) proxy all requests to `paperbrain`:
- `/api/ingest` → `paperbrain:8787/ingest` (PDF upload & chunking)
- `/api/chat` → `paperbrain:8787/chat` (RAG Q&A)
- `/api/podcast` → `paperbrain:8787/podcast` (audio generation)
- `/api/video-script` → `paperbrain:8787/video-script` (script generation)
- `/api/generate-video` → `paperbrain:8787/generate-video` (video rendering)
- `/api/synthesize` → `paperbrain:8787/synthesize` (multi-paper synthesis)

Default proxy target: `http://127.0.0.1:3001` (override via `PAPERBRAIN_BASE_URL` env var).

### Storage
All data is stored locally by `paperbrain` under `paperbrain/data/`:
- `data/{projectId}.json` - Papers, chunks, embeddings (JSON vector store)
- `data/audio/{paperId}.mp3` - Generated podcast audio
- `data/video/{paperId}.mp4` - Generated summary videos
- `data/files/{paperId}.pdf` - Uploaded PDF files

**Note:** Supabase scaffolding exists in `paperpilot/` but is not currently used.

### Data flow
1. User uploads PDF in `paperpilot` UI
2. Frontend calls `/api/ingest` → proxies to `paperbrain`
3. `paperbrain` extracts text, chunks, embeds, stores in JSON
4. User triggers generation (podcast/video) → proxied to `paperbrain`
5. `paperbrain` generates asset, saves to `data/`, returns file path
6. Frontend displays/plays the asset

## Quick start

### 1. Backend (required)
```bash
cd paperbrain
npm install
npm run dev  # Starts on http://0.0.0.0:8787 (default PORT=8787)
```

**Environment:** Copy `.env.example` to `.env` and configure:
- Embedding provider: `OPENAI_API_KEY` or `VOYAGE_API_KEY` or `JINA_API_KEY`
- LLM provider: `ANTHROPIC_API_KEY` or `GROQ_API_KEY`
- Optional: `ELEVENLABS_API_KEY` for podcast TTS

### 2. Frontend (required)
```bash
cd paperpilot
npm install
npm run dev  # Starts on http://localhost:3000 (Next.js default)
```

**Environment (optional):** Set `PAPERBRAIN_BASE_URL` if backend isn't on `http://127.0.0.1:3001`.

### 3. Search service (optional)
```bash
cd search
pip install -r ../requirements.txt
python -m uvicorn search.api:app --host 127.0.0.1 --port 8000 --reload
```

**Environment:** Create `.env` at repo root with:
- `EXA_API_KEY` (for Exa websets)
- `ACADEMIA_MCP_API_KEY` (for arXiv/Scholar via MCP)

### 4. Browser extension (optional)
1. Open Chrome → `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → select `extension/` folder
4. Extension icon appears in toolbar

## Port summary
- **paperbrain**: `8787` (configurable via `PORT` env var)
- **paperpilot**: `3000` (Next.js default, configurable via `next dev -p`)
- **search**: `8000` (FastAPI, configurable via uvicorn args)

**Note:** `paperpilot` API routes default to proxying `http://127.0.0.1:3001` for `paperbrain`. Either:
- Run `paperbrain` on port 3001: `PORT=3001 npm run dev`
- Or set `PAPERBRAIN_BASE_URL=http://127.0.0.1:8787` in `paperpilot/.env.local`

## Documentation
- `paperbrain/README.md` - API endpoints, embedding/LLM providers, data storage
- `paperpilot/README.md` - UI components, state management, mock data
- `search/README.md` - Search tools, API endpoints, response formats
- `paperbrain/QUICKSTART.md` - Step-by-step backend setup
- `INTEGRATION_COMPLETE.md` - Supabase scaffolding notes (not currently used)
