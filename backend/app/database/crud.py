#James Acacio - User database helper functions

from sqlalchemy.orm import Session
from app.database import models, schemas
from app.services.security import hash_password


#function for creating a new user and hashing the provided password

def create_user(db: Session, user: schemas.UserCreate):
    hashed_pw = hash_password(user.password)
    db_user = models.User(
        email=user.email,
        name=user.name,
        hashed_password=hashed_pw
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

#retrieve user from the database via their email, used during authentication and account lookup
def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

#retrieves user fromdatabase bia their user ID
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

#Task Database functions

#function for creating, retrieving, and deleting a user's tasks
def create_task(db: Session, task: schemas.TaskCreate, user_id: int):
    db_task = models.Task(
        title=task.title,
        description=task.description,
        user_id=user_id
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task

#Retrieve all tasks belonging to a specific user
def get_tasks(db: Session, user_id: int):
    return db.query(models.Task).filter(models.Task.user_id == user_id).all()

#user can delete a task 
def delete_task(db: Session, task_id: int, user_id: int):
    task = db.query(models.Task).filter(
        models.Task.id == task_id,
        models.Task.user_id == user_id
    ).first()

    if task:
        db.delete(task)
        db.commit()
        return True
    return False
