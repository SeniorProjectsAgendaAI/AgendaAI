#Canvas MCP Server Main Module and Tool Listing

import os
from dotenv import load_dotenv
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
from canvasapi import Canvas
from datetime import datetime, timedelta
import json

#load env variables from .env file in same directory
load_dotenv()

#get the env variables
CANVAS_URL = os.getenv("CANVAS_URL")
CANVAS_TOKEN = os.getenv("CANVAS_TOKEN")

if not CANVAS_TOKEN or not CANVAS_URL:
    raise ValueError("CANVAS_URL and CANVAS_TOKEN must be set in environment variables.")

#set up the cavnas app
canvas = Canvas(CANVAS_URL, CANVAS_TOKEN)
app = Server(name="canvas-server", description="A MCP server for interacting with the Canvas LMS.")


@app.list_tools()
async def list_tools():
    #This lists the tools available in this server for the LLM to use
    return [
        Tool(
            name= "get_courses",
            description="Get a list of courses the user is enrolled in.",
            inputSchema={
                "type" : "object",
                "properties" : {},
                "required" : []
            }
        ),
        Tool(
            name= "get_assignments",
            description="Get a list of assignments for a specfic course. It Returns assignmetn details including due dates, points, and submission status.",
            inputSchema={
                "type" : "object",
                "properties" : {
                    "course_id" : {
                        "type" : "string",
                        "description" : "The Canvas course ID"
                    },
                },
                "required" : ["course_id"]
            }
        ),
        Tool(
            name="get_upcoming_assignments",
            description="Get all upcoming assignments across all courses within the next 7 days",
            inputSchema={
                "type": "object",
                "properties": {
                    "days": {
                        "type": "integer",
                        "description": "Number of days to look ahead (default: 7)",
                        "default": 7
                    }
                },
                "required": []
            }
        ),
        Tool(
            name="get_announcements",
            description="Get recent announcements for a specific course",
            inputSchema={
                "type": "object",
                "properties": {
                    "course_id": {
                        "type": "string",
                        "description": "The Canvas course ID"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of announcements to retrieve (default: 10)",
                        "default": 10
                    }
                },
                "required": ["course_id"]
            }
        ),
        Tool(
            name="get_grades",
            description="Get grades and scores for a specific course",
            inputSchema={
                "type": "object",
                "properties": {
                    "course_id": {
                        "type": "string",
                        "description": "The Canvas course ID"
                    }
                },
                "required": ["course_id"]
            }
        ),
    ]



def main():
    print("Hello from canvas-server!")


if __name__ == "__main__":
    main()
