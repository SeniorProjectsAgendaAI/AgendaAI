from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# DB init
from app.database.database import init_db

# Routes
from app.routes.auth import router as auth_router
from app.routes.users import router as user_router
from app.routes.tasks import router as task_router
from app.routes.db_test import router as db_test_router
from app.routes.health import router as health_router

load_dotenv()

app = FastAPI()


# -------- ROOT ROUTE --------
@app.get("/")
def home():
    return {"status": "ok", "message": "Backend is running"}


# -------- STARTUP EVENT --------
@app.on_event("startup")
def startup_event():
    print("Initializing database tables...")
    init_db()


# -------- CORS CONFIG --------
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://dashboard.d2i3jqbsdy4snq.amplifyapp.com/",
    "https://*.amplifyapp.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------- ROUTERS --------
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(task_router)
app.include_router(db_test_router)
app.include_router(health_router)
