## Search module

The `search` folder provides a small toolkit and FastAPI service to search research papers across multiple sources:

- **Exa Websets** (`exa_search.py`) — rich web search with enrichment and caching
- **Hugging Face Papers** (`hugging_face_paper.py`) — daily/weekly/monthly feeds
- **MCP arXiv** (`mcp_client.py`) — call the `academia_mcp` arXiv tool via MCP
- **MCP Google Scholar** (`mcp_google_scholar.py`) — call a Google Scholar MCP tool
- **Unified router** (`paper_search.py`) — register/search across tools
- **FastAPI** (`api.py`) — simple HTTP API exposing tools and a unified `/search`


### Requirements

- Python 3.10+
- Packages from the repo-level `requirements.txt` (FastAPI, requests, exa-py, mcp, etc.)

Install:

```bash
pip install -r /Users/svetachurina/Sam/requirements.txt
```


### Environment variables

Create a `.env` at the repo root (or export in your shell):

- `EXA_API_KEY` — required for Exa Websets
- `ACADEMIA_MCP_API_KEY` — required for MCP-based tools (arXiv, Google Scholar)

Example `.env`:

```bash
EXA_API_KEY=exa_live_xxx
ACADEMIA_MCP_API_KEY=smithery_xxx
```


### Tool parameters at a glance

- **Exa (`exa`)**
  - Required: `enrichment_description`
  - Optional: `count` (int, default 10), `use_cache` (bool, default true)
  - Notes: reads `EXA_API_KEY`; results cached under `search/.cache/exa/`

- **Hugging Face**
  - `hf_daily`: `date` (YYYY-MM-DD, optional)
  - `hf_weekly`: `end_date` (YYYY-MM-DD, optional), `days` (int, default 7)
  - `hf_monthly`: `end_date` (YYYY-MM-DD, optional), `days` (int, default 30)
  - Notes: `query` may be empty; server-side filtering matches title/summary/highlights

- **MCP arXiv (`mcp_arxiv`)**
  - Required: `query`
  - Optional: `limit`, `offset`, `sort_by`, `end_date`, `sort_order`, `start_date`, `include_abstracts`
  - Notes: uses `ACADEMIA_MCP_API_KEY`; parameters are forwarded to the MCP tool

- **MCP Google Scholar (`mcp_google_scholar`)**
  - Required: `query`
  - Optional: `author`, `startYear`, `endYear`, `numResults`
  - Notes: uses `ACADEMIA_MCP_API_KEY`; parameters are forwarded to the MCP tool


### FastAPI service

Run locally:

```bash
python -m uvicorn search.api:app --host 127.0.0.1 --port 8000 --reload
```

Endpoints:

- `GET /health` → `{ "status": "ok" }`
- `GET /tools` → list of registered tool names
- `POST /tools/exa` → register Exa at runtime if not auto-registered
- `POST /search` → run a query through the chosen tool

Request/response models are defined in `search/api.py`.


#### Response shape

`POST /search` responds with:

```json
{
  "tool": "exa",
  "count": 5,
  "results": [ { "...": "tool-specific fields" } ]
}
```

- `results` is a list of JSON-like dicts. Shape varies by tool.
- `limit` (if provided in the request) caps the list length after tool execution.

Examples of `results` entries by tool (indicative, not exhaustive):

- Exa:

```json
{
  "id": "webset-item-id",
  "url": "https://example.com/paper",
  "title": "Paper title",
  "enrichments": [ { "description": "Main research outcome", "text": "..." } ]
}
```

- Hugging Face daily/weekly/monthly:

```json
{
  "title": "Paper title",
  "summary": "...",
  "publishedAt": "2025-10-17",
  "paper": {
    "id": "2410.12345",
    "upvotes": 42,
    "links": { "arxiv": "https://arxiv.org/abs/2410.12345" }
  }
}
```

- MCP arXiv / Google Scholar:

```json
{
  "title": "Paper title",
  "authors": ["Author A", "Author B"],
  "abstract": "...",
  "url": "https://arxiv.org/abs/XXXX.YYYYY"
}
```


#### Register Exa (optional)

If `EXA_API_KEY` is in the environment, Exa registers automatically. You can also register via the API:

```bash
curl -X POST http://127.0.0.1:8000/tools/exa \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "exa",
    "enrichment_description": "Main research outcome",
    "count": 10,
    "use_cache": true
  }'
```


