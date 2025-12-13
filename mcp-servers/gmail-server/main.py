#Gmail MCP Server Gmail Module and Tool Listing
#Author: Biniam Gashaw
#Class: CS425: Software Engineering
#Sources: https://modelcontextprotocol.io/docs/develop/build-server
import os
import json
import asyncio
from typing import List

from dotenv import load_dotenv
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent


load_dotenv()

GMAIL_TOKEN_PATH = os.getenv("GMAIL_TOKEN_PATH", "gmail_token.json")
GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

def get_gmail_service():
    if not os.path.exists(GMAIL_TOKEN_PATH):
        raise RuntimeError(
            f"Gmail token file not found at {GMAIL_TOKEN_PATH}. "
            "Run your Google OAuth flow and save the authorized_user JSON there."
        )
    creds = Credentials.from_authorized_user_file(GMAIL_TOKEN_PATH, scopes=GMAIL_SCOPES)
    return build("gmail", "v1", credentials=creds)

app = Server("gmail-server")

@app.list_tools()
async def list_tools() -> List[Tool]:
    return [
        Tool(
            name="list_unread_emails",
            description="List recent unread emails (subject, from, snippet).",
            inputSchema={
                "type": "object",
                "properties": {
                    "max_results": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 50,
                        "default": 10,
                    }
                },
                "required": [],
            },
        ),
        Tool(
            name="search_emails",
            description="Search Gmail with a query string (e.g. 'from:prof assignment').",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "max_results": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 50,
                        "default": 10,
                    },
                },
                "required": ["query"],
            },
        ),
    ]

@app.call_tool()
async def call_tool(name: str, arguments: dict):
    try:
        service = get_gmail_service()

        if name == "list_unread_emails":
            max_results = int(arguments.get("max_results", 10))
            resp = (
                service.users()
                .messages()
                .list(userId="me", labelIds=["UNREAD"], maxResults=max_results)
                .execute()
            )
            messages = resp.get("messages", [])
            out = []
            for meta in messages:
                msg = (
                    service.users()
                    .messages()
                    .get(
                        userId="me",
                        id=meta["id"],
                        format="metadata",
                        metadataHeaders=["Subject", "From"],
                    )
                    .execute()
                )
                headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
                out.append(
                    {
                        "id": msg["id"],
                        "subject": headers.get("Subject"),
                        "from": headers.get("From"),
                        "snippet": msg.get("snippet"),
                    }
                )
            return [TextContent(type="text", text=json.dumps(out, indent=2))]

        if name == "search_emails":
            query = arguments["query"]
            max_results = int(arguments.get("max_results", 10))
            resp = (
                service.users()
                .messages()
                .list(userId="me", q=query, maxResults=max_results)
                .execute()
            )
            messages = resp.get("messages", [])
            out = []
            for meta in messages:
                msg = (
                    service.users()
                    .messages()
                    .get(
                        userId="me",
                        id=meta["id"],
                        format="metadata",
                        metadataHeaders=["Subject", "From", "Date"],
                    )
                    .execute()
                )
                headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
                out.append(
                    {
                        "id": msg["id"],
                        "subject": headers.get("Subject"),
                        "from": headers.get("From"),
                        "date": headers.get("Date"),
                        "snippet": msg.get("snippet"),
                    }
                )
            return [TextContent(type="text", text=json.dumps(out, indent=2))]

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
