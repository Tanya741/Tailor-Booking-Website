from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import TailorProfile, Specialization, Service, Booking, Review, ServiceImage, ReviewImage

User = get_user_model()


# Image Serializers
class ServiceImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceImage
        fields = ['id', 'image', 'alt_text', 'order', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']
    
    def to_representation(self, instance):
        """Override to handle Cloudinary URLs properly"""
        data = super().to_representation(instance)
        
        # Handle image URL
        if instance.image:
            try:
                url = instance.image.url
                # If it's already an absolute URL (Cloudinary), use as-is
                if url.startswith('http'):
                    data['image'] = url
                else:
                    # If it's a relative URL (local), build the absolute URL
                    request = self.context.get('request')
                    if request:
                        data['image'] = request.build_absolute_uri(url)
                    else:
                        data['image'] = url
            except Exception:
                data['image'] = None
        else:
            data['image'] = None
            
        return data


class ReviewImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReviewImage
        fields = ['id', 'image', 'alt_text', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']
    
    def to_representation(self, instance):
        """Override to handle Cloudinary URLs properly"""
        data = super().to_representation(instance)
        
        # Handle image URL
        if instance.image:
            try:
                url = instance.image.url
                # If it's already an absolute URL (Cloudinary), use as-is
                if url.startswith('http'):
                    data['image'] = url
                else:
                    # If it's a relative URL (local), build the absolute URL
                    request = self.context.get('request')
                    if request:
                        data['image'] = request.build_absolute_uri(url)
                    else:
                        data['image'] = url
            except Exception:
                data['image'] = None
        else:
            data['image'] = None
            
        return data


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
            'user_id', 'username', 'bio', 'years_experience', 'avg_rating', 'total_reviews', 'specializations', 'distance_km', 'matched_service', 'profile_image'
        ]
        read_only_fields = ['avg_rating', 'total_reviews']
    
    def to_representation(self, instance):
        """Override to handle Cloudinary URLs properly - production-safe version"""
        try:
            # Start with safe defaults
            data = {
                'user_id': None,
                'username': None,
                'bio': '',
                'years_experience': 0,
                'avg_rating': 0.0,
                'total_reviews': 0,
                'specializations': [],
                'distance_km': None,
                'matched_service': None,
                'profile_image': None,
            }
            
            # Safely set each field
            try:
                if instance and hasattr(instance, 'user') and instance.user:
                    data['user_id'] = instance.user.id
                    data['username'] = instance.user.username
            except Exception:
                pass
            
            try:
                data['bio'] = str(instance.bio) if instance.bio else ''
            except Exception:
                pass
                
            try:
                data['years_experience'] = int(instance.years_experience) if instance.years_experience else 0
            except Exception:
                pass
                
            try:
                data['avg_rating'] = float(instance.avg_rating) if instance.avg_rating else 0.0
            except Exception:
                pass
                
            try:
                data['total_reviews'] = int(instance.total_reviews) if instance.total_reviews else 0
            except Exception:
                pass
            
            # Handle specializations very safely
            try:
                if instance and hasattr(instance, 'specializations'):
                    specializations_list = []
                    for s in instance.specializations.all()[:10]:  # Limit to prevent memory issues
                        try:
                            specializations_list.append({
                                'id': s.id, 
                                'name': str(s.name), 
                                'slug': str(s.slug)
                            })
                        except Exception:
                            continue
                    data['specializations'] = specializations_list
            except Exception:
                pass
            
            # Handle optional fields safely
            try:
                data['distance_km'] = getattr(instance, 'distance_km', None)
            except Exception:
                pass
            
            # Handle profile_image URL very safely
            try:
                if instance and hasattr(instance, 'profile_image') and instance.profile_image:
                    try:
                        url = str(instance.profile_image.url)
                        if url.startswith('http'):
                            data['profile_image'] = url
                        else:
                            request = self.context.get('request') if hasattr(self, 'context') and self.context else None
                            if request and hasattr(request, 'build_absolute_uri'):
                                data['profile_image'] = request.build_absolute_uri(url)
                            else:
                                data['profile_image'] = url
                    except Exception:
                        data['profile_image'] = None
            except Exception:
                pass
                
            return data
            
        except Exception:
            # Ultimate fallback - return basic structure
            return {
                'user_id': None,
                'username': 'unknown',
                'bio': '',
                'years_experience': 0,
                'avg_rating': 0.0,
                'total_reviews': 0,
                'specializations': [],
                'distance_km': None,
                'matched_service': None,
                'profile_image': None,
            }

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
            'duration_days': svc.duration_days,
            'is_active': svc.is_active,
        }


