"""
Chat app models.

  Conversation            — a chat thread between 2+ participants
  ConversationParticipant — M2M through model (participant + last_read_at for unread counts)
  Message                 — a single text/emoji message in a conversation

Design notes:
  - UUID PKs everywhere (no sequential IDs leaked in URLs or WebSocket frames)
  - Conversation.updated_at is bumped via signal on every new Message
    so that conversation lists can be sorted by most-recent activity
  - Message.content is stored AES-256 encrypted (Fernet) in the DB.
    Encryption/decryption is handled transparently by EncryptedTextField.
    The column type stays TEXT — only the stored bytes change.
  - Soft-delete on Message (is_deleted=True) so participants see
    "This message was deleted" rather than a vanished bubble
  - DB index on (conversation_id, created_at DESC) for fast cursor pagination
    of message history (the most common query in any chat app)
"""

import uuid

from django.conf import settings
from django.db import models

from .encryption import decrypt_text, encrypt_text, is_encrypted


# ── Custom encrypted field ────────────────────────────────────────────────────

class EncryptedTextField(models.TextField):
    """
    A TextField subclass that transparently encrypts on write and decrypts
    on read using Fernet (AES-128-CBC + HMAC-SHA256).

    The value stored in the database is always a Fernet token (base64
    ASCII string).  The application always sees the original plaintext.
    No schema migration is required — the column type remains TEXT.
    """

    def from_db_value(self, value, expression, connection):
        if value is None:
            return value
        if is_encrypted(value):
            return decrypt_text(value)
        # Legacy plaintext row — return as-is
        return value

    def get_prep_value(self, value):
        if value is None:
            return value
        if is_encrypted(value):
            # Already encrypted (e.g. after a failed partial save) — don't double-encrypt
            return value
        return encrypt_text(value)


# ── Models ────────────────────────────────────────────────────────────────────

class Conversation(models.Model):
    """
    Represents a chat thread.

    A conversation can be a 1-on-1 DM (2 participants) or a group chat
    (3+ participants). The UI enforces which mode is shown; the model
    is agnostic.

    Fields
    ──────
    id              UUID, primary key
    participants    M2M through ConversationParticipant
    created_at      When the conversation was started
    updated_at      Bumped on every new message (used for ordering conversation list)
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="ConversationParticipant",
        related_name="conversations",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]  # newest activity first

    def __str__(self) -> str:
        return f"Conversation {self.id}"


class ConversationParticipant(models.Model):
    """
    Through model for Conversation ↔ User M2M.

    Stores per-participant metadata:
      joined_at     — when this user was added
      last_read_at  — the timestamp of the last message this user has seen.
                      Used to calculate unread_count in the serializer.
                      Updated whenever the user opens the conversation thread.
    """

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="participant_set",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conversation_participations",
    )
    joined_at = models.DateTimeField(auto_now_add=True)
    last_read_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp of the last message this participant has read. "
                  "NULL means they have never opened the conversation.",
    )

    class Meta:
        unique_together = [("conversation", "user")]
        verbose_name = "participant"
        verbose_name_plural = "participants"

    def __str__(self) -> str:
        return f"{self.user.display_name} in {self.conversation_id}"


class Message(models.Model):
    """
    A single message in a conversation.

    Content is stored AES-256 encrypted (Fernet) — the EncryptedTextField
    handles encrypt-on-write and decrypt-on-read transparently.  The
    application code always works with plaintext strings.

    Fields
    ──────
    id              UUID, primary key
    conversation    FK → Conversation
    sender          FK → User
    content         Encrypted message text (max 4000 chars plaintext)
    created_at      Indexed for cursor-based pagination
    is_deleted      Soft delete — content is blanked on delete but the row persists
                    so other participants see "This message was deleted."
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,  # Keep message history even if account deleted
        null=True,
        related_name="sent_messages",
    )
    content = EncryptedTextField(
        max_length=4000,
        help_text="Stored AES-256 encrypted. App always receives plaintext.",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    is_deleted = models.BooleanField(
        default=False,
        help_text="If True, the content field should be ignored by the frontend.",
    )

    class Meta:
        ordering = ["created_at"]
        indexes = [
            # Composite index for the most common query:
            # "give me the last N messages in conversation X ordered newest-first"
            models.Index(
                fields=["conversation", "-created_at"],
                name="msg_conv_created_idx",
            )
        ]

    def __str__(self) -> str:
        status = "[deleted]" if self.is_deleted else self.content[:40]
        sender_name = self.sender.display_name if self.sender else "deleted user"
        return f"{sender_name}: {status}"
