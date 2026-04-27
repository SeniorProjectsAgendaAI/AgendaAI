# Routes for user-related endpoints.
from datetime import datetime
from io import BytesIO

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import models
from app.database.session import get_db
from app.services.auth_utils import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])
MAX_PROFILE_PICTURE_BYTES = 2 * 1024 * 1024
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


# Returns the currently logged-in user's basic account information.
@router.get("/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "created_at": current_user.created_at,
    }


@router.get("/me/profile-picture")
def get_profile_picture(current_user: models.User = Depends(get_current_user)):
    # Returns the saved PNG profile picture for the current user.
    if not current_user.profile_picture_data:
        raise HTTPException(status_code=404, detail="Profile picture not found")

    return StreamingResponse(
        BytesIO(current_user.profile_picture_data),
        media_type=current_user.profile_picture_content_type or "image/png",
        headers={"Cache-Control": "private, max-age=300"},
    )


@router.put("/me/profile-picture")
async def update_profile_picture(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Saves a PNG profile picture for the current user.
    if file.content_type != "image/png":
        raise HTTPException(status_code=400, detail="Profile picture must be a PNG file")

    image_data = await file.read()
    if not image_data:
        raise HTTPException(status_code=400, detail="Profile picture file is empty")
    if len(image_data) > MAX_PROFILE_PICTURE_BYTES:
        raise HTTPException(
            status_code=400,
            detail="Profile picture must be 2 MB or smaller",
        )
    if not image_data.startswith(PNG_SIGNATURE):
        raise HTTPException(status_code=400, detail="Profile picture must be a valid PNG file")

    try:
        current_user.profile_picture_data = image_data
        current_user.profile_picture_content_type = "image/png"
        current_user.profile_picture_updated_at = datetime.utcnow()
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to save profile picture")

    return {"message": "Profile picture updated"}


# Permanently deletes the current user's AgendaAI data.
@router.delete("/me")
def delete_me(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Deletes account-owned tasks, events, connected accounts, and the user row.
    try:
        deleted_tasks = (
            db.query(models.Task)
            .filter(models.Task.user_id == current_user.id)
            .delete(synchronize_session=False)
        )
        deleted_events = (
            db.query(models.Event)
            .filter(models.Event.user_id == current_user.id)
            .delete(synchronize_session=False)
        )

        deleted_connected_accounts = 0
        if current_user.cognito_sub:
            deleted_connected_accounts = (
                db.query(models.ConnectedAccount)
                .filter(models.ConnectedAccount.user_id == current_user.cognito_sub)
                .delete(synchronize_session=False)
            )

        db.delete(current_user)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete account")

    return {
        "message": "Account deleted",
        "deleted": {
            "tasks": deleted_tasks,
            "events": deleted_events,
            "connected_accounts": deleted_connected_accounts,
        },
    }
