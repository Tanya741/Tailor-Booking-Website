from rest_framework import permissions, generics, viewsets
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.contrib.auth import get_user_model
from django.db import connection
from django.db.models import F, Value, Q
from django.db.models.functions import Radians, Sin, Cos, ACos, Least, Greatest, Abs
from django.utils import timezone
from django.conf import settings
import stripe

from .models import TailorProfile, Service, Review, ReviewImage
from .serializers import (
	TailorProfileSerializer,
	TailorProfileUpdateSerializer,
	ServiceSerializer,
	ServiceCreateUpdateSerializer,
	ServiceImageSerializer,
	BookingSerializer,
	BookingCreateSerializer,
	ReviewSerializer,
	ReviewCreateSerializer,
	ReviewImageSerializer,
)

User = get_user_model()


class MyTailorProfileView(generics.RetrieveUpdateAPIView):
	permission_classes = [permissions.IsAuthenticated]

	def get_object(self):
		user = self.request.user
		if user.role != 'tailor':
			raise PermissionDenied('Only tailors have a profile.')
		return user.tailor_profile

	def get_serializer_class(self):
		if self.request.method in ('PUT', 'PATCH'):
			return TailorProfileUpdateSerializer
		return TailorProfileSerializer


class TailorListView(generics.ListAPIView):
	queryset = (TailorProfile.objects
				.select_related('user')
				.prefetch_related('specializations')
				.all().order_by('-avg_rating'))
	serializer_class = TailorProfileSerializer
	permission_classes = [permissions.AllowAny]


class TailorDetailView(generics.RetrieveAPIView):
	queryset = TailorProfile.objects.select_related('user').prefetch_related('specializations')
	serializer_class = TailorProfileSerializer
	lookup_field = 'user__username'
	permission_classes = [permissions.AllowAny]

	def get_object(self):
		username = self.kwargs.get('username')
		return generics.get_object_or_404(self.queryset, user__username=username)

	# Note: This endpoint is used by the frontend public TailorProfilePage at
	# /tailor/:username to display a tailor's profile.


class MyServicesView(generics.ListCreateAPIView):
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		user = self.request.user
		if user.role != 'tailor':
			raise PermissionDenied('Only tailors can view their services.')
		return Service.objects.filter(tailor=user.tailor_profile).prefetch_related('images').order_by('-created_at')

	def get_serializer_class(self):
		if self.request.method == 'POST':
			return ServiceCreateUpdateSerializer
		return ServiceSerializer

	def perform_create(self, serializer):
		user = self.request.user
		if user.role != 'tailor':
			raise PermissionDenied('Only tailors can create services.')
		serializer.save(tailor=user.tailor_profile)


class ServiceDetailUpdateView(generics.RetrieveUpdateDestroyAPIView):
	permission_classes = [permissions.IsAuthenticated]
	lookup_url_kwarg = 'service_id'

	def get_queryset(self):
		user = self.request.user
		if user.role != 'tailor':
			raise PermissionDenied('Only tailors can manage services.')
		return Service.objects.filter(tailor=user.tailor_profile)

	def get_serializer_class(self):
		if self.request.method in ('PUT', 'PATCH'):
			return ServiceCreateUpdateSerializer
		return ServiceSerializer

	# Note: This view also supports DELETE requests to remove a service:
	# DELETE /api/marketplace/me/services/<service_id>/ → 204 No Content


class PublicTailorServicesView(generics.ListAPIView):
	serializer_class = ServiceSerializer
	permission_classes = [permissions.AllowAny]

	def get_queryset(self):
		username = self.kwargs.get('username')
		tailor_profile = generics.get_object_or_404(TailorProfile.objects.select_related('user'), user__username=username)
		return Service.objects.filter(tailor=tailor_profile, is_active=True).prefetch_related('images').order_by('name')


class BookingListCreateView(generics.ListCreateAPIView):
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		# Return bookings for the current authenticated user.
		# - If user is a customer: bookings they made (customer=user)
		# - If user is a tailor: bookings they received (tailor=user)
		from .models import Booking
		user = self.request.user
		if user.role == 'customer':
			return (
				Booking.objects
				.filter(customer=user)
				.select_related('service', 'service__tailor__user', 'tailor')
				.order_by('-created_at')
			)
		# Treat non-customers as tailors for this endpoint
		return (
			Booking.objects
			.filter(tailor=user)
			.select_related('service', 'service__tailor__user', 'customer')
			.order_by('-created_at')
		)

	def get_serializer_class(self):
		if self.request.method == 'POST':
			return BookingCreateSerializer
		return BookingSerializer


