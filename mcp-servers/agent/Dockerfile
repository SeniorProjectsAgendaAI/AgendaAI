# ---- Build stage ---
# Use 3.12 as it's the stable standard for App Runner 2026; 3.14 is currently experimental
FROM python:3.12-slim AS builder

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv correctly
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# CRITICAL FIX: Copy only the mcp-servers folder to avoid double-nesting
COPY ./mcp-servers /app/mcp-servers

# Install dependencies for the agent itself
WORKDIR /app/mcp-servers/agent
# We use uv sync here too to ensure the lockfile is respected
RUN uv sync --frozen

# Pre-install each MCP server's virtualenv
# Only run uv sync if the directory actually contains a pyproject.toml
WORKDIR /app/mcp-servers/agenda-server
RUN if [ -f "pyproject.toml" ]; then uv sync --frozen; fi

WORKDIR /app/mcp-servers/gmail-server
RUN if [ -f "pyproject.toml" ]; then uv sync --frozen; fi

WORKDIR /app/mcp-servers/google-calendar-server
RUN if [ -f "pyproject.toml" ]; then uv sync --frozen; fi

WORKDIR /app/mcp-servers/canvas-server
RUN if [ -f "pyproject.toml" ]; then uv sync --frozen; fi

# ---- Runtime stage ----
FROM python:3.12-slim

WORKDIR /app

# Runtime PostgreSQL client lib
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Bring uv into the runtime image (needed for subprocesses)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy the entire /app directory which now contains all code and .venv environments
COPY --from=builder /app /app

WORKDIR /app/mcp-servers/agent

# Ensure the agent's venv is on the PATH
ENV PATH="/app/mcp-servers/agent/.venv/bin:$PATH"

# App Runner typically defaults to 8080. If you use 8001, 
# you MUST specify port 8001 in your App Runner Service settings.
EXPOSE 8001

CMD ["uv", "run", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]