"""
Chat routes: topic listing, starting an interview session, and
exchanging messages with the local Ollama LLM for evaluation.
"""

import os
import random
import re

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, Question, InterviewSession, Message
from routes.auth import get_current_user

router = APIRouter(prefix="/api/chat", tags=["chat"])

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")

# Topics available in the app, and which ones the free tier can access.
ALL_TOPICS = ["DSA", "OS", "DBMS", "OOP", "CN"]
FREE_TOPICS = ["DSA", "OOP", "CN"]

SYSTEM_PROMPT = (
    "You are a technical interview evaluator. Ask one interview question at a time "
    "from the given topic. When the user answers, evaluate it, give a score from 1 to 10, "
    "briefly explain what was good and what was missing, then ask the next question. "
    "Keep responses short, clear, and encouraging. "
    "Always include the score in the exact format 'Score: X/10' on its own line."
)


# --- Schemas ----------------------------------------------------
class StartSessionRequest(BaseModel):
    topic: str


class StartSessionResponse(BaseModel):
    session_id: int
    topic: str
    question: str


class SendMessageRequest(BaseModel):
    session_id: int
    content: str


class SendMessageResponse(BaseModel):
    reply: str
    score: int | None = None


# --- Helpers ------------------------------------------------------
def extract_score(text: str) -> int | None:
    """Pull a 1-10 score out of the model's reply, e.g. 'Score: 7/10'."""
    match = re.search(r"(\d{1,2})\s*/\s*10", text)
    if not match:
        return None
    score = int(match.group(1))
    return max(1, min(10, score))


async def call_ollama(messages: list[dict]) -> str:
    payload = {"model": OLLAMA_MODEL, "messages": messages, "stream": False}
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(f"{OLLAMA_URL}/api/chat", json=payload)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=503,
                detail=f"Could not reach Ollama at {OLLAMA_URL}. Is it running? ({exc})",
            )
    data = response.json()
    return data["message"]["content"]


def get_owned_session(session_id: int, user: User, db: Session) -> InterviewSession:
    session = (
        db.query(InterviewSession)
        .filter(InterviewSession.id == session_id, InterviewSession.user_id == user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


# --- Routes ----------------------------------------------------
@router.get("/topics")
def list_topics(current_user: User = Depends(get_current_user)):
    return [
        {"topic": topic, "locked": current_user.plan == "free" and topic not in FREE_TOPICS}
        for topic in ALL_TOPICS
    ]


@router.post("/start", response_model=StartSessionResponse)
def start_session(
    payload: StartSessionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    topic = payload.topic
    if topic not in ALL_TOPICS:
        raise HTTPException(status_code=400, detail="Unknown topic")
    if current_user.plan == "free" and topic not in FREE_TOPICS:
        raise HTTPException(status_code=403, detail="Upgrade to Pro to access this topic")

    questions = db.query(Question).filter(Question.topic == topic).all()
    if not questions:
        raise HTTPException(status_code=404, detail="No questions found for this topic")
    first_question = random.choice(questions).question_text

    session = InterviewSession(user_id=current_user.id, topic=topic)
    db.add(session)
    db.commit()
    db.refresh(session)

    bot_message = Message(session_id=session.id, role="bot", content=first_question)
    db.add(bot_message)
    db.commit()

    return StartSessionResponse(session_id=session.id, topic=topic, question=first_question)


@router.post("/message", response_model=SendMessageResponse)
async def send_message(
    payload: SendMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = get_owned_session(payload.session_id, current_user, db)

    user_message = Message(session_id=session.id, role="user", content=payload.content)
    db.add(user_message)
    db.commit()

    history = (
        db.query(Message)
        .filter(Message.session_id == session.id)
        .order_by(Message.id.asc())
        .all()
    )

    ollama_messages = [{"role": "system", "content": f"{SYSTEM_PROMPT} The interview topic is {session.topic}."}]
    for msg in history:
        role = "assistant" if msg.role == "bot" else "user"
        ollama_messages.append({"role": role, "content": msg.content})

    reply = await call_ollama(ollama_messages)
    score = extract_score(reply)

    bot_message = Message(session_id=session.id, role="bot", content=reply, score=score)
    db.add(bot_message)
    db.commit()

    return SendMessageResponse(reply=reply, score=score)
