# PaperBrain API

A clean, versioned REST API for the PaperBrain research assistant with OpenAPI documentation.

## Features

- 📚 **Project & Folder Management** - Organize papers hierarchically
- 📄 **PDF Ingestion** - Extract, chunk, and embed research papers
- 💬 **RAG-powered Chat** - Ask questions about individual papers
- 🔄 **Multi-paper Synthesis** - Generate insights across multiple papers
- 🎙️ **Podcast Generation** - Convert papers to audio summaries
- 🎬 **Video Generation** - Create slideshow videos with scripts
- 🔍 **Search** - Find papers by keyword
- 📖 **OpenAPI Docs** - Interactive API documentation at `/docs`

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file:

```env
# Server
PORT=8787
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:3000

# Data
DATA_DIR=./data

# Providers
EMBEDDINGS_PROVIDER=openai
LLM_PROVIDER=anthropic

# API Keys
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...
```

### 3. Run the Server

```bash
# Development (with pretty logs)
npm run dev

# Production
npm run build
npm start
```

The API will be available at `http://localhost:8787` with docs at `http://localhost:8787/docs`.

## API Endpoints

### Health

```bash
# Health check
curl http://localhost:8787/health
```

### Projects

```bash
# List all projects
curl http://localhost:8787/v1/projects

# Create a project
curl -X POST http://localhost:8787/v1/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"FDD Research","domainFocus":"wireless communications"}'

# Get a project
curl http://localhost:8787/v1/projects/{projectId}

# Update a project
curl -X PATCH http://localhost:8787/v1/projects/{projectId} \
  -H 'Content-Type: application/json' \
  -d '{"name":"Updated Name"}'

# Delete a project
curl -X DELETE http://localhost:8787/v1/projects/{projectId}
```

### Folders

```bash
# List folders in a project
curl "http://localhost:8787/v1/folders?projectId={projectId}"

# Create a folder
curl -X POST http://localhost:8787/v1/folders \
  -H 'Content-Type: application/json' \
  -d '{
    "projectId":"proj_123",
    "name":"Full Reciprocity",
    "tags":["antenna","theory"]
  }'

# Get a folder
curl http://localhost:8787/v1/folders/{folderId}

# Update a folder
curl -X PATCH http://localhost:8787/v1/folders/{folderId} \
  -H 'Content-Type: application/json' \
  -d '{"name":"Updated Folder Name"}'

# Delete a folder
curl -X DELETE http://localhost:8787/v1/folders/{folderId}

# Get papers in a folder (including subfolders)
curl "http://localhost:8787/v1/folders/{folderId}/papers?includeSubfolders=true"
```

### Papers

```bash
# List papers
curl "http://localhost:8787/v1/papers?projectId={projectId}"

# List papers in a folder
curl "http://localhost:8787/v1/papers?folderId={folderId}&includeSubfolders=true"

# Get a paper
curl http://localhost:8787/v1/papers/{paperId}

# Ingest a PDF
curl -X POST http://localhost:8787/v1/papers/ingest \
  -F "projectId=proj_123" \
  -F "folderId=folder_456" \
  -F "pdf=@/path/to/paper.pdf"

# Update a paper
curl -X PATCH http://localhost:8787/v1/papers/{paperId} \
  -H 'Content-Type: application/json' \
  -d '{
    "title":"Updated Title",
    "year":2024,
    "folderId":"new_folder_id"
  }'

# Delete a paper
curl -X DELETE http://localhost:8787/v1/papers/{paperId}

# Get chunks for a paper
curl "http://localhost:8787/v1/papers/{paperId}/chunks?offset=0&limit=10"
```

### Chat

```bash
# Chat with a paper
curl -X POST http://localhost:8787/v1/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "paperId":"paper_123",
    "messages":[
      {"role":"user","content":"What is the main contribution of this paper?"}
    ],
    "topK":8
  }'

# Alternative: Chat via paper endpoint
curl -X POST http://localhost:8787/v1/papers/{paperId}/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "messages":[
      {"role":"user","content":"Explain the methodology"}
    ]
  }'
```

### Synthesis

```bash
# Synthesize multiple papers
curl -X POST http://localhost:8787/v1/synthesis \
  -H 'Content-Type: application/json' \
  -d '{
    "paperIds":["paper_1","paper_2","paper_3"]
  }'

# Response includes:
# - storyline: Collective narrative
# - deltas: Comparison map
# - tableMarkdown: Summary table
```

### Podcast

```bash
# Generate podcast for a paper
curl -X POST http://localhost:8787/v1/papers/{paperId}/podcast

# Response:
# {"url":"/audio/{paperId}.mp3"}
```

### Video

```bash
# Generate video script
curl -X POST http://localhost:8787/v1/papers/{paperId}/video-script

# Generate video
curl -X POST http://localhost:8787/v1/papers/{paperId}/generate-video \
  -H 'Content-Type: application/json' \
  -d '{"includeAudio":false}'

# Response:
# {"url":"/video/{paperId}.mp4"}
```

### Search

