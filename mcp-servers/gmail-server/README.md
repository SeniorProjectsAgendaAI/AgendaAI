# Gmail MCP Server

MCP server for Gmail - list and search emails.

## Tools

| Tool | What It Does |
| `list_unread_emails` | List unread emails |
| `search_emails` | Search with Gmail query syntax |

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

- **Token Not Found**: Run the OAuth flow to generate `gmail_token.json`
- **Access Denied (403)**: Make sure you added your email as a test user in Google Cloud Console
- **Token Expired**: Delete `gmail_token.json` and regenerate it using the OAuth flow above
- **Rate Limit**: Gmail API has usage quotas; wait a few minutes if you hit limits
