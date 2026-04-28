#Google Calendar OAuth routes for multi-user authorization
#Reference :https://developers.google.com/identity/protocols/oauth2
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

router = APIRouter(prefix="/oauth/google-calendar", tags=["google_calendar_oauth"])

#google OAuth configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI", "http://localhost:8000/oauth/google-calendar/callback"
)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

#google Calendar specific scopes
GOOGLE_CALENDAR_SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email",
]

#In-memory state storage (for future implementation)
oauth_states = {}


@router.get("/authorize")
async def google_calendar_oauth_start(
    current_user: User = Depends(get_current_user),
):
    
    #Initiate Google Calendar OAuth flow.
    #Returns the authorization URL for the frontend to redirect to.
    
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        print(f"[DEBUG] GOOGLE_CLIENT_ID={repr(GOOGLE_CLIENT_ID)}, GOOGLE_CLIENT_SECRET={repr(GOOGLE_CLIENT_SECRET)}")
        print(f"[DEBUG] os.getenv check: ID={repr(os.getenv('GOOGLE_CLIENT_ID'))}, SECRET={repr(os.getenv('GOOGLE_CLIENT_SECRET'))}")
        raise HTTPException(
            status_code=500, detail="Google OAuth not configured on server"
        )


    state = secrets.token_urlsafe(32)
    oauth_states[state] = {
        "user_id": current_user.cognito_sub,
        "expires_at": datetime.utcnow() + timedelta(minutes=10),
    }

    #Build Google authorization URL
    auth_params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(GOOGLE_CALENDAR_SCOPES),
        "state": state,
        "access_type": "offline",  #request a refresh on token
        "prompt": "consent",  #force consent screen to get refresh token
    }

    authorization_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(auth_params)}"
    )

    return {"authorization_url": authorization_url, "state": state}


@router.get("/callback")
async def google_calendar_oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    error: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    
    #Handle Google Calendar OAuth callback.
    #Exchanges authorization code for access token and stores it.
    
    # Check for errors
    if error:
        return RedirectResponse(
            url=f"{FRONTEND_URL}/aisidebar?google_calendar_error={error}"
        )

    #Verify state to prevent CSRF
    if state not in oauth_states:
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    state_data = oauth_states[state]
    if datetime.utcnow() > state_data["expires_at"]:
        del oauth_states[state]
        raise HTTPException(status_code=400, detail="State expired")

    user_id = state_data["user_id"]
    del oauth_states[state]

    #exchange code for access token
    try:
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "grant_type": "authorization_code",
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": GOOGLE_REDIRECT_URI,
                },
            )
            token_response.raise_for_status()
            token_data = token_response.json()
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to exchange code for token: {str(e)}"
        )

    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    expires_in = token_data.get("expires_in")
    scope = token_data.get("scope", "")

    if not access_token:
        raise HTTPException(status_code=500, detail="No access token received")

    #Calculate expiration time
    expires_at = None
    if expires_in:
        expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

    #Get user info to store provider_user_id
    google_user_id = None
    google_email = None
    try:
        async with httpx.AsyncClient() as client:
            user_info_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if user_info_response.status_code == 200:
                user_info = user_info_response.json()
                google_user_id = user_info.get("id")
                google_email = user_info.get("email")
    except:
        pass

    #Store token for google_calendar provider
    existing_account = (
        db.query(ConnectedAccount)
        .filter(
            ConnectedAccount.user_id == user_id,
            ConnectedAccount.provider == "google_calendar",
        )
        .first()
    )

    if existing_account:
        existing_account.access_token = access_token
        existing_account.refresh_token = refresh_token
        existing_account.expires_at = expires_at
        existing_account.scopes = scope
        existing_account.provider_user_id = google_user_id
        existing_account.provider_email = google_email
        existing_account.updated_at = datetime.utcnow()
    else:
        new_account = ConnectedAccount(
            user_id=user_id,
            provider="google_calendar",
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at,
            scopes=scope,
            provider_user_id=google_user_id,
            provider_email=google_email,
        )
        db.add(new_account)

    db.commit()

    return RedirectResponse(
        url=f"{FRONTEND_URL}/profilecontainer?google_calendar_connected=true"
    )


@router.get("/status")
async def google_calendar_oauth_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    
    #Check if user has connected their Google Calendar account.
    
    account = (
        db.query(ConnectedAccount)
        .filter(
            ConnectedAccount.user_id == current_user.cognito_sub,
            ConnectedAccount.provider == "google_calendar",
        )
        .first()
    )

    return {
        "connected": account is not None,
        "email": account.provider_email if account else None,
    }


@router.delete("/disconnect")
async def google_calendar_oauth_disconnect(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    
    #Disconnect user's Google Calendar account.
    
    account = (
        db.query(ConnectedAccount)
        .filter(
            ConnectedAccount.user_id == current_user.cognito_sub,
            ConnectedAccount.provider == "google_calendar",
        )
        .first()
    )

    if account:
        db.delete(account)
        db.commit()
        return {"message": "Google Calendar disconnected successfully"}

    raise HTTPException(status_code=404, detail="Google Calendar not connected")
