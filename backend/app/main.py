import os

from dotenv import find_dotenv, load_dotenv

dotenv_path = find_dotenv()
print(f"[DEBUG main.py] CWD={os.getcwd()}, find_dotenv()={repr(dotenv_path)}")
result = load_dotenv()
print(f"[DEBUG main.py] load_dotenv() returned: {result}")
print(
    f"[DEBUG main.py] GOOGLE_CLIENT_ID after load: {repr(os.getenv('GOOGLE_CLIENT_ID'))}"
)

import asyncio
import time

# DB init
from app.database.database import init_db
from app.database.session import SessionLocal

# Routes
from app.routes.auth import router as auth_router
from app.routes.canvas_oauth import router as canvas_oauth_router
from app.routes.db_test import router as db_test_router
from app.routes.events import router as event_router
from app.routes.gmail_oauth import router as gmail_oauth_router
from app.routes.google_calendar_oauth import router as google_calendar_oauth_router
from app.routes.health import router as health_router
from app.routes.tasks import router as task_router
from app.routes.users import router as user_router
from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()


scheduler = None

# -------- CORS CONFIG --------
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://main.d2i3jqbsdy4snq.amplifyapp.com",
    "https://dev.d2i3jqbsdy4snq.amplifyapp.com",
    "https://creating-dockerfile.d2i3jqbsdy4snq.amplifyapp.com",
]

app.add_middleware(
    CORSMiddleware,
    # Matches localhost:3000 AND any Amplify Gen 2 branch URL
    allow_origin_regex=r"^http://localhost:3000$|^https://[a-zA-Z0-9-]+\.[a-zA-Z0-9]+\.amplifyapp\.com$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------- ROOT ROUTE --------
@app.get("/")
def home():
    return {"status": "ok", "message": "Backend is running"}


# -------- STARTUP EVENT --------
@app.on_event("startup")
def startup_event():
    global scheduler

    print("Initializing database tables...")
    for i in range(5):
        try:
            init_db()
            print("Database tables initialized successfullly")
            break
        except Exception as e:
            print(f"Database connection failed (attempt {i+1}/5): {e}")
            time.sleep(5)
    else:
        print("Could not connect to database after 5 attempts. Exiting.")
        raise SystemExit(1)

    # Start background scheduler for Google Calendar and Canvas sync
    print("Starting background scheduler for syncs...")
    try:
        scheduler = BackgroundScheduler()
        scheduler.add_job(
            sync_google_calendars_job,
            "interval",
            hours=24,
            id="sync_google_calendars",
            name="Sync Google Calendar events every 24 hours",
        )
        scheduler.add_job(
            sync_canvas_assignments_job,
            "interval",
            hours=24,
            id="sync_canvas_assignments",
            name="Sync Canvas assignments every 24 hours",
        )
        scheduler.start()
        print("Background scheduler started successfully")
    except Exception as e:
        print(f"Failed to start background scheduler: {e}")
        # Don't exit here, just log the error - sync can still be triggered manually


# -------- SHUTDOWN EVENT --------
@app.on_event("shutdown")
def shutdown_event():
    global scheduler

    if scheduler:
        print("Shutting down background scheduler...")
        scheduler.shutdown()
        print("Background scheduler stopped")


# -------- BACKGROUND JOBS --------
def sync_google_calendars_job():
    """
    Background job to sync Google Calendar events for all users.
    Runs every 24 hours.
    """
    from app.services.google_calendar_sync import sync_all_users_google_calendars

    print("[Background Job] Starting Google Calendar sync for all users...")
    try:
        db = SessionLocal()
        try:
            # asyncio.run() is needed since sync_all_users_google_calendars is async
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(sync_all_users_google_calendars(db))
            loop.close()

            print(
                f"[Background Job] Google Calendar sync completed: {result['status']}"
            )
            print(
                f"[Background Job] Total synced: {result['total_synced']}, Updated: {result['total_updated']}, Errors: {result['total_errors']}"
            )

            if result.get("errors"):
                for error in result["errors"][:5]:  # Log first 5 errors
                    print(f"[Background Job] Error: {error}")

        finally:
            db.close()
    except Exception as e:
        print(f"[Background Job] Google Calendar sync failed: {str(e)}")


def sync_canvas_assignments_job():
    """
    Background job to sync Canvas assignments for all users.
    Runs every 24 hours.
    """
    from app.services.canvas_sync import sync_all_users_canvas

    print("[Background Job] Starting Canvas assignment sync for all users...")
    try:
        db = SessionLocal()
        try:
            canvas_url = os.getenv("CANVAS_URL", "https://unr.beta.instructure.com")

            # asyncio.run() is needed since sync_all_users_canvas is async
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(sync_all_users_canvas(db, canvas_url))
            loop.close()

            print(f"[Background Job] Canvas sync completed: {result['status']}")
            print(
                f"[Background Job] Total synced: {result['total_synced']}, Updated: {result['total_updated']}"
            )

            if result.get("errors"):
                for error in result["errors"][:5]:  # Log first 5 errors
                    print(f"[Background Job] Error: {error}")

        finally:
            db.close()
    except Exception as e:
        print(f"[Background Job] Canvas sync failed: {str(e)}")


# -------- ROUTERS --------
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(task_router)
app.include_router(event_router)
app.include_router(db_test_router)
app.include_router(health_router)
app.include_router(google_calendar_oauth_router)
app.include_router(gmail_oauth_router)
app.include_router(canvas_oauth_router)
