# AgendaAI Agent

Unified AI agent that connects to all three MCP servers (Canvas, Gmail, Google Calendar).

## What It Does

Combines Canvas, Gmail, and Google Calendar into a single conversational interface using Gemini AI.

## Setup

1. Set up all three servers first (see main MCP README)
2. Get Google Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
3. Copy `.env.example` to `.env` and add your `GOOGLE_API_KEY`
4. Run `uv sync`

## Usage

```bash
uv run python client.py
```

Ask questions like:
- "What assignments are due this week?"
- "Show me unread emails from professors"
- "What's on my calendar tomorrow?"

Type `quit` or `exit` to end the session.

## How It Works

Connects to all three MCP servers via stdio, discovers available tools, and uses Gemini to decide which tools to call based on your questions.
