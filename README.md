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
- **AWS Amplify**: Authentication and authorization with Cognito
- **React Router**: Client-side routing

### MCP Servers

- **Model Context Protocol (MCP)**: Integration with external services
- **Google Calendar Server**: Calendar integration
- **Gmail Server**: Email integration
- **Canvas Server**: Learning management system integration
- **Agent**: MCP client for orchestrating server interactions

## Project Structure

```
AgendaAI/
├── backend/
│   ├── app/
│   │   ├── database/    # Database configuration, models, and CRUD operations
│   │   ├── deps/        # Dependencies
│   │   ├── routes/      # API endpoints (auth, tasks, users, health)
│   │   ├── schemas/     # Pydantic schemas
│   │   ├── services/    # Business logic (auth, security)
│   │   └── main.py      # FastAPI application entry point
│   ├── pyproject.toml   # Python dependencies
│   └── .venv/           # Virtual environment
├── frontend/
│   ├── amplify/         # AWS Amplify backend configuration
│   │   ├── auth/        # Authentication resources
│   │   └── data/        # Data resources
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API service layer
│   │   ├── App.tsx      # Main application with Authenticator
│   │   ├── Dashboard.tsx       # Dashboard view
│   │   ├── TaskPanel.tsx       # Task management panel
│   │   ├── Calendarview.tsx    # Calendar views (month/week/day)
│   │   └── amplify_outputs.json # Amplify configuration
│   ├── public/          # Static assets
│   └── package.json     # Node dependencies
├── mcp-servers/
│   ├── agent/           # MCP client for orchestrating server interactions
│   ├── google-calendar-server/  # Google Calendar integration
│   ├── gmail-server/    # Gmail integration
│   └── canvas-server/   # Canvas LMS integration
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
- Docker (for PostgreSQL database)
- AWS Account (for Amplify authentication)
- Google Cloud Account (for MCP server integrations - optional)

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

- **Authentication**: AWS Amplify with Cognito (Email/Password and Google OAuth)
- **Task Management**: Create, edit, and delete tasks with priority levels
- **Calendar Views**: Month, week, and day views for scheduling
- **Database Integration**: PostgreSQL with SQLAlchemy ORM
- **MCP Integration**: Connect with Google Calendar, Gmail, and Canvas LMS
- **CORS Configuration**: Frontend and backend communication enabled
- **Environment Configuration**: `.env` file support for secure configuration
- **Hot Reload**: Both frontend and backend support live reloading during development

## Authentication

The application uses AWS Amplify for authentication with AWS Cognito. To use authentication:

1. Configure your AWS Amplify project
2. Update `frontend/src/amplify_outputs.json` with your Cognito configuration
3. For Google OAuth, configure the identity provider in AWS Cognito Console

To test without setting up OAuth, use email/password registration through the "Create Account" tab.

## MCP Servers

The project includes Model Context Protocol servers for integrating with external services:

- **Google Calendar**: Sync and manage calendar events
- **Gmail**: Access and manage emails
- **Canvas**: Integrate with Canvas LMS for academic tasks
- **Agent**: Client for orchestrating interactions between MCP servers

Each MCP server has its own `pyproject.toml` and can be run independently. See individual server READMEs for setup instructions.
