from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.routes.db_test import router as db_test_router
import os
from app.routes.health import router as health_router

#load all the env variables from a .env file
load_dotenv() 

app = FastAPI()

origins = ["http://localhost:3000", "http://127.0.0.1:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(db_test_router)
app.include_router(health_router)

# later: include_router(events_router)