```bash
# Search papers by keyword
curl "http://localhost:8787/v1/search?query=antenna&projectId={projectId}"
```

## Example Workflow

### 1. Create a Project

```bash
PROJECT_ID=$(curl -X POST http://localhost:8787/v1/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"My Research","domainFocus":"AI"}' \
  | jq -r '.id')

echo "Project ID: $PROJECT_ID"
```

### 2. Create a Folder

```bash
FOLDER_ID=$(curl -X POST http://localhost:8787/v1/folders \
  -H 'Content-Type: application/json' \
  -d "{\"projectId\":\"$PROJECT_ID\",\"name\":\"Core Papers\"}" \
  | jq -r '.id')

echo "Folder ID: $FOLDER_ID"
```

### 3. Ingest a Paper

```bash
PAPER_ID=$(curl -X POST http://localhost:8787/v1/papers/ingest \
  -F "projectId=$PROJECT_ID" \
  -F "folderId=$FOLDER_ID" \
  -F "pdf=@paper.pdf" \
  | jq -r '.paper.id')

echo "Paper ID: $PAPER_ID"
```

### 4. Chat with the Paper

```bash
curl -X POST http://localhost:8787/v1/chat \
  -H 'Content-Type: application/json' \
  -d "{
    \"paperId\":\"$PAPER_ID\",
    \"messages\":[
      {\"role\":\"user\",\"content\":\"What is the main contribution?\"}
    ]
  }" | jq '.answer'
```

### 5. Generate a Podcast

```bash
curl -X POST http://localhost:8787/v1/papers/$PAPER_ID/podcast \
  | jq '.url'
```

## Data Structure

```
data/
├── meta.json              # Projects, folders, papers metadata
├── papers/
│   └── {paperId}.json     # Paper + chunks with embeddings
├── files/
│   └── {paperId}.pdf      # Original PDF files
├── audio/
│   └── {paperId}.mp3      # Generated podcasts
└── video/
    └── {paperId}.mp4      # Generated videos
```

## Response Formats

### Paper Object

```json
{
  "id": "paper_abc123",
  "projectId": "proj_xyz",
  "folderId": "folder_456",
  "title": "Deep Learning for NLP",
  "authors": ["John Doe", "Jane Smith"],
  "venue": "ACL 2024",
  "year": 2024,
  "citations": 42,
  "sourcePath": "/data/files/paper_abc123.pdf",
  "tags": ["nlp", "transformers"]
}
```

### Chat Response

```json
{
  "answer": "The main contribution is...",
  "citations": [
    {"paperId": "paper_abc123", "chunkIndex": 5},
    {"paperId": "paper_abc123", "chunkIndex": 12}
  ]
}
```

### Synthesis Response

```json
{
  "storyline": "These papers collectively explore...",
  "deltas": "Paper A focuses on X, while Paper B...",
  "tableMarkdown": "| Paper | Key Idea | Method |\n|---|---|---|..."
}
```

## Error Handling

All errors follow this format:

```json
{
  "error": "Error Type",
  "message": "Human-readable error message",
  "details": {} // Optional validation details
}
```

Common status codes:
- `400` - Bad Request (validation error)
- `404` - Not Found
- `413` - Payload Too Large (>40MB)
- `500` - Internal Server Error

## OpenAPI Documentation

Visit `http://localhost:8787/docs` for interactive API documentation with:
- All endpoints documented
- Request/response schemas
- Try-it-out functionality
- Example requests

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `8787` | Server port |
| `HOST` | No | `0.0.0.0` | Server host |
| `CORS_ORIGIN` | No | `http://localhost:3000` | CORS origin |
| `DATA_DIR` | No | `./data` | Data directory |
| `EMBEDDINGS_PROVIDER` | No | `openai` | `openai`, `voyage`, or `jina` |
| `LLM_PROVIDER` | No | `anthropic` | `anthropic` or `groq` |
| `ANTHROPIC_API_KEY` | Conditional | - | Required if `LLM_PROVIDER=anthropic` |
| `GROQ_API_KEY` | Conditional | - | Required if `LLM_PROVIDER=groq` |
| `OPENAI_API_KEY` | Conditional | - | Required if `EMBEDDINGS_PROVIDER=openai` |
| `VOYAGE_API_KEY` | Conditional | - | Required if `EMBEDDINGS_PROVIDER=voyage` |
| `JINA_API_KEY` | Conditional | - | Required if `EMBEDDINGS_PROVIDER=jina` |
| `ELEVENLABS_API_KEY` | No | - | Required for podcast generation |

## Integration with PaperPilot

The API is designed for easy integration with the PaperPilot frontend:

```typescript
// Example: Fetch papers for a project
const papers = await fetch(`${API_URL}/v1/papers?projectId=${projectId}`)
  .then(res => res.json());

// Example: Chat with a paper
const response = await fetch(`${API_URL}/v1/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paperId,
    messages: [{ role: 'user', content: question }]
  })
}).then(res => res.json());
```

## Development

```bash
# Run with hot reload
npm run dev

# Build TypeScript
npm run build

# Lint code
npm run lint
```

## License

MIT

