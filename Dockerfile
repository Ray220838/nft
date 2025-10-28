# Multi-stage Dockerfile for XRPL NFT Whitelist App
# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM python:3.12-slim AS backend

WORKDIR /app

RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN pip install poetry

COPY backend/pyproject.toml backend/poetry.lock ./
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --no-root

COPY backend/ ./

COPY --from=frontend-builder /app/frontend/dist ./frontend_dist

ENV PORT=8080
ENV DATABASE_URL=sqlite:////data/app.db
ENV SUPER_ADMIN_WALLET=rKhHA3suVVRtJpUQE5vZntyMTWvd9hBxg1

EXPOSE 8080

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
