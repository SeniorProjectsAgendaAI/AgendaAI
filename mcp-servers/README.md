# MCP Servers

Model Context Protocol servers for AgendaAI - connects Canvas, Gmail, and Google Calendar.

## Structure

- **canvas-server/** - Canvas LMS integration
- **gmail-server/** - Gmail integration
- **google-calendar-server/** - Google Calendar integration
- **agent/** - Unified AI agent that connects all servers
- **.oauth/** - Shared OAuth credentials (not committed to git)

## What Each Server Does

**Canvas**: Get courses, assignments, grades, announcements

**Gmail**: List and search emails

**Google Calendar**: View and create calendar events

**Agent**: AI assistant that uses all three servers to answer questions

## Authentication

- Canvas uses API token from Canvas settings
- Gmail and Calendar share Google OAuth credentials in `.oauth/` folder

**Tools:**
- `list_upcoming_events` - List upcoming events
- `create_event` - Create new calendar events

**Authentication:** Google OAuth (full access)

## 🧪 Testing

Each server has a comprehensive test suite:

```bash
# Test Canvas
cd canvas-server && uv run python test_server.py

# Test Gmail
cd gmail-server && uv run python test_server.py

# Test Calendar
cd google-calendar-server && uv run python test_server.py
```

All tests should pass before committing changes.

## 🔐 Security Notes

### DO NOT COMMIT:
- `.env` files (contain API tokens)
- `.oauth/` directory (contains OAuth credentials and tokens)
- Any files with credentials or personal data

### Already Gitignored:
```
mcp-servers/.oauth/
mcp-servers/*/.env
```

### What to Commit:
- `.env.example` files
- Source code (`main.py`, `test_server.py`)
- Documentation (`README.md`)
- Configuration (`pyproject.toml`)

## 📖 How MCP Servers Work

MCP servers use **stdio (standard input/output)** for communication:

1. Server starts and waits for JSON-RPC messages on stdin
2. Client sends requests via the MCP protocol
3. Server processes requests using registered tools
4. Server returns responses via stdout

**Running a server directly will appear "stuck"** - this is normal! Servers wait for MCP protocol messages. Press Ctrl+C to stop.

To actually use the servers, you need an MCP client (like the unified agent or Claude Desktop).

## 🤖 Unified Agent (Coming Soon)

The unified agent will:
- Connect to all three MCP servers simultaneously
- Send user queries to Claude
- Let Claude decide which tools to use
- Combine results into unified responses

Location: `mcp-servers/agent/client.py`

## 🐛 Troubleshooting

### Canvas Server Issues
- **401 Unauthorized**: Invalid Canvas token - regenerate it
- **Course Not Found**: Check course ID is correct
- **Permission Denied**: Token needs proper API permissions

### Gmail Server Issues
- **Token Not Found**: Run OAuth flow to generate token
- **403 Access Denied**: Add your email as test user in Google Cloud Console
- **Token Expired**: Delete `gmail_token.json` and regenerate

### Calendar Server Issues
- **Token Not Found**: Run OAuth flow to generate token
- **403 Access Denied**: Add your email as test user in Google Cloud Console
- **Invalid Time Format**: Use ISO 8601 with timezone (e.g., `2025-11-25T14:00:00-05:00`)

### General Issues
- **Import Errors**: Run `uv sync` in the server directory
- **Server Won't Start**: Check `.env` file exists and has correct values
- **Tests Fail**: Verify API credentials are valid and have proper permissions

## 📚 Additional Resources

- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [Canvas API Documentation](https://canvas.instructure.com/doc/api/)
- [Gmail API Documentation](https://developers.google.com/gmail/api)
- [Google Calendar API Documentation](https://developers.google.com/calendar/api)

## 🤝 Contributing

When adding new tools or servers:

1. Follow the existing MCP pattern (use `@app.list_tools()` and `@app.call_tool()`)
2. Add comprehensive tests in `test_server.py`
3. Update relevant README files
4. Create `.env.example` with required configuration
5. Add error handling with try/except blocks
6. Document all tools with clear descriptions and input schemas

## 📝 Next Steps

1. ✅ Set up all three MCP servers
2. ✅ Verify tests pass for each server
3. 🔄 Create unified agent (in progress)
4. 🔄 Integrate agent with AgendaAI backend
5. 🔄 Expose agent functionality via REST API
6. 🔄 Connect to frontend for user interaction
