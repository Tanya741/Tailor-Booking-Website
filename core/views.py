from django.views.generic import View
from django.http import HttpResponse
from django.conf import settings
import os

class FrontendAppView(View):
    def get(self, request):
        index_path = os.path.join(settings.STATIC_ROOT, 'index.html')
        try:
            with open(index_path, encoding='utf-8') as f:
                return HttpResponse(f.read())
        except FileNotFoundError:
            return HttpResponse('Frontend build not found.', status=404)
