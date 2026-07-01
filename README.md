# AI Interview Prep Chatbot

A university project: a web-based chatbot that runs mock technical
interviews. It asks one question at a time from a chosen topic, the
user answers, and a locally-running LLM (via Ollama) evaluates the
answer, gives a score out of 10 with feedback, then asks the next
question. All data (users, sessions, messages) is stored in a
centralized MySQL database.

## Project Overview

- **Frontend:** React (Vite) + Tailwind CSS + React Router + Axios
- **Backend:** Python FastAPI (JWT authentication, REST API)
- **Database:** MySQL (users, questions, sessions, messages)
- **LLM:** Ollama running locally with the `llama3` model — no paid
  API keys required
- **Topics covered:** DSA, OS, DBMS, OOP, CN
- **Business model UI:** a simple Pricing page shows Free (3 topics)
  vs Pro (all 5 topics) — display only, no real payments

## Prerequisites

Install the following before you start:

| Tool    | Version (tested) | Link |
|---------|-------------------|------|
| Python  | 3.10+             | https://www.python.org/downloads/ |
| Node.js | 18+ (includes npm)| https://nodejs.org/ |
| MySQL   | 8.0+              | https://dev.mysql.com/downloads/ |
| Ollama  | latest            | https://ollama.com/download |

## Folder Structure

```
interview-prep-chatbot/
├── backend/
│   ├── main.py            # FastAPI app entry point, CORS, router registration
│   ├── database.py        # SQLAlchemy engine/session setup (MySQL connection)
│   ├── models.py           # SQLAlchemy ORM models (User, Question, Session, Message)
│   ├── routes/
│   │   ├── auth.py         # Register / login / JWT auth dependency
│   │   ├── chat.py         # Topics, start session, send message -> Ollama
│   │   └── history.py      # List past sessions, view a session transcript
│   ├── .env.example        # Copy to .env and fill in your local config
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx          # React entry point
│   │   ├── App.jsx           # Renders the router
│   │   ├── router/index.jsx  # All route definitions + auth guard
│   │   ├── api/client.js     # Axios instance (base URL + JWT header)
│   │   ├── components/Navbar.jsx
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Register.jsx
│   │       ├── Topics.jsx    # Topic picker (DSA, OS, DBMS, OOP, CN)
│   │       ├── Chat.jsx      # Question -> answer -> score/feedback loop
│   │       ├── History.jsx   # Past sessions + transcripts
│   │       └── Pricing.jsx   # Free vs Pro comparison (display only)
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
├── database.sql           # Schema + sample interview questions
└── README.md
```

## Step by Step Installation

### 1. Clone / open the project

```bash
cd interview-prep-chatbot
```

### 2. Import the database

Make sure MySQL is running, then import the schema (this creates the
`interview_prep_chatbot` database, its tables, and sample questions
for every topic):

```bash
mysql -u root -p < database.sql
```

**If you get `ERROR 1698 (28000): Access denied for user 'root'@'localhost'`:**
this means MySQL's `root` user is set up with the `auth_socket` plugin
(default on many Linux installs), which doesn't accept a password at
all. Use `sudo` instead, then create a dedicated app user with a real
password so the backend can connect to it:

```bash
sudo mysql < database.sql

sudo mysql -e "CREATE USER IF NOT EXISTS 'interview_app'@'localhost' IDENTIFIED BY 'changeme123'; GRANT ALL PRIVILEGES ON interview_prep_chatbot.* TO 'interview_app'@'localhost'; FLUSH PRIVILEGES;"
```

Then in `backend/.env` (see step 3) set:

```
DB_USER=interview_app
DB_PASSWORD=changeme123
```

### 3. Set up and run the backend

```bash
cd backend
python3 -m venv venv

# Activate the virtual environment
source venv/bin/activate        # macOS/Linux
venv\Scripts\activate           # Windows

pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and set your MySQL password, JWT secret, etc.
```

Run the API server (make sure you're inside `backend/` with the venv
activated — `main.py` lives there, not in the project root):

```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`. You can check
`http://localhost:8000/docs` for the interactive Swagger UI.

### 4. Pull and run the Ollama model

