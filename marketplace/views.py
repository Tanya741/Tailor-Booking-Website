from rest_framework import permissions, generics, viewsets
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.contrib.auth import get_user_model
from django.db import connection
from django.db.models import F, Value, Q
from django.db.models.functions import Radians, Sin, Cos, ACos, Least, Greatest, Abs

from .models import TailorProfile, Service
from .serializers import (
	TailorProfileSerializer,
	TailorProfileUpdateSerializer,
	ServiceSerializer,
	ServiceCreateUpdateSerializer,
	BookingSerializer,
	BookingCreateSerializer,
	ReviewSerializer,
	ReviewCreateSerializer,
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
		return Service.objects.filter(tailor=user.tailor_profile).order_by('-created_at')

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
		return Service.objects.filter(tailor=tailor_profile, is_active=True).order_by('name')


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


class BookingStatusUpdateView(generics.UpdateAPIView):
	permission_classes = [permissions.IsAuthenticated]
	lookup_url_kwarg = 'booking_id'
	serializer_class = BookingSerializer

	def get_queryset(self):
		from .models import Booking
		return Booking.objects.select_related('service', 'customer', 'tailor')

	def update(self, request, *args, **kwargs):
		from .models import Booking
		booking = self.get_object()
		user = request.user
		new_status = request.data.get('status')
		valid_statuses = {c[0] for c in Booking.Status.choices}
		if new_status not in valid_statuses:
			raise ValidationError('Invalid status')

		# Permission & transition rules
		if user == booking.customer:
			allowed = {'cancelled'} if booking.status in {'pending', 'accepted'} else set()
		elif user == booking.tailor:
			if new_status in {'accepted', 'rejected'} and booking.status == 'pending':
				allowed = {new_status}
			elif new_status == 'completed' and booking.status == 'accepted':
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
		return user.reviews_made.select_related('tailor', 'booking').order_by('-created_at')

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
		return tailor.reviews_received.select_related('customer', 'booking').order_by('-created_at')


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

