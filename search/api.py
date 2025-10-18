from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .paper_search import ResearchPaperSearcher


app = FastAPI(title="Sam Paper Search API", version="0.1.0")


# Initialize the searcher and register available tools
_searcher = ResearchPaperSearcher()

# Register Exa tool (requires EXA_API_KEY in the environment)
try:
    _searcher.add_exa_tool(
        enrichment_description="Main research outcome",
        name="exa",
        count=10,
        use_cache=True,
        make_default=False,
    )
except Exception:
    # If EXA_API_KEY is not set, we still want the API to boot; users can avoid using this tool
    pass

# Register MCP arXiv tool (requires ACADEMIA_MCP_API_KEY in the environment)
try:
    _searcher.add_mcp_arxiv_tool(name="mcp_arxiv", make_default=False)
except Exception:
    # If env is missing, keep API operational for other tools
    pass


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
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


@app.post("/search", response_model=SearchResponse)
def search(req: SearchRequest) -> SearchResponse:
    try:
        if req.limit is not None:
            _searcher.limit = req.limit
        tool_name = req.tool or _searcher.default_tool
        results = _searcher.search(req.query, tool=tool_name, **req.tool_kwargs)
        return SearchResponse(tool=tool_name, count=len(results), results=results)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("search.api:app", host="127.0.0.1", port=8000, reload=True)


