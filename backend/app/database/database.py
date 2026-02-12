#James Acacio - Database connection and initialization

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

# Load database URL from environment variable
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL is missing in .env")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Function to initialize the database (create tables), called at app startup
def init_db():
    from app.database import models  

    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    _migrate_users_table_for_cognito()
    _migrate_tasks_table_for_metadata()
    _migrate_events_table_for_metadata()


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
