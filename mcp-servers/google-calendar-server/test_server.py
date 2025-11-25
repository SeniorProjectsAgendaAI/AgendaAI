import asyncio

from main import app

#Acutal api calls arent made to avoid rate limits, will be added later.

async def _list_tool_names():
    resp = await app.list_tools()
    return [t.name for t in resp]

def test_calendar_tools_exist():
    names = asyncio.run(_list_tool_names())
    assert "list_upcoming_events" in names
    assert "create_event" in names

async def _unknown_tool():
    result = await app.call_tool("nonexistent_tool", {})
    assert len(result) == 1
    assert "Unknown tool" in result[0].text

def test_unknown_tool_handled():
    asyncio.run(_unknown_tool())
