# paperbrain

NotebookLM-style context-aware research assistant backend. Upload PDFs, chat with papers using RAG, generate podcast summaries, and synthesize insights across multiple papers.

## Features

- 📄 **PDF Ingestion**: Extract text, metadata, chunk, and embed papers
- 💬 **RAG Chat**: Context-aware Q&A with citations
- 🎙️ **Podcast Generation**: Audio summaries via ElevenLabs TTS
- 🎬 **Video Scripts**: Chapter-based video plans
- 🎥 **Video Generation**: Slideshow videos from scripts using ffmpeg
- 🔄 **Multi-Paper Synthesis**: Collective storylines and delta analysis

## Tech Stack

- **Runtime**: Node 20 + TypeScript
- **HTTP**: Fastify + Zod validation
- **PDF**: pdf-parse
- **Embeddings**: OpenAI / Voyage / Jina (configurable)
- **LLM**: Anthropic Claude 3.5 / Groq Llama-3 70B
- **TTS**: ElevenLabs
- **Vector Store**: In-memory + JSON persistence

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and add your API keys:

```bash
cp .env.example .env
```

Required keys depend on your provider choices:
- **Embeddings**: Set one of `OPENAI_API_KEY`, `VOYAGE_API_KEY`, or `JINA_API_KEY`
- **LLM**: Set `ANTHROPIC_API_KEY` or `GROQ_API_KEY`
- **TTS** (optional): Set `ELEVENLABS_API_KEY`

### 3. Run Development Server

```bash
npm run dev
```

Server runs on `http://localhost:3001`

### 4. Build for Production

```bash
npm run build
npm start
```

## API Endpoints

### Health Check

```bash
curl http://localhost:3001/health
```

### 1. Ingest PDF

Upload and process a PDF:

```bash
curl -X POST http://localhost:3001/ingest \
  -F "projectId=default" \
  -F "file=@/path/to/paper.pdf"
```

Response:
```json
{
  "paperId": "paper_abc123",
  "chunks": 42
}
```

### 2. Chat with Paper

Ask questions about a paper:

```bash
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "default",
    "paperId": "paper_abc123",
    "messages": [
      {
        "role": "user",
        "content": "What is the main contribution of this paper?"
      }
    ],
    "topK": 8
  }'
```

Response:
```json
{
  "answer": "The main contribution is... [CIT:paper_abc123#5]",
  "citations": [
    { "paperId": "paper_abc123", "chunkIndex": 5 }
  ]
}
```

### 3. Generate Podcast

Create an audio summary:

```bash
curl -X POST http://localhost:3001/podcast \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "default",
    "paperId": "paper_abc123",
    "duration": 180,
    "style": "explainer"
  }'
```

Response:
```json
{
  "url": "./data/audio/paper_abc123.mp3",
  "bytesLength": 524288
}
```

### 4. Generate Video Script

Create a video plan with chapters:

```bash
curl -X POST http://localhost:3001/video-script \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "default",
    "paperId": "paper_abc123"
  }'
```

Response:
```json
{
  "title": "Understanding Neural Networks",
  "hook": "What if machines could learn like humans?",
  "chapters": [
    {
      "t": 0,
      "heading": "Introduction",
      "bulletPoints": ["Neural networks mimic brain structure"]
    }
  ],
  "outro": "The future of AI is here"
}
```

### 5. Generate Video

Create an actual MP4 video from the video script:

```bash
curl -X POST http://localhost:3001/generate-video \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "default",
    "paperId": "paper_abc123",
    "videoScript": {
      "title": "Understanding Neural Networks",
      "hook": "What if machines could learn like humans?",
      "chapters": [
        {
          "t": 0,
          "heading": "Introduction",
          "bulletPoints": ["Neural networks mimic brain", "Inspired by human cognition"]
        }
      ],
      "outro": "Thanks for watching"
    },
    "duration": 10
  }'
```

Response:
```json
{
  "videoPath": "./data/video/paper_abc123.mp4",
  "duration": 21,
  "slides": 5
}
```

### 6. Synthesize Multiple Papers

Generate collective insights:

```bash
curl -X POST http://localhost:3001/synthesize \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "default",
    "paperIds": ["paper_abc123", "paper_def456", "paper_ghi789"]
  }'
```

Response:
```json
{
  "folderId": "default",
  "storyline": "These papers collectively explore...",
  "deltas": "Paper 1 focuses on X, while Paper 2 improves Y...",
  "tableMarkdown": "| Paper | Method | Results | Delta |\n|-------|--------|---------|-------|..."
}
```

