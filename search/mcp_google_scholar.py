import os
from urllib.parse import urlencode

from dotenv import load_dotenv
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client
import json


BASE_URL = "https://server.smithery.ai/@mochow13/google-scholar-mcp/mcp"


def build_server_url(api_key: str) -> str:
    params = {"api_key": api_key}
    return f"{BASE_URL}?{urlencode(params)}"

async def search_google_scholar(
    query: str,
    author: str | None = None,
    endYear: int | None = None,
    startYear: int | None = None,
    numResults: int | None = None,
) -> dict:
    """Call the `search_google_scholar` MCP tool.

    Required:
      - query
    Optional:
      - author, endYear, startYear, numResults
    Returns the raw tool result from the MCP server.
    """
    load_dotenv()
    api_key = os.environ.get("ACADEMIA_MCP_API_KEY")
    if not api_key:
        raise RuntimeError("Missing ACADEMIA_MCP_API_KEY environment variable")

    url = build_server_url(api_key)

    args: dict = {"query": query}
    if author is not None:
        args["author"] = author
    if endYear is not None:
        args["endYear"] = endYear
    if startYear is not None:
        args["startYear"] = startYear
    if numResults is not None:
        args["numResults"] = numResults

    async with streamablehttp_client(url) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            result = await session.call_tool("search_google_scholar", args)

            # Convert the MCP CallToolResult into JSON-serializable data
            def _coerce_jsonable(value):
                if value is None or isinstance(value, (str, int, float, bool)):
                    return value
                if isinstance(value, (list, tuple, set)):
                    return [_coerce_jsonable(v) for v in value]
                if isinstance(value, dict):
                    return {str(_coerce_jsonable(k)): _coerce_jsonable(v) for k, v in value.items()}
                if hasattr(value, "model_dump_json"):
                    try:
                        return json.loads(value.model_dump_json())
                    except Exception:
                        pass
                if hasattr(value, "model_dump"):
                    try:
                        return _coerce_jsonable(value.model_dump())
                    except Exception:
                        pass
                if hasattr(value, "dict"):
                    try:
                        return _coerce_jsonable(value.dict())
                    except Exception:
                        pass
                try:
                    return str(value)
                except Exception:
                    return "<unserializable>"

            content = getattr(result, "content", None)
            if content is None:
                return {"result": _coerce_jsonable(result)}

            items = []
            for item in content:
                # Prefer explicit JSON payloads if present
                if hasattr(item, "json") and getattr(item, "json") is not None:
                    items.append(_coerce_jsonable(getattr(item, "json")))
                    continue
                # Text payloads: try to parse JSON, else keep as text
                text_value = getattr(item, "text", None) or getattr(item, "output_text", None)
                if isinstance(text_value, str):
                    try:
                        items.append(json.loads(text_value))
                    except Exception:
                        items.append(text_value)
                    continue
                # Generic data/mime-typed payloads
                data_value = getattr(item, "data", None)
                if data_value is not None:
                    items.append(_coerce_jsonable(data_value))
                    continue
                # Fallback to best-effort coercion
                items.append(_coerce_jsonable(item))

            # If a single top-level payload, unwrap it; otherwise return list
            if len(items) == 1:
                return items[0]
            return items

async def main():
    load_dotenv()
    api_key = os.environ.get("ACADEMIA_MCP_API_KEY")
    if not api_key:
        raise RuntimeError("Missing ACADEMIA_MCP_API_KEY environment variable")
    url = build_server_url(api_key)

    async with streamablehttp_client(url) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools_result = await session.list_tools()
            print(f"Available tools: {', '.join([t.name for t in tools_result.tools])}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())


