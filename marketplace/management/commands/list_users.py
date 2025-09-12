from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from marketplace.models import TailorProfile
from django.db.models import Exists, OuterRef

User = get_user_model()

class Command(BaseCommand):
    help = "List all users with role and whether a TailorProfile exists."

    def handle(self, *args, **options):
        qs = (User.objects
              .annotate(has_profile=Exists(TailorProfile.objects.filter(user=OuterRef('pk'))))
              .order_by('id'))
        self.stdout.write("ID | Username | Role     | HasProfile | Email")
        self.stdout.write('-'*60)
        for u in qs:
            self.stdout.write(f"{u.id:2} | {u.username:<8} | {u.role:<8} | {str(u.has_profile):<10} | {u.email or '-'}")
        missing = qs.filter(role='tailor', has_profile=False).count()
        self.stdout.write(f"\nTailor users missing profile: {missing}")