## Quick Test Flow

Here's a complete test sequence:

```bash
# 1. Ingest a paper
PAPER_ID=$(curl -X POST http://localhost:3001/ingest \
  -F "projectId=test" \
  -F "file=@sample.pdf" | jq -r '.paperId')

echo "Paper ID: $PAPER_ID"

# 2. Ask a question
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\": \"test\",
    \"paperId\": \"$PAPER_ID\",
    \"messages\": [{\"role\": \"user\", \"content\": \"What problem does this paper solve?\"}]
  }" | jq

# 3. Generate podcast
curl -X POST http://localhost:3001/podcast \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\": \"test\",
    \"paperId\": \"$PAPER_ID\",
    \"duration\": 120
  }" | jq

# 4. Synthesize (using same paper twice for demo)
curl -X POST http://localhost:3001/synthesize \
  -H "Content-Type: application/json" \
  -d "{
    \"projectId\": \"test\",
    \"paperIds\": [\"$PAPER_ID\", \"$PAPER_ID\"]
  }" | jq
```

## Project Structure

```
paperbrain/
├── src/
│   ├── server.ts           # Fastify bootstrap
│   ├── env.ts              # Environment validation
│   ├── types.ts            # TypeScript types
│   ├── pdf.ts              # PDF extraction
│   ├── chunk.ts            # Text chunking
│   ├── rag.ts              # RAG retrieval + MMR
│   ├── prompts.ts          # LLM prompt templates
│   ├── embed/              # Embedding providers
│   │   ├── index.ts
│   │   ├── openai.ts
│   │   ├── voyage.ts
│   │   └── jina.ts
│   ├── llm/                # LLM providers
│   │   ├── index.ts
│   │   ├── anthropic.ts
│   │   └── groq.ts
│   ├── store/              # Vector store
│   │   └── memory.ts
│   ├── routes/             # API routes
│   │   ├── ingest.ts
│   │   ├── chat.ts
│   │   ├── podcast.ts
│   │   ├── video-script.ts
│   │   └── synth.ts
│   └── utils/              # Utilities
│       ├── cosine.ts
│       ├── id.ts
│       └── logger.ts
├── data/                   # JSON store + audio files
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Data Storage

Papers and embeddings are stored as JSON files in `./data/`:
- `./data/{projectId}.json` - Papers and chunks with embeddings
- `./data/audio/{paperId}.mp3` - Generated podcast audio

Format:
```json
{
  "papers": [
    {
      "id": "paper_abc123",
      "title": "...",
      "authors": ["..."],
      "year": 2024
    }
  ],
  "chunks": [
    {
      "id": "paper_abc123_chunk_0",
      "paperId": "paper_abc123",
      "text": "...",
      "index": 0,
      "tokens": 1200,
      "embedding": [0.1, 0.2, ...]
    }
  ]
}
```

## Configuration

### Embedding Providers

Set `EMBEDDINGS_PROVIDER` in `.env`:

- `openai` - OpenAI `text-embedding-3-small` (1536 dims)
- `voyage` - Voyage `voyage-3-lite` (1024 dims)
- `jina` - Jina `jina-embeddings-v3` (1024 dims)

### LLM Providers

Set `LLM_PROVIDER` in `.env`:

- `anthropic` - Claude 3.5 Sonnet (recommended for synthesis)
- `groq` - Llama-3.1 70B (fast, good for Q&A)

## Chunking Strategy

- Target: 1200 tokens per chunk
- Overlap: 200 tokens
- Preserves paragraph boundaries
- Falls back to sentence splitting for large paragraphs

## RAG Pipeline

1. **Embed query** using configured provider
2. **Cosine search** for top-K chunks (default K=8)
3. **MMR diversification** to final-K (default 5)
4. **Build context** with inline citations `[CIT:paperId#index]`
5. **LLM generation** with system prompt enforcing citations

## Future Enhancements

- [ ] Swap to Supabase + pgvector for production scale
- [ ] Add streaming responses for chat
- [ ] Support more PDF formats (OCR for scanned papers)
- [ ] Add paper metadata extraction from APIs (Semantic Scholar, arXiv)
- [ ] Implement caching for embeddings
- [ ] Add rate limiting and authentication

## License

MIT

---

Built for hackathons. Keep it simple, keep it fast. 🚀