class BookingStatusUpdateView(generics.GenericAPIView):
	permission_classes = [permissions.IsAuthenticated]
	lookup_url_kwarg = 'booking_id'
	serializer_class = BookingSerializer

	def get_queryset(self):
		from .models import Booking
		return Booking.objects.select_related('service', 'customer', 'tailor')
		
	def post(self, request, *args, **kwargs):
		return self.update(request, *args, **kwargs)

	def update(self, request, *args, **kwargs):
		from .models import Booking
		booking = self.get_object()
		user = request.user
		new_status = request.data.get('status')
		valid_statuses = {c[0] for c in Booking.Status.choices}
		if new_status not in valid_statuses:
			raise ValidationError('Invalid status')

		from django.utils import timezone
		
		# Permission & transition rules
		if user == booking.customer:
			# Customers can cancel pending or accepted bookings
			allowed = {'cancelled'} if booking.status in {'pending', 'accepted'} else set()
		elif user == booking.tailor:
			if booking.status == 'pending':
				# Tailors can accept or reject pending bookings
				allowed = {'accepted', 'rejected'}
			elif booking.status == 'accepted':
				# Check payment status for accepted bookings
				is_paid = booking.payment_status == 'paid'
				if is_paid:
					# If paid, allow marking as ready for pickup
					allowed = {'pickup_ready'}
				else:
					# If unpaid, allow cancellation
					allowed = {'cancelled'}
			elif booking.status == 'pickup_ready':
				# After marking as ready for pickup, can mark as picked up
				allowed = {'picked_up'}
			elif booking.status == 'picked_up':
				# After pickup, can mark as completed
				allowed = {'completed'}
			else:
				allowed = set()
		else:
			raise PermissionDenied('Not your booking.')

		if new_status not in allowed:
			raise ValidationError('Status transition not allowed.')

		booking.status = new_status
		booking.save(update_fields=['status'])
		serializer = self.get_serializer(booking)
		return Response(serializer.data)


class ReviewListCreateView(generics.ListCreateAPIView):
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		user = self.request.user
		# List reviews written by the user (for quick access)
		return user.reviews_made.select_related('tailor', 'booking__service').order_by('-created_at')

	def get_serializer_class(self):
		if self.request.method == 'POST':
			return ReviewCreateSerializer
		return ReviewSerializer


class PublicTailorReviewsView(generics.ListAPIView):
	serializer_class = ReviewSerializer
	permission_classes = [permissions.AllowAny]

	def get_queryset(self):
		username = self.kwargs.get('username')
		tailor = generics.get_object_or_404(User, username=username, role='tailor')
		return tailor.reviews_received.select_related('customer', 'booking__service').order_by('-created_at')


class InitiatePaymentView(generics.GenericAPIView):
	permission_classes = [permissions.IsAuthenticated]
	serializer_class = BookingSerializer

	def post(self, request, booking_id):
		from .models import Booking
		
		# Configure Stripe with secret key
		stripe.api_key = settings.STRIPE_SECRET_KEY
		
		booking = generics.get_object_or_404(Booking, id=booking_id)
		
		# Verify user is the customer
		if request.user != booking.customer:
			raise PermissionDenied("Only the customer can make payment")
		
		# Verify booking is in correct state
		if booking.status != Booking.Status.ACCEPTED:
			raise ValidationError("Booking must be accepted before payment")
		
		if booking.payment_status == Booking.PaymentStatus.PAID:
			raise ValidationError("Booking is already paid")
		
		try:
			# Debug: Check if we have the API key
			if not settings.STRIPE_SECRET_KEY:
				return Response({
					"error": "Stripe not configured"
				}, status=500)
			
			# Check minimum amount for INR (Stripe requires minimum ₹0.50 = 50 paise)
			min_amount_inr = 0.50  # ₹0.50 minimum for INR
			if booking.price_snapshot < min_amount_inr:
				return Response({
					"error": f"Minimum payment amount is ₹{min_amount_inr}. Current amount: ₹{booking.price_snapshot}"
				}, status=400)
			
			# Create Stripe checkout session (compatible with Stripe 5.x)
			checkout_session = stripe.checkout.Session.create(
				payment_method_types=['card'],
				line_items=[{
					'price_data': {
						'currency': 'inr',  # Indian Rupees
						'product_data': {
							'name': f'Tailoring Service - {booking.service.name}',
						},
						'unit_amount': int(booking.price_snapshot * 100),  # Convert ₹478 to 47800 paise
					},
					'quantity': 1,
				}],
				mode='payment',
				success_url=f'{settings.FRONTEND_URL}/bookings/success?booking_id={booking_id}&session_id={{CHECKOUT_SESSION_ID}}',
				cancel_url=f'{settings.FRONTEND_URL}/bookings/cancel?booking_id={booking_id}',
				metadata={
					'booking_id': str(booking_id),
				},
			)
			
			# Store session ID for later verification
			booking.stripe_session_id = checkout_session.id
			booking.save(update_fields=['stripe_session_id'])
			
			return Response({
				"checkout_url": checkout_session.url,
				"session_id": checkout_session.id,
				"amount": str(booking.price_snapshot)
			})
			
		except Exception as e:
			return Response({
				"error": "Payment initialization failed",
				"details": str(e)
			}, status=400)


