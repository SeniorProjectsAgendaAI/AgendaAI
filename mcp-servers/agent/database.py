# Database utilities for agent to fetch user OAuth tokens
import os

from cryptography.fernet import Fernet
from dotenv import load_dotenv
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.types import TypeDecorator

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+psycopg://agendaai:agendaai@localhost:5432/agendaai"
)
SECRET_KEY = os.getenv("SECRET_KEY")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


class EncryptedString(TypeDecorator):
    impl = String
    cache_ok = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if not SECRET_KEY:
            raise ValueError("SECRET_KEY environment variable must be set")
        self.fernet = Fernet(SECRET_KEY.encode())

    def process_bind_param(self, value, dialect):
        if value is not None:
            return self.fernet.encrypt(value.encode()).decode()
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            return self.fernet.decrypt(value.encode()).decode()
        return value


class ConnectedAccount(Base):
    __tablename__ = "connected_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        String, ForeignKey("users.cognito_sub"), nullable=False, index=True
    )
    provider = Column(String, nullable=False)
    access_token = Column(EncryptedString(500), nullable=False)
    refresh_token = Column(EncryptedString(500), nullable=True)
    expires_at = Column(DateTime, nullable=True)
    scopes = Column(String, nullable=True)
    provider_user_id = Column(String, nullable=True)


def get_user_google_calendar_token(cognito_sub: str) -> dict:
    """Get Google Calendar access token for a user."""
    db = SessionLocal()
    try:
        account = (
            db.query(ConnectedAccount)
            .filter(
                ConnectedAccount.user_id == cognito_sub,
                ConnectedAccount.provider == "google_calendar",
            )
            .first()
        )

        if not account:
            return None

        return {
            "access_token": account.access_token,
            "refresh_token": account.refresh_token,
            "expires_at": (
                account.expires_at.isoformat() if account.expires_at else None
            ),
            "scopes": account.scopes.split(",") if account.scopes else [],
        }
    finally:
        db.close()


def get_user_gmail_token(cognito_sub: str) -> dict:
    """Get Gmail access token for a user."""
    db = SessionLocal()
    try:
        account = (
            db.query(ConnectedAccount)
            .filter(
                ConnectedAccount.user_id == cognito_sub,
                ConnectedAccount.provider == "gmail",
            )
            .first()
        )

        if not account:
            return None

        return {
            "access_token": account.access_token,
            "refresh_token": account.refresh_token,
            "expires_at": (
                account.expires_at.isoformat() if account.expires_at else None
            ),
            "scopes": account.scopes.split(",") if account.scopes else [],
        }
    finally:
        db.close()
