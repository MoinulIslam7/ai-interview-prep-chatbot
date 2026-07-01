"""
FastAPI application entry point.
Run with: uvicorn main:app --reload
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
import models  # noqa: F401 - ensures models are registered before create_all
from routes import auth, chat, history

# Create tables if they don't already exist (database.sql also does this).
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Interview Prep Chatbot API")

# In production (Vercel services) the frontend calls /api/* on the same
# domain, so browsers treat it as same-origin and CORS doesn't apply. This
# list only matters when the frontend is served from a different origin
# (e.g. local dev on :5173, or a standalone deployment).
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(history.router)


@app.get("/")
def root():
    return {"status": "ok", "message": "AI Interview Prep Chatbot API is running"}
