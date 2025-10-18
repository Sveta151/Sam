from __future__ import annotations

import json
import os
import hashlib
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from exa_py import Exa
from exa_py.websets.types import CreateWebsetParameters, CreateEnrichmentParameters


class ExaSearchService:
    """Thin wrapper around Exa Websets with simple file-based caching.

    Usage:
        service = ExaSearchService()
        items = service.get(
            query="Top AI research labs focusing on large language models",
            enrichment_description="LinkedIn profile of VP of Engineering or related role",
            count=5,
            use_cache=True,
        )
    """

    def __init__(self, api_key: Optional[str] = None, cache_dir: Optional[str] = None) -> None:
        load_dotenv()
        key = api_key or os.getenv("EXA_API_KEY")
        if not key:
            raise RuntimeError("EXA_API_KEY is not set. Add it to your environment or .env file.")
        self._exa = Exa(key)

        base_dir = os.path.dirname(os.path.abspath(__file__))
        self._cache_dir = (
            os.path.join(base_dir, ".cache", "exa") if cache_dir is None else cache_dir
        )
        os.makedirs(self._cache_dir, exist_ok=True)

    def _make_cache_key(self, query: str, enrichment_description: str, count: int) -> str:
        payload = {
            "query": query,
            "enrichment_description": enrichment_description,
            "count": int(count),
            # include a simple version tag to allow future invalidation if the shape changes
            "v": 1,
        }
        digest = hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()
        return digest

    def _cache_path(self, key: str) -> str:
        return os.path.join(self._cache_dir, f"{key}.json")

    def _serialize_item(self, item: Any) -> Dict[str, Any]:
        def _coerce_jsonable(value):
            # Fast-path primitives
            if value is None or isinstance(value, (str, int, float, bool)):
                return value
            # Collections
            if isinstance(value, (list, tuple, set)):
                return [ _coerce_jsonable(v) for v in value ]
            if isinstance(value, dict):
                return { str(_coerce_jsonable(k)): _coerce_jsonable(v) for k, v in value.items() }
            # Pydantic v2 style
            if hasattr(value, "model_dump"):
                try:
                    dumped = value.model_dump()
                    return _coerce_jsonable(dumped)
                except Exception:
                    pass
            # Pydantic v1 style
            if hasattr(value, "dict"):
                try:
                    dumped = value.dict()
                    return _coerce_jsonable(dumped)
                except Exception:
                    pass
            # As a last resort, stringify
            try:
                return str(value)
            except Exception:
                return "<unserializable>"

        # Prefer Pydantic dumps, then fall back, and always coerce deeply to JSON-friendly types
        if hasattr(item, "model_dump_json"):
            try:
                return json.loads(item.model_dump_json())
            except Exception:
                pass
        if hasattr(item, "model_dump"):
            try:
                return _coerce_jsonable(item.model_dump())
            except Exception:
                pass
        if hasattr(item, "dict"):
            try:
                return _coerce_jsonable(item.dict())
            except Exception:
                pass
        return _coerce_jsonable(item)

    def get(
        self,
        query: str,
        enrichment_description: str,
        count: int,
        use_cache: bool = True,
    ) -> List[Dict[str, Any]]:
        """Return list of items (JSON-like dicts) for the given parameters.

        Caches results to disk keyed by (query, enrichment_description, count).
        """
        cache_key = self._make_cache_key(query, enrichment_description, count)
        cache_path = self._cache_path(cache_key)

        if use_cache and os.path.exists(cache_path):
            try:
                with open(cache_path, "r", encoding="utf-8") as f:
                    cached = json.load(f)
                items = cached.get("items", [])
                return items
            except Exception:
                # Cache read failed; proceed to fetch fresh
                pass

        # Build and run the Webset job
        webset = self._exa.websets.create(
            params=CreateWebsetParameters(
                search={
                    "query": query,
                    "count": int(count),
                },
                enrichments=[
                    CreateEnrichmentParameters(
                        description=enrichment_description,
                        format="text",
                    ),
                ],
            )
        )

        # Wait for processing to complete
        webset = self._exa.websets.wait_until_idle(webset.id)

        # Retrieve items and serialize to JSON-friendly dicts
        raw_items = self._exa.websets.items.list(webset_id=webset.id)
        items: List[Dict[str, Any]] = [self._serialize_item(it) for it in getattr(raw_items, "data", [])]

        # Persist to cache
        try:
            payload = {
                "query": query,
                "enrichment_description": enrichment_description,
                "count": int(count),
                "webset_id": getattr(webset, "id", None),
                "fetched_at": datetime.now(timezone.utc).isoformat(),
                "items": items,
            }
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False, indent=2)
        except Exception:
            # If caching fails, we still return fresh results
            pass

        return items


def exa_search(
    query: str,
    enrichment_description: str,
    count: int,
    use_cache: bool = True,
    api_key: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Convenience function returning items for given parameters.

    Designed for easy use from other modules like `paper_search.py`.
    """
    service = ExaSearchService(api_key=api_key)
    return service.get(query=query, enrichment_description=enrichment_description, count=count, use_cache=use_cache)


class ExaSearchTool:
    """Callable wrapper so Exa search can plug into generic search workflows."""

    def __init__(
        self,
        enrichment_description: str,
        *,
        count: int = 10,
        use_cache: bool = True,
        api_key: Optional[str] = None,
        service: Optional[ExaSearchService] = None,
        name: str = "exa",
    ) -> None:
        self._default_enrichment_description = enrichment_description
        self._default_count = count
        self._default_use_cache = use_cache
        self._service = service or ExaSearchService(api_key=api_key)
        self.name = name

    def __call__(
        self,
        query: str,
        *,
        enrichment_description: Optional[str] = None,
        count: Optional[int] = None,
        use_cache: Optional[bool] = None,
    ) -> List[Dict[str, Any]]:
        description = enrichment_description if enrichment_description is not None else self._default_enrichment_description
        if not description:
            raise ValueError("An enrichment description must be provided for Exa search.")
        final_count = count if count is not None else self._default_count
        if final_count <= 0:
            raise ValueError("Result count must be a positive integer.")
        final_use_cache = self._default_use_cache if use_cache is None else use_cache
        return self._service.get(
            query=query,
            enrichment_description=description,
            count=final_count,
            use_cache=final_use_cache,
        )


if __name__ == "__main__":
    # Minimal manual run example (reads EXA_API_KEY from environment/.env)
    svc = ExaSearchService()
    results = svc.get(
        query="Trust encoded in LLMs ",
        enrichment_description="Main research outcome ",
        count=2,
        use_cache=True,
    )
    print(json.dumps(results, indent=2))
