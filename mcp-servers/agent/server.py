#Biniam Gashaw
#FastAPI server for AgendaAI Agent
#Run with: uvicorn server:app --reload --port 8001, this should be automated with task.json

import json
import os
from functools import lru_cache
from urllib.request import urlopen

from client import AgendaAIAgent
from database import get_user_gmail_token, get_user_google_calendar_token
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from pydantic import BaseModel

load_dotenv()

app = FastAPI(title="AgendaAI Agent API")

#CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

#Cognito config
COGNITO_REGION = os.getenv("COGNITO_REGION")
COGNITO_USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID")
COGNITO_APP_CLIENT_ID = os.getenv("COGNITO_APP_CLIENT_ID")


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    response: str


#General agent instance and chat session
_agent = None
_chat_session = None
_gemini_tools = []


def _get_cognito_issuer() -> str:
    if not COGNITO_REGION or not COGNITO_USER_POOL_ID:
        return None
    return f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}"


@lru_cache(maxsize=1)
def _get_cognito_jwks() -> dict:
    issuer = _get_cognito_issuer()
    if not issuer:
        raise RuntimeError("Cognito issuer is not configured")
    with urlopen(f"{issuer}/.well-known/jwks.json") as response:
        return json.load(response)


def verify_cognito_token(token: str) -> dict:
    """Verify Cognito JWT token and return claims."""
    issuer = _get_cognito_issuer()
    if not issuer or not COGNITO_APP_CLIENT_ID:
        raise JWTError("Cognito settings missing")

    headers = jwt.get_unverified_header(token)
    kid = headers.get("kid")
    if not kid:
        raise JWTError("Token header missing kid")

    jwks = _get_cognito_jwks()
    key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
    if not key:
        raise JWTError("Matching JWKS key not found")

    claims = jwt.decode(
        token,
        key,
        algorithms=["RS256"],
        issuer=issuer,
        options={"verify_aud": False, "verify_at_hash": False},
    )

    token_use = claims.get("token_use")
    if token_use == "id":
        if claims.get("aud") != COGNITO_APP_CLIENT_ID:
            raise JWTError("Invalid Cognito audience")
    elif token_use == "access":
        if claims.get("client_id") != COGNITO_APP_CLIENT_ID:
            raise JWTError("Invalid Cognito client_id")
    else:
        raise JWTError("Unsupported Cognito token_use")

    return claims


async def get_current_user(authorization: str = Header(None)) -> str:
    """Dependency to extract cognito_sub from JWT token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401, detail="Missing or invalid authorization header"
        )

    token = authorization.replace("Bearer ", "")
    try:
        claims = verify_cognito_token(token)
        cognito_sub = claims.get("sub")
        if not cognito_sub:
            raise HTTPException(
                status_code=401, detail="Invalid token: missing sub claim"
            )
        return cognito_sub
    except JWTError as e:
        raise HTTPException(
            status_code=401, detail=f"Token validation failed: {str(e)}"
        )


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
async def chat(request: ChatRequest, cognito_sub: str = Depends(get_current_user)):
    #Send message to AI agent with MCP tool calling
    import google.generativeai as genai


    gcal_token = get_user_google_calendar_token(cognito_sub)
    gmail_token = get_user_gmail_token(cognito_sub)

    if gcal_token:
        print(f"[Agent] Using Google Calendar token for user {cognito_sub}")
        _agent.current_user_gcal_token = gcal_token
    else:
        print(f"[Agent] No Google Calendar token found for user {cognito_sub}")
        _agent.current_user_gcal_token = None

    if gmail_token:
        print(f"[Agent] Using Gmail token for user {cognito_sub}")
        _agent.current_user_gmail_token = gmail_token
    else:
        print(f"[Agent] No Gmail token found for user {cognito_sub}")
        _agent.current_user_gmail_token = None

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

            #function calls
            function_responses = []
            for function_call in function_calls:
                tool_name = function_call.name
                args = dict(function_call.args) if function_call.args else {}

                print(f"\n Calling tool: {tool_name}")
                print(f"   Arguments: {args}")

                try:
                    #Set Google Calendar token in temp file if this is a google_calendar tool
                    if (
                        tool_name.startswith("google_calendar:")
                        and _agent.current_user_gcal_token
                    ):
                        import tempfile

                        token_file = "/tmp/agendaai_gcal_runtime_token.json"
                        with open(token_file, "w") as f:
                            json.dump(_agent.current_user_gcal_token, f)
                        print(f"   [Using user's Google Calendar token]")

                    # Set Gmail token in temp file if this is a gmail tool
                    if (
                        tool_name.startswith("gmail:")
                        and _agent.current_user_gmail_token
                    ):
                        token_file = "/tmp/agendaai_gmail_runtime_token.json"
                        with open(token_file, "w") as f:
                            json.dump(_agent.current_user_gmail_token, f)
                        print(f"   [Using user's Gmail token]")

                    session, actual_tool_name = _agent.tool_map[tool_name]
                    result = await session.call_tool(actual_tool_name, args)
                    result_text = result.content[0].text

                    # Clear the runtime token files after use
                    if tool_name.startswith("google_calendar:"):
                        try:
                            os.remove("/tmp/agendaai_gcal_runtime_token.json")
                        except:
                            pass
                    if tool_name.startswith("gmail:"):
                        try:
                            os.remove("/tmp/agendaai_gmail_runtime_token.json")
                        except:
                            pass

                    # Print readable, formatted result
                    print(f"   Retrieved information")
                    if len(result_text) > 300:
                        # Show first 300 chars with formatting
                        lines = result_text[:300].split("\n")
                        print(f"   Here's what was found:")
                        for line in lines[:5]:
                            print(f"      {line[:80]}")
                        if len(lines) > 5 or len(result_text) > 300:
                            print(f"      ... (more content available)")
                    else:
                        # Show full result if short
                        print(f"   Here's what was found:")
                        for line in result_text.split("\n")[:10]:
                            print(f"      {line}")

                    # Truncate long results
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
