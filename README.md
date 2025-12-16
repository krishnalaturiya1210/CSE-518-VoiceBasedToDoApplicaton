Hey To Do — Voice-Driven To-Do Management System
================================================

This repository contains the source code for **Hey To Do**, a browser-based,
voice-driven to-do list application developed as part of CSE 518 (Human-Computer
Interaction). The system supports multimodal interaction using speech, touch,
and keyboard input, with a Flask backend and a JavaScript-based frontend.

------------------------------------------------
Repository Structure
------------------------------------------------

.
├── app.py
├── task_parsing.py
├── intent_model.joblib
├── category_model.joblib
├── requirements.txt
├── Procfile
├── static/
│   ├── script.js
│   ├── style.css
│   ├── sw.js
│   └── icons/
├── templates/
│   └── index.html
└── README.txt

------------------------------------------------
Backend (Flask)
------------------------------------------------

- app.py  
  Main Flask application entry point.
  - Defines the Task database model using SQLAlchemy
  - Handles REST API routes for:
      - Adding tasks
      - Editing tasks
      - Deleting tasks
      - Marking tasks as done/undone
      - Clearing tasks
      - Fetching and sorting tasks
  - Integrates with PostgreSQL (production) or SQLite (local development)
  - Initializes the database schema on startup

- task_parsing.py  
  Contains the natural language parsing logic for task creation.
  - Uses rule-based parsing and lightweight ML models
  - Extracts task name, priority, category, and due date from free-form speech

- intent_model.joblib / category_model.joblib  
  Pre-trained scikit-learn models used for intent inspection and
  category inference during speech-based task creation.

------------------------------------------------
Frontend (Client-Side)
------------------------------------------------

- templates/index.html  
  Main HTML template rendered by Flask.
  - Defines the application layout
  - Includes task list, controls, help modal, and overlays

- static/script.js  
  Core client-side logic.
  - Handles task rendering and UI updates
  - Implements speech recognition using the Web Speech API
  - Implements wake-word detection ("Hey To Do")
  - Supports voice commands for adding, editing, deleting, and listing tasks
  - Manages confirmation dialogs and text-to-speech feedback
  - Supports inline task editing via a pencil icon on each task

- static/style.css  
  Styling for the application UI.
  - Task cards, buttons, modals, icons, and responsive layout
  - Visual feedback for priority, completion state, and interactions

- static/sw.js  
  Service worker for basic PWA functionality.
  - Enables caching for offline or intermittent connectivity

------------------------------------------------
Deployment and Configuration
------------------------------------------------

- requirements.txt  
  Lists all Python dependencies required to run the application.

- Procfile  
  Specifies the Gunicorn command used by deployment platforms
  (e.g., Railway, Render).

- DATABASE_URL  
  The PostgreSQL connection string is provided via an environment
  variable on the deployment platform.

------------------------------------------------
Usage Notes
------------------------------------------------

- The application can be run locally using:
    python app.py

- Voice features require a modern browser with Web Speech API support
  (e.g., Chrome on desktop or Android).

- Tasks can be created via voice or manual input and refined using
  the inline edit interface.

------------------------------------------------
Course Context
------------------------------------------------

This project was developed as part of CSE 518: Human-Computer Interaction.
The design emphasizes multimodal interaction, visibility of system status,
error recovery, and user control, aligning with core HCI principles.
