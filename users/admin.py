from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
	fieldsets = UserAdmin.fieldsets + (
		("Extra", {"fields": ("role", "latitude", "longitude")}),
	)
	list_display = ("username", "email", "role", "latitude", "longitude", "is_staff")
	list_filter = ("role", "is_staff", "is_superuser")


# Register your models here.
