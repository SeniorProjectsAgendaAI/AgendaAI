

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from app.database import models, schemas
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from sqlalchemy.orm import Session


async def refresh_google_token(
    db: Session, connected_account: models.ConnectedAccount
) -> Optional[str]:

    if not connected_account.refresh_token:
        raise ValueError("No refresh token available for Google Calendar")

    # Check if token is expired or about to expire (within 5 minutes)
    if (
        connected_account.expires_at
        and connected_account.expires_at > datetime.utcnow() + timedelta(minutes=5)
    ):
        return connected_account.access_token

    try:
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": connected_account.refresh_token,
                    "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                    "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                },
            )
            token_response.raise_for_status()
            token_data = token_response.json()

     
        connected_account.access_token = token_data["access_token"]
        if "refresh_token" in token_data:
            connected_account.refresh_token = token_data["refresh_token"]

        expires_in = token_data.get("expires_in")
        if expires_in:
            connected_account.expires_at = datetime.utcnow() + timedelta(
                seconds=expires_in
            )

        connected_account.updated_at = datetime.utcnow()
        db.commit()

        return token_data["access_token"]

    except Exception as e:
        print(f"[Google Calendar Sync] Failed to refresh token: {str(e)}")
        raise


def get_google_calendar_service(connected_account: models.ConnectedAccount):

    creds = Credentials(
        token=connected_account.access_token,
        refresh_token=connected_account.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        scopes=[
            "https://www.googleapis.com/auth/calendar.readonly",
            "https://www.googleapis.com/auth/calendar.events",
        ],
    )
    return build("calendar", "v3", credentials=creds)


async def fetch_google_events(
    db: Session,
    connected_account: models.ConnectedAccount,
    days_back: int = 30,
    days_forward: int = 90,
) -> list[dict]:


    try:
        access_token = await refresh_google_token(db, connected_account)
        connected_account.access_token = access_token
    except Exception as e:
        print(
            f"[Google Calendar Sync] Token refresh failed for user {connected_account.user_id}: {e}"
        )
        raise

    try:
        service = get_google_calendar_service(connected_account)

        now = datetime.now(timezone.utc)
        time_min = (now - timedelta(days=days_back)).isoformat()
        time_max = (now + timedelta(days=days_forward)).isoformat()

        events_result = (
            service.events()
            .list(
                calendarId="primary",
                timeMin=time_min,
                timeMax=time_max,
                singleEvents=True,
                orderBy="startTime",
                maxResults=250, 
            )
            .execute()
        )

        events = events_result.get("items", [])
        print(
            f"[Google Calendar Sync] Fetched {len(events)} events from Google Calendar for user {connected_account.user_id}"
        )

        return events

    except HttpError as e:
        print(f"[Google Calendar Sync] Google API error: {e}")
        raise


def parse_google_event(google_event: dict) -> dict:

    event_id = google_event.get("id")
    title = google_event.get("summary", "Untitled Event")
    description = google_event.get("description", "")
    location = google_event.get("location", "")


    start_data = google_event.get("start", {})
    end_data = google_event.get("end", {})

    all_day = False
    start_at = None
    end_at = None


    if "date" in start_data:
   
        all_day = True
        start_date = datetime.strptime(start_data["date"], "%Y-%m-%d")
        end_date = datetime.strptime(end_data["date"], "%Y-%m-%d")
        start_at = start_date
        end_at = end_date
    elif "dateTime" in start_data:

        start_str = start_data["dateTime"]
        end_str = end_data["dateTime"]


        try:

            dt_aware = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
         
            start_at = dt_aware.replace(tzinfo=None)
        except:
            try:
                import dateutil.parser

                dt_aware = dateutil.parser.isoparse(start_str)
                start_at = dt_aware.replace(tzinfo=None)
            except:
                start_at = datetime.utcnow()

        try:
            dt_aware = datetime.fromisoformat(end_str.replace("Z", "+00:00"))
            end_at = dt_aware.replace(tzinfo=None)
        except:
            try:
                import dateutil.parser

                dt_aware = dateutil.parser.isoparse(end_str)
                end_at = dt_aware.replace(tzinfo=None)
            except:
                end_at = start_at + timedelta(hours=1)


    rrule = google_event.get("recurrence", [])
    recurrence = "none"
    if rrule:
    
        rrule_str = str(rrule).upper()
        if "FREQ=DAILY" in rrule_str:
            recurrence = "daily"
        elif "FREQ=WEEKLY" in rrule_str:
            recurrence = "weekly"
        elif "FREQ=MONTHLY" in rrule_str:
            recurrence = "monthly"

    return {
        "title": title,
        "description": description,
        "location": location,
        "start_at": start_at,
        "end_at": end_at,
        "all_day": all_day,
        "recurrence": recurrence,
        "source": "google_calendar",
        "external_event_id": event_id,
        "status": "scheduled",  
    }


