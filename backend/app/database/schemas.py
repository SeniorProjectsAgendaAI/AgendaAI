# James Acacio - Pydantic schemas for User and Task
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List


# User Schemas for creating and responding to users
class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Task Schemas for creating and responding to tasks
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None


class TaskCreate(TaskBase):
    pass


class TaskResponse(TaskBase):
    id: int
    completed: bool
    created_at: datetime
    owner_id: int

    class Config:
        from_attributes = True

#authentication when a user logs in with email and password
class UserLogin(BaseModel):
    email: str
    password: str
