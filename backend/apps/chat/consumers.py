"""
WebSocket consumer for real-time chat.

ChatConsumer handles one WebSocket connection per user per conversation.

Connection lifecycle
────────────────────
  connect()       — authenticate, verify participation, join channel group,
                    mark user online in Redis, send connection_established event
  receive_json()  — route incoming frames to the appropriate handler
  disconnect()    — leave channel group, update presence in Redis

Incoming frame types (client → server)
───────────────────────────────────────
  { "type": "message.send", "content": "Hello 👋" }
      → saves Message to DB (encrypted), broadcasts message.new to the conversation group

  { "type": "typing", "is_typing": true }
      → broadcasts typing event to group (no DB write)
      → updates Redis/cache presence key with TTL

  { "type": "mark_read" }
      → updates ConversationParticipant.last_read_at = now()

  { "type": "heartbeat" }
      → refreshes the online presence TTL in Redis/cache

Outgoing frame types (server → client)
───────────────────────────────────────
  { "type": "connection_established", "conversation_id": "...", "user_id": "..." }
  { "type": "message.new", "message": { ...MessageSerializer data... } }
  { "type": "typing", "user_id": "...", "display_name": "...", "is_typing": true }
  { "type": "presence", "user_id": "...", "is_online": true }
  { "type": "error", "code": "...", "message": "..." }

Redis resilience
────────────────
  All cache operations (presence, typing) use IGNORE_EXCEPTIONS=True so a
  Redis failure does NOT crash the consumer.
  All channel_layer group operations are wrapped in try/except so a Redis
  failure during fan-out logs an error but does NOT close the WebSocket.
"""

import logging
from datetime import datetime, timezone

from asgiref.sync import sync_to_async
from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.conf import settings
from django.core.cache import cache

from .models import Conversation, ConversationParticipant, Message
from .serializers import MessageSerializer

logger = logging.getLogger(__name__)


# ── Redis/cache key helpers ───────────────────────────────────────────────────

def _presence_key(user_id: str) -> str:
    """Cache key for online presence. TTL = settings.PRESENCE_TTL seconds."""
    return f"{settings.PRESENCE_KEY_PREFIX}:{user_id}"


def _typing_key(conversation_id: str, user_id: str) -> str:
    """Cache key for typing indicator. TTL = settings.TYPING_TTL seconds."""
    return f"{settings.TYPING_KEY_PREFIX}:{conversation_id}:{user_id}"


def _group_name(conversation_id: str) -> str:
    """Channel group name for a conversation."""
    return f"chat_{conversation_id}"


# ── Sync cache helpers (wrapped for async context) ────────────────────────────

def _cache_set(key: str, value, timeout: int):
    try:
        cache.set(key, value, timeout=timeout)
    except Exception as exc:
        logger.debug("Cache set failed (non-critical): %s", exc)


def _cache_delete(key: str):
    try:
        cache.delete(key)
    except Exception as exc:
        logger.debug("Cache delete failed (non-critical): %s", exc)


# Async-safe wrappers
_async_cache_set = sync_to_async(_cache_set)
_async_cache_delete = sync_to_async(_cache_delete)


# ── Database helpers (run in thread pool) ─────────────────────────────────────

@database_sync_to_async
def _is_participant(user, conversation_id: str) -> bool:
    """Return True if the user is a participant of the given conversation."""
    return ConversationParticipant.objects.filter(
        user=user, conversation_id=conversation_id
    ).exists()


