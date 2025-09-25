#!/bin/bash

# Wait for database to be ready
if [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ]; then
  echo "Waiting for database..."
  while ! nc -z $DB_HOST $DB_PORT; do
    sleep 0.1
  done
  echo "Database started"
fi

# Run database migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Execute the main command
exec "$@"
