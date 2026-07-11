"""
URL patterns for the chat app.

All routes are mounted at /api/v1/chat/ from core/urls.py.

WebSocket routes are in routing.py (mounted via asgi.py).
"""

from django.urls import path

from .views import (
    ConversationDetailView,
    ConversationListCreateView,
    MarkConversationReadView,
    MessageListView,
)

urlpatterns = [
    # ── Conversations ─────────────────────────────────────────────────────────
    # GET  /api/v1/chat/conversations/         — list own conversations
    # POST /api/v1/chat/conversations/         — create or retrieve 1-on-1 DM
    path(
        "conversations/",
        ConversationListCreateView.as_view(),
        name="conversation-list-create",
    ),

    # GET  /api/v1/chat/conversations/<uuid>/  — single conversation detail
    path(
        "conversations/<uuid:conversation_id>/",
        ConversationDetailView.as_view(),
        name="conversation-detail",
    ),

    # POST /api/v1/chat/conversations/<uuid>/read/  — mark all messages as read
    path(
        "conversations/<uuid:conversation_id>/read/",
        MarkConversationReadView.as_view(),
        name="conversation-mark-read",
    ),

    # ── Messages ──────────────────────────────────────────────────────────────
    # GET /api/v1/chat/conversations/<uuid>/messages/  — cursor-paginated history
    path(
        "conversations/<uuid:conversation_id>/messages/",
        MessageListView.as_view(),
        name="message-list",
    ),
]
