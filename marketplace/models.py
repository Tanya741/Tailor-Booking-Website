from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal

User = settings.AUTH_USER_MODEL


class Specialization(models.Model):
	name = models.CharField(max_length=100, unique=True)
	slug = models.SlugField(max_length=120, unique=True)

	def __str__(self):
		return self.name


class TailorProfile(models.Model):
	user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='tailor_profile')
	bio = models.TextField(blank=True)
	years_experience = models.PositiveIntegerField(default=0)
	specializations = models.ManyToManyField(Specialization, blank=True, related_name='tailors')
	avg_rating = models.DecimalField(max_digits=3, decimal_places=2, default=Decimal('0.00'))
	total_reviews = models.PositiveIntegerField(default=0)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self):
		return f"TailorProfile({self.user})"


class Service(models.Model):
	tailor = models.ForeignKey(TailorProfile, on_delete=models.CASCADE, related_name='services')
	name = models.CharField(max_length=150)
	description = models.TextField(blank=True)
	price = models.DecimalField(max_digits=8, decimal_places=2)
	duration_minutes = models.PositiveIntegerField()
	is_active = models.BooleanField(default=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		unique_together = ("tailor", "name")

	def __str__(self):
		return f"{self.name} ({self.tailor.user})"


class Booking(models.Model):
	class Status(models.TextChoices):
		PENDING = 'pending', 'Pending'
		ACCEPTED = 'accepted', 'Accepted'
		REJECTED = 'rejected', 'Rejected'
		COMPLETED = 'completed', 'Completed'
		CANCELLED = 'cancelled', 'Cancelled'

	class PaymentStatus(models.TextChoices):
		UNPAID = 'unpaid', 'Unpaid'
		PAID = 'paid', 'Paid'

	customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings_made')
	tailor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings_received')
	service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='bookings')
	status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
	scheduled_time = models.DateTimeField()
	price_snapshot = models.DecimalField(max_digits=8, decimal_places=2)
	payment_status = models.CharField(max_length=10, choices=PaymentStatus.choices, default=PaymentStatus.UNPAID)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	def __str__(self):
		return f"Booking #{self.id} {self.customer} -> {self.tailor} ({self.status})"

	def clean(self):
		from django.core.exceptions import ValidationError
		if self.scheduled_time < timezone.now():
			raise ValidationError("Scheduled time cannot be in the past.")


class Review(models.Model):
	booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='review')
	customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_made')
	tailor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_received')
	rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
	comment = models.TextField(blank=True)
	created_at = models.DateTimeField(auto_now_add=True)

	def __str__(self):
		return f"Review {self.rating} for {self.tailor}"

	def save(self, *args, **kwargs):
		new = self.pk is None
		super().save(*args, **kwargs)
		# Update tailor profile aggregates
		try:
			profile = self.tailor.tailor_profile
		except TailorProfile.DoesNotExist:
			return
		from django.db.models import Avg, Count
		agg = Review.objects.filter(tailor=self.tailor).aggregate(avg=Avg('rating'), cnt=Count('id'))
		profile.avg_rating = Decimal(str(round(agg['avg'] or 0, 2)))
		profile.total_reviews = agg['cnt'] or 0
		profile.save(update_fields=['avg_rating', 'total_reviews'])

