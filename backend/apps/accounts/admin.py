"""
Admin registration for the accounts app.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Admin panel configuration for the custom User model.

    Since we swapped out username for email, we need to explicitly
    configure the fieldsets and add/change forms.
    """

    # ── List view ─────────────────────────────────────────────────────────────
    list_display = ["email", "display_name", "is_active", "is_staff", "date_joined"]
    list_filter = ["is_active", "is_staff", "is_superuser"]
    search_fields = ["email", "display_name"]
    ordering = ["-date_joined"]
    readonly_fields = ["date_joined", "last_login", "id"]

    # ── Detail / Change view ──────────────────────────────────────────────────
    fieldsets = (
        (None, {"fields": ("id", "email", "password")}),
        ("Profile", {"fields": ("display_name",)}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )

    # ── Add user form ─────────────────────────────────────────────────────────
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "display_name", "password1", "password2"),
            },
        ),
    )
