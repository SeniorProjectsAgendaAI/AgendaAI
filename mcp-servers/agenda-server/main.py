# AgendaAI Internal MCP Server - Task & Event Management
# Provides tools for the AI agent to create, read, update, and delete tasks and events in the AgendaAI PostgreSQL database.

import asyncio
import json
import os
from datetime import date, datetime, time, timedelta, timezone
from typing import List

from dotenv import load_dotenv
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool
from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    create_engine,
)
from sqlalchemy.orm import Session, declarative_base, relationship, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+psycopg://agendaai:agendaai@localhost:5432/agendaai"
)
RUNTIME_USER_PATH = "/tmp/agendaai_user_runtime.json"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


# Mirror the backend models (read-only definitions for querying)
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    cognito_sub = Column(String, unique=True, index=True, nullable=True)


class Task(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    tag = Column(String, nullable=True)
    color = Column(String, nullable=True)
    priority = Column(Integer, nullable=True, default=1)
    status = Column(String, nullable=False, default="todo")
    due_date = Column(Date, nullable=True)
    due_time = Column(Time, nullable=True)
    completed = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    start_at = Column(DateTime, nullable=False)
    end_at = Column(DateTime, nullable=False)
    all_day = Column(Boolean, nullable=False, default=False)
    recurrence = Column(String, nullable=False, default="none")
    color = Column(String, nullable=True)
    location = Column(String, nullable=True)
    status = Column(String, nullable=False, default="scheduled")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


def _to_local_naive(dt: datetime) -> datetime:
    """Convert a timezone-aware datetime to a naive local-time datetime.

    Google Calendar returns ISO strings with tz offsets (e.g. '2026-04-16T14:00:00-07:00').
    datetime.fromisoformat keeps that offset, but our DB column is naive (no tz).
    If we store the value as-is the offset is silently dropped, so a UTC value
    like '21:00+00:00' would appear as 9 PM instead of 2 PM local.

    Fix: convert to the server's local timezone first, then strip tzinfo.
    """
    if dt.tzinfo is not None:
        dt = dt.astimezone()          # convert to system local tz
        dt = dt.replace(tzinfo=None)  # strip tz so SQLAlchemy stores it as naive local
    return dt


ALLOWED_TASK_STATUSES = {"todo", "in_progress", "done"}
ALLOWED_EVENT_STATUSES = {"scheduled", "ongoing", "completed", "canceled"}
ALLOWED_EVENT_RECURRENCE = {"none", "daily", "weekly", "monthly"}


def _get_current_user_id() -> int:
    """Read the current user's cognito_sub from runtime file and resolve to user_id."""
    if not os.path.exists(RUNTIME_USER_PATH):
        raise RuntimeError("No user identity available. Runtime user file not found.")
    with open(RUNTIME_USER_PATH, "r") as f:
        data = json.load(f)
    cognito_sub = data.get("cognito_sub")
    if not cognito_sub:
        raise RuntimeError("Runtime user file missing cognito_sub.")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.cognito_sub == cognito_sub).first()
        if not user:
            raise RuntimeError(f"User with cognito_sub not found in database.")
        return user.id
    finally:
        db.close()


def _serialize_task(task: Task) -> dict:
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "tag": task.tag,
        "color": task.color,
        "priority": task.priority,
        "status": task.status,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "due_time": task.due_time.isoformat() if task.due_time else None,
        "completed": task.completed,
        "created_at": task.created_at.isoformat() if task.created_at else None,
    }


def _serialize_event(event: Event) -> dict:
    return {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "start_at": event.start_at.isoformat() if event.start_at else None,
        "end_at": event.end_at.isoformat() if event.end_at else None,
        "all_day": event.all_day,
        "recurrence": event.recurrence,
        "color": event.color,
        "location": event.location,
        "status": event.status,
        "created_at": event.created_at.isoformat() if event.created_at else None,
        "updated_at": event.updated_at.isoformat() if event.updated_at else None,
    }


app = Server("agenda-server")


