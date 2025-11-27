
import asyncio
import os

from anthropic import Anthropic
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from contextlib import AsyncExitStack
from dotenv import load_dotenv


load_dotenv()

class AgendaAIAgent:
    "This is the AI agent for the MCP client server tools. This agent connects to Cavvas LMS, Gmail, and Google Calendar. "

    def __init__(self):
        self.exit_stack = AsyncExitStack()
        self.sessions = {}
        self.anthropic = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.tool_map = {}
        self.tools = []

    async def connect(self, name: str, script_path: str):
        """Connect to an MCP server via stdio."""
        transport = await self.exit_stack.enter_async_context(
            stdio_client(StdioServerParameters(
                command="uv",
                args=["run", "python", script_path]
            ))
        )
        session = await self.exit_stack.enter_async_context(ClientSession(transport[0], transport[1]))
        await session.initialize()
        self.sessions[name] = session
        print(f"Connected to {name} server.")

    async def setup(self):
        '''This function is to connect the mcp servers and showcase the tools to the AI'''
        await self.connect("gmail", "../gmail-server/main.py")
        await self.connect("google_calendar", "../google-calendar-server/main.py")
        await self.connect("canvas", "../canvas-server/main.py")
