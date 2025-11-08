# Debug Environment Variables View
# Add this to your core/urls.py temporarily to debug

from django.http import JsonResponse
from django.conf import settings
import os

def debug_env(request):
    """Debug endpoint to check environment variables"""
    return JsonResponse({
        'USE_CLOUDINARY': getattr(settings, 'USE_CLOUDINARY', None),
        'CLOUDINARY_CLOUD_NAME_SET': bool(os.environ.get('CLOUDINARY_CLOUD_NAME')),
        'CLOUDINARY_API_KEY_SET': bool(os.environ.get('CLOUDINARY_API_KEY')), 
        'CLOUDINARY_API_SECRET_SET': bool(os.environ.get('CLOUDINARY_API_SECRET')),
        'DEFAULT_FILE_STORAGE': getattr(settings, 'DEFAULT_FILE_STORAGE', 'Not set'),
        'DEBUG': settings.DEBUG,
        'MEDIA_URL': settings.MEDIA_URL,
    })