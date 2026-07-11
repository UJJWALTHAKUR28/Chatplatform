"""
Custom User model for the Chat Application.

Design decisions:
  - Email is the unique identifier (USERNAME_FIELD = "email")
  - No username field — removes ambiguity between email and username login
  - display_name is how the user appears in the chat UI (must be unique)
  - Inherits from AbstractBaseUser (gives password + last_login)
    and PermissionsMixin (gives groups, user_permissions, is_superuser)
  - UUID primary key for security (no sequential IDs exposed in URLs/WS)
"""

import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models
from django.utils import timezone

from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    """
    Application user identified by email address.

    Fields
    ──────
    id            UUID primary key
    email         Unique login identifier
    display_name  The name shown inside conversations (max 50 chars, unique)
    is_active     Allows account deactivation without deletion
    is_staff      Django admin access
    date_joined   Account creation timestamp
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        db_index=True,
    )
    email = models.EmailField(
        unique=True,
        db_index=True,
        verbose_name="email address",
        help_text="Used for login. Must be unique across all accounts.",
    )
    display_name = models.CharField(
        max_length=50,
        unique=True,
        blank=False,
        db_index=True,
        help_text="The name shown to other users inside the chat. Must be unique.",
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Uncheck to deactivate the account without deleting it.",
    )
    is_staff = models.BooleanField(
        default=False,
        help_text="Grants access to the Django admin site.",
    )
    date_joined = models.DateTimeField(default=timezone.now)

    # ── Manager ──────────────────────────────────────────────────────────────
    objects = UserManager()

    # ── Auth config ──────────────────────────────────────────────────────────
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["display_name"]  # asked by createsuperuser, not for login

    class Meta:
        verbose_name = "user"
        verbose_name_plural = "users"
        ordering = ["date_joined"]

    def __str__(self) -> str:
        return f"{self.display_name} <{self.email}>"

    def get_full_name(self) -> str:
        return self.display_name

    def get_short_name(self) -> str:
        return self.display_name
