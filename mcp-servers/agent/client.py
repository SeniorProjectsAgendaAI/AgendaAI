# Author: Biniam Gashaw
# Class: CS425: Software Engineering

# Sources:
#  https://ai.google.dev/gemini-api/docs/function-calling
#  https://modelcontextprotocol.io/docs/develop/build-client
#  https://github.com/google/generative-ai-python

import asyncio
import json
import os
from contextlib import AsyncExitStack
from datetime import datetime

import google.generativeai as genai
from dotenv import load_dotenv
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

load_dotenv()


class AgendaAIAgent:
    "This is the AI agent for the MCP client server tools. This agent connects to Cavvas LMS, Gmail, and Google Calendar."

    def __init__(self):
        self.exit_stack = AsyncExitStack()
        self.sessions = {}
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment variables")
        genai.configure(api_key=api_key)

        #Get current local time for system prompt
        local_tz = datetime.now().astimezone().tzinfo
        current_time = datetime.now(local_tz).strftime("%Y-%m-%d %H:%M:%S %Z")
        day_of_week = datetime.now(local_tz).strftime("%A")

        system_prompt = f"""You are AgendaAI, an intelligent personal assistant specialized in academic and professional task management. You have access to the user's Canvas LMS, Gmail, and Google Calendar.

CURRENT CONTEXT:
- Current Date & Time: {current_time} ({day_of_week})
- You are helping a student/professional manage their academic coursework, emails, and schedule

YOUR CAPABILITIES:
1. **Canvas LMS**: Access courses, assignments, grades, announcements, modules, and submission details
2. **Gmail**: Read, search, send, and manage emails
3. **Google Calendar**: View, create, update, and delete calendar events

YOUR ROLE:
- Proactively help users stay organized and on top of their responsibilities
- Provide clear, actionable information about deadlines, assignments, and schedules
- When users ask about "today", "tomorrow", "this week", or relative dates, calculate from the current time above
- Always consider timezone and provide specific dates/times when discussing deadlines
- Prioritize urgent items and upcoming deadlines
- Be concise but thorough in responses

BEST PRACTICES:
- When listing assignments or events, sort by due date/time by default
- For date queries without specific times, assume the user means their local timezone
- If an assignment is overdue, mention it clearly
- When sending emails or creating calendar events, confirm details before execution
- Suggest creating calendar events for important deadlines if they're not already scheduled
- Cross-reference information (e.g., check if an assignment deadline has a calendar event)
- Use natural language for dates (e.g., "tomorrow at 3 PM" instead of just timestamps)

HANDLING REQUESTS:
- Break down complex requests into logical steps
- Use available tools to gather complete information before responding
- If you need to perform actions (send email, create event), explain what you'll do first
- Provide summaries for large amounts of data
- Ask for clarification only when truly necessary

Remember: You're here to reduce the user's cognitive load and help them succeed academically and professionally."""

        self.model = genai.GenerativeModel(
            model_name="models/gemini-2.5-flash", system_instruction=system_prompt
        )
        self.tool_map = {}
        self.tools = []
        self.current_user_gcal_token = None

    async def connect(self, name: str, script_path: str, env_vars: dict = None):
        """Connect to an MCP server via stdio."""
        import os
        from pathlib import Path

        script_file = Path(script_path).resolve()
        server_dir = script_file.parent

        # Build environment variables
        env = os.environ.copy()
        if env_vars:
            env.update(env_vars)

        # cd into directory first, then run uv
        # this routes to the correct virtual environment for each server.
        transport = await self.exit_stack.enter_async_context(
            stdio_client(
                StdioServerParameters(
                    command="sh",
                    args=["-c", f"cd {server_dir} && uv run python {script_file.name}"],
                    env=env,
                )
            )
        )
        session = await self.exit_stack.enter_async_context(
            ClientSession(transport[0], transport[1])
        )
        await session.initialize()
        self.sessions[name] = session
        print(f" Connected to {name} server")

    async def setup(self):
        """This function is to connect the mcp servers and showcase the tools to the AI"""
        await self.connect("gmail", "../gmail-server/main.py")
        await self.connect("google_calendar", "../google-calendar-server/main.py")
        await self.connect("canvas", "../canvas-server/main.py")

        for server_name, session in self.sessions.items():
            resp = await session.list_tools()
            for t in resp.tools:
                unified_name = f"{server_name}:{t.name}"
                self.tool_map[unified_name] = (session, t.name)
                self.tools.append(
                    {
                        "name": unified_name,
                        "description": f"[{server_name.upper()}] {t.description}",
                        "input_schema": t.inputSchema,
                    }
                )

        print(f"\n Discovered {len(self.tools)} tools across all servers")
        print("Available tools:")
        for tool in self.tools:
            print(f"  - {tool['name']}")

    async def chat(self):
        """This is the chat that is going to loop with the AI agent model used"""
        print("\n" + "=" * 60)
        print("AgendaAI Agent Chat Session")
        print("=" * 60)
        print("Ask about Canvas, Gmail, or Google Calendar")
        print("type 'quit' or 'exit' to end the session with the AI\n")

        # Convert MCP tools to Gemini function
        gemini_tools = []
        for tool in self.tools:
            gemini_tools.append(
                genai.protos.FunctionDeclaration(
                    name=tool["name"],
                    description=tool["description"],
                    parameters=genai.protos.Schema(
                        type=genai.protos.Type.OBJECT,
                        properties={
                            k: genai.protos.Schema(
                                type=self._convert_type(v.get("type", "string")),
                                description=v.get("description", ""),
                            )
                            for k, v in tool["input_schema"]
                            .get("properties", {})
                            .items()
                        },
                        required=tool["input_schema"].get("required", []),
                    ),
                )
            )

        # Start the AI chat session ONCE (reuse across messages) instead of constantly remaking the chat
        chat = self.model.start_chat(enable_automatic_function_calling=False)

        while True:
            user_input = input("You: ").strip()
            if user_input.lower() in ("quit", "exit"):
                print("\n Goodbye User!")
                break

            if not user_input:
                continue

            try:
                # Send message to existing chat session
                response = chat.send_message(user_input, tools=gemini_tools)

                while response.candidates[0].content.parts:
                    function_calls = [
                        part.function_call
                        for part in response.candidates[0].content.parts
                        if hasattr(part, "function_call")
                        and part.function_call
                        and part.function_call.name
                    ]

                    if not function_calls:
                        print(f"\nAssistant: {response.text}\n")
                        break

                    function_responses = []
                    for function_call in function_calls:
                        tool_name = function_call.name
                        args = dict(function_call.args) if function_call.args else {}

                        print(f"\n Calling tool: {tool_name}")
                        print(f"   Arguments: {args}")

                        session, actual_tool_name = self.tool_map[tool_name]

                        result = await session.call_tool(actual_tool_name, args)
                        result_text = result.content[0].text

                        # keep the ai from too long responses
                        max_result_length = 8000
                        if len(result_text) > max_result_length:
                            result_text = (
                                result_text[:max_result_length]
                                + f"\n\n... [Truncated {len(result_text) - max_result_length} characters]"
                            )

                        print(
                            f"   Result: {result_text[:200]}{'...' if len(result_text) > 200 else ''}"
                        )

                        function_responses.append(
                            genai.protos.Part(
                                function_response=genai.protos.FunctionResponse(
                                    name=tool_name, response={"result": result_text}
                                )
                            )
                        )

                    response = chat.send_message(function_responses)

            except Exception as e:
                error_msg = str(e)
                if "finish_reason: 12" in error_msg or "StopCandidateException" in str(
                    type(e)
                ):
                    print(
                        f"\n  Response too long. Try asking for specific information or fewer items.\n"
                    )
                else:
                    print(f"\n Error: {error_msg}\n")
                    import traceback

                    traceback.print_exc()

    def _convert_type(self, json_type: str) -> genai.protos.Type:
        """Convert JSON Schema to Gemini usable format."""
        type_mapping = {
            "string": genai.protos.Type.STRING,
            "integer": genai.protos.Type.INTEGER,
            "number": genai.protos.Type.NUMBER,
            "boolean": genai.protos.Type.BOOLEAN,
            "object": genai.protos.Type.OBJECT,
            "array": genai.protos.Type.ARRAY,
        }
        return type_mapping.get(json_type, genai.protos.Type.STRING)

    async def run(self):
        """Main point for running the agent."""
        async with self.exit_stack:
            await self.setup()
            await self.chat()


def main():

    asyncio.run(AgendaAIAgent().run())


if __name__ == "__main__":
    main()
