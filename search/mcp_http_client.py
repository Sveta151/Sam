from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client
from typing import Any, List
import json

# Construct server URL with authentication
from urllib.parse import urlencode

base_url = "https://server.smithery.ai/@adamamer20/paper-search-mcp-openai/mcp"
params = {"api_key": "b5e28cd8-edd8-4099-9b02-62554e19a8e8"}
url = f"{base_url}?{urlencode(params)}"


async def search_arxiv(query: str, max_results: int | None = None) -> List[Any]:
    """Call the MCP tool `search_arxiv` with required `query` and optional `max_results`.

    Returns a list of JSON-serializable items from the tool result.
    """
    args: dict[str, Any] = {"query": query}
    if max_results is not None:
        args["max_results"] = max_results

    async with streamablehttp_client(url) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            result = await session.call_tool("search_arxiv", args)

            items: list[Any] = []
            content = getattr(result, "content", None)
            if content is None:
                return [str(result)]

            for item in content:
                # Prefer JSON if available
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

                text_value = getattr(item, "text", None) or getattr(item, "output_text", None)
                if isinstance(text_value, str):
                    try:
                        items.append(json.loads(text_value))
                    except Exception:
                        items.append(text_value)
                    continue

                data_value = getattr(item, "data", None)
                if data_value is not None:
                    items.append(data_value)
                    continue

                # Fallback
                try:
                    items.append(str(item))
                except Exception:
                    items.append("<unserializable>")

            return items


async def main():
    # Connect to the server using HTTP client
    async with streamablehttp_client(url) as (read, write, _):
        async with ClientSession(read, write) as session:
            # Initialize the connection
            await session.initialize()

            # List available tools
            tools_result = await session.list_tools()
            print(f"Available tools: {', '.join([t.name for t in tools_result.tools])}")


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())


