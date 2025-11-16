# AgendaAI
AgendaAI is an intelligent scheduling assistant designed to centralize academic and personal tasks across multiple platforms.

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm

### Running the Project

#### Quick Start (Recommended)
1. Press `Cmd+Shift+P` (or `Ctrl+Shift+P` on Windows/Linux)
2. Type "Tasks: Run Task"
3. Select **"Start Full Stack"**

This will automatically:
- Activate the Python virtual environment
- Start the FastAPI backend server with hot reload
- Start the React frontend development server

#### Running Services Individually
You can also run the backend and frontend separately:
- Select **"Start Backend"** to run only the backend
- Select **"Start Frontend"** to run only the frontend

#### Manual Setup
If you prefer to run services manually:

**Backend:**
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm start
```
