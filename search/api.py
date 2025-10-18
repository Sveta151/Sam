from __future__ import annotations

from typing import Any, Dict, List, Optional, Tuple
import asyncio
import logging
from time import perf_counter
import os

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .paper_search import ResearchPaperSearcher
from .hugging_face_paper import (
    fetch_daily_papers,
    fetch_weekly_papers,
    fetch_monthly_papers,
)
from .hugging_face_paper import derive_links


app = FastAPI(title="Sam Paper Search API", version="0.1.0")


# Initialize the searcher and register available tools
_searcher = ResearchPaperSearcher()

# Logger
_logger = logging.getLogger("sam.search")
if not _logger.handlers:
    _handler = logging.StreamHandler()
    _formatter = logging.Formatter(fmt="%(asctime)s %(levelname)s [%(name)s] %(message)s")
    _handler.setFormatter(_formatter)
    _logger.addHandler(_handler)
_logger.setLevel(logging.INFO)

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
    query: str = ""
    limit: Optional[int] = 10


class UnifiedItem(BaseModel):
    title: str
    authors: List[str] = Field(default_factory=list)
    summary: Optional[str] = None
    links: Dict[str, str] = Field(default_factory=dict)
    provider: str
    # Optional metadata when available
    year: Optional[int] = None
    venue: Optional[str] = None


class SearchResponse(BaseModel):
    count: int
    results: List[UnifiedItem]


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