In a separate terminal, make sure Ollama is installed, then pull the
`llama3` model:

```bash
ollama pull llama3
```

Ollama runs its API server automatically on `http://localhost:11434`
once installed. If it's not already running, start it with:

```bash
ollama serve
```

Keep this running in the background — the backend calls it every
time a chat message is evaluated.

### 5. Set up and run the frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

### 6. Use the app

1. Open `http://localhost:5173` in your browser.
2. Register a new account.
3. Pick a topic (Free accounts get DSA, OOP, and CN; OS and DBMS are
   Pro-only — this is enforced by the backend too).
4. Answer the bot's questions; it will score each answer 1-10 with
   feedback, then ask the next question.
5. Check the History page to review past sessions and scores.
6. Check the Pricing page to see the Free vs Pro comparison.

## Database Tables

| Table       | Purpose |
|-------------|---------|
| `users`     | id, name, email, password_hash, plan (free/pro), created_at |
| `questions` | id, topic, question_text — the question bank per topic |
| `sessions`  | id, user_id, topic, started_at — one row per interview attempt |
| `messages`  | id, session_id, role (user/bot), content, score, created_at |

## Environment Variables (backend/.env)

| Variable         | Description                              | Default |
|------------------|-------------------------------------------|---------|
| `DB_USER`        | MySQL username                           | `root` |
| `DB_PASSWORD`    | MySQL password                           | (empty) |
| `DB_HOST`        | MySQL host                               | `localhost` |
| `DB_PORT`        | MySQL port                               | `3306` |
| `DB_NAME`        | MySQL database name                      | `interview_prep_chatbot` |
| `JWT_SECRET_KEY` | Secret used to sign JWT tokens           | (change this!) |
| `OLLAMA_URL`     | Base URL of the running Ollama server    | `http://localhost:11434` |
| `OLLAMA_MODEL`   | Model name to use for evaluation         | `llama3` |

## Troubleshooting

- **"Could not reach Ollama"** — make sure `ollama serve` is running
  and `ollama pull llama3` has completed.
- **MySQL connection errors** — double check `backend/.env` matches
  your local MySQL username/password, and that the database from
  `database.sql` was imported successfully.
- **`Access denied for user 'root'@'localhost'`** — see the note under
  "Import the database" in step 2 above; use `sudo mysql` and a
  dedicated app user instead of a `root` password.
- **`Unknown database 'interview_prep_chatbot'`** — the schema was
  never imported (or was imported to the wrong place). Re-run
  `sudo mysql < database.sql` from the **project root** (where
  `database.sql` lives), then confirm with
  `sudo mysql -e "SHOW DATABASES LIKE 'interview_prep_chatbot';"`.
- **`ERROR: Error loading ASGI app. Could not import module "main"`**
  — `uvicorn` was run from the wrong directory. `main.py` is inside
  `backend/`, so `cd backend` (and activate the venv) before running
  `uvicorn main:app --reload`.
- **Registration/login hangs for ~20 seconds then returns 500, with
  `AttributeError: module 'bcrypt' has no attribute '__about__'` or
  `ValueError: password cannot be longer than 72 bytes` in the
  `uvicorn` logs** — this is a known incompatibility between
  `passlib==1.7.4` and `bcrypt>=4.1`. `requirements.txt` already pins
  `bcrypt==4.0.1` to avoid it, but if you installed dependencies
  *before* that pin was added (or already had a newer `bcrypt` cached),
  your venv may still have the wrong version. Fix it with:
  ```bash
  pip install "bcrypt==4.0.1"
  ```
  then stop and restart `uvicorn` (`--reload` does not pick up
  dependency changes, only code changes).
- **CORS errors in the browser** — the backend only allows requests
  from `http://localhost:5173` by default (see `backend/main.py`);
  make sure the frontend dev server is running on that port.

## Screenshots

_Add screenshots of the app here once it's running:_

- Login / Register page: `screenshots/login.png`
- Topics page: `screenshots/topics.png`
- Chat interview page: `screenshots/chat.png`
- History page: `screenshots/history.png`
- Pricing page: `screenshots/pricing.png`
