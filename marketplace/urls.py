from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import (
    TailorListView,
    TailorDetailView,
    MyTailorProfileView,
    MyServicesView,
    ServiceDetailUpdateView,
    PublicTailorServicesView,
    BookingListCreateView,
    BookingStatusUpdateView,
    ReviewListCreateView,
    PublicTailorReviewsView,
    TailorSearchViewSet,
)

router = SimpleRouter()
router.register(r'tailors', TailorSearchViewSet, basename='tailor-search')

urlpatterns = [
    # New search endpoint
    path('', include(router.urls)),
    # Tailor profiles (list and "me")
    path('', TailorListView.as_view(), name='tailor_list'),
    path('me/', MyTailorProfileView.as_view(), name='my_tailor_profile'),

    # Services for logged-in tailor
    path('me/services/', MyServicesView.as_view(), name='my_services'),
    path('me/services/<int:service_id>/', ServiceDetailUpdateView.as_view(), name='my_service_detail'),

    # Bookings (place BEFORE the catch-all <username>/ route)
    path('bookings/', BookingListCreateView.as_view(), name='bookings'),
    path('bookings/<int:booking_id>/status/', BookingStatusUpdateView.as_view(), name='booking_status'),

    # Reviews for current user
    path('reviews/', ReviewListCreateView.as_view(), name='my_reviews'),

    # Public services and reviews list for a tailor by username
    path('<str:username>/services/', PublicTailorServicesView.as_view(), name='public_tailor_services'),
    path('<str:username>/reviews/', PublicTailorReviewsView.as_view(), name='public_tailor_reviews'),

    # Tailor detail by username (catch-all segment) - keep LAST
    path('<str:username>/', TailorDetailView.as_view(), name='tailor_detail'),
]
