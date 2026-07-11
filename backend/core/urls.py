"""
URL configuration for the Chat Application.

Route layout
────────────
  /admin/                           → Django admin panel
  /api/v1/auth/                     → accounts app (register, login, logout, me, search)
  /api/v1/chat/                     → chat app (conversations, messages)
  /api/v1/token/refresh/            → SimpleJWT TokenRefreshView
  /api/v1/token/blacklist/          → SimpleJWT TokenBlacklistView (manual logout)

WebSocket routes are defined in apps/chat/routing.py and mounted via
core/asgi.py — they are NOT Django URL patterns.
"""

from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenBlacklistView, TokenRefreshView

urlpatterns = [
    # ── Django Admin ────────────────────────────────────────────────────────
    path("admin/", admin.site.urls),

    # ── JWT Token Management ─────────────────────────────────────────────────
    # Refresh:   POST  /api/v1/token/refresh/    {refresh} → {access, refresh}
    # Blacklist: POST  /api/v1/token/blacklist/  {refresh} → 205 (logout)
    path("api/v1/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/v1/token/blacklist/", TokenBlacklistView.as_view(), name="token_blacklist"),

    # ── Accounts ─────────────────────────────────────────────────────────────
    # POST /api/v1/auth/register/       → create account + get JWT pair
    # POST /api/v1/auth/login/          → authenticate + get JWT pair
    # POST /api/v1/auth/logout/         → blacklist refresh token
    # GET  /api/v1/auth/me/             → own user profile
    # GET  /api/v1/auth/users/search/   → search users by email/display_name
    path("api/v1/auth/", include("apps.accounts.urls")),

    # ── Chat ─────────────────────────────────────────────────────────────────
    # GET  /api/v1/chat/conversations/             → list own conversations
    # POST /api/v1/chat/conversations/             → create new conversation
    # GET  /api/v1/chat/conversations/<uuid>/      → single conversation detail
    # GET  /api/v1/chat/conversations/<uuid>/messages/  → paginated message history
    path("api/v1/chat/", include("apps.chat.urls")),
]
