"""
URL patterns for the accounts app.

All routes are mounted at /api/v1/auth/ from core/urls.py.
"""

from django.urls import path

from .views import LoginView, LogoutView, MeView, RegisterView, UserSearchView

urlpatterns = [
    # ── Authentication ────────────────────────────────────────────────────────
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),

    # ── Current user profile (GET + PATCH) ───────────────────────────────────
    # GET  /api/v1/auth/me/  — fetch own profile
    # PATCH /api/v1/auth/me/ — update display_name
    path("me/", MeView.as_view(), name="auth-me"),

    # ── User search (for starting new conversations) ──────────────────────────
    # GET /api/v1/auth/users/search/?q=<query>
    path("users/search/", UserSearchView.as_view(), name="user-search"),
]
