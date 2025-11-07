# Tailor It - AI Assistant Instructions

## Project Overview
Tailor It is a Django-based booking platform connecting customers with tailors. The system uses Django REST framework for the API and follows a service-oriented architecture.

## Key Architecture Components

### Core Services
- **Users System** (`users/`): Custom user model with role-based access (customer/tailor)
- **Marketplace** (`marketplace/`): Manages tailor profiles, services, bookings, and reviews
- **Media** (`media/`): Handles file uploads and static assets

### Data Models & Relationships
- `TailorProfile`: Extends User model for tailor-specific data (OneToOne)
- `Service`: Offered by tailors, basis for bookings
- `Booking`: Core transaction model with state machine
- `Review`: Post-service feedback, affects tailor ratings

Example booking state transitions:
```python
# marketplace/models.py
class Booking:
    Status = {
        PENDING → ACCEPTED/REJECTED (tailor action)
        ACCEPTED → COMPLETED (tailor action)
        PENDING/ACCEPTED → CANCELLED (customer action)
    }
```

## Development Environment

### Setup
1. PostgreSQL database (required):
```shell
# Using Docker
docker-compose up db
# Configure in .env:
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tailor_it
```

2. Virtual environment and dependencies:
```shell
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

### Key Commands
- `python manage.py seed_demo`: Populate test data
- `python manage.py ensure_tailor_profiles`: Maintenance task for profile consistency

## Project Conventions

### API Patterns
- JWT authentication required for most endpoints
- Nested routes under `/api/marketplace/` for domain entities
- Status changes handled by dedicated endpoints (e.g., `/bookings/<id>/status/`)
- Profile actions use `me` convention (e.g., `/marketplace/me/services/`)

### Data Validation
- Model-level validation in `clean()` methods
- Service prices use Decimal for accuracy
- Automated rating calculations on review creation

## Common Tasks

### Adding New Service Types
1. Add to `Specialization` model if needed
2. Update serializers if adding fields
3. Consider impact on existing bookings

### Implementing New Status Flows
1. Add to `Booking.Status` choices
2. Update transition validation in views
3. Consider notification implications

## Testing Guidelines
- Use model factories for test data
- Respect booking state machine in tests
- Mock external service calls (if any)

## Troubleshooting
- Missing tailor profiles: Run `ensure_tailor_profiles` command
- Rating discrepancies: Check review aggregation triggers