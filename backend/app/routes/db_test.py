#James Acacio - Simple endpoint used to verify database connectivity and query execution

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.session import get_db

router = APIRouter(tags=["DB Test"])


@router.get("/db-test")
def db_test(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT NOW()")).fetchone()
    return {"database_time": str(result[0])}
