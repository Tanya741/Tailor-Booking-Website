from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import TailorProfile, Specialization, Service, Booking, Review

User = get_user_model()


class SpecializationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialization
        fields = ['id', 'name', 'slug']
        read_only_fields = ['id', 'slug']


class TailorProfileSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    specializations = SpecializationSerializer(many=True, read_only=True)
    # Optional distance in kilometers, populated by search endpoint when available
    distance_km = serializers.FloatField(read_only=True, required=False)
    # Service that matches the requested specialization (if provided in context)
    matched_service = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = TailorProfile
        fields = [
            'user_id', 'username', 'bio', 'years_experience', 'avg_rating', 'total_reviews', 'specializations', 'distance_km', 'matched_service'
        ]
        read_only_fields = ['avg_rating', 'total_reviews']

    def get_matched_service(self, obj: TailorProfile):
        spec_slug = (self.context or {}).get('specialization')
        if not spec_slug:
            return None
        # Find specialization label to match against service names
        try:
            spec = obj.specializations.filter(slug__iexact=spec_slug).first()
        except Exception:
            spec = None
        label = spec.name if spec else None
        # Fallback: use slug words as keywords
        keywords = []
        if label:
            keywords = [label]
        else:
            keywords = [spec_slug.replace('-', ' '), spec_slug]

        qs = obj.services.filter(is_active=True)
        # Prefer exact/icontains name matches
        from django.db.models import Q
        q = Q()
        for kw in keywords:
            q |= Q(name__iexact=kw) | Q(name__icontains=kw)
        svc = qs.filter(q).order_by('name').first()
        if not svc:
            return None
        return {
            'id': svc.id,
            'name': svc.name,
            'price': str(svc.price),
            'duration_minutes': svc.duration_minutes,
            'is_active': svc.is_active,
        }


class TailorProfileUpdateSerializer(serializers.ModelSerializer):
    # Accept a list of specialization names to set
    specializations = serializers.ListField(
        child=serializers.CharField(), write_only=True, required=False
    )

    class Meta:
        model = TailorProfile
        fields = ['bio', 'years_experience', 'specializations']

    def update(self, instance, validated_data):
        spec_names = validated_data.pop('specializations', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if spec_names is not None:
            from .models import Specialization
            objs = []
            for name in spec_names:
                name_clean = name.strip()
                if not name_clean:
                    continue
                slug = name_clean.lower().replace(' ', '-')
                spec, _ = Specialization.objects.get_or_create(name=name_clean, defaults={'slug': slug})
                objs.append(spec)
            instance.specializations.set(objs)
        return instance


class ServiceSerializer(serializers.ModelSerializer):
    tailor_username = serializers.CharField(source='tailor.user.username', read_only=True)

    class Meta:
        model = Service
        fields = ['id', 'tailor_username', 'name', 'description', 'price', 'duration_minutes', 'is_active']
        read_only_fields = ['id', 'tailor_username']


class ServiceCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ['name', 'description', 'price', 'duration_minutes', 'is_active']

    def validate_name(self, value):
        tailor_profile = self.context['request'].user.tailor_profile
        if Service.objects.filter(tailor=tailor_profile, name=value).exclude(pk=getattr(self.instance, 'pk', None)).exists():
            raise serializers.ValidationError('You already have a service with that name.')
        return value


class BookingSerializer(serializers.ModelSerializer):
    customer_username = serializers.CharField(source='customer.username', read_only=True)
    tailor_username = serializers.CharField(source='tailor.username', read_only=True)
    service_name = serializers.CharField(source='service.name', read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'customer_username', 'tailor_username', 'service', 'service_name',
            'status', 'scheduled_time', 'price_snapshot', 'payment_status', 'created_at'
        ]
        read_only_fields = ['id', 'customer_username', 'tailor_username', 'service_name', 'status', 'price_snapshot', 'payment_status', 'created_at']


class BookingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ['service', 'scheduled_time']

    def validate(self, attrs):
        service = attrs['service']
        if not service.is_active:
            raise serializers.ValidationError('Service is not active.')
        user = self.context['request'].user
        if user.role != 'customer':
            raise serializers.ValidationError('Only customers can create bookings.')
        return attrs

    def create(self, validated_data):
        request = self.context['request']
        service = validated_data['service']
        booking = Booking.objects.create(
            customer=request.user,
            tailor=service.tailor.user,
            service=service,
            scheduled_time=validated_data['scheduled_time'],
            price_snapshot=service.price,
        )
        return booking


class ReviewSerializer(serializers.ModelSerializer):
    customer_username = serializers.CharField(source='customer.username', read_only=True)
    tailor_username = serializers.CharField(source='tailor.username', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'booking', 'customer_username', 'tailor_username', 'rating', 'comment', 'created_at']
        read_only_fields = ['id', 'customer_username', 'tailor_username', 'created_at']


class ReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ['booking', 'rating', 'comment']

    def validate(self, attrs):
        booking = attrs['booking']
        user = self.context['request'].user
        if booking.customer != user:
            raise serializers.ValidationError('You can only review your own booking.')
        if booking.status != 'completed':
            raise serializers.ValidationError('Booking must be completed to review.')
        if hasattr(booking, 'review'):
            raise serializers.ValidationError('Booking already reviewed.')
        return attrs

    def create(self, validated_data):
        booking = validated_data['booking']
        return Review.objects.create(
            booking=booking,
            customer=booking.customer,
            tailor=booking.tailor,
            rating=validated_data['rating'],
            comment=validated_data.get('comment', ''),
        )
"""Serializers for marketplace app.

Note: Duplicate definitions were removed to avoid confusion. We keep the
original TailorProfileSerializer/TailorProfileUpdateSerializer pair that the
views expect (Update serializer uses field name 'specializations').
"""
