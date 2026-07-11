"""
Django settings for the Chat Application.

Stack:
  - Django 5 + DRF
  - PostgreSQL (primary DB)
  - Redis (channel layer + cache for presence/typing) — with InMemory fallback
  - Django Channels (WebSocket real-time)
  - SimpleJWT (access/refresh tokens, refresh blacklist)
  - django-cors-headers (Next.js frontend)
  - cryptography (Fernet AES message encryption)

Reads all secrets from .env via python-decouple.
"""

import logging
from datetime import timedelta
from pathlib import Path

import dj_database_url
from decouple import Csv, config

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# Security
# ---------------------------------------------------------------------------
SECRET_KEY = config("SECRET_KEY")
DEBUG = config("DEBUG", default=False, cast=bool)
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())

# ---------------------------------------------------------------------------
# Application definition
# ---------------------------------------------------------------------------
DJANGO_APPS = [
    # daphne MUST be before django.contrib.staticfiles (daphne.E001)
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    # ASGI / WebSockets
    "channels",
    # REST
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",  # refresh-token blacklist (Postgres table)
    # CORS
    "corsheaders",
]

LOCAL_APPS = [
    "apps.accounts",
    "apps.chat",
    "apps.common",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # WhiteNoise: serve static files efficiently in production (place after SecurityMiddleware)
    "whitenoise.middleware.WhiteNoiseMiddleware",
    # CORS must be as high as possible, before CommonMiddleware
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# ---------------------------------------------------------------------------
# URL / ASGI / WSGI
# ---------------------------------------------------------------------------
ROOT_URLCONF = "core.urls"
WSGI_APPLICATION = "core.wsgi.application"
ASGI_APPLICATION = "core.asgi.application"  # Channels entry-point

# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# ---------------------------------------------------------------------------
# Database — PostgreSQL
# ---------------------------------------------------------------------------
DATABASES = {
    "default": dj_database_url.config(
        default=config("DATABASE_URL", default="postgres://chatuser:chatpass@localhost:5432/chatdb"),
        # ── Connection persistence ──────────────────────────────────────────────
        # Supabase free (session mode, port 5432): max 15 simultaneous connections.
        #   → conn_max_age=0  (open+close per request, never exhaust the pool)
        #
        # Railway Postgres (same-network): no connection limit, ~1-5ms latency.
        #   → conn_max_age=600  (persistent connections, much faster throughput)
        #
        # Switch by setting DB_PERSISTENT_CONNECTIONS=true in Railway env vars
        # after adding a Railway PostgreSQL service.
        conn_max_age=config("DB_PERSISTENT_CONNECTIONS", default=False, cast=bool) and 600 or 0,
        conn_health_checks=config("DB_PERSISTENT_CONNECTIONS", default=False, cast=bool),
        # Disables server-side cursors (required for PgBouncer / Supabase pooler).
        # Safe to keep True even with Railway Postgres — no negative effect.
        disable_server_side_cursors=True,
    )
}

# ---------------------------------------------------------------------------
# Redis — Channel Layer (WebSocket fan-out) with InMemory fallback
# ---------------------------------------------------------------------------
REDIS_URL = config("REDIS_URL", default="")


def _build_channel_layers(redis_url: str) -> dict:
    """
    Try to build a Redis channel layer.  If REDIS_URL is not configured,
    fall back to InMemoryChannelLayer with a warning.

    InMemory works for single-process deployments (local dev, single Daphne).
    Multi-worker production deployments require a healthy Redis instance.
    """
    if not redis_url:
        logger.warning(
            "REDIS_URL is not set — falling back to InMemoryChannelLayer. "
            "WebSocket fan-out will NOT work across multiple workers."
        )
        return {
            "default": {
                "BACKEND": "channels.layers.InMemoryChannelLayer",
            }
        }

    # channels_redis host config — handles both plain redis:// and TLS rediss:// (Upstash)
    if redis_url.startswith("rediss://"):
        host_config = {"address": redis_url, "ssl_cert_reqs": None}
    else:
        host_config = redis_url

    return {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [host_config],
                # Limit channel message backlog to prevent memory bloat
                "capacity": 1500,
                "expiry": 10,
            },
        }
    }


