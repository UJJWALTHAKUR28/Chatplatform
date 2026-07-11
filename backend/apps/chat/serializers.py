"""
Serializers for the chat app.

  MessageSerializer             — full message representation (includes sender)
  ConversationSerializer        — conversation with participants, last_message, unread_count
  CreateConversationSerializer  — validates participant list, creates conversation
  SendMessageSerializer         — validates outgoing message content
"""

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.serializers import UserPublicSerializer

from .models import Conversation, ConversationParticipant, Message

User = get_user_model()


class MessageSerializer(serializers.ModelSerializer):
    """
    Full representation of a message.

    - sender is embedded as a UserPublicSerializer (id + display_name)
    - If is_deleted=True, the content is replaced with an empty string
      so the frontend can show "This message was deleted." without needing
      to know the original content.
    - conversation is serialized as a string (UUID) for msgpack compatibility
      in the Redis channel layer.
    """

    sender = UserPublicSerializer(read_only=True)
    # Force UUID → str so msgpack (channel layer) can serialize this dict
    conversation = serializers.CharField(source="conversation_id", read_only=True)

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sender",
            "content",
            "created_at",
            "is_deleted",
        ]
        read_only_fields = fields

    def to_representation(self, instance: Message) -> dict:
        data = super().to_representation(instance)
        # Mask deleted message content for all clients
        if instance.is_deleted:
            data["content"] = ""
        # Ensure UUIDs are strings — msgpack (channel layer) can't serialize UUID objects
        data["id"] = str(data["id"])
        if data.get("sender") and data["sender"].get("id"):
            data["sender"]["id"] = str(data["sender"]["id"])
        return data



class ConversationSerializer(serializers.ModelSerializer):
    """
    Conversation list / detail representation.

    Includes:
      participants  — list of UserPublicSerializer
      last_message  — the most recent Message (or null)
      unread_count  — how many messages since the requesting user's last_read_at
    """

    participants = UserPublicSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "participants",
            "last_message",
            "unread_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_last_message(self, obj: Conversation) -> dict | None:
        last = obj.messages.order_by("-created_at").first()
        if last is None:
            return None
        # Pass request context so nested serializers have access to it
        return MessageSerializer(last, context=self.context).data

    def get_unread_count(self, obj: Conversation) -> int:
        """
        Count messages created after the requesting user's last_read_at.
        Uses prefetched participant_set to avoid extra DB queries.
        """
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return 0

        # Use all() to leverage the prefetch cache set by get_queryset()
        participant = None
        for p in obj.participant_set.all():
            if p.user_id == request.user.pk:
                participant = p
                break

        if participant is None:
            return 0

        if participant.last_read_at is None:
            return obj.messages.filter(is_deleted=False).count()

        return obj.messages.filter(
            created_at__gt=participant.last_read_at,
            is_deleted=False,
        ).exclude(sender=request.user).count()


class CreateConversationSerializer(serializers.Serializer):
    """
    Creates a new conversation.

    Input:  { participant_ids: ["<uuid>", ...] }
            (the requesting user is added automatically)

    Rules:
      - participant_ids must be non-empty and contain valid, active user UUIDs
      - All participants (including the requester) must be distinct
      - Maximum 50 participants (groups)
      - A 1-on-1 DM between the same pair is de-duplicated: if one already
        exists it is returned (so the frontend can just navigate to it)
    """

    participant_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        max_length=49,  # +1 for the requester = 50 max
        help_text="UUIDs of the users to add to the conversation (exclude yourself).",
    )

    def validate_participant_ids(self, value: list) -> list:
        request = self.context["request"]
        # Deduplicate and exclude the requester (they're added separately)
        ids = list({str(uid) for uid in value if str(uid) != str(request.user.pk)})

        if not ids:
            raise serializers.ValidationError(
                "You must include at least one other participant."
            )

        found = User.objects.filter(pk__in=ids, is_active=True)
        if found.count() != len(ids):
            raise serializers.ValidationError(
                "One or more participant IDs are invalid or belong to inactive accounts."
            )

        return ids

    def create(self, validated_data: dict) -> Conversation:
        request = self.context["request"]
        participant_ids = validated_data["participant_ids"]
        all_participant_ids = sorted([str(request.user.pk)] + participant_ids)

        # ── De-duplicate DMs (1-on-1 only) ───────────────────────────────────
        if len(all_participant_ids) == 2:
            # Find an existing conversation that contains exactly these two users.
            # Filter to conversations where BOTH users are participants, then
            # confirm exactly 2 participants total (not a group that happens to
            # include both).
            candidates = (
                Conversation.objects.filter(participant_set__user=request.user)
                .filter(participant_set__user_id=participant_ids[0])
                .prefetch_related("participant_set")
            )
            for conv in candidates:
                if conv.participant_set.count() == 2:
                    return conv

        # ── Create new conversation ───────────────────────────────────────────
        conversation = Conversation.objects.create()
        all_users = User.objects.filter(pk__in=all_participant_ids)
        ConversationParticipant.objects.bulk_create(
            [
                ConversationParticipant(conversation=conversation, user=user)
                for user in all_users
            ]
        )
        return conversation



class SendMessageSerializer(serializers.Serializer):
    """
    Validates content for a new message sent via REST (not WebSocket).
    WebSocket messages are validated directly in the consumer.
    """

    content = serializers.CharField(
        max_length=4000,
        help_text="Text + emoji content. Must not be blank after stripping whitespace.",
    )

    def validate_content(self, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise serializers.ValidationError("Message content cannot be empty.")
        return stripped


class MarkReadSerializer(serializers.Serializer):
    """Updates last_read_at for the requesting participant."""
    # No body needed — we set last_read_at = now() server-side
    pass
