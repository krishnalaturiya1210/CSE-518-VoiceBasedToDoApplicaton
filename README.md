# Hey To Do — Voice-Driven To-Do Management System

Hey To Do is a browser-based, voice-first to-do list application built for **CSE 518 (Human-Computer Interaction)**. It supports **multimodal interaction** (voice + touch + keyboard), with a **Flask + SQLAlchemy** backend and a **JavaScript/Web Speech API** frontend.

**Live deployment:** https://voicebasedtodoapplication.up.railway.app/

---

## Key Features

- **Wake word + commands**: Say “Hey To Do” → then speak a command.
- **Natural language task creation**: Infers **priority**, **category**, and **due date** from speech/text (via `parse_add_task_command`).
- **Multimodal editing**: Each task card has a **pencil icon** to edit:
  - name
  - priority
  - category
  - due date
- **Task management**: mark done/undone, delete, clear completed, clear all, sorting.
- **Basic PWA support**: service worker for caching/offline-ish behavior.

---

## Repository Structure

### Backend (Flask)

- **`app.py`**
  - Flask app entry point
  - SQLAlchemy `Task` model (id, name, done, priority, category, due_date, created_at) :contentReference[oaicite:0]{index=0}
  - REST endpoints for:
    - Fetch tasks (sorting/filtering) :contentReference[oaicite:1]{index=1}
    - Add task (NLP parsing) :contentReference[oaicite:2]{index=2}
    - Mark by name, delete by name, toggle by id, delete by id :contentReference[oaicite:3]{index=3}
    - Clear completed, clear all (and update route if included in your current file) :contentReference[oaicite:4]{index=4}

- **`task_parsing.py`**
  - Parses free-form input to extract task attributes (name/priority/category/due_date)
  - Used by `/add` via `parse_add_task_command(...)` :contentReference[oaicite:5]{index=5}

- **`intent_model.joblib`, `category_model.joblib`**
  - ML models used for intent/category inference (if present and loaded).

### Frontend (Client-Side)

- **`templates/index.html`**
  - Main UI template rendered by Flask.

- **`static/script.js`**
  - Renders task cards and wires UI actions (checkbox, delete, edit)
  - Speech recognition pipeline (wake word + command mode)
  - Confirmation dialogs (e.g., Clear All)
  - Sorting, listing tasks, etc. :contentReference[oaicite:6]{index=6}

- **`static/style.css`**
  - Styling for task cards, buttons, modals, edit icon, responsive layout.

- **`static/sw.js`**
  - Service worker for caching/PWA behavior.

---

## Voice Commands You Can Try

### Wake Word
Say one of these to activate listening:
- **“Hey To Do”**
- **“Hello To Do”**

### Add Tasks
After wake word, try:
- **“add buy milk by tomorrow”**
- **“remind me to finish HCI assignment in school category with high priority”**
- **“add submit HCI report with high priority by Monday in school category”**

### Mark Done
- **“mark buy milk as done”**

### Delete
- **“delete buy milk”**
- **“remove finish my homework”**

### Clear
- **“clear completed tasks”**
- **“clear all the tasks”** (will ask for confirmation)

### List
- **“what are my pending tasks”**
- **“list completed tasks”**
- **“list all tasks”**

### Sort
- **“order by priority”**
- **“order by due date”**
- **“order by category”**
- **“order by created”**

> Tip: Voice features work best in Chrome (Desktop/Android) with microphone permission enabled.

---

## Running Locally

1. **Clone the repo**
   git clone <your-repo-url>
   cd <your-repo-folder>
   
2. **Install dependencies**
    pip install -r requirements.txt

3. **Run the server**
     python app.py
   
5. **Open in your browser:**
      http://127.0.0.1:5000

## Database Behavior

If DATABASE_URL is not set, the app falls back to local SQLite (tasks.db). In production (Railway), set DATABASE_URL to your Postgres connection string.

Deployment Notes (Railway)

Set DATABASE_URL in your Railway service environment variables (not inside app.py). Railway typically runs the app via Gunicorn/Procfile; locally you can run python app.py.

