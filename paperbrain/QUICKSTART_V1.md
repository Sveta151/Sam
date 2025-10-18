# PaperBrain v1 API - Quick Start Guide

Get up and running with the PaperBrain v1 API in 5 minutes.

## Prerequisites

- Node.js 18+ and npm
- API keys for your chosen providers
- A PDF file to test with (optional)

## 1. Install Dependencies

```bash
cd paperbrain
npm install
```

## 2. Configure Environment

Create a `.env` file in the `paperbrain` directory:

```env
# Server Configuration
PORT=8787
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:3000

# Data Storage
DATA_DIR=./data

# Provider Selection
EMBEDDINGS_PROVIDER=openai
LLM_PROVIDER=anthropic

# API Keys (add your keys here)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Optional: For podcast generation
ELEVENLABS_API_KEY=...

# Optional: Other embedding providers
VOYAGE_API_KEY=...
JINA_API_KEY=...

# Optional: Alternative LLM provider
GROQ_API_KEY=...
```

**Minimum Required Keys:**
- If `LLM_PROVIDER=anthropic`: Need `ANTHROPIC_API_KEY`
- If `LLM_PROVIDER=groq`: Need `GROQ_API_KEY`
- If `EMBEDDINGS_PROVIDER=openai`: Need `OPENAI_API_KEY`
- If `EMBEDDINGS_PROVIDER=voyage`: Need `VOYAGE_API_KEY`
- If `EMBEDDINGS_PROVIDER=jina`: Need `JINA_API_KEY`

## 3. Start the Server

```bash
# Development mode (with pretty logs)
npm run dev

# Production mode
npm run build
npm start
```

You should see:
```
🚀 PaperBrain API running on http://0.0.0.0:8787
📚 OpenAPI docs available at http://0.0.0.0:8787/docs
   Embeddings: openai
   LLM: anthropic
   Data: ./data
   CORS: http://localhost:3000
```

## 4. Explore the API

### Option A: Interactive Documentation

Open your browser and visit:
```
http://localhost:8787/docs
```

This gives you an interactive UI to:
- Browse all endpoints
- See request/response schemas
- Try out API calls directly

### Option B: Command Line

Run the provided test script:
```bash
./test-api.sh
```

This will:
- Test the health endpoint
- Create a project
- Create a folder
- List resources
- Test search

### Option C: Manual cURL Commands

```bash
# Health check
curl http://localhost:8787/health

# Create a project
curl -X POST http://localhost:8787/v1/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"My Research","domainFocus":"AI"}'

# List projects
curl http://localhost:8787/v1/projects
```

## 5. Complete Workflow Example

Here's a complete workflow from project creation to paper chat:

```bash
# 1. Create a project
PROJECT_ID=$(curl -s -X POST http://localhost:8787/v1/projects \
  -H 'Content-Type: application/json' \
  -d '{"name":"AI Research","domainFocus":"Machine Learning"}' \
  | jq -r '.id')

echo "Project ID: $PROJECT_ID"

# 2. Create a folder
FOLDER_ID=$(curl -s -X POST http://localhost:8787/v1/folders \
  -H 'Content-Type: application/json' \
  -d "{\"projectId\":\"$PROJECT_ID\",\"name\":\"Transformers\",\"tags\":[\"nlp\"]}" \
  | jq -r '.id')

echo "Folder ID: $FOLDER_ID"

# 3. Ingest a PDF (replace with your PDF path)
PAPER_ID=$(curl -s -X POST http://localhost:8787/v1/papers/ingest \
  -F "projectId=$PROJECT_ID" \
  -F "folderId=$FOLDER_ID" \
  -F "pdf=@/path/to/paper.pdf" \
  | jq -r '.paper.id')

echo "Paper ID: $PAPER_ID"

# 4. Chat with the paper
curl -X POST http://localhost:8787/v1/chat \
  -H 'Content-Type: application/json' \
  -d "{
    \"paperId\":\"$PAPER_ID\",
    \"messages\":[
      {\"role\":\"user\",\"content\":\"What is the main contribution of this paper?\"}
    ]
  }" | jq '.answer'

# 5. Generate a podcast (optional)
curl -X POST http://localhost:8787/v1/papers/$PAPER_ID/podcast \
  | jq '.url'

# 6. List all papers in the folder
curl "http://localhost:8787/v1/folders/$FOLDER_ID/papers?includeSubfolders=true" \
  | jq '.[].title'
```

