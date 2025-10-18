from __future__ import annotations

from typing import Any, Dict, List, Optional
import os

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .paper_search import ResearchPaperSearcher


app = FastAPI(title="Sam Paper Search API", version="0.1.0")


# Initialize the searcher and register available tools
_searcher = ResearchPaperSearcher()

# Register Exa tool (requires EXA_API_KEY in the environment)
if os.environ.get("EXA_API_KEY"):
    try:
        _searcher.add_exa_tool(
            enrichment_description="Main research outcome",
            name="exa",
            count=10,
            use_cache=True,
            make_default=False,
        )
    except Exception:
        # Keep API operational if initialization fails
        pass

# Register MCP arXiv tool (requires ACADEMIA_MCP_API_KEY in the environment)
try:
    _searcher.add_mcp_arxiv_tool(name="mcp_arxiv", make_default=False)
except Exception:
    # If env is missing, keep API operational for other tools
    pass

# Register Hugging Face paper tools (no credentials required)
try:
    _searcher.add_hf_tools(make_default=False)
except Exception:
    # Keep API operational if registration fails
    pass


class SearchRequest(BaseModel):
    query: Optional[str] = None
    tool: Optional[str] = None
    tool_kwargs: Dict[str, Any] = Field(default_factory=dict)
    limit: Optional[int] = None


class SearchResponse(BaseModel):
    tool: str
    count: int
    results: List[Dict[str, Any]]


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/tools")
def tools() -> Dict[str, List[str]]:
    return {"tools": _searcher.available_tools()}


class RegisterExaRequest(BaseModel):
    enrichment_description: str = Field("Main research outcome")
    count: int = 10
    use_cache: bool = True
    name: str = "exa"
    api_key: Optional[str] = None


@app.post("/tools/exa")
def register_exa(req: RegisterExaRequest) -> Dict[str, Any]:
    if "exa" in _searcher.available_tools():
        return {"status": "ok", "message": "exa already registered", "tools": _searcher.available_tools()}
    effective_key = req.api_key or os.environ.get("EXA_API_KEY")
    if not effective_key:
        raise HTTPException(status_code=400, detail="Missing Exa API key. Provide api_key in body or set EXA_API_KEY env var.")
    try:
        _searcher.add_exa_tool(
            enrichment_description=req.enrichment_description,
            name=req.name,
            count=req.count,
            use_cache=req.use_cache,
            api_key=effective_key,
            make_default=False,
        )
        return {"status": "ok", "tools": _searcher.available_tools()}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@app.post("/search", response_model=SearchResponse)
def search(req: SearchRequest) -> SearchResponse:
    try:
        if req.limit is not None:
            _searcher.limit = req.limit
        tool_name = req.tool or _searcher.default_tool
        results = _searcher.search(req.query or "", tool=tool_name, **req.tool_kwargs)
        return SearchResponse(tool=tool_name, count=len(results), results=results)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("search.api:app", host="127.0.0.1", port=8000, reload=True)


