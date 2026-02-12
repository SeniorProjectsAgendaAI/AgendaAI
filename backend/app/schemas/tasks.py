#James Acacio - schemas for Task creation, update, and response 

from datetime import date, datetime, time
from typing import Optional

from pydantic import BaseModel

#
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    tag: Optional[str] = None
    color: Optional[str] = None
    priority: Optional[int] = 1
    status: Optional[str] = "todo"
    due_date: Optional[date] = None
    due_time: Optional[time] = None


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
        orm_mode = True
