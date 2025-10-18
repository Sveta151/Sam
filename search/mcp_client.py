import os
from urllib.parse import urlencode
import asyncio

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
            return result

async def main() -> None:
    tools = await list_tools()
    print(f"Available tools: {', '.join(tools) if tools else '(none)'}")


if __name__ == "__main__":
	asyncio.run(main())


