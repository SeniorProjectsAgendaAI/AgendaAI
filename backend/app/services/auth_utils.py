import json
import os
import ssl
from datetime import datetime, timedelta
from functools import lru_cache
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

import certifi
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


def _load_cognito_config_from_amplify_outputs() -> tuple[str | None, str | None, str | None]:
    current_file = Path(__file__).resolve()
    default_outputs_path = current_file.parents[3] / "frontend" / "src" / "amplify_outputs.json"
    outputs_path = Path(os.getenv("AMPLIFY_OUTPUTS_PATH", str(default_outputs_path)))

    if not outputs_path.exists():
        return (None, None, None)

    try:
        with outputs_path.open("r", encoding="utf-8") as file:
            outputs = json.load(file)
    except (OSError, json.JSONDecodeError):
        return (None, None, None)

    auth = outputs.get("auth", {})
    return (
        auth.get("aws_region"),
        auth.get("user_pool_id"),
        auth.get("user_pool_client_id"),
    )


if not (COGNITO_REGION and COGNITO_USER_POOL_ID and COGNITO_APP_CLIENT_ID):
    fallback_region, fallback_pool_id, fallback_client_id = _load_cognito_config_from_amplify_outputs()
    COGNITO_REGION = COGNITO_REGION or fallback_region
    COGNITO_USER_POOL_ID = COGNITO_USER_POOL_ID or fallback_pool_id
    COGNITO_APP_CLIENT_ID = COGNITO_APP_CLIENT_ID or fallback_client_id

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
    ssl_context = ssl.create_default_context(cafile=certifi.where())
    with urlopen(f"{issuer}/.well-known/jwks.json", context=ssl_context) as response:
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
    except (JWTError, RuntimeError, URLError, OSError) as e:
        print(f"Cognito validation failed: {e}")
        raise credentials_exception

    cognito_sub = claims.get("sub")
    email = claims.get("email")
    if not cognito_sub or not email:
        print(f"Missing cognito_sub or email in claims: {claims}")
        raise credentials_exception

    normalized_email = email.strip().lower()
    user = db.query(User).filter(User.cognito_sub == cognito_sub).first()
    if user:
        return user

    existing_by_email = db.query(User).filter(User.email == normalized_email).first()
    if existing_by_email:
        if existing_by_email.cognito_sub == cognito_sub:
            return existing_by_email
        # If email is already connected to a different cognito sub, replace that sub with the new instead of creating a new user. 
        existing_by_email.cognito_sub = cognito_sub
        db.commit()
        db.refresh(existing_by_email)
        return existing_by_email

    user = User(email=normalized_email, cognito_sub=cognito_sub)
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already in use by a different account. Use that provider or a different email.",
        )
    db.refresh(user)

    return user
