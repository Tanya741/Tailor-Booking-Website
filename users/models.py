from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
	class Roles(models.TextChoices):
		CUSTOMER = "customer", "Customer"
		TAILOR = "tailor", "Tailor"

	role = models.CharField(max_length=20, choices=Roles.choices)
	latitude = models.FloatField(null=True, blank=True)
	longitude = models.FloatField(null=True, blank=True)

	def __str__(self):  # pragma: no cover simple representation
		return f"{self.username} ({self.role})"