#### Search via HTTP

The unified `/search` accepts:

- `query` (string; optional for HF tools)
- `tool` (string; one of the names in `/tools`, e.g. `exa`, `mcp_arxiv`, `mcp_google_scholar`, `hf_daily`, `hf_weekly`, `hf_monthly`)
- `tool_kwargs` (object; forwarded to the specific tool)
- `limit` (int; optional hard cap applied after tool returns)

Example: Exa

```bash
curl -X POST http://127.0.0.1:8000/search \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "speculative decoding transformers",
    "tool": "exa",
    "tool_kwargs": {"enrichment_description": "Main research outcome", "count": 5, "use_cache": true}
  }'
```

Example: MCP arXiv

```bash
curl -X POST http://127.0.0.1:8000/search \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "graph neural networks",
    "tool": "mcp_arxiv",
    "tool_kwargs": {"limit": 25, "include_abstracts": true, "sort_by": "submitted_date", "sort_order": "descending"},
    "limit": 25
  }'
```

Example: MCP Google Scholar

```bash
curl -X POST http://127.0.0.1:8000/search \
  -H 'Content-Type: application/json' \
  -d '{
    "query": "multimodal large language models",
    "tool": "mcp_google_scholar",
    "tool_kwargs": {"author": "Kaiming He", "startYear": 2018, "endYear": 2025, "numResults": 10}
  }'
```

Example: Hugging Face (no query required)

```bash
curl -X POST http://127.0.0.1:8000/search \
  -H 'Content-Type: application/json' \
  -d '{
    "tool": "hf_daily",
    "tool_kwargs": {"date": "2025-10-17"},
    "limit": 50
  }'
```


### Using the modules directly (Python)

Exa (returns list of dicts):

```python
from search.exa_search import exa_search

items = exa_search(
    query="Top AI research labs focusing on LLMs",
    enrichment_description="Main research outcome",
    count=5,
    use_cache=True,
)
```

Hugging Face daily/weekly/monthly:

```python
from search.hugging_face_paper import fetch_daily_papers, fetch_weekly_papers, fetch_monthly_papers, sort_by_upvotes, format_papers

daily = fetch_daily_papers()  # optional date="YYYY-MM-DD"
weekly = fetch_weekly_papers()  # optional end_date, days
monthly = fetch_monthly_papers()  # optional end_date, days

top = sort_by_upvotes(daily)[:20]
print(format_papers(top))
```

MCP arXiv tool:

```python
import asyncio
from search.mcp_client import arxiv_search

async def run():
    result = await arxiv_search(
        query="diffusion model inversion",
        limit=10,
        include_abstracts=True,
    )
    print(result)

asyncio.run(run())
```

MCP Google Scholar tool:

```python
import asyncio
from search.mcp_google_scholar import search_google_scholar

async def run():
    result = await search_google_scholar(
        query="retrieval augmented generation",
        author="MacGlashan",
        startYear=2020,
        endYear=2025,
        numResults=10,
    )
    print(result)

asyncio.run(run())
```


### Unified router (in-process)

You can compose tools with `ResearchPaperSearcher` from `paper_search.py`:

```python
from search.paper_search import ResearchPaperSearcher

searcher = ResearchPaperSearcher()
searcher.add_hf_tools(make_default=True)  # registers hf_daily, hf_weekly, hf_monthly
# Optionally add Exa and MCP tools if env vars are set
searcher.add_exa_tool(enrichment_description="Main research outcome", name="exa")
searcher.add_mcp_arxiv_tool(name="mcp_arxiv")
searcher.add_mcp_google_scholar_tool(name="mcp_google_scholar")

results = searcher.search("vision-language models", tool="exa", count=5)
```


### Notes

- HF feeds require no credentials but depend on public endpoints; a network issue can reduce coverage for specific dates.
- Exa responses are cached under `search/.cache/exa/` keyed by query + enrichment.
- MCP servers are hosted via Smithery; ensure `ACADEMIA_MCP_API_KEY` is valid and has access.
- The FastAPI service attempts to register tools opportunistically; missing keys won’t crash the server.

Maintenance tips:
- Clear Exa cache by deleting files in `search/.cache/exa/`.
- Use `GET /tools` to confirm which tools registered successfully at startup.

