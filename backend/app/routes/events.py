#james acacio

import asyncio
import os
from datetime import datetime, timedelta
from typing import Optional

from app.database import models
from app.database.session import get_db
from app.schemas.events import EventCreate, EventResponse, EventUpdate
from app.services.auth_utils import get_current_user
from app.services.canvas_sync import sync_user_canvas
from app.services.google_calendar_sync import sync_user_google_calendar
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

load_dotenv()

router = APIRouter(prefix="/events", tags=["Events"])
# Valid status values allowed for events.
ALLOWED_EVENT_STATUSES = {
    "scheduled",
    "ongoing",
    "completed",
    "canceled",
    "pending_approval",
}
# Valid recurrence options allowed for repeating events.
ALLOWED_EVENT_RECURRENCE = {"none", "daily", "weekly", "monthly"}


_last_sync_times = {} 


def _has_event_conflict(
    db: Session,
    user_id: int,
    start_at: datetime,
    end_at: datetime,
    exclude_event_id: Optional[int] = None,
) -> bool:
    query = db.query(models.Event).filter(
        models.Event.user_id == user_id,
        models.Event.status.notin_(["canceled", "pending_approval"]),
        models.Event.start_at < end_at,
        models.Event.end_at > start_at,
    )
    if exclude_event_id is not None:
        query = query.filter(models.Event.id != exclude_event_id)
    return db.query(query.exists()).scalar()


