from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# Data sent when creating a new event.
class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    start_at: datetime
    end_at: datetime
    all_day: Optional[bool] = False
    recurrence: Optional[str] = "none"
    color: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = "scheduled"


# Data that can be changed when updating an existing event.
class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    all_day: Optional[bool] = None
    recurrence: Optional[str] = None
    color: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None


# Data returned to the client for an event.
class EventResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    start_at: datetime
    end_at: datetime
    all_day: bool
    recurrence: str
    color: Optional[str] = None
    location: Optional[str] = None
    status: str
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        # Lets Pydantic read data directly from SQLAlchemy models.
        orm_mode = True
