#James Acacio - Routes for managing tasks (create, read, update, delete) for authenticated users

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database import models
from app.schemas.tasks import TaskCreate, TaskUpdate, TaskResponse
from app.services.auth_utils import get_current_user

router = APIRouter(prefix="/tasks", tags=["Tasks"])


# create a new task
@router.post("/", response_model=TaskResponse)
def create_task(
    task: TaskCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    new_task = models.Task(
        title=task.title,
        description=task.description,
        user_id=user.id,
    )

    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    return new_task


# tasks for current user
@router.get("/", response_model=list[TaskResponse])
def get_tasks(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return db.query(models.Task).filter(models.Task.user_id == user.id).all()


# update task
@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    updates: TaskUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    task = (
        db.query(models.Task)
        .filter(models.Task.id == task_id, models.Task.user_id == user.id)
        .first()
    )

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if updates.title is not None:
        task.title = updates.title
    if updates.description is not None:
        task.description = updates.description
    if updates.completed is not None:
        task.completed = updates.completed

    db.commit()
    db.refresh(task)

    return task


# delete tasks
@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    task = (
        db.query(models.Task)
        .filter(models.Task.id == task_id, models.Task.user_id == user.id)
        .first()
    )

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()

    return {"message": "Task deleted"}
