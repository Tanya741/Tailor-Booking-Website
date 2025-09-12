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
    # Tailor profiles
    path('', TailorListView.as_view(), name='tailor_list'),
    path('me/', MyTailorProfileView.as_view(), name='my_tailor_profile'),
    path('<str:username>/', TailorDetailView.as_view(), name='tailor_detail'),

    # Services for logged-in tailor
    path('me/services/', MyServicesView.as_view(), name='my_services'),
    path('me/services/<int:service_id>/', ServiceDetailUpdateView.as_view(), name='my_service_detail'),

    # Public services list for a tailor by username
    path('<str:username>/services/', PublicTailorServicesView.as_view(), name='public_tailor_services'),

    # Bookings
    path('bookings/', BookingListCreateView.as_view(), name='bookings'),
    path('bookings/<int:booking_id>/status/', BookingStatusUpdateView.as_view(), name='booking_status'),

    # Reviews
    path('reviews/', ReviewListCreateView.as_view(), name='my_reviews'),
    path('<str:username>/reviews/', PublicTailorReviewsView.as_view(), name='public_tailor_reviews'),
]