def upsert_events_from_google(
    db: Session,
    user_id: int,
    google_events: list[dict],
) -> dict:

    stats = {"created": 0, "updated": 0, "errors": []}

    for google_event in google_events:
        try:
            event_data = parse_google_event(google_event)
            external_event_id = event_data["external_event_id"]

            existing_event = (
                db.query(models.Event)
                .filter(
                    models.Event.external_event_id == external_event_id,
                    models.Event.user_id == user_id,
                )
                .first()
            )

            if existing_event:
                
                existing_event.title = event_data["title"]
                existing_event.description = event_data["description"]
                existing_event.location = event_data["location"]
                existing_event.start_at = event_data["start_at"]
                existing_event.end_at = event_data["end_at"]
                existing_event.all_day = event_data["all_day"]
                existing_event.recurrence = event_data["recurrence"]
                existing_event.updated_at = datetime.utcnow()
             
                stats["updated"] += 1
            else:
                
                new_event = models.Event(
                    title=event_data["title"],
                    description=event_data["description"],
                    location=event_data["location"],
                    start_at=event_data["start_at"],
                    end_at=event_data["end_at"],
                    all_day=event_data["all_day"],
                    recurrence=event_data["recurrence"],
                    user_id=user_id,
                    source=event_data["source"],
                    external_event_id=event_data["external_event_id"],
                    status=event_data["status"],
                )
                db.add(new_event)
                stats["created"] += 1

        except Exception as e:
            error_msg = (
                f"Failed to sync event {google_event.get('id', 'unknown')}: {str(e)}"
            )
            print(f"[Google Calendar Sync] {error_msg}")
            stats["errors"].append(error_msg)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        stats["errors"].append(f"Database commit failed: {str(e)}")

    return stats


async def sync_user_google_calendar(
    db: Session,
    user_id: int,
    cognito_sub: str,
    days_back: int = 30,
    days_forward: int = 90,
) -> dict:

    try:
       
        connected_account = (
            db.query(models.ConnectedAccount)
            .filter(
                models.ConnectedAccount.user_id == cognito_sub,
                models.ConnectedAccount.provider == "google_calendar",
            )
            .first()
        )

        if not connected_account:
            return {
                "status": "error",
                "synced_count": 0,
                "updated_count": 0,
                "errors": ["Google Calendar not connected for this user"],
            }


        google_events = await fetch_google_events(
            db,
            connected_account,
            days_back=days_back,
            days_forward=days_forward,
        )

      
        stats = upsert_events_from_google(db, user_id, google_events)

        return {
            "status": "success",
            "synced_count": stats["created"],
            "updated_count": stats["updated"],
            "errors": stats["errors"],
        }

    except Exception as e:
        error_msg = str(e)
        print(f"[Google Calendar Sync] Sync failed for user {user_id}: {error_msg}")
        return {
            "status": "error",
            "synced_count": 0,
            "updated_count": 0,
            "errors": [error_msg],
        }


async def sync_all_users_google_calendars(db: Session) -> dict:

    try:
        
        connected_accounts = (
            db.query(models.ConnectedAccount)
            .filter(models.ConnectedAccount.provider == "google_calendar")
            .all()
        )

        total_synced = 0
        total_updated = 0
        total_errors = []

        print(
            f"[Google Calendar Sync] Starting background sync for {len(connected_accounts)} users"
        )

        for connected_account in connected_accounts:
            try:
                
                user = (
                    db.query(models.User)
                    .filter(models.User.cognito_sub == connected_account.user_id)
                    .first()
                )

                if not user:
                    print(
                        f"[Google Calendar Sync] User with cognito_sub {connected_account.user_id} not found"
                    )
                    continue

                result = await sync_user_google_calendar(
                    db,
                    user.id,
                    connected_account.user_id,
                )

                if result["status"] == "success":
                    total_synced += result["synced_count"]
                    total_updated += result["updated_count"]
                    print(
                        f"[Google Calendar Sync] Synced {result['synced_count']} new and {result['updated_count']} updated events for user {user.id}"
                    )
                else:
                    total_errors.extend(result["errors"])

            except Exception as e:
                error_msg = f"Failed to sync user {connected_account.user_id}: {str(e)}"
                print(f"[Google Calendar Sync] {error_msg}")
                total_errors.append(error_msg)

        return {
            "status": "completed",
            "total_synced": total_synced,
            "total_updated": total_updated,
            "total_errors": len(total_errors),
            "errors": total_errors,
        }

    except Exception as e:
        error_msg = f"Background sync failed: {str(e)}"
        print(f"[Google Calendar Sync] {error_msg}")
        return {
            "status": "error",
            "total_synced": 0,
            "total_updated": 0,
            "total_errors": 1,
            "errors": [error_msg],
        }
