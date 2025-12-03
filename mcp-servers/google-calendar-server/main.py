import os
import json
import asyncio
from datetime import datetime, timedelta, timezone
from typing import List

from dotenv import load_dotenv
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

load_dotenv()

GCAL_TOKEN_PATH = os.getenv("GCAL_TOKEN_PATH", "gcal_token.json")
GCAL_SCOPES = ["https://www.googleapis.com/auth/calendar"]

def get_calendar_service():
    if not os.path.exists(GCAL_TOKEN_PATH):
        raise RuntimeError(
            f"Google Calendar token file not found at {GCAL_TOKEN_PATH}. "
            "Run your Google OAuth flow and save the authorized_user JSON there."
        )
    creds = Credentials.from_authorized_user_file(GCAL_TOKEN_PATH, scopes=GCAL_SCOPES)
    return build("calendar", "v3", credentials=creds)

app = Server("google-calendar-server")

@app.list_tools()
async def list_tools() -> List[Tool]:
    return [
        Tool(
            name="list_upcoming_events",
            description="List upcoming events from your primary Google Calendar.",
            inputSchema={
                "type": "object",
                "properties": {
                    "days_ahead": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 30,
                        "default": 7,
                    }
                },
                "required": [],
            },
        ),
        Tool(
            name="create_event",
            description="Create a simple timed event in your primary calendar.",
            inputSchema={
                "type": "object",
                "properties": {
                    "summary": {"type": "string"},
                    "start_iso": {
                        "type": "string",
                        "description": "Start time in ISO 8601 with timezone."
                    },
                    "end_iso": {
                        "type": "string",
                        "description": "End time in ISO 8601 with timezone."
                    },
                    "description": {"type": "string"},
                },
                "required": ["summary", "start_iso", "end_iso"],
            },
        ),
    ]

@app.call_tool()
async def call_tool(name: str, arguments: dict):
    try:
        service = get_calendar_service()

        if name == "list_upcoming_events":
            days_ahead = int(arguments.get("days_ahead", 7))
            now = datetime.now(timezone.utc)
            time_min = now.isoformat()
            time_max = (now + timedelta(days=days_ahead)).isoformat()

            events_result = (
                service.events()
                .list(
                    calendarId="primary",
                    timeMin=time_min,
                    timeMax=time_max,
                    singleEvents=True,
                    orderBy="startTime",
                )
                .execute()
            )
            events = events_result.get("items", [])
            out = [
                {
                    "id": e["id"],
                    "summary": e.get("summary"),
                    "start": e.get("start"),
                    "end": e.get("end"),
                    "htmlLink": e.get("htmlLink"),
                }
                for e in events
            ]
            return [TextContent(type="text", text=json.dumps(out, indent=2))]

        if name == "create_event":
            event_body = {
                "summary": arguments["summary"],
                "description": arguments.get("description"),
                "start": {"dateTime": arguments["start_iso"]},
                "end": {"dateTime": arguments["end_iso"]},
            }
            created = (
                service.events()
                .insert(calendarId="primary", body=event_body)
                .execute()
            )
            return [TextContent(type="text", text=json.dumps(created, indent=2))]

        return [TextContent(type="text", text=f"Unknown tool: {name}")]
    except Exception as e:
        return [TextContent(
            type="text",
            text=f"Error executing {name}: {str(e)}"
        )]

async def _run():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())

def main():
    asyncio.run(_run())

if __name__ == "__main__":
    main()
