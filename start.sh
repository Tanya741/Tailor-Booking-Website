#!/bin/bash

# Run database migrations
python manage.py migrate

# Create superuser if it doesn't exist
python manage.py create_superuser_from_env

# Start the Django server
python manage.py runserver 0.0.0.0:$PORT