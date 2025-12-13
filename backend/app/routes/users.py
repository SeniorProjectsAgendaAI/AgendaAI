#James Acacio - Routes for user operations such as retrieving current user info
from fastapi import APIRouter, Depends

from app.database import models
from app.services.auth_utils import get_current_user

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "created_at": current_user.created_at,
    }
