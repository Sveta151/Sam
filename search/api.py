from __future__ import annotations

from typing import Any, Dict, List, Optional
import os

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .paper_search import ResearchPaperSearcher
from .hugging_face_paper import (
    fetch_daily_papers,
    fetch_weekly_papers,
    fetch_monthly_papers,
)


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

# Register MCP Google Scholar tool (requires GOOGLE_SCHOLAR_MCP_API_KEY)
try:
    _searcher.add_mcp_google_scholar_tool(name="mcp_google_scholar", make_default=False)
except Exception:
    # Keep API operational if missing env or client fails
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


@app.get("/trend")
def trend(
    period: str = "daily",
    date: Optional[str] = None,
    end_date: Optional[str] = None,
    days: Optional[int] = None,
    limit: Optional[int] = None,
) -> Dict[str, Any]:
    """Return trending Hugging Face papers without configuring tools.

    Query params:
      - period: one of 'daily' | 'weekly' | 'monthly' (default: daily)
      - date: ISO date YYYY-MM-DD (for daily)
      - end_date: ISO date to end the trailing window (weekly/monthly)
      - days: window size override (weekly default 7, monthly default 30)
      - limit: truncate results to first N
    """
    try:
        period_value = (period or "").lower()
        if period_value not in {"daily", "weekly", "monthly"}:
            raise HTTPException(status_code=400, detail="Invalid period. Use 'daily', 'weekly', or 'monthly'.")

        if period_value == "daily":
            results = fetch_daily_papers(date=date)
        elif period_value == "weekly":
            kwargs: Dict[str, Any] = {}
            if end_date is not None:
                kwargs["end_date"] = end_date
            if days is not None:
                kwargs["days"] = days
            results = fetch_weekly_papers(**kwargs)
        else:
            kwargs2: Dict[str, Any] = {}
            if end_date is not None:
                kwargs2["end_date"] = end_date
            if days is not None:
                kwargs2["days"] = days
            results = fetch_monthly_papers(**kwargs2)

        if limit is not None and limit >= 0:
            results = results[:limit]
        return {"period": period_value, "count": len(results), "results": results}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("search.api:app", host="127.0.0.1", port=8000, reload=True)


