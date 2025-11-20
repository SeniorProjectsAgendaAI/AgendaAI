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

#set up the canvas app
canvas = Canvas(CANVAS_URL, CANVAS_TOKEN)
app = Server("canvas-server")

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

@app.call_tool()
async def call_tool(name: str, arguments:dict) -> list[TextContent]:
#This tool handels tool calls from the LLM

    try:
        if name == "get_courses":
            courses = canvas.get_courses(enrollment_state="active")
            course_list = []
            for course in courses:
                course_list.append({
                    "id": course.id,
                    "name": course.name,
                    "course_code":getattr(course, "course_code", "N/A")     
                })
            return [TextContent(
                type="text",
                text=json.dumps(course_list, indent=2)
            )]
        
        elif name == "get_assignments":
            course_id = arguments["course_id"]
            course = canvas.get_course(course_id)
            assignments = course.get_assignments()
            
            assignment_list = []
            for assignment in assignments:
                assignment_list.append({
                    "id": assignment.id,
                    "name": assignment.name,
                    "due_at": getattr(assignment, 'due_at', None),
                    "points_possible": getattr(assignment, 'points_possible', None),
                    "submission_types": getattr(assignment, 'submission_types', []),
                    "has_submitted": getattr(assignment, 'has_submitted_submissions', False)
                })
            
            return [TextContent(
                type="text",
                text=json.dumps(assignment_list, indent=2)
            )]

