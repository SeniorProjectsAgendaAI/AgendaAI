#James Acacio - Database models for Users and Tasks
import os
from datetime import datetime

from app.database.database import Base
from cryptography.fernet import Fernet
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.types import TypeDecorator


#added encrypted string type for storing sensitive tokens
class EncryptedString(TypeDecorator):
    impl = String
    cache_ok = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        secret_key = os.getenv("SECRET_KEY")
        if not secret_key:
            raise ValueError("SECRET_KEY environment variable must be set")
        #make sure the key is a valid Fernet key (44 characters, base64 encoded)
        self.fernet = Fernet(secret_key.encode())

    def process_bind_param(self, value, dialect):
        if value is not None:
            return self.fernet.encrypt(value.encode()).decode()
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            return self.fernet.decrypt(value.encode()).decode()
        return value


#user stored in database with hashed password and relationship to tasks
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)
    cognito_sub = Column(String, unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")
    connected_accounts = relationship(
        "ConnectedAccount", back_populates="user", cascade="all, delete-orphan"
    )


#Connected external accounts (Google calendar, Gmail ,Canvas)
class ConnectedAccount(Base):
    __tablename__ = "connected_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.cognito_sub"), nullable=False)
    provider = Column(String, nullable=False)  # e.g., "google_calendar"
    access_token = Column(EncryptedString(500), nullable=False)
    refresh_token = Column(EncryptedString(500), nullable=True)
    expires_at = Column(DateTime, nullable=True)
    scopes = Column(String, nullable=True)
    provider_user_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="connected_accounts")


#user task created by user with title, description, completion status, and timestamp
class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    completed = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="tasks")
