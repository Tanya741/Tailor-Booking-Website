# Use Python 3.11 slim image
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client curl build-essential netcat-openbsd && rm -rf /var/lib/apt/lists/*

# Install Node.js for frontend build
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt




# Copy frontend code and build
COPY frontend/ /app/frontend/
WORKDIR /app/frontend
RUN npm install
RUN npm run build
# Debug: list contents of dist folder
RUN ls -l /app/frontend/dist

# Switch back to app directory and copy backend code
WORKDIR /app
COPY . /app/

# Create media directory for image uploads
RUN mkdir -p /app/media

# Copy entrypoint script
COPY docker/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "core.wsgi:application"]