class MarkPaymentCompleteView(generics.GenericAPIView):
	permission_classes = [permissions.IsAuthenticated]
	serializer_class = BookingSerializer

	def post(self, request, booking_id):
		from .models import Booking
		
		# Configure Stripe with secret key
		stripe.api_key = settings.STRIPE_SECRET_KEY
		
		booking = generics.get_object_or_404(Booking, id=booking_id)
		
		# Verify user is the customer
		if request.user != booking.customer:
			raise PermissionDenied("Only the customer can make payment")
		
		# Get session_id from request
		session_id = request.data.get('session_id')
		if not session_id:
			raise ValidationError("Session ID is required")
		
		try:
			# Verify the payment with Stripe
			checkout_session = stripe.checkout.Session.retrieve(session_id)
			
			# Verify this session belongs to the booking
			if checkout_session.metadata.get('booking_id') != str(booking_id):
				raise ValidationError("Invalid session for this booking")
			
			# Check if payment was successful
			if checkout_session.payment_status == 'paid':
				if booking.payment_status == Booking.PaymentStatus.UNPAID:
					booking.payment_status = Booking.PaymentStatus.PAID
					booking.stripe_session_id = session_id
					booking.save(update_fields=['payment_status', 'stripe_session_id'])
			else:
				raise ValidationError("Payment was not successful")
			
		except Exception as e:
			return Response({
				"error": "Payment verification failed",
				"details": str(e)
			}, status=400)
		
		serializer = self.get_serializer(booking)
		return Response(serializer.data)


class TailorSearchViewSet(viewsets.ReadOnlyModelViewSet):
	"""
	Read-only ViewSet that supports /api/marketplace/tailors/ endpoint to list
	tailors filtered by specialization and sorted by nearest given lat/lng.

	Query params:
	- specialization: slug or name (case-insensitive contains for name)
	- lat, lng: floats for the user's location. If provided, results include
	  distance_km and are ordered by ascending distance.
	"""

	serializer_class = TailorProfileSerializer
	permission_classes = [permissions.AllowAny]

	def get_serializer_context(self):
		ctx = super().get_serializer_context()
		spec = self.request.query_params.get('specialization')
		if spec:
			ctx['specialization'] = spec
		return ctx

	def get_queryset(self):
		qs = (TailorProfile.objects
			  .select_related('user')
			  .prefetch_related('specializations')
			  .all())

		# Filter by specialization if provided (by slug exact or name icontains)
		specialization = self.request.query_params.get('specialization')
		if specialization:
			qs = qs.filter(
				Q(specializations__slug__iexact=specialization) |
				Q(specializations__name__icontains=specialization)
			).distinct()

		# Order by rating by default
		qs = qs.order_by('-avg_rating')

		# If lat/lng provided, optionally prefilter by radius and annotate with distance
		lat = self.request.query_params.get('lat')
		lng = self.request.query_params.get('lng')
		radius_km = self.request.query_params.get('radius_km')
		try:
			lat = float(lat) if lat is not None else None
			lng = float(lng) if lng is not None else None
			radius_km = float(radius_km) if radius_km is not None else None
		except (TypeError, ValueError):
			raise ValidationError('Invalid lat/lng')

		# Tailor coordinates are stored on related User model
		if lat is not None and lng is not None:
			earth_radius = 6371.0
			user_lat = F('user__latitude')
			user_lng = F('user__longitude')

			# Exclude rows without coordinates
			qs = qs.exclude(user__latitude__isnull=True).exclude(user__longitude__isnull=True)

			# Default radius is 10km if not supplied
			if radius_km is None or radius_km <= 0:
				radius_km = 10.0

			# Bounding box pre-filter for performance
			if radius_km and radius_km > 0:
				from math import cos, radians
				lat_delta = radius_km / 111.32
				lng_delta = radius_km / (111.32 * max(0.1, cos(radians(lat))))
				qs = qs.filter(
					user__latitude__gte=lat - lat_delta,
					user__latitude__lte=lat + lat_delta,
					user__longitude__gte=lng - lng_delta,
					user__longitude__lte=lng + lng_delta,
				)

			if connection.vendor == 'postgresql':
				# Accurate great-circle distance using trig functions
				acos_arg = (
					Cos(Radians(Value(lat))) * Cos(Radians(user_lat)) * Cos(Radians(user_lng - Value(lng))) +
					Sin(Radians(Value(lat))) * Sin(Radians(user_lat))
				)
				clamped = Least(Value(1.0), Greatest(Value(-1.0), acos_arg))
				distance = Value(earth_radius) * ACos(clamped)
				qs = qs.annotate(distance_km=distance).order_by('distance_km')
			else:
				# SQLite/MySQL-safe lightweight surrogate avoiding trig on DB:
				# Use scaled Manhattan distance in degrees and convert to km approximately.
				# distance_deg ≈ |lat - lat0| + |(lng - lng0) * cos(lat0)|
				# distance_km ≈ 111.32 * distance_deg (roughly)
				from math import cos, radians
				cos_lat0 = cos(radians(lat))
				deg_distance = Abs(user_lat - Value(lat)) + Abs((user_lng - Value(lng)) * Value(cos_lat0))
				distance_km = Value(111.32) * deg_distance
				qs = qs.annotate(distance_km=distance_km).order_by('distance_km')

		return qs


