"""
WebSocket URL routing for the chat app.

These patterns are mounted in core/asgi.py under the "websocket" protocol router,
NOT in core/urls.py (which only handles HTTP).

WebSocket URL:
  ws://localhost:8000/ws/chat/<conversation_uuid>/?token=<jwt_access_token>

The conversation_id UUID is extracted by the router and passed to the consumer
as: self.scope["url_route"]["kwargs"]["conversation_id"]
"""

from django.urls import re_path

from .consumers import ChatConsumer

websocket_urlpatterns = [
    re_path(
        r"^ws/chat/(?P<conversation_id>[0-9a-f-]{36})/$",
        ChatConsumer.as_asgi(),
        name="ws-chat",
    ),
]
