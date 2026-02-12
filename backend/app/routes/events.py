from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import models
from app.database.session import get_db
from app.schemas.events import EventCreate, EventResponse, EventUpdate
from app.services.auth_utils import get_current_user

router = APIRouter(prefix="/events", tags=["Events"])
ALLOWED_EVENT_STATUSES = {"scheduled", "ongoing", "completed", "canceled"}
ALLOWED_EVENT_RECURRENCE = {"none", "daily", "weekly", "monthly"}


@router.post("/", response_model=EventResponse)
def create_event(
    event: EventCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if event.end_at <= event.start_at:
        raise HTTPException(status_code=400, detail="Event end time must be after start time")
    if event.status and event.status not in ALLOWED_EVENT_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid event status")
    if event.recurrence and event.recurrence not in ALLOWED_EVENT_RECURRENCE:
        raise HTTPException(status_code=400, detail="Invalid event recurrence")

    new_event = models.Event(
        title=event.title,
        description=event.description,
        start_at=event.start_at,
        end_at=event.end_at,
        all_day=bool(event.all_day),
        recurrence=event.recurrence or "none",
        color=event.color,
        location=event.location,
        status=event.status or "scheduled",
        user_id=user.id,
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return new_event


@router.get("/", response_model=list[EventResponse])
def get_events(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return db.query(models.Event).filter(models.Event.user_id == user.id).all()


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
        raise HTTPException(status_code=400, detail="Event end time must be after start time")

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

    db.commit()
    db.refresh(event)
    return event


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