## 6. Common Operations

### List all papers in a project
```bash
curl "http://localhost:8787/v1/papers?projectId=YOUR_PROJECT_ID" | jq .
```

### Search papers
```bash
curl "http://localhost:8787/v1/search?query=transformer&projectId=YOUR_PROJECT_ID" | jq .
```

### Update paper metadata
```bash
curl -X PATCH http://localhost:8787/v1/papers/YOUR_PAPER_ID \
  -H 'Content-Type: application/json' \
  -d '{"year":2024,"citations":100}'
```

### Get paper chunks
```bash
curl "http://localhost:8787/v1/papers/YOUR_PAPER_ID/chunks?offset=0&limit=5" | jq .
```

### Synthesize multiple papers
```bash
curl -X POST http://localhost:8787/v1/synthesis \
  -H 'Content-Type: application/json' \
  -d '{"paperIds":["paper1","paper2","paper3"]}' \
  | jq .
```

### Generate video script
```bash
curl -X POST http://localhost:8787/v1/papers/YOUR_PAPER_ID/video-script | jq .
```

## 7. Frontend Integration

If you're integrating with PaperPilot or another frontend:

```typescript
// Example: React/Next.js integration
const API_URL = 'http://localhost:8787';

// Fetch projects
async function getProjects() {
  const response = await fetch(`${API_URL}/v1/projects`);
  return response.json();
}

// Create project
async function createProject(name: string, domainFocus?: string) {
  const response = await fetch(`${API_URL}/v1/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, domainFocus }),
  });
  return response.json();
}

// Ingest PDF
async function ingestPDF(projectId: string, file: File, folderId?: string) {
  const formData = new FormData();
  formData.append('projectId', projectId);
  if (folderId) formData.append('folderId', folderId);
  formData.append('pdf', file);

  const response = await fetch(`${API_URL}/v1/papers/ingest`, {
    method: 'POST',
    body: formData,
  });
  return response.json();
}

// Chat with paper
async function chatWithPaper(paperId: string, message: string) {
  const response = await fetch(`${API_URL}/v1/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      paperId,
      messages: [{ role: 'user', content: message }],
    }),
  });
  return response.json();
}
```

## 8. Troubleshooting

### Server won't start
- Check that port 8787 is not in use: `lsof -i :8787`
- Verify environment variables are set correctly
- Check that required API keys are present

### API key errors
- Ensure the correct provider is selected in `.env`
- Verify API keys are valid and not expired
- Check that the key matches the provider

### PDF ingestion fails
- Verify the PDF file is valid and not corrupted
- Check file size is under 40MB
- Ensure sufficient disk space in `DATA_DIR`

### Chat returns empty responses
- Verify the paper was ingested successfully
- Check that embeddings were generated (look at logs)
- Ensure the LLM provider API key is valid

### CORS errors in frontend
- Update `CORS_ORIGIN` in `.env` to match your frontend URL
- Restart the server after changing environment variables

## 9. Next Steps

- **Read the full API documentation:** [API_README.md](./API_README.md)
- **Explore OpenAPI docs:** http://localhost:8787/docs
- **Check migration guide:** [MIGRATION.md](./MIGRATION.md) (if upgrading)
- **Review refactoring summary:** [REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md)

## 10. Production Deployment

When deploying to production:

1. **Set environment variables** on your server
2. **Update CORS_ORIGIN** to your production domain
3. **Use a process manager** like PM2:
   ```bash
   npm install -g pm2
   pm2 start dist/server.js --name paperbrain
   ```
4. **Set up reverse proxy** (nginx/Apache) for HTTPS
5. **Configure logging** and monitoring
6. **Set up backups** for the `data/` directory

## Support

For issues or questions:
- Check the [API_README.md](./API_README.md) for detailed documentation
- Review the OpenAPI docs at `/docs`
- Look at example code in this guide

Happy researching! 🚀📚

