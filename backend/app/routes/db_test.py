from fastapi import APIRouter, Depends
from sqlalchemy import text
from app.db.session import get_db

router = APIRouter()

@router.get("/db-test")
def db_test(db=Depends(get_db)):
    result = db.execute(text("SELECT NOW()")).fetchone()
    return {"database_time": str(result[0])}
