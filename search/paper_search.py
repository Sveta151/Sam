from __future__ import annotations

from typing import Callable, Dict, List, Optional
import asyncio
import json


SearchResult = List[dict]
SearchTool = Callable[..., SearchResult]
SearchToolRegistry = Dict[str, SearchTool]


def _dummy_search_tool(query: str) -> SearchResult:
    """Return a placeholder response for the given query."""
    return [
        {
            "title": f"Sample paper for: {query}",
            "authors": ["Doe, Jane"],
            "source": "dummy-provider",
            "summary": "This is a mock summary. Replace with real search logic.",
        }
    ]


class ResearchPaperSearcher:
    """Search helper that can route to different underlying tools."""

    def __init__(
        self,
        query: str = "",
        search_tool: Optional[SearchTool] = None,
        *,
        search_tools: Optional[SearchToolRegistry] = None,
        default_tool: Optional[str] = None,
        author: Optional[str] = None,
        tags: Optional[List[str]] = None,
        limit: Optional[int] = None,
        year: Optional[int] = None,
        venue: Optional[str] = None,
    ) -> None:
        self._query = query
        provided_tools: SearchToolRegistry = {}
        if search_tools:
            provided_tools.update(search_tools)
        if search_tool:
            provided_tools.setdefault("primary", search_tool)
        if not provided_tools:
            provided_tools["dummy"] = _dummy_search_tool
        self._tools: SearchToolRegistry = dict(provided_tools)
        self._default_tool = default_tool or next(iter(self._tools))
        if self._default_tool not in self._tools:
            raise ValueError(f"Default tool '{self._default_tool}' is not registered.")
        self._author = author
        self._tags = tags
        self._limit = limit
        self._year = year
        self._venue = venue

    @property
    def query(self) -> str:
        return self._query

    @query.setter
    def query(self, value: str) -> None:
        self._query = value

    @property
    def search_tool(self) -> SearchTool:
        return self._tools[self._default_tool]

    @search_tool.setter
    def search_tool(self, tool: SearchTool) -> None:
        self._tools[self._default_tool] = tool

    @property
    def search_tools(self) -> SearchToolRegistry:
        return dict(self._tools)

    @property
    def default_tool(self) -> str:
        return self._default_tool

    @default_tool.setter
    def default_tool(self, name: str) -> None:
        if name not in self._tools:
            raise ValueError(f"Tool '{name}' is not registered. Available tools: {', '.join(self._tools)}")
        self._default_tool = name

    def add_tool(self, name: str, tool: SearchTool, *, make_default: bool = False) -> None:
        if not name:
            raise ValueError("Tool name must be a non-empty string.")
        self._tools[name] = tool
        if make_default:
            self._default_tool = name

    def add_exa_tool(
        self,
        enrichment_description: str,
        *,
        name: str = "exa",
        count: int = 10,
        use_cache: bool = True,
        api_key: Optional[str] = None,
        make_default: bool = False,
    ) -> SearchTool:
        """Convenience helper to register the Exa search tool."""
        from .exa_search import ExaSearchTool

        exa_tool = ExaSearchTool(
            enrichment_description=enrichment_description,
            count=count,
            use_cache=use_cache,
            api_key=api_key,
            name=name,
        )
        self.add_tool(name, exa_tool, make_default=make_default)
        return exa_tool

    def add_hf_daily_tool(self, *, name: str = "hf_daily", make_default: bool = False) -> SearchTool:
        """Register a tool that fetches Hugging Face daily papers.

        tool_kwargs:
          - date: optional ISO date (YYYY-MM-DD) for a specific day
        """
        from .hugging_face_paper import fetch_daily_papers as _fetch_daily

        def _matches_query(record: dict, query: str) -> bool:
            if not query:
                return True
            q = query.lower()
            paper = record.get("paper") or {}
            haystack_values = [
                record.get("title"),
                record.get("summary"),
                record.get("highlights"),
                paper.get("title"),
                paper.get("summary"),
                paper.get("highlights"),
            ]
            for val in haystack_values:
                if isinstance(val, str) and q in val.lower():
                    return True
            return False

        def tool_impl(query: str, *, date: Optional[str] = None, **_: dict) -> List[dict]:
            items = _fetch_daily(date=date)
            return [it for it in items if _matches_query(it, query)]

        self.add_tool(name, tool_impl, make_default=make_default)
        return tool_impl

    def add_hf_weekly_tool(self, *, name: str = "hf_weekly", make_default: bool = False) -> SearchTool:
        """Register a tool that fetches Hugging Face weekly papers.

        tool_kwargs:
          - end_date: optional ISO date to end the trailing window
          - days: optional int (default 7)
        """
        from .hugging_face_paper import fetch_weekly_papers as _fetch_weekly

        def _matches_query(record: dict, query: str) -> bool:
            if not query:
                return True
            q = query.lower()
            paper = record.get("paper") or {}
            haystack_values = [
                record.get("title"),
                record.get("summary"),
                record.get("highlights"),
                paper.get("title"),
                paper.get("summary"),
                paper.get("highlights"),
            ]
            for val in haystack_values:
                if isinstance(val, str) and q in val.lower():
                    return True
            return False

        def tool_impl(query: str, *, end_date: Optional[str] = None, days: int = 7, **_: dict) -> List[dict]:
            items = _fetch_weekly(end_date=end_date, days=days)
            return [it for it in items if _matches_query(it, query)]

        self.add_tool(name, tool_impl, make_default=make_default)
        return tool_impl

    def add_hf_monthly_tool(self, *, name: str = "hf_monthly", make_default: bool = False) -> SearchTool:
        """Register a tool that fetches Hugging Face monthly papers.

        tool_kwargs:
          - end_date: optional ISO date to end the trailing window
          - days: optional int (default 30)
        """
        from .hugging_face_paper import fetch_monthly_papers as _fetch_monthly

        def _matches_query(record: dict, query: str) -> bool:
            if not query:
                return True
            q = query.lower()
            paper = record.get("paper") or {}
            haystack_values = [
                record.get("title"),
                record.get("summary"),
                record.get("highlights"),
                paper.get("title"),
                paper.get("summary"),
                paper.get("highlights"),
            ]
            for val in haystack_values:
                if isinstance(val, str) and q in val.lower():
                    return True
            return False

        def tool_impl(query: str, *, end_date: Optional[str] = None, days: int = 30, **_: dict) -> List[dict]:
            items = _fetch_monthly(end_date=end_date, days=days)
            return [it for it in items if _matches_query(it, query)]

        self.add_tool(name, tool_impl, make_default=make_default)
        return tool_impl

    def add_hf_tools(self, *, make_default: bool = False) -> None:
        """Register hf_daily, hf_weekly, and hf_monthly tools."""
        self.add_hf_daily_tool(make_default=make_default)
        self.add_hf_weekly_tool(make_default=False)
        self.add_hf_monthly_tool(make_default=False)

    def add_mcp_arxiv_tool(
        self,
        *,
        name: str = "mcp_arxiv",
        make_default: bool = False,
    ) -> SearchTool:
        """Register a minimal MCP arXiv tool that calls `mcp_client.arxiv_search`.

        Pass tool params directly via `search(..., tool=name, limit=..., offset=..., ...)`.
        """

        def tool_impl(query: str, **kwargs) -> List[dict]:
            from .mcp_client import arxiv_search as _arxiv_search
            result = asyncio.run(_arxiv_search(query=query, **kwargs))
            return result if isinstance(result, list) else [result]

        self.add_tool(name, tool_impl, make_default=make_default)
        return tool_impl

    @property
    def author(self) -> Optional[str]:
        return self._author

    @author.setter
    def author(self, value: Optional[str]) -> None:
        self._author = value

    @property
    def tags(self) -> Optional[List[str]]:
        return self._tags

    @tags.setter
    def tags(self, value: Optional[List[str]]) -> None:
        self._tags = value

    @property
    def limit(self) -> Optional[int]:
        return self._limit

    @limit.setter
    def limit(self, value: Optional[int]) -> None:
        self._limit = value

    @property
    def year(self) -> Optional[int]:
        return self._year

    @year.setter
    def year(self, value: Optional[int]) -> None:
        self._year = value

    @property
    def venue(self) -> Optional[str]:
        return self._venue

    @venue.setter
    def venue(self, value: Optional[str]) -> None:
        self._venue = value

    def available_tools(self) -> List[str]:
        return list(self._tools.keys())

    def search(self, query: Optional[str] = None, *, tool: Optional[str] = None, **tool_kwargs) -> SearchResult:
        active_query = query if query is not None else self._query
        # Allow empty queries for tools that don't require a query (e.g., HF tools)
        tool_name = tool or self._default_tool
        if tool_name not in self._tools:
            raise ValueError(f"Tool '{tool_name}' is not registered. Available tools: {', '.join(self._tools)}")
        results = self._tools[tool_name](active_query, **tool_kwargs)
        if self._limit is not None and self._limit >= 0:
            results = results[: self._limit]
        return results
