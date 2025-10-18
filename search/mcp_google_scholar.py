from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

# Construct server URL with authentication
from urllib.parse import urlencode
base_url = "https://server.smithery.ai/@mochow13/google-scholar-mcp/mcp"
params = {"api_key": "b5e28cd8-edd8-4099-9b02-62554e19a8e8"}
url = f"{base_url}?{urlencode(params)}"

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
            return result

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


