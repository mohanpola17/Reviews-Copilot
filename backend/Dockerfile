# Use official Python image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install pip and dependencies
RUN python -m ensurepip --upgrade \
    && pip install --upgrade pip \
    && pip install -r requirements.txt

# Copy backend code
COPY . .

# Expose port (Railway will provide $PORT)
EXPOSE 8080

# Start FastAPI
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