@app.list_tools()
async def list_tools() -> List[Tool]:
    return [
        # ── Task tools ──
        Tool(
            name="create_task",
            description="Create a new task on the user's AgendaAI calendar. Use this to add homework, assignments, deadlines, or any to-do items.",
            inputSchema={
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Task title (e.g. 'Finish CS425 homework')",
                    },
                    "description": {
                        "type": "string",
                        "description": "Optional detailed description of the task",
                    },
                    "tag": {
                        "type": "string",
                        "description": "Optional tag/category (e.g. 'homework', 'exam', 'project')",
                    },
                    "color": {
                        "type": "string",
                        "description": "Optional color for display (e.g. '#FF5733', 'blue')",
                    },
                    "priority": {
                        "type": "integer",
                        "description": "Priority level: 1 (low) to 5 (high). Default is 1.",
                    },
                    "status": {
                        "type": "string",
                        "description": "Task status: 'todo', 'in_progress', or 'done'. Default is 'todo'.",
                    },
                    "due_date": {
                        "type": "string",
                        "description": "Due date in YYYY-MM-DD format (e.g. '2026-03-15')",
                    },
                    "due_time": {
                        "type": "string",
                        "description": "Due time in HH:MM format, 24-hour (e.g. '23:59')",
                    },
                },
                "required": ["title"],
            },
        ),
        Tool(
            name="list_tasks",
            description="List all tasks on the user's AgendaAI calendar. Can filter by status or date range.",
            inputSchema={
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "description": "Filter by status: 'todo', 'in_progress', or 'done'",
                    },
                    "upcoming_days": {
                        "type": "integer",
                        "description": "Only show tasks due within this many days from today",
                    },
                },
                "required": [],
            },
        ),
        Tool(
            name="update_task",
            description="Update an existing task on the user's AgendaAI calendar.",
            inputSchema={
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "integer",
                        "description": "The ID of the task to update",
                    },
                    "title": {"type": "string", "description": "New title"},
                    "description": {"type": "string", "description": "New description"},
                    "tag": {"type": "string", "description": "New tag"},
                    "color": {"type": "string", "description": "New color"},
                    "priority": {"type": "integer", "description": "New priority (1-5)"},
                    "status": {
                        "type": "string",
                        "description": "New status: 'todo', 'in_progress', or 'done'",
                    },
                    "due_date": {
                        "type": "string",
                        "description": "New due date (YYYY-MM-DD)",
                    },
                    "due_time": {
                        "type": "string",
                        "description": "New due time (HH:MM)",
                    },
                    "completed": {
                        "type": "boolean",
                        "description": "Mark task as completed (true/false)",
                    },
                },
                "required": ["task_id"],
            },
        ),
        Tool(
            name="delete_task",
            description="Delete a task from the user's AgendaAI calendar.",
            inputSchema={
                "type": "object",
                "properties": {
                    "task_id": {
                        "type": "integer",
                        "description": "The ID of the task to delete",
                    },
                },
                "required": ["task_id"],
            },
        ),
        # ── Event tools ──
        Tool(
            name="create_event",
            description="Create a new event on the user's AgendaAI calendar. Use this for scheduled meetings, classes, study sessions, or any timed events.",
            inputSchema={
                "type": "object",
                "properties": {
                    "title": {
                        "type": "string",
                        "description": "Event title (e.g. 'CS425 Lecture')",
                    },
                    "description": {
                        "type": "string",
                        "description": "Optional event description",
                    },
                    "start_at": {
                        "type": "string",
                        "description": "Start time in ISO 8601 format (e.g. '2026-03-15T09:00:00')",
                    },
                    "end_at": {
                        "type": "string",
                        "description": "End time in ISO 8601 format (e.g. '2026-03-15T10:00:00')",
                    },
                    "all_day": {
                        "type": "boolean",
                        "description": "Whether this is an all-day event. Default is false.",
                    },
                    "recurrence": {
                        "type": "string",
                        "description": "Recurrence: 'none', 'daily', 'weekly', or 'monthly'. Default is 'none'.",
                    },
                    "color": {
                        "type": "string",
                        "description": "Optional color for display",
                    },
                    "location": {
                        "type": "string",
                        "description": "Optional event location",
                    },
                    "status": {
                        "type": "string",
                        "description": "Event status: 'scheduled', 'ongoing', 'completed', or 'canceled'. Default is 'scheduled'.",
                    },
                },
                "required": ["title", "start_at", "end_at"],
            },
        ),
        Tool(
            name="list_events",
            description="List events on the user's AgendaAI calendar. Can filter by date range.",
            inputSchema={
                "type": "object",
                "properties": {
                    "upcoming_days": {
                        "type": "integer",
                        "description": "Only show events within this many days from today. Default shows all.",
                    },
                    "status": {
                        "type": "string",
                        "description": "Filter by status: 'scheduled', 'ongoing', 'completed', or 'canceled'",
                    },
                },
                "required": [],
            },
        ),
        Tool(
            name="update_event",
            description="Update an existing event on the user's AgendaAI calendar.",
            inputSchema={
                "type": "object",
                "properties": {
                    "event_id": {
                        "type": "integer",
                        "description": "The ID of the event to update",
                    },
                    "title": {"type": "string", "description": "New title"},
                    "description": {"type": "string", "description": "New description"},
                    "start_at": {
                        "type": "string",
                        "description": "New start time (ISO 8601)",
                    },
                    "end_at": {
                        "type": "string",
                        "description": "New end time (ISO 8601)",
                    },
                    "all_day": {"type": "boolean", "description": "All-day flag"},
                    "recurrence": {
                        "type": "string",
                        "description": "New recurrence: 'none', 'daily', 'weekly', 'monthly'",
                    },
                    "color": {"type": "string", "description": "New color"},
                    "location": {"type": "string", "description": "New location"},
                    "status": {
                        "type": "string",
                        "description": "New status: 'scheduled', 'ongoing', 'completed', 'canceled'",
                    },
                },
                "required": ["event_id"],
            },
        ),
        Tool(
            name="delete_event",
            description="Delete an event from the user's AgendaAI calendar.",
            inputSchema={
                "type": "object",
                "properties": {
                    "event_id": {
                        "type": "integer",
                        "description": "The ID of the event to delete",
                    },
                },
                "required": ["event_id"],
            },
        ),
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict):
    try:
        user_id = _get_current_user_id()
        db = SessionLocal()

        try:
            # ── Task tools ──
            if name == "create_task":
                status = arguments.get("status", "todo")
                if status not in ALLOWED_TASK_STATUSES:
                    return [TextContent(type="text", text=f"Error: Invalid status '{status}'. Must be one of: {', '.join(ALLOWED_TASK_STATUSES)}")]

                due_date_val = None
                if arguments.get("due_date"):
                    due_date_val = date.fromisoformat(arguments["due_date"])

                due_time_val = None
                if arguments.get("due_time"):
                    due_time_val = time.fromisoformat(arguments["due_time"])

                task = Task(
                    title=arguments["title"],
                    description=arguments.get("description"),
                    tag=arguments.get("tag"),
                    color=arguments.get("color"),
                    priority=arguments.get("priority", 1),
                    status=status,
                    due_date=due_date_val,
                    due_time=due_time_val,
                    user_id=user_id,
                )
                db.add(task)
                db.commit()
                db.refresh(task)
                return [TextContent(type="text", text=json.dumps({
                    "success": True,
                    "message": f"Task '{task.title}' created successfully",
                    "task": _serialize_task(task),
                }, indent=2))]

            if name == "list_tasks":
                query = db.query(Task).filter(Task.user_id == user_id)

                status_filter = arguments.get("status")
                if status_filter:
                    if status_filter not in ALLOWED_TASK_STATUSES:
                        return [TextContent(type="text", text=f"Error: Invalid status filter '{status_filter}'.")]
                    query = query.filter(Task.status == status_filter)

                upcoming_days = arguments.get("upcoming_days")
                if upcoming_days:
                    cutoff = date.today() + timedelta(days=int(upcoming_days))
                    query = query.filter(Task.due_date <= cutoff)

                tasks = query.order_by(Task.due_date.asc().nulls_last()).all()
                return [TextContent(type="text", text=json.dumps({
                    "count": len(tasks),
                    "tasks": [_serialize_task(t) for t in tasks],
                }, indent=2))]

            if name == "update_task":
                task_id = int(arguments["task_id"])
                task = db.query(Task).filter(Task.id == task_id, Task.user_id == user_id).first()
                if not task:
                    return [TextContent(type="text", text=f"Error: Task with ID {task_id} not found.")]

                if "title" in arguments:
                    task.title = arguments["title"]
                if "description" in arguments:
                    task.description = arguments["description"]
                if "tag" in arguments:
                    task.tag = arguments["tag"]
                if "color" in arguments:
                    task.color = arguments["color"]
                if "priority" in arguments:
                    task.priority = int(arguments["priority"])
                if "status" in arguments:
                    if arguments["status"] not in ALLOWED_TASK_STATUSES:
                        return [TextContent(type="text", text=f"Error: Invalid status '{arguments['status']}'.")]
                    task.status = arguments["status"]
                if "due_date" in arguments:
                    task.due_date = date.fromisoformat(arguments["due_date"])
                if "due_time" in arguments:
                    task.due_time = time.fromisoformat(arguments["due_time"])
                if "completed" in arguments:
                    task.completed = bool(arguments["completed"])

                db.commit()
                db.refresh(task)
                return [TextContent(type="text", text=json.dumps({
                    "success": True,
                    "message": f"Task '{task.title}' updated successfully",
                    "task": _serialize_task(task),
                }, indent=2))]

            if name == "delete_task":
                task_id = int(arguments["task_id"])
                task = db.query(Task).filter(Task.id == task_id, Task.user_id == user_id).first()
                if not task:
                    return [TextContent(type="text", text=f"Error: Task with ID {task_id} not found.")]
                title = task.title
                db.delete(task)
                db.commit()
                return [TextContent(type="text", text=json.dumps({
                    "success": True,
                    "message": f"Task '{title}' deleted successfully",
                }, indent=2))]

            # ── Event tools ──
            if name == "create_event":
                status = arguments.get("status", "scheduled")
                if status not in ALLOWED_EVENT_STATUSES:
                    return [TextContent(type="text", text=f"Error: Invalid status '{status}'. Must be one of: {', '.join(ALLOWED_EVENT_STATUSES)}")]

                recurrence = arguments.get("recurrence", "none")
                if recurrence not in ALLOWED_EVENT_RECURRENCE:
                    return [TextContent(type="text", text=f"Error: Invalid recurrence '{recurrence}'. Must be one of: {', '.join(ALLOWED_EVENT_RECURRENCE)}")]

                start_at = _to_local_naive(datetime.fromisoformat(arguments["start_at"]))
                end_at = _to_local_naive(datetime.fromisoformat(arguments["end_at"]))

                if end_at <= start_at:
                    return [TextContent(type="text", text="Error: Event end time must be after start time.")]

                event = Event(
                    title=arguments["title"],
                    description=arguments.get("description"),
                    start_at=start_at,
                    end_at=end_at,
                    all_day=bool(arguments.get("all_day", False)),
                    recurrence=recurrence,
                    color=arguments.get("color"),
                    location=arguments.get("location"),
                    status=status,
                    user_id=user_id,
                )
                db.add(event)
                db.commit()
                db.refresh(event)
                return [TextContent(type="text", text=json.dumps({
                    "success": True,
                    "message": f"Event '{event.title}' created successfully",
                    "event": _serialize_event(event),
                }, indent=2))]

            if name == "list_events":
                query = db.query(Event).filter(Event.user_id == user_id)

                status_filter = arguments.get("status")
                if status_filter:
                    if status_filter not in ALLOWED_EVENT_STATUSES:
                        return [TextContent(type="text", text=f"Error: Invalid status filter '{status_filter}'.")]
                    query = query.filter(Event.status == status_filter)

                upcoming_days = arguments.get("upcoming_days")
                if upcoming_days:
                    now = datetime.now()
                    cutoff = now + timedelta(days=int(upcoming_days))
                    query = query.filter(Event.start_at <= cutoff, Event.end_at >= now)

                events = query.order_by(Event.start_at.asc()).all()
                return [TextContent(type="text", text=json.dumps({
                    "count": len(events),
                    "events": [_serialize_event(e) for e in events],
                }, indent=2))]

            if name == "update_event":
                event_id = int(arguments["event_id"])
                event = db.query(Event).filter(Event.id == event_id, Event.user_id == user_id).first()
                if not event:
                    return [TextContent(type="text", text=f"Error: Event with ID {event_id} not found.")]

                if "title" in arguments:
                    event.title = arguments["title"]
                if "description" in arguments:
                    event.description = arguments["description"]
                if "start_at" in arguments:
                    event.start_at = _to_local_naive(datetime.fromisoformat(arguments["start_at"]))
                if "end_at" in arguments:
                    event.end_at = _to_local_naive(datetime.fromisoformat(arguments["end_at"]))
                if "all_day" in arguments:
                    event.all_day = bool(arguments["all_day"])
                if "recurrence" in arguments:
                    if arguments["recurrence"] not in ALLOWED_EVENT_RECURRENCE:
                        return [TextContent(type="text", text=f"Error: Invalid recurrence '{arguments['recurrence']}'.")]
                    event.recurrence = arguments["recurrence"]
                if "color" in arguments:
                    event.color = arguments["color"]
                if "location" in arguments:
                    event.location = arguments["location"]
                if "status" in arguments:
                    if arguments["status"] not in ALLOWED_EVENT_STATUSES:
                        return [TextContent(type="text", text=f"Error: Invalid status '{arguments['status']}'.")]
                    event.status = arguments["status"]

                # Validate times after potential updates
                next_start = event.start_at
                next_end = event.end_at
                if next_end <= next_start:
                    return [TextContent(type="text", text="Error: Event end time must be after start time.")]

                db.commit()
                db.refresh(event)
                return [TextContent(type="text", text=json.dumps({
                    "success": True,
                    "message": f"Event '{event.title}' updated successfully",
                    "event": _serialize_event(event),
                }, indent=2))]

            if name == "delete_event":
                event_id = int(arguments["event_id"])
                event = db.query(Event).filter(Event.id == event_id, Event.user_id == user_id).first()
                if not event:
                    return [TextContent(type="text", text=f"Error: Event with ID {event_id} not found.")]
                title = event.title
                db.delete(event)
                db.commit()
                return [TextContent(type="text", text=json.dumps({
                    "success": True,
                    "message": f"Event '{title}' deleted successfully",
                }, indent=2))]

            return [TextContent(type="text", text=f"Unknown tool: {name}")]

        finally:
            db.close()

    except Exception as e:
        return [TextContent(type="text", text=f"Error executing {name}: {str(e)}")]


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
