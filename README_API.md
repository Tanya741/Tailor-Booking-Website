# Tailor It API Quick Reference (MVP)

Base URL (development): http://localhost:8000/api/

Auth & Users
----------------
POST  users/session/               Unified register/login/refresh (action field)
POST  users/register/              Register (legacy separate endpoint)
POST  users/token/                 Obtain JWT pair (legacy)
POST  users/token/refresh/         Refresh access token (legacy)
GET   users/me/                    Current user profile (auth required)

Tailors & Profiles
------------------
GET   marketplace/                 List tailors (public) sorted by rating desc
GET   marketplace/me/              Get/update (PATCH) current tailor profile (tailor only)
GET   marketplace/<username>/      Tailor profile detail (public)

Services
--------
GET   marketplace/me/services/                 List my services (tailor)
POST  marketplace/me/services/                 Create service (tailor)
GET   marketplace/me/services/<id>/            Retrieve own service (tailor)
PATCH marketplace/me/services/<id>/            Update own service (tailor)
DELETE marketplace/me/services/<id>/           Delete own service (tailor)
GET   marketplace/<username>/services/         Public services of a tailor

Bookings
--------
GET   marketplace/bookings/                    List bookings (customer: their bookings; tailor: received)
POST  marketplace/bookings/                    Create booking (customer only)
PATCH marketplace/bookings/<id>/status/        Change status (customer: cancel; tailor: accept/reject/complete)

Status transitions:
- Customer: pending|accepted -> cancelled
- Tailor: pending -> accepted|rejected; accepted -> completed

Reviews
-------
GET   marketplace/reviews/                     List my written reviews (auth)
POST  marketplace/reviews/                     Create review (customer of completed booking)
GET   marketplace/<username>/reviews/          Public reviews for a tailor

Seeds & Maintenance (management commands)
----------------------------------------
python manage.py seed_demo               Populate demo data (tailors, customers, services, bookings, reviews)
python manage.py seed_demo --no-superuser   Skip creating admin superuser
python manage.py ensure_tailor_profiles  Create missing TailorProfile rows
python manage.py list_users              List all users with has_profile flag

Request Examples
----------------
1. Register (tailor):
POST /api/users/session/
{
  "action": "register",
  "username": "tailor9",
  "password": "password",
  "role": "tailor"
}

2. Login:
POST /api/users/session/
{
  "action": "login",
  "username": "tailor1",
  "password": "password"
}

3. Create Service (tailor):
POST /api/marketplace/me/services/
Authorization: Bearer <ACCESS>
{
  "name": "Jacket Alteration",
  "description": "Shorten sleeves",
  "price": "750.00",
  "duration_minutes": 60,
  "is_active": true
}

4. Create Booking (customer):
POST /api/marketplace/bookings/
Authorization: Bearer <ACCESS>
{
  "service": 12,
  "scheduled_time": "2025-09-10T14:30:00Z"
}

5. Accept Booking (tailor):
PATCH /api/marketplace/bookings/5/status/
Authorization: Bearer <ACCESS>
{
  "status": "accepted"
}

6. Leave Review (after completed booking):
POST /api/marketplace/reviews/
Authorization: Bearer <ACCESS>
{
  "booking": 5,
  "rating": 5,
  "comment": "Great customer"
}

Error Notes
-----------
401 Unauthorized: Missing/invalid token.
403 Forbidden: Role not allowed for action (e.g., customer trying to create service).
400 Bad Request: Validation error (e.g., duplicate service name).

Pagination & Filtering
----------------------
(Current MVP returns full lists; add pagination & filters later.)

Next Enhancements (Future)
--------------------------
- Distance / nearby search
- Stripe payments integration
- Advanced filtering (specialization, price range, rating)
- Pagination & ordering parameters
- Swagger/OpenAPI auto schema

Glossary
--------
TailorProfile: Extra data + rating aggregate for tailor users.
Service: Offer created by tailor.
Booking: Customer request for a service.
Review: Rating/comment after completed booking.

