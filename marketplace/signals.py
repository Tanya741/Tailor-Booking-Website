from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from .models import TailorProfile

User = get_user_model()


@receiver(post_save, sender=User)
def ensure_tailor_profile(sender, instance, created, **kwargs):
    """Ensure every tailor user has a TailorProfile.

    Runs on every save (cheap get_or_create). Covers:
    - User created with role='tailor'
    - Existing user whose role is changed to 'tailor' later
    """
    if instance.role == 'tailor':
        TailorProfile.objects.get_or_create(user=instance)
