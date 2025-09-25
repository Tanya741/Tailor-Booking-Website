from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import authenticate, get_user_model
from django.utils import timezone
from django.conf import settings
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer

from .serializers import UserRegisterSerializer, UserSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
	serializer_class = UserRegisterSerializer
	permission_classes = [permissions.AllowAny]


class MeView(APIView):
	def get(self, request):
		return Response(UserSerializer(request.user).data)

	def patch(self, request):
		serializer = UserSerializer(request.user, data=request.data, partial=True)
		serializer.is_valid(raise_exception=True)
		serializer.save()
		return Response(serializer.data)


class CombinedAuthView(APIView):
	"""Unified endpoint to (a) register, (b) login, (c) refresh token.

	Request patterns:
	1. Register:
	   {"action": "register", "username": "u", "email": "e", "password": "p", "role": "tailor|customer", "latitude": 12.9, "longitude": 77.6 }
	2. Login:
	   {"action": "login", "username": "u", "password": "p"}
	3. Refresh:
	   {"action": "refresh", "refresh": "<refresh_token>"}

	Response (examples) always returns:
	{
	  "user": {...},
	  "access": "...", "refresh": "...", (refresh missing only if using existing pair not rotated)
	  "tailor_profile": {...} or null,
	  "access_expires_at": ISO timestamp
	}
	"""
	permission_classes = [permissions.AllowAny]

	def post(self, request):
		action = (request.data.get('action') or '').lower()
		if action not in {'register', 'login', 'refresh'}:
			return Response({'detail': 'Invalid action. Use register | login | refresh.'}, status=400)

		if action == 'register':
			reg_serializer = UserRegisterSerializer(data=request.data)
			reg_serializer.is_valid(raise_exception=True)
			user = reg_serializer.save()
			# authenticate not strictly needed; create tokens directly
			token_serializer = TokenObtainPairSerializer(data={
				'username': reg_serializer.validated_data['username'],
				'password': request.data['password']
			})
			token_serializer.is_valid(raise_exception=True)
			tokens = token_serializer.validated_data
			return self._build_response(user, tokens)

		if action == 'login':
			username = request.data.get('username')
			password = request.data.get('password')
			if not username or not password:
				return Response({'detail': 'username and password required'}, status=400)
			auth_serializer = TokenObtainPairSerializer(data={'username': username, 'password': password})
			auth_serializer.is_valid(raise_exception=True)
			# fetch user for profile info
			try:
				user = User.objects.get(username=username)
			except User.DoesNotExist:
				return Response({'detail': 'Invalid credentials'}, status=401)
			return self._build_response(user, auth_serializer.validated_data)

		if action == 'refresh':
			refresh_token = request.data.get('refresh')
			if not refresh_token:
				return Response({'detail': 'refresh token required'}, status=400)
			ref_serializer = TokenRefreshSerializer(data={'refresh': refresh_token})
			ref_serializer.is_valid(raise_exception=True)
			access = ref_serializer.validated_data['access']
			# We cannot always rotate refresh unless configured; keep same
			# Try to identify user id from refresh token (decode manually optional)
			# Simpler: tell client user to call /api/users/me/ if user info needed.
			return Response({
				'access': access,
				'refresh': refresh_token,
				'access_expires_at': (timezone.now() + settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME']).isoformat(),
			})

	def _build_response(self, user, tokens):
		access = tokens.get('access')
		refresh = tokens.get('refresh')
		profile_data = None
		if user.role == 'tailor':
			# Ensure a TailorProfile exists (covers legacy users and JWT login without session signals)
			from marketplace.models import TailorProfile
			tp, _ = TailorProfile.objects.get_or_create(user=user)
			from marketplace.serializers import TailorProfileSerializer
			profile_data = TailorProfileSerializer(tp).data
		return Response({
			'user': UserSerializer(user).data,
			'access': access,
			'refresh': refresh,
			'tailor_profile': profile_data,
			'access_expires_at': (timezone.now() + settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME']).isoformat(),
		}, status=status.HTTP_200_OK)

