# Sam

## Repository overview
This repo is a small monorepo for the Sam hackathon project. It brings together a minimal Next.js frontend, a lightweight TypeScript backend for RAG/LLM operations, a set of Python helpers for paper discovery, and a simple browser extension.

## Structure
```
.
├── paperpilot/     # Next.js (App Router, TypeScript) frontend UI
├── paperbrain/     # Fastify-based TypeScript service for PDF/RAG/LLM APIs
├── search/         # Python utilities to discover/fetch papers (HF, Scholar, Exa)
├── extension/      # Minimal Chrome extension (manifest + popup)
├── INTEGRATION_COMPLETE.md   # Summary of Supabase integration into paperpilot
└── README.md
```

### Major components and their roles
- `paperpilot` (frontend): Project/folder/paper UI, PDF uploads, and display of generated assets (audio/video/summaries). Uses Supabase for storage + metadata. See `paperpilot/SUPABASE_INTEGRATION.md` and the summary in `INTEGRATION_COMPLETE.md`.
- `paperbrain` (backend): Serves HTTP APIs for parsing PDFs, retrieval-augmented generation, and content generation. Exposes an OpenAPI-described surface and is designed to be called by the frontend for actions like “Generate Podcast/Video/Summary.” See `paperbrain/README.md` and `paperbrain/QUICKSTART.md`.
- `search` (python): Standalone helpers to discover/import papers from external sources (e.g., Hugging Face feeds, Google Scholar). Outputs data that can be ingested by the app.
- `extension`: Optional Chrome extension to streamline importing or kicking off actions from the browser.

## How things are integrated
- **Frontend ↔ Backend**: `paperpilot` calls `paperbrain` HTTP endpoints to generate assets (podcasts, videos, summaries) from uploaded papers. The code is structured so you can wire these calls inside `paperpilot/components/action-tiles.tsx` and related pages. See examples and TODOs in `INTEGRATION_COMPLETE.md`.
- **Storage (Supabase)**: `paperpilot` is integrated with Supabase for PDF uploads and generated assets. It creates database rows and stores files in public buckets for hackathon speed. Details, schema, and helpers are documented in `paperpilot/SUPABASE_INTEGRATION.md` and summarized in `INTEGRATION_COMPLETE.md`.
- **Data flow**:
  1) Upload PDF in `paperpilot` → stored in Supabase (file + metadata).
  2) Trigger generation in the UI → `paperpilot` calls `paperbrain`.
  3) Resulting asset URL is saved back to Supabase via `paperpilot`.
  4) Assets are listed/rendered in the `paperpilot` UI.

## Getting started (high level)
- Frontend: `cd paperpilot && npm i && npm run dev`
- Backend: `cd paperbrain && npm i && npm run dev`
- Supabase: follow `paperpilot/SUPABASE_INTEGRATION.md` (schema, buckets, env).
- Search tools: `cd search && pip install -r ../requirements.txt` (or your env) and see `search/README.md`.

For deeper setup and endpoints, refer to the READMEs inside each subproject.