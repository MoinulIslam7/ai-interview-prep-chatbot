# AI Interview Prep Chatbot — Technical Documentation

## 1. Overview

The AI Interview Prep Chatbot is a web application that runs mock
technical interviews. A user picks a topic, the system asks one
question at a time, the user types an answer, and a locally-hosted
LLM (via [Ollama](https://ollama.com)) evaluates the answer — giving
a score from 1 to 10 and short feedback — before asking the next
question. All accounts, sessions, and message history are stored in
a centralized MySQL database, and the app is fully web-based (any
modern browser, no installation beyond the standard dev tooling).

No paid API is used anywhere in the system: the LLM runs locally via
Ollama, and there is no third-party auth or payment provider.

## 2. System Architecture

```
┌─────────────────┐        HTTP/JSON (axios)        ┌──────────────────┐
│  React Frontend  │ ───────────────────────────────▶│  FastAPI Backend │
│  (Vite, port     │◀─────────────────────────────── │  (port 8000)     │
│   5173)          │        JWT-authenticated          └───────┬──────────┘
└─────────────────┘                                            │
                                                                │ SQLAlchemy / PyMySQL
                                                                ▼
                                                        ┌──────────────────┐
                                                        │  MySQL Database  │
                                                        │ interview_prep_  │
                                                        │    chatbot       │
                                                        └──────────────────┘

FastAPI Backend also talks to:

┌──────────────────┐        HTTP (httpx, async)       ┌──────────────────┐
│  FastAPI Backend │ ───────────────────────────────▶ │  Ollama Server   │
│                  │◀─────────────────────────────── │  (localhost:11434)│
└──────────────────┘        POST /api/chat            │  model: llama3   │
                                                        └──────────────────┘
```

- The **frontend** never talks to MySQL or Ollama directly — it only
  calls the FastAPI backend over REST/JSON.
- The **backend** is the only component that talks to MySQL (via
  SQLAlchemy + PyMySQL) and to Ollama (via `httpx`, async).
- Authentication is stateless: the backend issues a JWT on
  register/login, and the frontend sends it as a `Bearer` token on
  every subsequent request. No server-side session store is used.

## 3. Tech Stack

| Layer      | Technology | Notes |
|------------|-----------|-------|
| Frontend   | React 18 + Vite | Fast dev server, ES modules |
| Styling    | Tailwind CSS | Utility-first, minimal custom CSS |
| Routing    | React Router v6 (`createBrowserRouter`) | Client-side routing + a simple auth guard |
| HTTP client| Axios | Single shared instance with a JWT-attaching interceptor |
| Backend    | FastAPI (Python) | Async-capable, auto-generated OpenAPI docs at `/docs` |
| ORM        | SQLAlchemy 2.x | Declarative models, session-per-request |
| DB driver  | PyMySQL | Pure-Python MySQL driver (+ `cryptography` for `caching_sha2_password` auth) |
| Auth       | `python-jose` (JWT) + `passlib`/`bcrypt` (password hashing) | See §7 for a version-pinning caveat |
| LLM        | Ollama, `llama3` model | Called via `httpx.AsyncClient`, no API key |
| Database   | MySQL 8.x | Centralized, single schema (`interview_prep_chatbot`) |

## 4. Database Design

Four tables, defined in [database.sql](database.sql):

```
users                    sessions                  messages
─────                    ────────                  ────────
id (PK)                  id (PK)                    id (PK)
name                      user_id (FK -> users.id)  session_id (FK -> sessions.id)
email (unique)            topic                      role (user | bot)
password_hash             started_at                 content
plan (free | pro)                                    score (nullable, 1-10)
created_at                                            created_at

questions
─────────
id (PK)
topic
question_text
```

Relationships:
- `users 1 --- N sessions` (`ON DELETE CASCADE`)
- `sessions 1 --- N messages` (`ON DELETE CASCADE`)
- `questions` is a standalone bank, not linked by foreign key — a
  question is picked at random per topic when a session starts, and
  its text is copied into the first `messages` row rather than
  referenced by ID. This keeps the transcript self-contained even if
  the question bank changes later.

Sample data: `database.sql` seeds 8 questions each for DSA, OS, DBMS,
OOP, and CN (40 total).

## 5. Backend Structure

```
backend/
├── main.py            FastAPI app: CORS, router registration, table creation on startup
├── database.py         SQLAlchemy engine/session factory, reads DB_* env vars
├── models.py           ORM models: User, Question, InterviewSession, Message
└── routes/
    ├── auth.py         /api/auth/* — register, login, get_current_user dependency
    ├── chat.py         /api/chat/* — topics, start session, send message (calls Ollama)
    └── history.py      /api/history/* — list sessions, view a session transcript
```

`main.py` calls `Base.metadata.create_all(bind=engine)` on startup,
so tables are (re-)created automatically if missing — but the schema
and sample questions should still be imported from `database.sql`
first, since `create_all` does not insert seed data.

## 6. Frontend Structure

```
frontend/src/
├── main.jsx             React entry point
├── App.jsx              Renders <RouterProvider>
├── router/index.jsx     Route table + ProtectedRoute (redirects to /login if no JWT)
├── api/client.js         Axios instance: baseURL + Authorization header interceptor
├── components/Navbar.jsx
└── pages/
    ├── Login.jsx         POST /api/auth/login, stores JWT + user in localStorage
    ├── Register.jsx      POST /api/auth/register
    ├── Topics.jsx        GET /api/chat/topics, shows locked/unlocked topic cards
    ├── Chat.jsx           POST /api/chat/start, then POST /api/chat/message per turn
    ├── History.jsx        GET /api/history/sessions and /sessions/{id}
    └── Pricing.jsx         Static Free vs Pro comparison (no backend calls)
```

State is kept local to each page (`useState`/`useEffect`) — there is
no global state manager (Redux/Zustand). The JWT and logged-in user
object live in `localStorage`, read by the axios interceptor and the
route guard.

## 7. Authentication & Security

- **Password storage:** bcrypt hash via `passlib.CryptContext`, never
  stored or logged in plaintext.
- **Session/auth:** stateless JWT (`python-jose`, HS256), signed with
  `JWT_SECRET_KEY` from `backend/.env`, 24-hour expiry. Sent as
  `Authorization: Bearer <token>` and validated per-request by the
  `get_current_user` FastAPI dependency in `routes/auth.py`.
- **CORS:** restricted to `http://localhost:5173` (the Vite dev
  server) in `main.py` — update `allow_origins` if deploying the
  frontend elsewhere.
- **Version-pinning caveat:** `passlib==1.7.4` (the latest release)
  predates `bcrypt`'s 4.1+ API changes and breaks against modern
  `bcrypt` — it either throws `AttributeError: module 'bcrypt' has no
  attribute '__about__'` or, worse, a passlib-internal self-test
  raises `ValueError: password cannot be longer than 72 bytes`,
  causing every register/login call to fail after a long hang.
  `requirements.txt` pins `bcrypt==4.0.1` to avoid this; if a fresh
  `pip install` ever resolves a newer `bcrypt`, re-pin it explicitly
  (`pip install "bcrypt==4.0.1"`) and restart the server — `--reload`
  does not pick up dependency/venv changes, only source file changes.

## 8. LLM Integration (Ollama)

- Endpoint called: `POST {OLLAMA_URL}/api/chat` (default
  `http://localhost:11434`), model `llama3`, `stream: false`.
- The **first question** of a session is *not* generated by the LLM —
  it's picked at random from the `questions` table for the chosen
  topic (`routes/chat.py: start_session`). This guarantees a
  deterministic, on-topic opening question even before any model
  call happens.
- Every subsequent turn (`POST /api/chat/message`) sends the **full
  message history** for that session to Ollama, prefixed by a system
  prompt:
  > "You are a technical interview evaluator. Ask one interview
  > question at a time from the given topic. When the user answers,
  > evaluate it, give a score from 1 to 10, briefly explain what was
  > good and what was missing, then ask the next question. Keep
  > responses short, clear, and encouraging."

  One line is appended to this exact prompt (not altering its
  intent): an instruction to always output the score as `Score:
  X/10` on its own line. This is required because the backend parses
  the numeric score back out of the model's free-text reply with a
  regex (`extract_score` in `routes/chat.py`, pattern `(\d{1,2})\s*/\s*10`,
  clamped to 1–10). Without a consistent format, score extraction
  would be unreliable.
- Because there is no fixed schema for LLM output, `extract_score`
  returns `None` if no `X/10` pattern is found — the frontend then
  simply omits the score badge for that message rather than erroring.

## 9. Free vs Pro Tier Logic

Defined once in `backend/routes/chat.py`:

```python
ALL_TOPICS  = ["DSA", "OS", "DBMS", "OOP", "CN"]
FREE_TOPICS = ["DSA", "OOP", "CN"]
```

- `GET /api/chat/topics` returns every topic with a `locked` flag
  (`true` when `plan == "free"` and the topic isn't in
  `FREE_TOPICS`). The frontend disables locked topic cards and shows
  a "Pro only" badge.
- `POST /api/chat/start` re-checks this server-side and returns
  `403 Forbidden` if a free-tier user tries to start a locked topic —
  the frontend lock is UX only, not the actual access control.
- The Pricing page (`Pricing.jsx`) is purely informational: it lists
  the same tier breakdown but has no payment integration — the
  "Upgrade" button is disabled by design.
- Upgrading a user's `plan` column (`free` → `pro`) currently has no
  UI; it would need to be done directly in the `users` table (e.g.
  via `UPDATE users SET plan = 'pro' WHERE email = '...'`) until a
  real billing flow is added.

## 10. Typical Request Flow (one interview turn)

1. User opens `/chat/DSA` → `Chat.jsx` calls
   `POST /api/chat/start {topic: "DSA"}`.
2. Backend creates a row in `sessions`, picks a random DSA question,
   inserts it as the first `messages` row (`role="bot"`), and returns
   `{session_id, topic, question}`.
3. User types an answer → `Chat.jsx` calls
   `POST /api/chat/message {session_id, content}`.
4. Backend inserts the user's answer as a `messages` row, loads the
   full transcript for that session, prepends the system prompt, and
   calls Ollama.
5. Ollama's reply is parsed for a `Score: X/10` pattern, stored as a
   new `messages` row (`role="bot"`, with `score`), and returned to
   the frontend, which appends it to the chat with a score badge.
6. Steps 3–5 repeat for as many questions as the user wants to
   answer; there's no fixed session length — the user ends it by
   navigating away ("End session" link).

## 11. Known Limitations

- No refresh-token/rotation flow — JWTs simply expire after 24 hours
  and the user must log in again.
- No rate limiting on Ollama calls; a slow/loaded local model will
  make `POST /api/chat/message` slow (it awaits the full response).
- Score parsing depends on the LLM following the requested `Score:
  X/10` format; smaller/uncooperative models may occasionally omit
  it, in which case the message is stored without a score.
- No password-reset flow.
- Plan upgrades (free → pro) have no UI and must be done directly in
  the database.
- Single MySQL database, no migrations tool (schema changes must be
  applied manually via SQL).

## 12. Setup & Troubleshooting

See [README.md](README.md) for step-by-step installation, environment
variables, and a troubleshooting section covering the issues
encountered during initial setup (MySQL `auth_socket` root access,
schema import path, running `uvicorn` from the wrong directory, and
the `passlib`/`bcrypt` version incompatibility).