class TailorProfileUpdateSerializer(serializers.ModelSerializer):
    # Accept a list of specialization names to set
    specializations = serializers.ListField(
        child=serializers.CharField(), write_only=True, required=False
    )

    class Meta:
        model = TailorProfile
        fields = ['bio', 'years_experience', 'specializations', 'profile_image']

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
    images = ServiceImageSerializer(many=True, read_only=True)

    class Meta:
        model = Service
        fields = ['id', 'tailor_username', 'name', 'description', 'price', 'duration_days', 'is_active', 'images']
        read_only_fields = ['id', 'tailor_username']


class ServiceCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ['id', 'name', 'description', 'price', 'duration_days', 'is_active']
        read_only_fields = ['id']

    def validate_name(self, value):
        tailor_profile = self.context['request'].user.tailor_profile
        if Service.objects.filter(tailor=tailor_profile, name=value).exclude(pk=getattr(self.instance, 'pk', None)).exists():
            raise serializers.ValidationError('You already have a service with that name.')
        return value


class BookingSerializer(serializers.ModelSerializer):
    customer_username = serializers.CharField(source='customer.username', read_only=True)
    tailor_username = serializers.CharField(source='tailor.username', read_only=True)
    service_name = serializers.CharField(source='service.name', read_only=True)
    has_review = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id', 'customer_username', 'tailor_username', 'service', 'service_name',
            'status', 'pickup_date', 'delivery_date', 'price_snapshot', 'payment_status', 
            'has_review', 'created_at'
        ]
        read_only_fields = ['id', 'customer_username', 'tailor_username', 'service_name', 'status', 'price_snapshot', 'payment_status', 'has_review', 'created_at']
    
    def get_has_review(self, obj):
        return hasattr(obj, 'review')


class BookingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ['service', 'pickup_date']

    def validate(self, attrs):
        service = attrs['service']
        if not service.is_active:
            raise serializers.ValidationError('Service is not active.')
        user = self.context['request'].user
        if user.role != 'customer':
            raise serializers.ValidationError('Only customers can create bookings.')
        
        # Calculate delivery date based on service duration
        pickup_date = attrs['pickup_date']
        if pickup_date < timezone.now():
            raise serializers.ValidationError('Pickup date cannot be in the past.')
        
        attrs['delivery_date'] = pickup_date + timezone.timedelta(days=service.duration_days)
        return attrs

    def create(self, validated_data):
        request = self.context['request']
        service = validated_data['service']
        booking = Booking.objects.create(
            customer=request.user,
            tailor=service.tailor.user,
            service=service,
            pickup_date=validated_data['pickup_date'],
            delivery_date=validated_data['delivery_date'],
            price_snapshot=service.price,
        )
        return booking


class ReviewSerializer(serializers.ModelSerializer):
    customer_username = serializers.CharField(source='customer.username', read_only=True)
    tailor_username = serializers.CharField(source='tailor.username', read_only=True)
    service_name = serializers.CharField(source='booking.service.name', read_only=True)
    service_price = serializers.DecimalField(source='booking.service.price', max_digits=8, decimal_places=2, read_only=True)
    images = ReviewImageSerializer(many=True, read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'booking', 'customer_username', 'tailor_username', 'service_name', 'service_price', 'rating', 'comment', 'images', 'created_at']
        read_only_fields = ['id', 'customer_username', 'tailor_username', 'service_name', 'service_price', 'created_at']


class ReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ['id', 'booking', 'rating', 'comment']
        read_only_fields = ['id']

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



