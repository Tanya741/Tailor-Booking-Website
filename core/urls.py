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
from core.views import FrontendAppView

router = SimpleRouter()
router.register(r'tailors', TailorSearchViewSet, basename='tailor-search')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('users.urls')),
    path('api/marketplace/', include('marketplace.urls')),
    # Frontend expects /api/tailors/
    path('api/', include(router.urls)),
    path('', FrontendAppView.as_view(), name='home'),
]

# Serve media files (for both development and production)
# In production, you might want to use a CDN or dedicated media server
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
