#James Acacio - Database connection and initialization

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

Base = declarative_base()

# These are initialized lazily via _ensure_engine() so the app
# doesn't crash at import time when DATABASE_URL is not yet available.
engine = None
SessionLocal = None


def _get_database_url() -> str:
    url = os.getenv("DATABASE_URL")
    if not url:
        raise ValueError("DATABASE_URL environment variable is not set")
    # Normalise Heroku / AWS-style postgres:// to SQLAlchemy-compatible form.
    # Use psycopg (v3) driver explicitly.
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def _ensure_engine():
    global engine, SessionLocal
    if engine is None:
        engine = create_engine(_get_database_url())
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Dependency to get DB session
def get_db():
    _ensure_engine()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Function to initialize the database (create tables), called at app startup
def init_db():
    from app.database import models  

    _ensure_engine()
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    _migrate_users_table_for_cognito()
    _migrate_users_table_for_profile_picture()
    _migrate_tasks_table_for_metadata()
    _migrate_events_table_for_metadata()

# This function adds new columns to the users table for Cognito integration, such as cognito_sub and created_at. It also makes the existing hashed_password column nullable since we won't be using it for Cognito users. 
def _migrate_users_table_for_cognito() -> None:
    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    if "users" not in table_names:
        return

    columns = {column["name"]: column for column in inspector.get_columns("users")}
    with engine.begin() as conn:
        if "created_at" not in columns:
            conn.execute(
                text(
                    "ALTER TABLE users ADD COLUMN created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()"
                )
            )
        if "cognito_sub" not in columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN cognito_sub VARCHAR NULL"))
        hashed_password_col = columns.get("hashed_password")
        if hashed_password_col and not hashed_password_col.get("nullable", True):
            conn.execute(text("ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL"))
        conn.execute(
            text("CREATE INDEX IF NOT EXISTS ix_users_cognito_sub ON users (cognito_sub)")
        )


def _migrate_users_table_for_profile_picture() -> None:
    # Adds profile picture columns to existing user tables.
    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    if "users" not in table_names:
        return

    columns = {column["name"]: column for column in inspector.get_columns("users")}
    binary_type = "BLOB" if engine.dialect.name == "sqlite" else "BYTEA"
    with engine.begin() as conn:
        if "profile_picture_data" not in columns:
            conn.execute(
                text(f"ALTER TABLE users ADD COLUMN profile_picture_data {binary_type} NULL")
            )
        if "profile_picture_content_type" not in columns:
            conn.execute(
                text("ALTER TABLE users ADD COLUMN profile_picture_content_type VARCHAR NULL")
            )
        if "profile_picture_updated_at" not in columns:
            conn.execute(
                text("ALTER TABLE users ADD COLUMN profile_picture_updated_at TIMESTAMP NULL")
            )


# These functions add new columns to the tasks and events tables for metadata like tags, colors, priorities, statuses, due dates/times, etc. They check if the columns already exist before trying to add them, so they can be safely run on an existing database without causing errors. This allows us to evolve the database schema over time as we add new features that require additional metadata on tasks and events.
def _migrate_tasks_table_for_metadata() -> None:
    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    if "tasks" not in table_names:
        return

    columns = {column["name"]: column for column in inspector.get_columns("tasks")}
    with engine.begin() as conn:
        if "tag" not in columns:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN tag VARCHAR NULL"))
        if "color" not in columns:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN color VARCHAR NULL"))
        if "priority" not in columns:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN priority INTEGER NULL DEFAULT 1"))
        if "status" not in columns:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN status VARCHAR NOT NULL DEFAULT 'todo'"))
        if "due_date" not in columns:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN due_date DATE NULL"))
        if "due_time" not in columns:
            conn.execute(text("ALTER TABLE tasks ADD COLUMN due_time TIME NULL"))

# Similar to the tasks table migration, this function adds new columns to the events table for metadata like all_day, recurrence, location, and status. 
def _migrate_events_table_for_metadata() -> None:
    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    if "events" not in table_names:
        return

    columns = {column["name"]: column for column in inspector.get_columns("events")}
    with engine.begin() as conn:
        if "all_day" not in columns:
            conn.execute(text("ALTER TABLE events ADD COLUMN all_day BOOLEAN NOT NULL DEFAULT FALSE"))
        if "recurrence" not in columns:
            conn.execute(text("ALTER TABLE events ADD COLUMN recurrence VARCHAR NOT NULL DEFAULT 'none'"))
        if "location" not in columns:
            conn.execute(text("ALTER TABLE events ADD COLUMN location VARCHAR NULL"))
        if "status" not in columns:
            conn.execute(text("ALTER TABLE events ADD COLUMN status VARCHAR NOT NULL DEFAULT 'scheduled'"))
