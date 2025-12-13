#James Acacio - Authentication routes for user registration and login

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database import models
from app.services.security import hash_password, verify_password
from app.services.auth_utils import create_access_token


router = APIRouter(prefix="/auth", tags=["Auth"])

#register a new user after checking if email is already in use and hashing their password

@router.post("/register")
def register_user(user: dict, db: Session = Depends(get_db)):
    email = user.get("email")
    password = user.get("password")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")

    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = models.User(
        email=email,
        hashed_password=hash_password(password),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User registered", "user_id": new_user.id}


#authenticate a user and return their access token if credentials are valid

@router.post("/login")
def login(user: dict, db: Session = Depends(get_db)):
    email = user.get("email")
    password = user.get("password")

    db_user = db.query(models.User).filter(models.User.email == email).first()
    if not db_user:
        raise HTTPException(status_code=400, detail="Invalid email or password")

    if not verify_password(password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    token = create_access_token({"sub": str(db_user.id)})

    return {"access_token": token, "token_type": "bearer"}
