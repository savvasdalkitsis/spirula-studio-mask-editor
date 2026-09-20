FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if any
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend ./backend
COPY frontend ./frontend

ENV PYTHONUNBUFFERED=1
ENV DATASET_ROOT=/nvr/splats/hovoli
ENV CACHE_DIR=/cache/previews

EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
