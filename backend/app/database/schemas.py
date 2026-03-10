#james acacio
# Pydantic schemas for user and task data.
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


# Shared fields used by user schemas.
class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None


# Data required when creating a new user.
class UserCreate(UserBase):
    password: str


# Data returned to the client for a user.
class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        # Lets Pydantic read data directly from SQLAlchemy models.
        from_attributes = True


# Shared fields used by task schemas.
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None


# Data required when creating a new task.
class TaskCreate(TaskBase):
    pass


# Data returned to the client for a task.
class TaskResponse(TaskBase):
    id: int
    completed: bool
    created_at: datetime
    user_id: int

    class Config:
        # Lets Pydantic read data directly from SQLAlchemy models.
        from_attributes = True


# Data used when a user logs in with email and password.
class UserLogin(BaseModel):
    email: str
    password: str
