from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import (
    TailorListView,
    TailorDetailView,
    MyTailorProfileView,
    MyServicesView,
    ServiceDetailUpdateView,
    ServiceImageListCreateView,
    ServiceImageDetailView,
    PublicTailorServicesView,
    BookingListCreateView,
    BookingStatusUpdateView,
    ReviewListCreateView,
    PublicTailorReviewsView,
    ReviewImageUploadView,
    ReviewImageDeleteView,
    TailorSearchViewSet,
    InitiatePaymentView,
    MarkPaymentCompleteView,
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
    
    # Service images management
    path('me/services/<int:service_id>/images/', ServiceImageListCreateView.as_view(), name='service_images'),
    path('me/services/<int:service_id>/images/<int:pk>/', ServiceImageDetailView.as_view(), name='service_image_detail'),

    # Bookings (place BEFORE the catch-all <username>/ route)
    path('bookings/', BookingListCreateView.as_view(), name='bookings'),
    path('bookings/<int:booking_id>/status/', BookingStatusUpdateView.as_view(), name='booking_status'),
    path('bookings/<int:booking_id>/payment/', InitiatePaymentView.as_view(), name='booking-payment-initiate'),
    path('bookings/<int:booking_id>/mark-paid/', MarkPaymentCompleteView.as_view(), name='booking-mark-paid'),

    # Reviews for current user
    path('reviews/', ReviewListCreateView.as_view(), name='my_reviews'),
    
    # Review images
    path('reviews/images/', ReviewImageUploadView.as_view(), name='review_image_upload'),
    path('reviews/<int:review_id>/images/<int:pk>/', ReviewImageDeleteView.as_view(), name='review_image_delete'),

    # Public services and reviews list for a tailor by username
    path('<str:username>/services/', PublicTailorServicesView.as_view(), name='public_tailor_services'),
    path('<str:username>/reviews/', PublicTailorReviewsView.as_view(), name='public_tailor_reviews'),

    # Tailor detail by username (catch-all segment) - keep LAST
    path('<str:username>/', TailorDetailView.as_view(), name='tailor_detail'),
]