@database_sync_to_async
def _get_user_display_name(user) -> str:
    """Fetch display_name from DB to avoid lazy-loading in async context."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    try:
        return User.objects.get(pk=user.pk).display_name
    except User.DoesNotExist:
        return str(user.pk)


@database_sync_to_async
def _save_message(conversation_id: str, sender, content: str) -> dict:
    """
    Persist a new Message to the database and return its serialized form.

    Uses select_related("sender") so the MessageSerializer does not trigger
    an extra DB query for each message's sender field (N+1 prevention).

    The EncryptedTextField on Message.content handles encryption transparently —
    the plaintext goes in, encrypted ciphertext is stored, plaintext comes back.
    """
    conversation = Conversation.objects.get(pk=conversation_id)
    message = Message.objects.create(
        conversation=conversation,
        sender=sender,
        content=content.strip(),
    )
    # Re-fetch with select_related to avoid extra queries in serializer
    message = (
        Message.objects.select_related("sender")
        .get(pk=message.pk)
    )
    return MessageSerializer(message).data


@database_sync_to_async
def _mark_read(user, conversation_id: str):
    """Update ConversationParticipant.last_read_at = now() for unread count reset."""
    ConversationParticipant.objects.filter(
        user=user, conversation_id=conversation_id
    ).update(last_read_at=datetime.now(tz=timezone.utc))


# ── Consumer ──────────────────────────────────────────────────────────────────

class ChatConsumer(AsyncJsonWebsocketConsumer):
    """
    Async WebSocket consumer for a single conversation channel.

    One instance is created per WebSocket connection.
    Multiple instances (across workers) share state via the channel layer
    (Redis-backed, or InMemory for single-worker deployments).
    """

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    async def connect(self):
        self.user = self.scope.get("user")
        self.conversation_id = str(self.scope["url_route"]["kwargs"]["conversation_id"])
        self.group_name = _group_name(self.conversation_id)
        self.display_name = ""  # set below after auth check

        # ── Guard: reject anonymous users ────────────────────────────────────
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4001)  # 4001 = Unauthorized (custom code)
            return

        # ── Guard: reject non-participants ───────────────────────────────────
        if not await _is_participant(self.user, self.conversation_id):
            await self.close(code=4003)  # 4003 = Forbidden
            return

        # ── Fetch display_name safely (avoid sync DB access in async) ────────
        self.display_name = await _get_user_display_name(self.user)
        self.user_id = str(self.user.pk)

        # ── Join the conversation's channel group ─────────────────────────────
        await self._safe_group_add()
        await self.accept()

        # ── Mark user online in cache (async-safe, Redis failure tolerant) ───
        await _async_cache_set(
            _presence_key(self.user_id), True, settings.PRESENCE_TTL
        )

        # ── Notify this client that the connection is ready ───────────────────
        await self.send_json({
            "type": "connection_established",
            "conversation_id": self.conversation_id,
            "user_id": self.user_id,
        })

        # ── Broadcast online presence to conversation group ───────────────────
        await self._safe_group_send({
            "type": "presence_broadcast",
            "user_id": self.user_id,
            "display_name": self.display_name,
            "is_online": True,
        })

        logger.info(
            "WS connect: user=%s conversation=%s",
            self.user_id,
            self.conversation_id,
        )

    async def disconnect(self, close_code: int):
        if not hasattr(self, "group_name"):
            return  # connect() was rejected before group_name was set

        user_id = getattr(self, "user_id", None)
        display_name = getattr(self, "display_name", "")

        if user_id:
            # ── Remove presence (async-safe) ─────────────────────────────────
            await _async_cache_delete(_presence_key(user_id))

        # ── Leave group ───────────────────────────────────────────────────────
        try:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
        except Exception as exc:
            logger.warning("group_discard failed (channel layer issue): %s", exc)

        # ── Broadcast offline presence ────────────────────────────────────────
        if user_id:
            await self._safe_group_send({
                "type": "presence_broadcast",
                "user_id": user_id,
                "display_name": display_name,
                "is_online": False,
            })

        logger.info(
            "WS disconnect: user=%s conversation=%s code=%s",
            user_id,
            self.conversation_id,
            close_code,
        )

    # ── Incoming messages from client ─────────────────────────────────────────

    async def receive_json(self, content: dict, **kwargs):
        """
        Route incoming WebSocket frames by 'type' field.

        Expected format: { "type": "<event_type>", ...payload }
        """
        msg_type = content.get("type")

        if msg_type == "message.send":
            await self._handle_message_send(content)
        elif msg_type == "typing":
            await self._handle_typing(content)
        elif msg_type == "mark_read":
            await self._handle_mark_read()
        elif msg_type == "heartbeat":
            await self._handle_heartbeat()
        else:
            await self.send_json({
                "type": "error",
                "code": "unknown_type",
                "message": f"Unknown message type: {msg_type!r}",
            })

    # ── Handlers ──────────────────────────────────────────────────────────────

    async def _handle_message_send(self, content: dict):
        """
        Persist the message (encrypted in DB) and broadcast it to all
        conversation participants.  The serialized data returned from
        _save_message already has decrypted plaintext content.
        """
        raw_content = content.get("content", "")
        stripped = raw_content.strip() if isinstance(raw_content, str) else ""

        if not stripped:
            await self.send_json({
                "type": "error",
                "code": "empty_content",
                "message": "Message content cannot be empty.",
            })
            return

        if len(stripped) > 4000:
            await self.send_json({
                "type": "error",
                "code": "content_too_long",
                "message": "Message must be 4000 characters or fewer.",
            })
            return

        try:
            message_data = await _save_message(
                self.conversation_id, self.user, stripped
            )
        except Exception as exc:
            logger.exception("Failed to save message: %s", exc)
            await self.send_json({
                "type": "error",
                "code": "save_failed",
                "message": "Failed to save message. Please try again.",
            })
            return

        # Broadcast to all clients in the conversation group (including sender)
        await self._safe_group_send({
            "type": "message_broadcast",  # maps to self.message_broadcast()
            "message": message_data,
        })

    async def _handle_typing(self, content: dict):
        """
        Broadcast a typing indicator to conversation group.
        Updates a cache key with a short TTL so it auto-expires.
        """
        is_typing = bool(content.get("is_typing", False))
        typing_key = _typing_key(self.conversation_id, self.user_id)

        if is_typing:
            await _async_cache_set(typing_key, True, settings.TYPING_TTL)
        else:
            await _async_cache_delete(typing_key)

        await self._safe_group_send({
            "type": "typing_broadcast",
            "user_id": self.user_id,
            "display_name": self.display_name,
            "is_typing": is_typing,
        })

    async def _handle_mark_read(self):
        """Update last_read_at for this participant (resets unread count)."""
        await _mark_read(self.user, self.conversation_id)

    async def _handle_heartbeat(self):
        """Refresh the online presence TTL in cache."""
        await _async_cache_set(
            _presence_key(self.user_id),
            True,
            settings.PRESENCE_TTL,
        )

    # ── Channel layer helpers (Redis-failure tolerant) ────────────────────────

    async def _safe_group_add(self):
        """Join the channel group, logging (not crashing) on failure."""
        try:
            await self.channel_layer.group_add(self.group_name, self.channel_name)
        except Exception as exc:
            logger.warning(
                "group_add failed for group=%s (channel layer issue): %s",
                self.group_name, exc
            )

    async def _safe_group_send(self, event: dict):
        """Broadcast to the channel group, logging (not crashing) on failure."""
        try:
            await self.channel_layer.group_send(self.group_name, event)
        except Exception as exc:
            logger.warning(
                "group_send failed for group=%s type=%s (channel layer issue): %s",
                self.group_name, event.get("type"), exc
            )

    # ── Group message handlers (channel layer → this consumer) ────────────────
    # These methods are called by the channel layer when another consumer
    # calls group_send(). The method name must match the "type" field with
    # dots replaced by underscores.

    async def message_broadcast(self, event: dict):
        """Forward a new message to this WebSocket client."""
        await self.send_json({
            "type": "message.new",
            "message": event["message"],
        })

    async def typing_broadcast(self, event: dict):
        """Forward a typing indicator to this WebSocket client."""
        # Don't echo typing events back to the sender
        if event["user_id"] == self.user_id:
            return
        await self.send_json({
            "type": "typing",
            "user_id": event["user_id"],
            "display_name": event["display_name"],
            "is_typing": event["is_typing"],
        })

    async def presence_broadcast(self, event: dict):
        """Forward an online/offline presence event to this WebSocket client."""
        # Don't echo your own presence back to yourself
        if event["user_id"] == self.user_id:
            return
        await self.send_json({
            "type": "presence",
            "user_id": event["user_id"],
            "display_name": event["display_name"],
            "is_online": event["is_online"],
        })
