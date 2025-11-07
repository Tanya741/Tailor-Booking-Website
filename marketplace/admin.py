from django.contrib import admin
from .models import Specialization, TailorProfile, Service, Booking, Review


@admin.register(Specialization)
class SpecializationAdmin(admin.ModelAdmin):
	list_display = ("name", "slug")
	prepopulated_fields = {"slug": ("name",)}


@admin.register(TailorProfile)
class TailorProfileAdmin(admin.ModelAdmin):
	list_display = ("user", "years_experience", "avg_rating", "total_reviews")
	search_fields = ("user__username", "user__email")
	filter_horizontal = ("specializations",)


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
	list_display = ("name", "tailor", "price", "duration_days", "is_active")
	list_filter = ("is_active",)
	search_fields = ("name", "tailor__user__username")


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
	list_display = ("id", "customer", "tailor", "service", "status", "pickup_date", "delivery_date", "payment_status")
	list_filter = ("status", "payment_status")
	search_fields = ("customer__username", "tailor__username")


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
	list_display = ("id", "booking", "customer", "tailor", "rating", "created_at")
	list_filter = ("rating",)
	search_fields = ("customer__username", "tailor__username")


# Register your models here.
