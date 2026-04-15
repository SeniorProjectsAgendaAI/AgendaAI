
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
import pytz
from app.database import models, schemas
from sqlalchemy.orm import Session


async def refresh_canvas_token(
    db: Session, connected_account: models.ConnectedAccount
) -> Optional[str]:

    if not connected_account.access_token:
        raise ValueError("No access token available for Canvas")



    return connected_account.access_token


def get_canvas_api_client(access_token: str) -> dict:

    return {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }


async def fetch_canvas_assignments(
    db: Session, canvas_url: str, access_token: str, user_id: int
) -> tuple:

    headers = get_canvas_api_client(access_token)
    assignments = []
    user_timezone = "America/Los_Angeles"  # Default to Pacific timezone (PDT/PST)

    try:
        async with httpx.AsyncClient() as client:
         
            try:
                profile_url = f"{canvas_url}/api/v1/users/self"
                profile_resp = await client.get(
                    profile_url,
                    headers=headers,
                    timeout=30.0,
                )
                profile_resp.raise_for_status()
                profile_data = profile_resp.json()
                print(f"[Canvas Sync] Profile data keys: {list(profile_data.keys())}")
                print(f"[Canvas Sync] Full profile data: {profile_data}")
                if "time_zone" in profile_data and profile_data["time_zone"]:
                    user_timezone = profile_data["time_zone"]
                    print(f"[Canvas Sync] User timezone from profile: {user_timezone}")
                else:
                    print(
                        f"[Canvas Sync] No time_zone field in Canvas profile, using default: {user_timezone}"
                    )
            except Exception as e:
                print(
                    f"[Canvas Sync] Could not fetch user timezone: {str(e)}, using UTC"
                )

            #get user's courses
            courses_url = f"{canvas_url}/api/v1/users/self/courses"
            courses_resp = await client.get(
                courses_url,
                headers=headers,
                params={"per_page": 100},
                timeout=30.0,
            )
            courses_resp.raise_for_status()
            courses = courses_resp.json()

            print(f"[Canvas Sync] Fetched {len(courses)} courses for user {user_id}")

            #For each course, fetch assignments
            for course in courses:
                course_id = course.get("id")
                course_name = course.get("name", "Unknown Course")

      
                if not course_id:
                    continue

                try:
                    assignments_url = (
                        f"{canvas_url}/api/v1/courses/{course_id}/assignments"
                    )
                    assignments_resp = await client.get(
                        assignments_url,
                        headers=headers,
                        params={"per_page": 100},
                        timeout=30.0,
                    )
                    assignments_resp.raise_for_status()
                    course_assignments = assignments_resp.json()


                    for assignment in course_assignments:
                        assignment["_course_id"] = course_id
                        assignment["_course_name"] = course_name
                        assignments.append(assignment)

                    print(
                        f"[Canvas Sync] Fetched {len(course_assignments)} assignments from course {course_name}"
                    )

                except httpx.HTTPError as e:
                    print(
                        f"[Canvas Sync] Error fetching assignments for course {course_name}: {str(e)}"
                    )
                    continue

            return assignments, user_timezone

    except Exception as e:
        print(f"[Canvas Sync] Error fetching Canvas assignments: {str(e)}")
        raise


def parse_canvas_assignment(assignment: dict, user_timezone: str = "UTC") -> dict:

    title = assignment.get("name", "Untitled Assignment")
    description = assignment.get("description", "")
    course_name = assignment.get("_course_name", "Canvas")
    assignment_id = assignment.get("id")


    full_description = (
        f"[Canvas] {course_name}\n\n{description}"
        if description
        else f"[Canvas] {course_name}"
    )


    due_at = assignment.get("due_at")
    if not due_at:
      
        return None


    try:

        if due_at.endswith("Z"):
            due_at_utc = due_at.replace("Z", "+00:00")
        else:
            due_at_utc = due_at

 
        dt_utc = datetime.fromisoformat(due_at_utc)


        try:
            user_tz = pytz.timezone(user_timezone)
            dt_local = dt_utc.astimezone(user_tz)
    
            start_at = dt_local.replace(tzinfo=None)
        except Exception as tz_error:
    
            print(
                f"[Canvas Sync] Could not convert timezone {user_timezone}: {str(tz_error)}, using UTC time"
            )
            start_at = dt_utc.replace(tzinfo=None)

        end_at = start_at

    except Exception as e:
        print(
            f"[Canvas Sync] Error parsing due date '{due_at}' for assignment '{title}': {str(e)}"
        )
        return None

    return {
        "title": title,
        "description": full_description,
        "start_at": start_at,
        "end_at": end_at,
        "location": None,
        "all_day": False,
    }


