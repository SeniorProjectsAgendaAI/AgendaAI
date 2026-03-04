# Canvas MCP Server

MCP server for Canvas LMS - provides access to courses, assignments, grades, and announcements.

## Tools

| Tool                       | What It Does                 |
| -------------------------- | ---------------------------- |
| `get_courses`              | List active courses          |
| `get_assignments`          | Get assignments for a course |
| `get_upcoming_assignments` | Get upcoming assignments     |
| `get_announcements`        | Get course announcements     |
| `get_grades`               | Get grades for a course      |

## Setup

### Quick Start (Static Token)

1. Copy `.env.example` to `.env`
2. Get Canvas API token from Canvas → Settings → New Access Token
3. Add your Canvas URL and token to `.env`
4. Run `uv sync` then `uv run python test_server.py`

### OAuth Integration (Multi-User)

For production multi-user support, this server automatically uses OAuth tokens provided by the agent:

1. **Backend OAuth Setup**: Configure Canvas OAuth credentials in `backend/.env`
   - See `backend/.env.example` for Canvas OAuth setup instructions
   - Contact Canvas admin for developer key credentials

2. **Runtime Token Loading**: The agent writes user tokens to `/tmp/agendaai_canvas_runtime_token.json`
   - This server automatically loads runtime tokens when available
   - Falls back to static `CANVAS_TOKEN` if no runtime token exists

3. **Testing OAuth**: Use the unified agent which handles token management
   ```bash
   cd ../agent
   uv run uvicorn server:app --reload --port 8001
   ```

### UNR Beta Environment Notes

- Beta resets every Saturday with Production data
- Must login to Canvas Beta manually before using OAuth
- Developer key provides READ ONLY access
- OAuth scope: `url:GET|/api/v1/courses`

## Usage

Runs via stdio using MCP protocol. Used by the unified agent in `../agent/`.
