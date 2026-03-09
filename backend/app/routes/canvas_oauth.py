#Canvas OAuth routes for multi-user authorization
#Reference: https://canvas.instructure.com/doc/api/file.oauth.html

import os
import secrets
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import urlencode

import httpx
from app.database.models import ConnectedAccount, User
from app.database.session import get_db
from app.services.auth_utils import get_current_user
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

load_dotenv()

router = APIRouter(prefix="/oauth/canvas", tags=["canvas_oauth"])

#Canvas OAuth configuration
CANVAS_URL = os.getenv("CANVAS_URL", "https://unr.beta.instructure.com")
CANVAS_CLIENT_ID = os.getenv("CANVAS_CLIENT_ID")
CANVAS_CLIENT_SECRET = os.getenv("CANVAS_CLIENT_SECRET")
CANVAS_REDIRECT_URI = os.getenv(
    "CANVAS_REDIRECT_URI", "http://localhost:8000/oauth/canvas/callback"
)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

#OAuth state storage
_oauth_states = {}


@router.get("/authorize")
async def authorize(current_user: User = Depends(get_current_user)):
    #Initiate Canvas OAuth flow
    if not CANVAS_CLIENT_ID:
        raise HTTPException(status_code=500, detail="CANVAS_CLIENT_ID not configured")

    #Generate CSRF state
    state = secrets.token_urlsafe(32)
    _oauth_states[state] = {
        "user_id": current_user.cognito_sub,
        "created_at": datetime.utcnow(),
    }


    scopes = [
        "url:GET|/api/v1/courses",
        "url:GET|/api/v1/courses/:course_id/assignments",
        "url:GET|/api/v1/courses/:course_id/discussion_topics",
        "url:GET|/api/v1/courses/:course_id/enrollments",
        "url:GET|/api/v1/users/:user_id/courses",
    ]
    scope = " ".join(scopes)

    params = {
        "client_id": CANVAS_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": CANVAS_REDIRECT_URI,
        "state": state,
        "scope": scope,
        "canvas_login": "1",
        "force_login": "1",
    }

    auth_url = f"{CANVAS_URL}/login/oauth2/auth?{urlencode(params)}"

    return {"authorization_url": auth_url}


@router.get("/callback")
async def callback(
    code: Optional[str] = Query(None),
    state: str = Query(...),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):

    try:

        if error:
            print(f"[Canvas OAuth] Error from Canvas: {error} - {error_description}")
            return RedirectResponse(
                url=f"{FRONTEND_URL}/aisidebar?canvas_error={error}&canvas_error_description={error_description or 'Unknown error'}"
            )

        if not code:
            raise HTTPException(
                status_code=400, detail="No authorization code received"
            )

        state_data = _oauth_states.pop(state, None)
        if not state_data:
            print(f"[Canvas OAuth] Invalid state: {state}")
            raise HTTPException(status_code=400, detail="Invalid or expired state")

        if datetime.utcnow() - state_data["created_at"] > timedelta(minutes=10):
            print(f"[Canvas OAuth] State expired")
            raise HTTPException(status_code=400, detail="State expired")

        user_id = state_data["user_id"]
        print(f"[Canvas OAuth] Processing callback for user {user_id}")

        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                f"{CANVAS_URL}/login/oauth2/token",
                data={
                    "client_id": CANVAS_CLIENT_ID,
                    "client_secret": CANVAS_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": CANVAS_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": "AgendaAI/1.0 (FastAPI; Canvas OAuth Integration)",
                },
            )

        print(f"[Canvas OAuth] Token exchange status: {token_response.status_code}")
        print(f"[Canvas OAuth] Token exchange raw response: {token_response.text}")

        if token_response.status_code != 200:
            print(f"[Canvas OAuth] Token exchange failed: {token_response.text}")
            raise HTTPException(
                status_code=400,
                detail=f"Failed to exchange code for token: {token_response.text}",
            )

        tokens = token_response.json()
        print(f"[Canvas OAuth] Token response: {tokens}")
        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")
        expires_in = tokens.get("expires_in")

        if not access_token:
            print(
                f"[Canvas OAuth] No access_token in response. Full response: {tokens}"
            )
            raise HTTPException(
                status_code=400, detail=f"No access token received. Response: {tokens}"
            )

        userinfo = tokens.get("user")
        if not userinfo:
            print(f"[Canvas OAuth] No user info in token response: {tokens}")
            raise HTTPException(
                status_code=400, detail="No user info received from Canvas"
            )

        provider_user_id = str(userinfo.get("id"))
        print(
            f"[Canvas OAuth] User ID: {provider_user_id}, User name: {userinfo.get('name')}"
        )

        #Calculate token expiry
        expires_at = None
        if expires_in:
            expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

        #Store or update tokens in database
        existing = (
            db.query(ConnectedAccount)
            .filter(
                ConnectedAccount.user_id == user_id,
                ConnectedAccount.provider == "canvas",
            )
            .first()
        )

        if existing:
            existing.access_token = access_token
            existing.refresh_token = refresh_token
            existing.expires_at = expires_at
            existing.provider_user_id = provider_user_id
        else:
            new_account = ConnectedAccount(
                user_id=user_id,
                provider="canvas",
                access_token=access_token,
                refresh_token=refresh_token,
                expires_at=expires_at,
                provider_user_id=provider_user_id,
            )
            db.add(new_account)

        db.commit()
        print(
            f"[Canvas OAuth] Successfully stored Canvas connection for user {user_id}"
        )

        #Redirect to frontend with success
        return RedirectResponse(url=f"{FRONTEND_URL}/aisidebar?canvas_connected=true")
    except Exception as e:
        print(f"[Canvas OAuth] Error in callback: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/status")
