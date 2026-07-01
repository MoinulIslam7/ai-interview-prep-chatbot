"""
FastAPI application entry point.
Run with: uvicorn main:app --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
import models  # noqa: F401 - ensures models are registered before create_all
from routes import auth, chat, history

# Create tables if they don't already exist (database.sql also does this).
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Interview Prep Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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
