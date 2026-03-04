import time 
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables FIRST before any other imports
load_dotenv()

# DB init
from app.database.database import init_db

# Routes
from app.routes.auth import router as auth_router
from app.routes.db_test import router as db_test_router
from app.routes.events import router as event_router
from app.routes.gmail_oauth import router as gmail_oauth_router
from app.routes.google_calendar_oauth import router as google_calendar_oauth_router
from app.routes.health import router as health_router
from app.routes.tasks import router as task_router
from app.routes.users import router as user_router
from app.routes.canvas_oauth import router as canvas_oauth_router

app = FastAPI()

# -------- CORS CONFIG --------
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://main.d2i3jqbsdy4snq.amplifyapp.com",
    "https://dev.d2i3jqbsdy4snq.amplifyapp.com",
    "https://creating-dockerfile.d2i3jqbsdy4snq.amplifyapp.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    # allow_origin_regex=r"https://.*\.d2i3jqbsdy4snq\.amplifyapp\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------- ROOT ROUTE --------
@app.get("/")
def home():
    return {"status": "ok", "message": "Backend is running"}


# -------- STARTUP EVENT --------
@app.on_event("startup")
def startup_event():
    print("Initializing database tables...")
    for i in range(5):
        try:
            init_db()
            print("Database tables initialized successfullly")
            return 
        except Exception as e:
            print(f"Database connection failed (attempt {i+1}/5): {e}")
            time.sleep(5)
        
    print("Could not connect to database after 5 attempts. Exiting.")
    raise SystemExit(1)


# -------- ROUTERS --------
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(task_router)
app.include_router(event_router)
app.include_router(db_test_router)
app.include_router(health_router)
app.include_router(google_calendar_oauth_router)
app.include_router(gmail_oauth_router)
app.include_router(canvas_oauth_router)