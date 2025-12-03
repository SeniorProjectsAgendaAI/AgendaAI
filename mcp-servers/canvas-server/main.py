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
                    "id": getattr(assignment, 'id', None),
                    "title": getattr(assignment, 'name', 'Untitled'),
                    "due_at": getattr(assignment, 'due_at', None),
                    "points_possible": getattr(assignment, 'points_possible', None),
                    "submission_types": getattr(assignment, 'submission_types', []),
                    "has_submitted": getattr(assignment, 'has_submitted_submissions', False)
                })
            
            return [TextContent(
                type="text",
                text=json.dumps(assignment_list, indent=2)
            )]

        elif name == "get_upcoming_assignments":
            days = arguments.get("days", 7)
            from datetime import timezone
            now = datetime.now(timezone.utc)
            cutoff_date = now + timedelta(days=days)
            
            upcoming = []
            courses = canvas.get_courses(enrollment_state='active')
            
            for course in courses:
                try:
                    assignments = course.get_assignments()
                    for assignment in assignments:
                        due_at = getattr(assignment, 'due_at', None)
                        if due_at:
                            due_date = datetime.fromisoformat(due_at.replace('Z', '+00:00'))
                            #Compare timezone-aware datetimes
                            if now <= due_date <= cutoff_date:
                                upcoming.append({
                                    "course_name": course.name,
                                    "course_id": course.id,
                                    "assignment_name": assignment.name,
                                    "assignment_id": assignment.id,
                                    "due_at": due_at,
                                    "points_possible": getattr(assignment, 'points_possible', None)
                                })
                except Exception as e:
                    continue
            
            #sort the due dates
            upcoming.sort(key=lambda x: x['due_at'])
            
            return [TextContent(
                type="text",
                text=json.dumps(upcoming, indent=2)
            )]

        elif name == "get_announcements":
            course_id = arguments["course_id"]
            limit = arguments.get("limit", 10)
            
            course = canvas.get_course(course_id)
            announcements = course.get_discussion_topics(only_announcements=True)
            
            announcement_list = []
            count = 0
            for announcement in announcements:
                if count >= limit:
                    break
                announcement_list.append({
                    "id": announcement.id,
                    "title": announcement.title,
                    "posted_at": getattr(announcement, 'posted_at', None),
                    "message": getattr(announcement, 'message', '')[:200] + '...' 
                })
                count += 1
            
            return [TextContent(
                type="text",
                text=json.dumps(announcement_list, indent=2)
            )]
        elif name == "get_grades":
            course_id = arguments["course_id"]
            course = canvas.get_course(course_id)
            user = canvas.get_current_user()
            
            enrollments = course.get_enrollments(user_id=user.id)
            grades = []
            
            for enrollment in enrollments:
                #Access the grades dict from enrollment object
                grades_dict = getattr(enrollment, 'grades', {})
                grades.append({
                    "course_name": course.name,
                    "current_score": grades_dict.get('current_score'),
                    "current_grade": grades_dict.get('current_grade'),
                    "final_score": grades_dict.get('final_score'),
                    "final_grade": grades_dict.get('final_grade')
                })
            
            return [TextContent(
                type="text",
                text=json.dumps(grades, indent=2)
            )]
        else:
            return [TextContent(
                    type="text",
                    text=f"Unknown tool: {name}"
                )]
    except Exception as e:
        return [TextContent(
            type="text",
            text=f"Error executing {name}: {str(e)}"
        )]

async def main():
    #Start the MCP server using stdio
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )

if __name__ == "__main__":

    import asyncio  
    asyncio.run(main())
