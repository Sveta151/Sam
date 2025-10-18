# paperbrain Quick Start

Get up and running in 5 minutes.

## Prerequisites

- Node.js 20+
- At least one API key (OpenAI or Anthropic recommended)
- A sample PDF paper

## Step 1: Install

```bash
npm install
```

## Step 2: Configure

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and add your API keys. Minimum required:

```env
OPENAI_API_KEY=sk-...           # For embeddings
ANTHROPIC_API_KEY=sk-ant-...    # For LLM
EMBEDDINGS_PROVIDER=openai
LLM_PROVIDER=anthropic
```

## Step 3: Start Server

```bash
npm run dev
```

You should see:
```
🚀 paperbrain server running on http://0.0.0.0:3001
   Embeddings: openai
   LLM: anthropic
   Data: ./data
```

## Step 4: Test with a PDF

### Option A: Use the test script

```bash
./test.sh /path/to/your/paper.pdf
```

This will run all endpoints automatically.

### Option B: Manual testing

**1. Ingest a PDF:**

```bash
curl -X POST http://localhost:3001/ingest \
  -F "projectId=demo" \
  -F "file=@paper.pdf"
```

Save the `paperId` from the response.

**2. Ask a question:**

```bash
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "demo",
    "paperId": "YOUR_PAPER_ID",
    "messages": [{"role": "user", "content": "What is this paper about?"}]
  }'
```

**3. Generate a podcast:**

```bash
curl -X POST http://localhost:3001/podcast \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "demo",
    "paperId": "YOUR_PAPER_ID",
    "duration": 180
  }'
```

## Common Issues

### "OPENAI_API_KEY required"

Make sure your `.env` file exists and has the correct key for your chosen provider.

### "No file uploaded"

Check that you're using `-F` (form data) not `-d` (JSON) for the `/ingest` endpoint.

### Build errors

Run `npm run build` to check for TypeScript errors.

## Next Steps

- Read the full [README.md](README.md) for all API details
- Check `./data/` to see stored papers and embeddings
- Try multi-paper synthesis with `/synthesize`
- Integrate with the paperpilot frontend

## Provider Options

### Embeddings

- **OpenAI** (recommended): Best quality, 1536 dimensions
- **Voyage**: Fast, 1024 dimensions
- **Jina**: Open source friendly, 1024 dimensions

### LLM

- **Anthropic Claude** (recommended): Best for synthesis and reasoning
- **Groq Llama-3**: Fastest, good for Q&A

### TTS (optional)

- **ElevenLabs**: High quality audio generation
- If not configured, podcast endpoint returns script text only

## Architecture

```
PDF → Extract → Chunk → Embed → Store
                                   ↓
User Query → Embed → Cosine Search → MMR → LLM → Answer
```

## Performance

- PDF ingestion: ~30-60 seconds for a 10-page paper
- Chat query: ~2-5 seconds
- Podcast generation: ~10-20 seconds (+ TTS time)
- Synthesis: ~15-30 seconds for 3 papers

## Data Location

All data is stored in `./data/`:
- `{projectId}.json` - Papers and embeddings
- `audio/{paperId}.mp3` - Generated podcasts

Files are human-readable JSON for easy debugging.

---

Happy hacking! 🚀

