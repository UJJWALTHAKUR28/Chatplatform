"""
ASGI config for the Chat Application.

This is the WebSocket + HTTP entry-point.

Protocol routing:
  - HTTP  → Django's standard ASGI application (admin, REST API)
  - WebSocket → Django Channels URLRouter (ChatConsumer)

The JwtAuthMiddlewareStack wraps the WebSocket router so that every
WS connection is authenticated before reaching the consumer.
"""

import os

import django
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

# Initialize Django before importing any app-level modules
django.setup()

# Import after django.setup() to avoid AppRegistryNotReady errors
from apps.chat.middleware import JwtAuthMiddlewareStack  # noqa: E402
from apps.chat.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter(
    {
        # ── Plain HTTP ──────────────────────────────────────────────────────
        # Handles all Django views, DRF endpoints, admin, etc.
        "http": get_asgi_application(),
        # ── WebSocket ───────────────────────────────────────────────────────
        # JwtAuthMiddlewareStack validates the JWT from ?token= query param
        # and populates scope["user"] before the consumer receives the connection.
        "websocket": JwtAuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        ),
    }
)