CHANNEL_LAYERS = _build_channel_layers(REDIS_URL)

# ---------------------------------------------------------------------------
# Cache — Redis (presence tracking, typing indicators)
# ---------------------------------------------------------------------------
if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
                # Do not raise on connection errors; degrade gracefully
                "IGNORE_EXCEPTIONS": True,
                # Required for Upstash TLS (rediss://) — skip certificate hostname check
                "CONNECTION_POOL_KWARGS": {
                    "ssl_cert_reqs": None,
                } if REDIS_URL.startswith("rediss://") else {},
            },
            "KEY_PREFIX": "chat",
            "TIMEOUT": 300,  # 5 minutes default TTL
        }
    }
else:
    # No Redis — use Django's local-memory cache (single process only)
    logger.warning(
        "REDIS_URL is not set — using LocMemCache for presence/typing. "
        "These features will not work across multiple workers."
    )
    CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
            "LOCATION": "chat-fallback",
        }
    }

# ---------------------------------------------------------------------------
# Real-time presence & typing — Redis key config (used by consumers.py)
# ---------------------------------------------------------------------------
# How long a user stays "online" after their last heartbeat (seconds)
PRESENCE_TTL = 75          # 30s heartbeat interval + 45s grace
PRESENCE_KEY_PREFIX = "presence"

# How long a typing indicator stays visible after the last keystroke (seconds)
TYPING_TTL = 5
TYPING_KEY_PREFIX = "typing"

# ---------------------------------------------------------------------------
# Message Encryption (Fernet AES-128-CBC + HMAC-SHA256)
# ---------------------------------------------------------------------------
# Generate a key: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# WARNING: Never rotate this key without first re-encrypting all stored messages.
MESSAGE_ENCRYPTION_KEY = config("MESSAGE_ENCRYPTION_KEY", default="")

# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------
AUTH_USER_MODEL = "accounts.User"  # Custom user model with email as USERNAME_FIELD

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_RENDERER_CLASSES": (
        "rest_framework.renderers.JSONRenderer",
    ),
    "DEFAULT_PAGINATION_CLASS": "apps.common.pagination.MessageCursorPagination",
    "PAGE_SIZE": 50,
    "EXCEPTION_HANDLER": "apps.common.exceptions.custom_exception_handler",
}

# ---------------------------------------------------------------------------
# SimpleJWT — Access/Refresh tokens with blacklist
# ---------------------------------------------------------------------------
SIMPLE_JWT = {
    # Short-lived access token — clients must refresh frequently
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    # Long-lived refresh token
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    # Issue a new refresh token on every refresh call
    "ROTATE_REFRESH_TOKENS": True,
    # Blacklist the old refresh token after rotation (requires token_blacklist app)
    "BLACKLIST_AFTER_ROTATION": True,
    # Update last_login on token generation
    "UPDATE_LAST_LOGIN": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
    # Token classes
    "ACCESS_TOKEN_CLASS": "rest_framework_simplejwt.tokens.AccessToken",
    "REFRESH_TOKEN_CLASS": "rest_framework_simplejwt.tokens.RefreshToken",
}

# ---------------------------------------------------------------------------
# CORS — Allow Next.js dev server
# ---------------------------------------------------------------------------
CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:3000",
    cast=Csv(),
)
# Allow Authorization header to be sent cross-origin
CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]
CORS_ALLOW_CREDENTIALS = True

# ---------------------------------------------------------------------------
# Internationalization
# ---------------------------------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static files — WhiteNoise serves compressed static files in production
# ---------------------------------------------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# ---------------------------------------------------------------------------
# Default primary key
# ---------------------------------------------------------------------------
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
