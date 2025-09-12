from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from marketplace.models import TailorProfile

User = get_user_model()

class Command(BaseCommand):
    help = "Create missing TailorProfile rows for users with role='tailor'."

    def handle(self, *args, **options):
        tailors = User.objects.filter(role='tailor')
        created = 0
        for u in tailors:
            obj, was_created = TailorProfile.objects.get_or_create(user=u)
            if was_created:
                created += 1
        self.stdout.write(self.style.SUCCESS(f'Missing profiles created: {created}'))