async def status(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    #Check if user has connected Canvas
    account = (
        db.query(ConnectedAccount)
        .filter(
            ConnectedAccount.user_id == current_user.cognito_sub,
            ConnectedAccount.provider == "canvas",
        )
        .first()
    )

    return {"connected": account is not None}


@router.delete("/disconnect")
async def disconnect(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    #Disconnect Canvas account.
    account = (
        db.query(ConnectedAccount)
        .filter(
            ConnectedAccount.user_id == current_user.cognito_sub,
            ConnectedAccount.provider == "canvas",
        )
        .first()
    )

    if account:
        db.delete(account)
        db.commit()

    return {"success": True}


@router.post("/refresh")
async def refresh_token(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Refresh the Canvas access token using the refresh token."""
    account = (
        db.query(ConnectedAccount)
        .filter(
            ConnectedAccount.user_id == current_user.cognito_sub,
            ConnectedAccount.provider == "canvas",
        )
        .first()
    )

    if not account or not account.refresh_token:
        raise HTTPException(
            status_code=404, detail="No Canvas account or refresh token found"
        )

    #Use the refresh token to get new access token
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            f"{CANVAS_URL}/login/oauth2/token",
            data={
                "client_id": CANVAS_CLIENT_ID,
                "client_secret": CANVAS_CLIENT_SECRET,
                "refresh_token": account.refresh_token,
                "grant_type": "refresh_token",
            },
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": "AgendaAI/1.0 (FastAPI; Canvas OAuth Integration)",
            },
        )

    if token_response.status_code != 200:
        print(f"[Canvas OAuth] Token refresh failed: {token_response.text}")
        raise HTTPException(
            status_code=400,
            detail=f"Failed to refresh token: {token_response.text}",
        )

    tokens = token_response.json()
    new_access_token = tokens.get("access_token")
    new_refresh_token = tokens.get("refresh_token")
    expires_in = tokens.get("expires_in")

    if not new_access_token:
        raise HTTPException(status_code=400, detail="No new access token received")

    #Update the token in database
    account.access_token = new_access_token
    if new_refresh_token:
        account.refresh_token = new_refresh_token
    if expires_in:
        account.expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

    db.commit()
    print(
        f"[Canvas OAuth] Token refreshed successfully for user {current_user.cognito_sub}"
    )

    return {"success": True, "expires_at": account.expires_at}
