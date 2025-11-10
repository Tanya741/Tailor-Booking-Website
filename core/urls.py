"""
URL configuration for core project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import SimpleRouter
from marketplace.views import TailorSearchViewSet
from django.http import JsonResponse
import os

def debug_env(request):
    """Debug endpoint to check environment variables and test file storage"""
    from django.core.files.storage import default_storage
    
    # Test file storage type
    storage_class = default_storage.__class__
    storage_name = f"{storage_class.__module__}.{storage_class.__name__}"
    
    # Check if we can get a sample TailorProfile with an image
    sample_image_info = None
    try:
        from marketplace.models import TailorProfile
        profile_with_image = TailorProfile.objects.exclude(profile_image__isnull=True).exclude(profile_image__exact='').first()
        if profile_with_image and profile_with_image.profile_image:
            sample_image_info = {
                'has_image': True,
                'image_name': profile_with_image.profile_image.name,
                'image_url': profile_with_image.profile_image.url,
                'url_starts_with_http': profile_with_image.profile_image.url.startswith('http'),
                'url_contains_cloudinary': 'cloudinary' in profile_with_image.profile_image.url.lower(),
            }
    except Exception as e:
        sample_image_info = {'error': str(e)}
    
    return JsonResponse({
        'USE_CLOUDINARY': getattr(settings, 'USE_CLOUDINARY', None),
        'CLOUDINARY_CLOUD_NAME_SET': bool(os.environ.get('CLOUDINARY_CLOUD_NAME')),
        'CLOUDINARY_API_KEY_SET': bool(os.environ.get('CLOUDINARY_API_KEY')), 
        'CLOUDINARY_API_SECRET_SET': bool(os.environ.get('CLOUDINARY_API_SECRET')),
        'DEFAULT_FILE_STORAGE': getattr(settings, 'DEFAULT_FILE_STORAGE', 'Not set'),
        'ACTUAL_STORAGE_CLASS': storage_name,
        'DEBUG': settings.DEBUG,
        'MEDIA_URL': settings.MEDIA_URL,
        'SAMPLE_IMAGE_INFO': sample_image_info,
    })

def debug_users(request):
    """Debug endpoint to check users in database"""
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    
    # Get all users
    users = User.objects.all()
    user_info = []
    
    for user in users:
        user_info.append({
            'username': user.username,
            'email': user.email,
            'is_superuser': user.is_superuser,
            'is_staff': user.is_staff,
            'is_active': user.is_active,
            'role': getattr(user, 'role', 'No role field'),
            'date_joined': user.date_joined.isoformat() if user.date_joined else None,
        })
    
    return JsonResponse({
        'total_users': users.count(),
        'superuser_count': User.objects.filter(is_superuser=True).count(),
        'staff_count': User.objects.filter(is_staff=True).count(),
        'users': user_info,
        'env_vars_set': {
            'SUPERUSER_USERNAME': bool(os.environ.get('SUPERUSER_USERNAME')),
            'SUPERUSER_EMAIL': bool(os.environ.get('SUPERUSER_EMAIL')),
            'SUPERUSER_PASSWORD': bool(os.environ.get('SUPERUSER_PASSWORD')),
        }
    })

def create_superuser_now(request):
    """Manual endpoint to create superuser"""
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    
    username = os.environ.get('SUPERUSER_USERNAME', 'admin')
    email = os.environ.get('SUPERUSER_EMAIL', 'admin@example.com')
    password = os.environ.get('SUPERUSER_PASSWORD')
    
    if not password:
        return JsonResponse({
            'success': False,
            'error': 'SUPERUSER_PASSWORD environment variable is required'
        })
    
    if User.objects.filter(username=username).exists():
        return JsonResponse({
            'success': False,
            'error': f'Superuser with username "{username}" already exists'
        })
    
    try:
        user = User.objects.create_superuser(
            username=username,
            email=email,
            password=password,
            role='admin'
        )
        
        return JsonResponse({
            'success': True,
            'message': f'Superuser "{username}" created successfully',
            'user_id': user.id,
            'is_superuser': user.is_superuser,
            'is_staff': user.is_staff
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': f'Error creating superuser: {str(e)}'
        })

router = SimpleRouter()
router.register(r'tailors', TailorSearchViewSet, basename='tailor-search')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('users.urls')),
    path('api/marketplace/', include('marketplace.urls')),
    # Frontend expects /api/tailors/
    path('api/', include(router.urls)),
    # Debug endpoints - REMOVE IN PRODUCTION
    path('api/debug-env/', debug_env, name='debug-env'),
    path('api/debug-users/', debug_users, name='debug-users'),
    path('api/create-superuser/', create_superuser_now, name='create-superuser'),
    # Note: Frontend is served separately via Render static site, not through Django
]

# Serve media files (for both development and production)
# In production, you might want to use a CDN or dedicated media server
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
