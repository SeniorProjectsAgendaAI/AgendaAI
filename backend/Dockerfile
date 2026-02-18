# Ankush Joshi 
# Dockerfile for the backend FastAPI application

# Resources / Documentation I used to help me build this file:
#   https://docs.docker.com/build/concepts/dockerfile/
#   https://builder.aws.com/content/2m6G7FMIFMvJWhvCNmCOgm2VKoA/creating-a-dockerfile


# using the official python runtime as parent image
FROM python:3.14-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# installing system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# install uv for fast dependency resolution
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# copy dependency file first for layer caching
COPY pyproject.toml .

# install dependencies
RUN uv pip install --system --no-cache .

# copy application code
COPY . .

# expose port the app runs on
EXPOSE 8000

# command to run application
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]