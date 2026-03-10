# Schemas for task creation, update, and response data.

from datetime import date, datetime, time
from typing import Optional

from pydantic import BaseModel


# Data sent when creating a new task.
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    tag: Optional[str] = None
    color: Optional[str] = None
    priority: Optional[int] = 1
    status: Optional[str] = "todo"
    due_date: Optional[date] = None
    due_time: Optional[time] = None


# Data that can be changed when updating an existing task.
class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    tag: Optional[str] = None
    color: Optional[str] = None
    priority: Optional[int] = None
    status: Optional[str] = None
    due_date: Optional[date] = None
    due_time: Optional[time] = None
    completed: Optional[bool] = None


# Data returned to the client for a task.
class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    tag: Optional[str] = None
    color: Optional[str] = None
    priority: Optional[int] = None
    status: str
    due_date: Optional[date] = None
    due_time: Optional[time] = None
    completed: bool
    user_id: int
    created_at: datetime

    class Config:
        # Lets Pydantic read data directly from SQLAlchemy models.
        orm_mode = True