def _normalize_exa(item: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    try:
        _logger.info("normalize_exa raw_keys=%s", list(item.keys()))
    except Exception:
        pass
    properties = item.get("properties") or {}
    rp = properties.get("research_paper") or {}
    title = str(
        item.get("title")
        or item.get("resultTitle")
        or item.get("name")
        or rp.get("title")
        or properties.get("title")
        or "Untitled"
    )
    # Exa items often carry the main link in properties.url
    url = (
        item.get("url")
        or item.get("source_url")
        or item.get("link")
        or properties.get("url")
    )
    enrichment = (
        item.get("enrichment")
        or item.get("enrichments")
        or item.get("content")
        or item.get("text")
        or properties.get("content")
    )
    summary = None
    if isinstance(enrichment, dict):
        summary = enrichment.get("text") or enrichment.get("content")
    elif isinstance(enrichment, str):
        summary = enrichment
    if not summary and isinstance(properties.get("description"), str):
        summary = properties.get("description")
    links = {}
    if url:
        links["source"] = str(url)
    # Authors may be a string under research_paper.author
    authors: List[str] = []
    author_field = rp.get("author") or rp.get("authors") or properties.get("authors")
    if isinstance(author_field, str):
        authors = [a.strip() for a in author_field.split(",") if a.strip()]
    elif isinstance(author_field, list):
        authors = [str(a).strip() for a in author_field if str(a).strip()]

    unified = {
        "title": title,
        "authors": authors,
        "summary": summary,
        "links": links,
        "provider": "exa",
    }
    if not unified.get("summary"):
        # fallback: try description/content fields
        for cand in ("description", "content", "text"):
            if isinstance(item.get(cand), str) and item.get(cand):
                unified["summary"] = item[cand]
                break
    _logger.info("normalize_exa unified_keys=%s has_title=%s has_link=%s", list(unified.keys()), bool(unified.get("title")), bool(unified.get("links")))
    return "exa", unified


def _normalize_gs_payload(payload: Any) -> List[Dict[str, Any]]:
    # Payload could be {query, results: [...]} or a list already
    if isinstance(payload, dict) and isinstance(payload.get("results"), list):
        return payload["results"]
    if isinstance(payload, list):
        return payload
    return []


def _normalize_gs(item: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    try:
        _logger.info("normalize_gs raw_keys=%s", list(item.keys()))
    except Exception:
        pass
    title = str(item.get("Title") or item.get("title") or "Untitled")
    authors_raw = item.get("Authors") or item.get("authors") or []
    if isinstance(authors_raw, str):
        authors = [authors_raw]
    elif isinstance(authors_raw, list):
        authors = [str(a) for a in authors_raw]
    else:
        authors = []
    summary = item.get("Abstract") or item.get("summary") or None
    url = item.get("URL") or item.get("url")
    links = {}
    if url:
        links["source"] = str(url)
    unified = {
        "title": title,
        "authors": authors,
        "summary": summary,
        "links": links,
        "provider": "mcp_google_scholar",
    }
    _logger.info("normalize_gs unified_keys=%s has_title=%s has_link=%s", list(unified.keys()), bool(unified.get("title")), bool(unified.get("links")))
    return "mcp_google_scholar", unified


def _normalize_hf(item: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    try:
        _logger.info("normalize_hf raw_keys=%s", list(item.keys()))
    except Exception:
        pass
    paper = item.get("paper") or {}
    title = (
        item.get("title")
        or paper.get("title")
        or item.get("paperTitle")
        or paper.get("paperTitle")
        or "Untitled"
    )
    authors_raw = (
        item.get("authors")
        or item.get("paperAuthors")
        or paper.get("authors")
        or paper.get("paperAuthors")
        or []
    )
    authors: List[str] = []
    if isinstance(authors_raw, str):
        authors = [authors_raw]
    elif isinstance(authors_raw, list):
        for a in authors_raw:
            if isinstance(a, str):
                authors.append(a)
            elif isinstance(a, dict):
                name = a.get("name")
                if not name and isinstance(a.get("user"), dict):
                    user = a["user"]
                    name = user.get("fullname") or user.get("name") or user.get("user")
                if name:
                    authors.append(str(name))
    summary = (
        item.get("summary")
        or item.get("highlights")
        or paper.get("summary")
        or paper.get("highlights")
        or None
    )
    links = derive_links(item)
    unified = {
        "title": str(title),
        "authors": authors,
        "summary": summary,
        "links": links or {},
        "provider": "huggingface",
    }
    _logger.info("normalize_hf unified_keys=%s has_title=%s has_link=%s", list(unified.keys()), bool(unified.get("title")), bool(unified.get("links")))
    return "huggingface", unified


def _normalize_arxiv(item: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    try:
        _logger.info("normalize_arxiv raw_keys=%s", list(item.keys()))
    except Exception:
        pass
    title = (
        item.get("title")
        or item.get("Title")
        or item.get("paperTitle")
        or "Untitled"
    )
    authors_raw = item.get("authors") or item.get("Authors") or []
    authors: List[str] = []
    if isinstance(authors_raw, str):
        authors = [a.strip() for a in authors_raw.split(",") if a.strip()]
    elif isinstance(authors_raw, list):
        authors = [str(a) for a in authors_raw]

    summary = item.get("summary") or item.get("Summary") or item.get("abstract") or item.get("Abstract")

    url = item.get("url") or item.get("URL") or item.get("link")
    arxiv_id = item.get("id") or item.get("paperId")
    links: Dict[str, str] = {}
    if isinstance(url, str):
        if "arxiv.org" in url:
            links["arxiv"] = url
        else:
            links["source"] = url
    if arxiv_id and "arxiv" not in links:
        links["arxiv"] = f"https://arxiv.org/abs/{arxiv_id}"

    unified = {
        "title": str(title),
        "authors": authors,
        "summary": summary,
        "links": links,
        "provider": "mcp_arxiv",
    }
    _logger.info("normalize_arxiv unified_keys=%s has_title=%s has_link=%s", list(unified.keys()), bool(unified.get("title")), bool(unified.get("links")))
    return "mcp_arxiv", unified


async def _fetch_exa_async(query: str, limit: int) -> List[Dict[str, Any]]:
    start = perf_counter()
    _logger.info("provider=exa phase=start query='%s' limit=%s", query, limit)
    try:
        exa_results = await asyncio.to_thread(
            _searcher.search,
            query,
            **{
                "tool": "exa",
                "enrichment_description": "Concise research paper context: title, authors, abstract/summary, venue/year, and primary link",
                "count": min(3, limit),
                "use_cache": True,
            },
        )
        out: List[Dict[str, Any]] = []
        for it in exa_results:
            _, norm = _normalize_exa(it)
            # _logger.info("norm: %s", norm)
            out.append(norm)
        _logger.info(
            "provider=exa phase=success ms=%d count=%d",
            int((perf_counter() - start) * 1000),
            len(out),
        )
        # _logger.info("exa_results: %s", exa_results)
        return out
    except Exception as exc:
        _logger.exception(
            "provider=exa phase=error ms=%d error=%s",
            int((perf_counter() - start) * 1000),
            exc,
        )
        return []


async def _fetch_gs_async(query: str, limit: int) -> List[Dict[str, Any]]:
    start = perf_counter()
    _logger.info("provider=mcp_google_scholar phase=start query='%s' limit=%s", query, limit)
    try:
        gs_payload = await asyncio.to_thread(_searcher.search, query, **{"tool": "mcp_google_scholar", "numResults": min(10, limit)})
        out: List[Dict[str, Any]] = []
        for it in _normalize_gs_payload(gs_payload):
            _, norm = _normalize_gs(it)
            out.append(norm)
        _logger.info(
            "provider=mcp_google_scholar phase=success ms=%d count=%d",
            int((perf_counter() - start) * 1000),
            len(out),
        )
        return out
    except Exception as exc:
        _logger.exception(
            "provider=mcp_google_scholar phase=error ms=%d error=%s",
            int((perf_counter() - start) * 1000),
            exc,
        )
        return []


async def _fetch_arxiv_async(query: str, limit: int) -> List[Dict[str, Any]]:
    start = perf_counter()
    _logger.info("provider=mcp_arxiv phase=start query='%s' limit=%s", query, limit)
    try:
        arxiv_payload = await asyncio.to_thread(
            _searcher.search, query, **{"tool": "mcp_arxiv", "limit": min(10, limit), "include_abstracts": True}
        )
        # The MCP arxiv tool often returns a list with a single text item whose 'text' is a JSON string.
        items: List[Dict[str, Any]] = []
        try:
            if isinstance(arxiv_payload, list):
                for entry in arxiv_payload:
                    if isinstance(entry, dict) and isinstance(entry.get("text"), str):
                        import json as _json
                        try:
                            parsed = _json.loads(entry["text"])
                            results_list = (
                                parsed.get("results")
                                if isinstance(parsed, dict)
                                else (parsed if isinstance(parsed, list) else [])
                            )
                            if isinstance(results_list, list):
                                items.extend(results_list)
                        except Exception:
                            # If text is not JSON, skip
                            pass
                    elif isinstance(entry, dict):
                        items.append(entry)
            elif isinstance(arxiv_payload, dict):
                items = arxiv_payload.get("results") or arxiv_payload.get("items") or []
                if isinstance(items, dict):
                    items = [items]
        except Exception:
            items = []
        # _logger.info("arxiv_payload: %s", arxiv_payload)
        out: List[Dict[str, Any]] = []
        for it in items:
            _, norm = _normalize_arxiv(it)
            out.append(norm)
        _logger.info(
            "provider=mcp_arxiv phase=success ms=%d count=%d",
            int((perf_counter() - start) * 1000),
            len(out),
        )
        return out
    except Exception as exc:
        _logger.exception(
            "provider=mcp_arxiv phase=error ms=%d error=%s",
            int((perf_counter() - start) * 1000),
            exc,
        )
        return []


@app.post("/search", response_model=SearchResponse)
async def search(req: SearchRequest) -> SearchResponse:
    try:
        query = req.query or ""
        limit = req.limit if (req.limit is not None and req.limit > 0) else 10
        t0 = perf_counter()
        _logger.info("search phase=start query='%s' limit=%s", query, limit)

        # Run providers in parallel
        exa_task = _fetch_exa_async(query, limit)
        # Google Scholar temporarily disabled for speed; uncomment to re-enable
        _logger.info("provider=mcp_google_scholar phase=disabled")
        arxiv_task = _fetch_arxiv_async(query, limit)

        results = await asyncio.gather(exa_task, arxiv_task, return_exceptions=True)

        unified: List[Dict[str, Any]] = []
        for chunk in results:
            if isinstance(chunk, list):
                unified.extend(chunk)

        # Dedupe by (title + primary link)
        seen: set = set()
        deduped: List[Dict[str, Any]] = []
        for r in unified:
            primary_link = r.get("links", {}).get("arxiv") or r.get("links", {}).get("source")
            # If no link is available, fall back to provider+title for stability
            key = (r.get("title"), primary_link or r.get("provider"))
            if key in seen:
                continue
            seen.add(key)
            deduped.append(r)

        final_results = deduped[: limit]
        _logger.info(
            "search phase=done ms=%d total_raw=%d total_deduped=%d",
            int((perf_counter() - t0) * 1000),
            sum(len(chunk) for chunk in results if isinstance(chunk, list)),
            len(final_results),
        )
        return SearchResponse(count=len(final_results), results=[UnifiedItem(**r) for r in final_results])
    except Exception as exc:
        _logger.exception("search phase=error error=%s", exc)
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


