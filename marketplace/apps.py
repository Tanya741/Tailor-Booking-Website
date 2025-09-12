from django.apps import AppConfig


class MarketplaceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'marketplace'

    def ready(self):
        # Import signals so that the @receiver decorator in signals.py runs
        # and ensures each tailor user has a TailorProfile (idempotent).
        from . import signals  # noqa: F401