async def upsert_assignments_to_db(
    db: Session, user: models.User, assignments: list, source: str = "canvas"
) -> tuple:

    created_count = 0
    updated_count = 0

    for assignment in assignments:
        if not assignment:
      
            continue

        external_id = assignment.get("external_event_id")

        try:
     
            existing_event = (
                db.query(models.Event)
                .filter(
                    models.Event.user_id == user.id,
                    models.Event.external_event_id == external_id,
                )
                .first()
            )

            if existing_event:
        
                existing_event.title = assignment["title"]
                existing_event.description = assignment["description"]
                existing_event.start_at = assignment["start_at"]
                existing_event.end_at = assignment["end_at"]
                existing_event.location = assignment.get("location")
                existing_event.all_day = assignment.get("all_day", False)
                existing_event.updated_at = datetime.utcnow()
                updated_count += 1
            else:

                new_event = models.Event(
                    user_id=user.id,
                    title=assignment["title"],
                    description=assignment["description"],
                    start_at=assignment["start_at"],
                    end_at=assignment["end_at"],
                    location=assignment.get("location"),
                    all_day=assignment.get("all_day", False),
                    source=source,
                    external_event_id=external_id,
                )
                db.add(new_event)
                created_count += 1

        except Exception as e:
            print(
                f"[Canvas Sync] Error upserting assignment '{assignment.get('title')}': {str(e)}"
            )
            continue

    db.commit()
    return created_count, updated_count


async def sync_user_canvas(
    db: Session,
    user: models.User,
    canvas_url: str,
    connected_account: models.ConnectedAccount,
) -> dict:


    try:
      
        access_token = await refresh_canvas_token(db, connected_account)
        if not access_token:
            return {
                "status": "error",
                "error": "No valid Canvas token available",
                "synced_count": 0,
                "updated_count": 0,
            }

       
        raw_assignments, user_timezone = await fetch_canvas_assignments(
            db, canvas_url, access_token, user.id
        )

       
        parsed_assignments = []
        for assignment in raw_assignments:
            parsed = parse_canvas_assignment(assignment, user_timezone)
            if parsed:
              
                parsed["external_event_id"] = f"canvas_{assignment.get('id')}"
                parsed_assignments.append(parsed)

       
        created, updated = await upsert_assignments_to_db(
            db, user, parsed_assignments, source="canvas"
        )

        return {
            "status": "success",
            "synced_count": created,
            "updated_count": updated,
        }

    except Exception as e:
        print(f"[Canvas Sync] Error syncing Canvas for user {user.id}: {str(e)}")
        return {
            "status": "error",
            "error": str(e),
            "synced_count": 0,
            "updated_count": 0,
        }


async def sync_all_users_canvas(db: Session, canvas_url: str) -> dict:

    try:
    
        canvas_accounts = (
            db.query(models.ConnectedAccount)
            .filter(models.ConnectedAccount.provider == "canvas")
            .all()
        )

        print(f"[Canvas Sync] Found {len(canvas_accounts)} users with Canvas connected")

        total_synced = 0
        total_updated = 0
        errors = []

        for connected_account in canvas_accounts:
            try:
                user = connected_account.user
                print(f"[Canvas Sync] Syncing Canvas for user {user.email}")

                result = await sync_user_canvas(db, user, canvas_url, connected_account)

                if result["status"] == "success":
                    total_synced += result.get("synced_count", 0)
                    total_updated += result.get("updated_count", 0)
                    print(
                        f"[Canvas Sync] ✓ Synced {result.get('synced_count', 0)} new, updated {result.get('updated_count', 0)} for {user.email}"
                    )
                else:
                    errors.append(
                        f"{user.email}: {result.get('error', 'Unknown error')}"
                    )
                    print(
                        f"[Canvas Sync] ✗ Error for {user.email}: {result.get('error')}"
                    )

            except Exception as e:
                error_msg = f"User {connected_account.user.email}: {str(e)}"
                errors.append(error_msg)
                print(f"[Canvas Sync] ✗ {error_msg}")

        return {
            "status": "success" if not errors else "partial",
            "total_synced": total_synced,
            "total_updated": total_updated,
            "errors": errors,
        }

    except Exception as e:
        print(f"[Canvas Sync] Fatal error in batch sync: {str(e)}")
        return {
            "status": "error",
            "total_synced": 0,
            "total_updated": 0,
            "errors": [str(e)],
        }
