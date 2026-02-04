#James Acacio - Utility functions for authentication using JWT tokens

import json
import os
from datetime import datetime, timedelta
from functools import lru_cache
from urllib.request import urlopen

from app.database.models import User
from app.database.session import get_db
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

load_dotenv()

#config values for JWT tokens and validation

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

COGNITO_REGION = os.getenv("COGNITO_REGION")
COGNITO_USER_POOL_ID = os.getenv("COGNITO_USER_POOL_ID")
COGNITO_APP_CLIENT_ID = os.getenv("COGNITO_APP_CLIENT_ID")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


#Function to create a JWT access token
def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()

    expire = datetime.utcnow() + (
        expires_delta
        if expires_delta
        else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode["exp"] = expire

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def _get_cognito_issuer() -> str | None:
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


def _verify_cognito_token(token: str) -> dict:
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


#Dependency to get the current user from the JWT token
def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    #local HS256 token validation.
    if SECRET_KEY:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            if user_id is not None:
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    return user
        except JWTError as e:
            print(f"Local JWT validation failed: {e}")
            pass

    #Cognito validation (RS256).
    try:
        claims = _verify_cognito_token(token)
        print(
            f"Cognito token validated successfully. Sub: {claims.get('sub')}, Email: {claims.get('email')}"
        )
    except JWTError as e:
        print(f"Cognito validation failed: {e}")
        raise credentials_exception

    cognito_sub = claims.get("sub")
    email = claims.get("email")
    if not cognito_sub or not email:
        print(f"Missing cognito_sub or email in claims: {claims}")
        raise credentials_exception

    user = db.query(User).filter(User.cognito_sub == cognito_sub).first()
    if not user:
        print(f"Creating new user for {email} with cognito_sub {cognito_sub}")
        existing_by_email = db.query(User).filter(User.email == email).first()
        if existing_by_email and not existing_by_email.cognito_sub:
            existing_by_email.cognito_sub = cognito_sub
            db.commit()
            db.refresh(existing_by_email)
            return existing_by_email

        user = User(email=email, cognito_sub=cognito_sub)
        db.add(user)
        db.commit()
        db.refresh(user)

    return user
