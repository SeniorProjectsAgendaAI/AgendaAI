#Gmail OAuth routes for multi-user authorization
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

router = APIRouter(prefix="/oauth/gmail", tags=["gmail_oauth"])

#Google OAuth configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv(
    "GMAIL_REDIRECT_URI", "http://localhost:8000/oauth/gmail/callback"
)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

#Gmail specific scopes
GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/userinfo.email",  #Needed for userinfo endpoint
]


_oauth_states = {}


@router.get("/authorize")
async def authorize(current_user: User = Depends(get_current_user)):
    #Initiate Gmail OAuth flow
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="GOOGLE_CLIENT_ID not configured")

    #Generate CSRF state
    state = secrets.token_urlsafe(32)
    _oauth_states[state] = {
        "user_id": current_user.cognito_sub,
        "created_at": datetime.utcnow(),
    }

    #Build authorization URL
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(GMAIL_SCOPES),
        "access_type": "offline",  #refresh token
        "prompt": "consent",  #force consent to get refresh token
        "state": state,
    }

    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return {"authorization_url": auth_url}


@router.get("/callback")
async def callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db),
):
    #Handle OAuth callback from Google
    try:
    
        state_data = _oauth_states.pop(state, None)
        if not state_data:
            print(f"[Gmail OAuth] Invalid state: {state}")
            raise HTTPException(status_code=400, detail="Invalid or expired state")

        
        if datetime.utcnow() - state_data["created_at"] > timedelta(minutes=10):
            print(f"[Gmail OAuth] State expired")
            raise HTTPException(status_code=400, detail="State expired")

        user_id = state_data["user_id"]
        print(f"[Gmail OAuth] Processing callback for user {user_id}")

        #exchange code for tokens
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
            )

        if token_response.status_code != 200:
            print(f"[Gmail OAuth] Token exchange failed: {token_response.text}")
            raise HTTPException(
                status_code=400,
                detail=f"Failed to exchange code for token: {token_response.text}",
            )

        tokens = token_response.json()
        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")
        expires_in = tokens.get("expires_in", 3600)

        if not access_token:
            raise HTTPException(status_code=400, detail="No access token received")

        #geet user info from Google
        async with httpx.AsyncClient() as client:
            userinfo_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )

        if userinfo_response.status_code != 200:
            print(
                f"[Gmail OAuth] Userinfo request failed: Status {userinfo_response.status_code}, Body: {userinfo_response.text}"
            )
            raise HTTPException(
                status_code=400,
                detail=f"Failed to get user info: {userinfo_response.status_code} - {userinfo_response.text}",
            )

        userinfo = userinfo_response.json()
        provider_user_id = userinfo.get("id")

        #Store or update tokens in database
        existing = (
            db.query(ConnectedAccount)
            .filter(
                ConnectedAccount.user_id == user_id,
                ConnectedAccount.provider == "gmail",
            )
            .first()
        )

        if existing:
            existing.access_token = access_token
            existing.refresh_token = refresh_token
            existing.expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            existing.scopes = ",".join(GMAIL_SCOPES)
            existing.provider_user_id = provider_user_id
        else:
            new_account = ConnectedAccount(
                user_id=user_id,
                provider="gmail",
                access_token=access_token,
                refresh_token=refresh_token,
                expires_at=datetime.utcnow() + timedelta(seconds=expires_in),
                scopes=",".join(GMAIL_SCOPES),
                provider_user_id=provider_user_id,
            )
            db.add(new_account)

        db.commit()
        print(f"[Gmail OAuth] Successfully stored Gmail connection for user {user_id}")

        #redirect to frontend with success
        return RedirectResponse(url=f"{FRONTEND_URL}/aisidebar?gmail_connected=true")
    except Exception as e:
        print(f"[Gmail OAuth] Error in callback: {str(e)}")
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/status")
async def status(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    #Check if user has connected Gmail
    account = (
        db.query(ConnectedAccount)
        .filter(
            ConnectedAccount.user_id == current_user.cognito_sub,
            ConnectedAccount.provider == "gmail",
        )
        .first()
    )

    return {"connected": account is not None}


@router.delete("/disconnect")
async def disconnect(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
   #Disconnect Gmail account.
    account = (
        db.query(ConnectedAccount)
        .filter(
            ConnectedAccount.user_id == current_user.cognito_sub,
            ConnectedAccount.provider == "gmail",
        )
        .first()
    )

    if account:
        db.delete(account)
        db.commit()

    return {"success": True}
