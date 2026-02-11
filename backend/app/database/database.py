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


def _migrate_users_table_for_cognito() -> None:
    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    if "users" not in table_names:
        return

    columns = {column["name"]: column for column in inspector.get_columns("users")}
    with engine.begin() as conn:
        if "cognito_sub" not in columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN cognito_sub VARCHAR NULL"))
        hashed_password_col = columns.get("hashed_password")
        if hashed_password_col and not hashed_password_col.get("nullable", True):
            conn.execute(text("ALTER TABLE users ALTER COLUMN hashed_password DROP NOT NULL"))
        conn.execute(
            text("CREATE INDEX IF NOT EXISTS ix_users_cognito_sub ON users (cognito_sub)")
        )
