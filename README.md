# AgendaAI
AgendaAI is an intelligent scheduling assistant designed to centralize academic and personal tasks across multiple platforms.

## Tech Stack
Preface: Docker must be installed on your local device and open to run all tasks
### Backend
- **FastAPI**: Modern Python web framework
- **PostgreSQL**: Database with SQLAlchemy ORM
- **UV**: Fast Python package manager
- **Dependencies**: 
  - `fastapi` - Web framework
  - `sqlalchemy` - Database ORM
  - `psycopg[binary]` - PostgreSQL adapter
  - `python-dotenv` - Environment variable management
  - `uvicorn` - ASGI server

### Frontend
- **React** with TypeScript
- **Create React App** template

## Project Structure

```
AgendaAI/
├── backend/
│   ├── app/
│   │   ├── db/          # Database configuration and session management
│   │   ├── deps/        # Dependencies
│   │   ├── models/      # SQLAlchemy models
│   │   ├── routes/      # API endpoints
│   │   ├── schemas/     # Pydantic schemas
│   │   ├── services/    # Business logic
│   │   └── main.py      # FastAPI application entry point
│   ├── pyproject.toml   # Python dependencies
│   └── .venv/           # Virtual environment
├── frontend/
│   ├── src/             # React source code
│   ├── public/          # Static assets
│   └── package.json     # Node dependencies
├── infra/
│   ├── docker-compose.yaml  # PostgreSQL container setup
│   └── .env.example     # Infrastructure environment variables
└── .env.example         # Environment variables template
```

## Getting Started

### Prerequisites
- Python 3.14+
- Node.js 16+
- npm
- PostgreSQL database

### Initial Setup

1. **Clone the repository**
```bash
git clone https://github.com/SeniorProjectsAgendaAI/AgendaAI.git
cd AgendaAI
```

2. **Setup environment variables**
```bash
cp .env.example .env
```
   The default `.env.example` is configured for Docker. If using your own PostgreSQL, edit `.env`:
   ```
   DATABASE_URL=postgresql+psycopg://username:password@localhost:5432/database_name
   ```

3. **Setup PostgreSQL database**

   **Option A: Using Docker (Recommended)**
   ```bash
   cd infra
   docker-compose up -d
   cd ..
   ```
   This will start a PostgreSQL container with credentials matching the default `.env.example`.

   **Option B: Use your own PostgreSQL instance**
   
   Make sure PostgreSQL is running and the `DATABASE_URL` in `.env` is correct.

4. **Install backend dependencies**
```bash
cd backend
uv sync  # or: pip install -r requirements.txt
```

5. **Install frontend dependencies**
```bash
cd frontend
npm install
cd ..
```

### Running the Project

#### Quick Start (Recommended)
1. Press `Cmd+Shift+P` (or `Ctrl+Shift+P` on Windows/Linux)
2. Type "Tasks: Run Task"
3. Select **"Start Full Stack"**

This will automatically:
- Activate the Python virtual environment
- Start the FastAPI backend server with hot reload on `http://localhost:8000`
- Start the React frontend development server on `http://localhost:3000`

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

## API Endpoints

### Health Check
- `GET /health` - Check API status

### Database
- `GET /db-test` - Test database connection (returns current database time)

## Features

- **CORS Configuration**: Frontend and backend communication enabled
- **Database Integration**: PostgreSQL with SQLAlchemy ORM
- **Environment Configuration**: `.env` file support for secure configuration
- **Hot Reload**: Both frontend and backend support live reloading during development
