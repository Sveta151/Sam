import os
from urllib.parse import urlencode
import asyncio
import json

from dotenv import load_dotenv
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client


BASE_URL = "https://server.smithery.ai/@IlyaGusev/academia_mcp/mcp"


def build_server_url(api_key: str) -> str:
    """Build the authenticated MCP server URL using the provided API key."""
    params = {"api_key": api_key}
    return f"{BASE_URL}?{urlencode(params)}"


async def list_tools() -> list[str]:
    """Connect to the academia_mcp server and return available tool names."""
    # Load .env so the script works without exporting vars in the shell
    load_dotenv()
    api_key = os.environ.get("ACADEMIA_MCP_API_KEY")
    if not api_key:
        raise RuntimeError("Missing ACADEMIA_MCP_API_KEY environment variable")

    url = build_server_url(api_key)

    # Connect to the server using the HTTP streaming client
    async with streamablehttp_client(url) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools_result = await session.list_tools()
            return [t.name for t in tools_result.tools]


async def arxiv_search(
    query: str,
    limit: int | None = None,
    offset: int | None = None,
    sort_by: str | None = None,
    end_date: str | None = None,
    sort_order: str | None = None,
    start_date: str | None = None,
    include_abstracts: bool | None = None,
) -> dict:
    """Call the `arxiv_search` MCP tool with provided parameters.

    Required:
      - query
    Optional:
      - limit, offset, sort_by, end_date, sort_order, start_date, include_abstracts
    Returns the raw tool result from the MCP server.
    """
    load_dotenv()
    api_key = os.environ.get("ACADEMIA_MCP_API_KEY")
    if not api_key:
        raise RuntimeError("Missing ACADEMIA_MCP_API_KEY environment variable")

    url = build_server_url(api_key)

    args: dict = {"query": query}
    if limit is not None:
        args["limit"] = limit
    if offset is not None:
        args["offset"] = offset
    if sort_by is not None:
        args["sort_by"] = sort_by
    if end_date is not None:
        args["end_date"] = end_date
    if sort_order is not None:
        args["sort_order"] = sort_order
    if start_date is not None:
        args["start_date"] = start_date
    if include_abstracts is not None:
        args["include_abstracts"] = include_abstracts

    async with streamablehttp_client(url) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            # Invoke the tool by name
            result = await session.call_tool("arxiv_search", args)

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
                # Pydantic v1-style: item.json() returns a JSON string
                json_attr = getattr(item, "json", None)
                if callable(json_attr):
                    try:
                        json_str = json_attr()
                        try:
                            items.append(json.loads(json_str))
                        except Exception:
                            items.append(json_str)
                        continue
                    except Exception:
                        pass
                elif json_attr is not None:
                    items.append(_coerce_jsonable(json_attr))
                    continue
                text_value = getattr(item, "text", None) or getattr(item, "output_text", None)
                if isinstance(text_value, str):
                    try:
                        items.append(json.loads(text_value))
                    except Exception:
                        items.append(text_value)
                    continue
                data_value = getattr(item, "data", None)
                if data_value is not None:
                    items.append(_coerce_jsonable(data_value))
                    continue
                items.append(_coerce_jsonable(item))

            if len(items) == 1:
                return items[0]
            return items

async def main() -> None:
    tools = await list_tools()
    print(f"Available tools: {', '.join(tools) if tools else '(none)'}")


if __name__ == "__main__":
	asyncio.run(main())


