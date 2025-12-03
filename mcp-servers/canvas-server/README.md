# Canvas MCP Server

MCP server for Canvas LMS - provides access to courses, assignments, grades, and announcements.

## Tools

| Tool | What It Does |
| `get_courses` | List active courses |
| `get_assignments` | Get assignments for a course |
| `get_upcoming_assignments` | Get upcoming assignments |
| `get_announcements` | Get course announcements |
| `get_grades` | Get grades for a course |

## Setup

1. Copy `.env.example` to `.env`
2. Get Canvas API token from Canvas → Settings → New Access Token
3. Add your Canvas URL and token to `.env`
4. Run `uv sync` then `uv run python test_server.py`

## Usage

Runs via stdio using MCP protocol. Used by the unified agent in `../agent/`.