# Creates a new event for the currently logged-in user.
@router.post("/", response_model=EventResponse)
@router.post("", response_model=EventResponse)
def create_event(
    event: EventCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if event.end_at <= event.start_at:
        raise HTTPException(
            status_code=400, detail="Event end time must be after start time"
        )
    if event.status and event.status not in ALLOWED_EVENT_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid event status")
    if event.recurrence and event.recurrence not in ALLOWED_EVENT_RECURRENCE:
        raise HTTPException(status_code=400, detail="Invalid event recurrence")

    status = event.status or "scheduled"
    if (
        status != "pending_approval"
        and _has_event_conflict(db, user.id, event.start_at, event.end_at)
    ):
        status = "pending_approval"

    new_event = models.Event(
        title=event.title,
        description=event.description,
        start_at=event.start_at,
        end_at=event.end_at,
        all_day=bool(event.all_day),
        recurrence=event.recurrence or "none",
        color=event.color,
        location=event.location,
        status=status,
        user_id=user.id,
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return new_event


# Returns all events that belong to the current user.
@router.get("/", response_model=list[EventResponse])
@router.get("", response_model=list[EventResponse])
def get_events(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return db.query(models.Event).filter(models.Event.user_id == user.id).all()


# Updates an existing event if it belongs to the current user.
@router.put("/{event_id}", response_model=EventResponse)
def update_event(
    event_id: int,
    updates: EventUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    event = (
        db.query(models.Event)
        .filter(models.Event.id == event_id, models.Event.user_id == user.id)
        .first()
    )
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    next_start = updates.start_at if updates.start_at is not None else event.start_at
    next_end = updates.end_at if updates.end_at is not None else event.end_at
    if next_end <= next_start:
        raise HTTPException(
            status_code=400, detail="Event end time must be after start time"
        )

    if updates.title is not None:
        event.title = updates.title
    if updates.description is not None:
        event.description = updates.description
    if updates.start_at is not None:
        event.start_at = updates.start_at
    if updates.end_at is not None:
        event.end_at = updates.end_at
    if updates.color is not None:
        event.color = updates.color
    if updates.location is not None:
        event.location = updates.location
    if updates.status is not None:
        if updates.status not in ALLOWED_EVENT_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid event status")
        event.status = updates.status
    if updates.all_day is not None:
        event.all_day = updates.all_day
    if updates.recurrence is not None:
        if updates.recurrence not in ALLOWED_EVENT_RECURRENCE:
            raise HTTPException(status_code=400, detail="Invalid event recurrence")
        event.recurrence = updates.recurrence

    if (
        event.status != "pending_approval"
        and (updates.start_at is not None or updates.end_at is not None)
        and _has_event_conflict(db, user.id, event.start_at, event.end_at, event.id)
    ):
        event.status = "pending_approval"

    db.commit()
    db.refresh(event)
    return event


# Deletes an event if it belongs to the current user.
@router.delete("/{event_id}")
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    event = (
        db.query(models.Event)
        .filter(models.Event.id == event_id, models.Event.user_id == user.id)
        .first()
    )
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    db.delete(event)
    db.commit()
    return {"message": "Event deleted"}


#Manually sync Google Calendar events for the current user.
@router.post("/sync/google-calendar")
async def sync_google_calendar(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    Manually trigger a sync of Google Calendar events for the current user.
    Rate limited to 1 request per 5 minutes per user to prevent abuse.
    """
    #rate limiting: check if user synced recently
    last_sync = _last_sync_times.get(user.id)
    if last_sync and datetime.utcnow() - last_sync < timedelta(minutes=5):
        raise HTTPException(
            status_code=429,
            detail=f"Rate limited. Please wait before syncing again. Last sync was {(datetime.utcnow() - last_sync).total_seconds():.0f} seconds ago.",
        )

    #check if user has Google Calendar connected
    connected_account = (
        db.query(models.ConnectedAccount)
        .filter(
            models.ConnectedAccount.user_id == user.cognito_sub,
            models.ConnectedAccount.provider == "google_calendar",
        )
        .first()
    )

    if not connected_account:
        raise HTTPException(
            status_code=400,
            detail="Google Calendar not connected. Please connect your Google Calendar first.",
        )

    try:
        #sync
        result = await sync_user_google_calendar(
            db,
            user.id,
            user.cognito_sub,
        )

        #updated rate limit
        _last_sync_times[user.id] = datetime.utcnow()

        return {
            "status": result["status"],
            "synced_count": result["synced_count"],
            "updated_count": result["updated_count"],
            "errors": result.get("errors", []),
        }

    except Exception as e:
        print(
            f"[Events Route] Google Calendar sync failed for user {user.id}: {str(e)}"
        )
        raise HTTPException(
            status_code=500,
            detail=f"Sync failed: {str(e)}",
        )


#manually sync Canvas assignments for the current user.
@router.post("/sync/canvas")
async def sync_canvas_assignments(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """
    Manually trigger a sync of Canvas assignments for the current user.
    Rate limited to 1 request per 5 minutes per user to prevent abuse.

    """
    #rate limiting: check if user synced recently
    last_sync = _last_sync_times.get(user.id)
    if last_sync and datetime.utcnow() - last_sync < timedelta(minutes=5):
        raise HTTPException(
            status_code=429,
            detail=f"Rate limited. Please wait before syncing again. Last sync was {(datetime.utcnow() - last_sync).total_seconds():.0f} seconds ago.",
        )

    #check user has connected
    connected_account = (
        db.query(models.ConnectedAccount)
        .filter(
            models.ConnectedAccount.user_id == user.cognito_sub,
            models.ConnectedAccount.provider == "canvas",
        )
        .first()
    )

    if not connected_account:
        raise HTTPException(
            status_code=400,
            detail="Canvas not connected. Please connect your Canvas account first.",
        )

    try:
     
        canvas_url = os.getenv("CANVAS_URL", "https://unr.beta.instructure.com")

      
        result = await sync_user_canvas(
            db,
            user,
            canvas_url,
            connected_account,
        )


        _last_sync_times[user.id] = datetime.utcnow()

        return {
            "status": result["status"],
            "synced_count": result["synced_count"],
            "updated_count": result["updated_count"],
            "errors": result.get("errors", []),
        }

    except Exception as e:
        print(f"[Events Route] Canvas sync failed for user {user.id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Sync failed: {str(e)}",
        )
