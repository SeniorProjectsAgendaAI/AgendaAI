#Biniam Gashaw
#FastAPI server for AgendaAI Agent
#Run with: uvicorn server:app --reload --port 8001, this should be automated with task.json

from client import AgendaAIAgent
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="AgendaAI Agent API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str


#General agent instance and chat session
_agent = None
_chat_session = None
_gemini_tools = []


@app.on_event("startup")
async def startup():
    #Initialize agent on startup
    global _agent, _chat_session, _gemini_tools
    print("Initializing AI agent...")
    _agent = AgendaAIAgent()

    #Enter the exit_stack context to keep MCP server connections alive
    await _agent.exit_stack.__aenter__()
    await _agent.setup()

    #Convert MCP tools to Gemini functions
    for tool in _agent.tools:
        import google.generativeai as genai

        _gemini_tools.append(
            genai.protos.FunctionDeclaration(
                name=tool["name"],
                description=tool["description"],
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        k: genai.protos.Schema(
                            type=_convert_type(v.get("type", "string")),
                            description=v.get("description", ""),
                        )
                        for k, v in tool["input_schema"].get("properties", {}).items()
                    },
                    required=tool["input_schema"].get("required", []),
                ),
            )
        )

    #Start chat session with MCP tools
    _chat_session = _agent.model.start_chat(enable_automatic_function_calling=False)
    print(f"Agent ready with {len(_gemini_tools)} tools!")


@app.on_event("shutdown")
async def shutdown():
    #Cleanup on shutdown
    global _agent
    if _agent:
        await _agent.exit_stack.__aexit__(None, None, None)


def _convert_type(json_type: str):
    #Convert JSON Schema type to Gemini type.
    import google.generativeai as genai

    type_mapping = {
        "string": genai.protos.Type.STRING,
        "integer": genai.protos.Type.INTEGER,
        "number": genai.protos.Type.NUMBER,
        "boolean": genai.protos.Type.BOOLEAN,
        "object": genai.protos.Type.OBJECT,
        "array": genai.protos.Type.ARRAY,
    }
    return type_mapping.get(json_type, genai.protos.Type.STRING)


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    #Send message to AI agent with MCP tool calling
    import google.generativeai as genai

    try:
        #Send message with tools
        response = _chat_session.send_message(request.message, tools=_gemini_tools)

        #Handle function calling loop
        max_iterations = 10
        iteration = 0

        while iteration < max_iterations and response.candidates[0].content.parts:
            function_calls = [
                part.function_call
                for part in response.candidates[0].content.parts
                if hasattr(part, "function_call")
                and part.function_call
                and part.function_call.name
            ]

            if not function_calls:
                return ChatResponse(response=response.text)

            #Execute function calls
            function_responses = []
            for function_call in function_calls:
                tool_name = function_call.name
                args = dict(function_call.args) if function_call.args else {}

                print(f"\n Calling tool: {tool_name}")
                print(f"   Arguments: {args}")

                try:
                    session, actual_tool_name = _agent.tool_map[tool_name]
                    result = await session.call_tool(actual_tool_name, args)
                    result_text = result.content[0].text

                    #Print readable, formatted result
                    print(f"   Retrieved information")
                    if len(result_text) > 300:
                        #Show first 300 chars with formatting
                        lines = result_text[:300].split('\n')
                        print(f"   Here's what was found:")
                        for line in lines[:5]:  
                            print(f"      {line[:80]}")
                        if len(lines) > 5 or len(result_text) > 300:
                            print(f"      ... (more content available)")
                    else:
                        #Show full result if short
                        print(f"   Here's what was found:")
                        for line in result_text.split('\n')[:10]:
                            print(f"      {line}")

                    #Truncate long results
                    max_result_length = 8000
                    if len(result_text) > max_result_length:
                        result_text = (
                            result_text[:max_result_length] + f"\n\n[Truncated]"
                        )

                    function_responses.append(
                        genai.protos.Part(
                            function_response=genai.protos.FunctionResponse(
                                name=tool_name, response={"result": result_text}
                            )
                        )
                    )
                except Exception as tool_error:
                    print(f"   Error calling tool: {str(tool_error)}")
                    import traceback

                    traceback.print_exc()

                    # Return error to model
                    function_responses.append(
                        genai.protos.Part(
                            function_response=genai.protos.FunctionResponse(
                                name=tool_name,
                                response={"result": f"Error: {str(tool_error)}"},
                            )
                        )
                    )

            response = _chat_session.send_message(function_responses)
            iteration += 1

        return ChatResponse(response=response.text)

    except Exception as e:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok", "agent_ready": _agent is not None}
