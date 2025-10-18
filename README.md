# Sam

## Repository overview
This repo is a small monorepo for the Sam hackathon project. It brings together a minimal Next.js frontend, a lightweight TypeScript backend for PDF/RAG/LLM operations, a set of Python helpers for paper discovery, and a simple browser extension.

## Structure
```
.
├── paperpilot/     # Next.js (App Router, TypeScript) frontend UI + API proxy
├── paperbrain/     # Fastify-based TypeScript service for PDF/RAG/LLM APIs + local storage
├── search/         # Python utilities to discover/fetch papers (HF, Scholar, Exa)
├── extension/      # Minimal Chrome extension (manifest + popup)
├── INTEGRATION_COMPLETE.md   # Summary of Supabase integration into paperpilot
└── README.md
```

### Major components and their roles
- `paperpilot` (frontend): Project/folder/paper UI, PDF ingest, and display of generated assets (audio/video/summaries). Its API routes proxy calls to the backend (`paperbrain`). No Supabase is required for the current setup. See `paperpilot/README.md` for UI details.
- `paperbrain` (backend): Serves HTTP APIs for ingesting PDFs, RAG chat, podcast generation, video scripting, and video generation. Stores JSON state and generated media locally under `paperbrain/data/`. See `paperbrain/README.md` for endpoints and environment configuration.
- `search` (python): Standalone helpers and a FastAPI service to discover/import papers from external sources (Hugging Face feeds, Exa, arXiv/Google Scholar via MCP). See `search/README.md` for endpoints and CLI usage.
- `extension`: Optional Chrome extension to streamline importing or kicking off actions from the browser.

## How things are integrated
- **Frontend ↔ Backend**: `paperpilot` proxies to `paperbrain` for all compute: ingest (`/ingest`), chat (`/chat`), podcast (`/podcast`), video script (`/video-script`), and video generation (`/generate-video`). See `paperpilot/app/api/*` for the proxy routes.
- **Storage**: In the current setup, files and generated assets are stored and served locally by `paperbrain` under `paperbrain/data/` (e.g., `data/audio/*.mp3`, `data/video/*.mp4`, JSON state under `data/`). No Supabase is used.
- **Data flow**:
  1) Upload in `paperpilot` → forwarded to `paperbrain` `/ingest`.
  2) Actions in UI (chat/podcast/video) → proxy to `paperbrain` endpoints.
  3) `paperbrain` returns local file paths/URLs under its `data/` directory.
  4) `paperpilot` renders returned outputs directly.

## Getting started (high level)
- Backend: `cd paperbrain && npm i && npm run dev` (runs on http://localhost:3001)
- Frontend: `cd paperpilot && npm i && npm run dev` (proxies to paperbrain via `app/api/*`)
- Search tools (optional): `cd search && pip install -r ../requirements.txt` and see `search/README.md` (FastAPI on http://127.0.0.1:8000)

Notes:
- Some Supabase-related files/docs exist under `paperpilot/` as scaffolding; they are not required for the current local setup.
- For deeper setup and endpoints, refer to the READMEs inside each subproject.