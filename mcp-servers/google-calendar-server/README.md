# Google Calendar MCP Server

MCP server for Google Calendar - view and create events.

## Tools

| Tool | What It Does |
| `list_upcoming_events` | List upcoming events |
| `create_event` | Create new calendar event |

## Setup

1. Set up Google OAuth in `../.oauth/` (see main README)/ Possible to change based on where Oauth folder is located
2. Run `uv sync` then `uv run python test_server.py`

## Usage

Runs via stdio using MCP protocol. Used by the unified agent in `../agent/`.

To run the server standalone:
```bash
uv run python main.py
```

The server will wait for MCP protocol messages on stdin. Press Ctrl+C to stop.

## Troubleshooting

- **Token Not Found**: Run the OAuth flow to generate `gcal_token.json`
- **Access Denied (403)**: Make sure you added your email as a test user in Google Cloud Console
- **Token Expired**: Delete `gcal_token.json` and regenerate it using the OAuth flow above
- **Invalid Time Format**: Ensure you're using ISO 8601 format with timezone (e.g., `2025-11-25T14:00:00-05:00`)
- **Rate Limit**: Google Calendar API has usage quotas; wait a few minutes if you hit limits
