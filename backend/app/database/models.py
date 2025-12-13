# James Acacio - Database models for Users and Tasks
from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship

from app.database.database import Base

#user stored in database with hashed password and relationship to tasks
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    tasks = relationship(
        "Task",
        back_populates="user",
        cascade="all, delete-orphan"
    )

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
