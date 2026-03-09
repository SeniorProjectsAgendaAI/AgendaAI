#James Acacio - Routes for managing tasks (create, read, update, delete) for authenticated users

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database import models
from app.schemas.tasks import TaskCreate, TaskUpdate, TaskResponse
from app.services.auth_utils import get_current_user

router = APIRouter(prefix="/tasks", tags=["Tasks"])
ALLOWED_TASK_STATUSES = {"todo", "in_progress", "done"}


# create a new task
@router.post("/", response_model=TaskResponse)
@router.post("", response_model=TaskResponse)
def create_task(
    task: TaskCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if task.status and task.status not in ALLOWED_TASK_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid task status")

    new_task = models.Task(
        title=task.title,
        description=task.description,
        tag=task.tag,
        color=task.color,
        priority=task.priority,
        status=task.status or "todo",
        due_date=task.due_date,
        due_time=task.due_time,
        user_id=user.id,
    )

    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    return new_task


# tasks for current user
@router.get("/", response_model=list[TaskResponse])
@router.get("", response_model=list[TaskResponse])
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
    if updates.tag is not None:
        task.tag = updates.tag
    if updates.color is not None:
        task.color = updates.color
    if updates.priority is not None:
        task.priority = updates.priority
    if updates.status is not None:
        if updates.status not in ALLOWED_TASK_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid task status")
        task.status = updates.status
    if updates.due_date is not None:
        task.due_date = updates.due_date
    if updates.due_time is not None:
        task.due_time = updates.due_time
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
