#James Acacio - Security service for password hashing and verification using Argon2

import hashlib
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

#helper functions for password hashing and verification

def _prehash(password: str) -> str:
    """Convert any-size password to 32-byte SHA256 hash."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()

def hash_password(password: str) -> str:
    return pwd_context.hash(_prehash(password))

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(_prehash(plain_password), hashed_password)