# Service Image Management Views
class ServiceImageListCreateView(generics.ListCreateAPIView):
	serializer_class = ServiceImageSerializer
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		user = self.request.user
		service_id = self.kwargs.get('service_id')
		
		# Verify the service belongs to the authenticated tailor
		try:
			service = Service.objects.get(id=service_id, tailor__user=user)
			return service.images.all().order_by('order', 'uploaded_at')
		except Service.DoesNotExist:
			raise PermissionDenied('Service not found or you do not have permission to access it.')

	def perform_create(self, serializer):
		user = self.request.user
		service_id = self.kwargs.get('service_id')
		
		# Verify the service belongs to the authenticated tailor
		try:
			service = Service.objects.get(id=service_id, tailor__user=user)
		except Service.DoesNotExist:
			raise PermissionDenied('Service not found or you do not have permission to access it.')
		
		# Check image limit
		current_count = service.images.count()
		max_images = getattr(settings, 'MAX_SERVICE_IMAGES', 10)
		if current_count >= max_images:
			raise ValidationError(f'Maximum {max_images} images allowed per service.')
		
		serializer.save(service=service)


class ServiceImageDetailView(generics.RetrieveUpdateDestroyAPIView):
	serializer_class = ServiceImageSerializer
	permission_classes = [permissions.IsAuthenticated]

	def get_queryset(self):
		user = self.request.user
		service_id = self.kwargs.get('service_id')
		
		# Verify the service belongs to the authenticated tailor
		try:
			service = Service.objects.get(id=service_id, tailor__user=user)
			return service.images.all()
		except Service.DoesNotExist:
			raise PermissionDenied('Service not found or you do not have permission to access it.')


class ReviewImageUploadView(generics.CreateAPIView):
	"""Upload images for customer reviews"""
	serializer_class = ReviewImageSerializer
	permission_classes = [permissions.IsAuthenticated]

	def perform_create(self, serializer):
		review_id = self.request.data.get('review')
		
		if not review_id:
			raise ValidationError('Review ID is required.')
		
		try:
			review = Review.objects.get(id=review_id)
		except Review.DoesNotExist:
			raise ValidationError('Review not found.')
		
		# Verify the review belongs to the authenticated customer
		if review.customer != self.request.user:
			raise PermissionDenied('You can only upload images for your own reviews.')
		
		# Check if review already has maximum number of images (let's say 5)
		if review.images.count() >= 5:
			raise ValidationError('Maximum of 5 images allowed per review.')
		
		serializer.save(review=review)


class ReviewImageDeleteView(generics.DestroyAPIView):
	"""Delete review images"""
	permission_classes = [permissions.IsAuthenticated]
	
	def get_queryset(self):
		user = self.request.user
		review_id = self.kwargs.get('review_id')
		
		# Verify the review belongs to the authenticated customer
		try:
			review = Review.objects.get(id=review_id, customer=user)
			return review.images.all()
		except Review.DoesNotExist:
			raise PermissionDenied('Review not found or you do not have permission to access it.')

