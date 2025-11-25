import asyncio
import types

from main import app

async def _list_tool_names():
    resp = await app.list_tools()
    return [t.name for t in resp]

def test_gmail_tools_exist():
    names = asyncio.run(_list_tool_names())
    assert "list_unread_emails" in names
    assert "search_emails" in names

async def _call_dummy_tool():
    #calling fake so we dont use the real api with rate limits

    result = await app.call_tool("nonexistent_tool", {})
    assert isinstance(result, list)
    assert len(result) == 1
    assert "Unknown tool" in result[0].text

def test_unknown_tool_handled():
    asyncio.run(_call_dummy_tool())
