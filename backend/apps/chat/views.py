"""
REST API views for the chat app.

  ConversationListCreateView  GET/POST /api/v1/chat/conversations/
  ConversationDetailView      GET      /api/v1/chat/conversations/<uuid>/
  MarkConversationReadView    POST     /api/v1/chat/conversations/<uuid>/read/
  MessageListView             GET      /api/v1/chat/conversations/<uuid>/messages/

All views require IsAuthenticated.
Detail/message views additionally require IsConversationParticipant.
"""

from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.common.pagination import MessageCursorPagination

from .models import Conversation, ConversationParticipant, Message
from .permissions import IsConversationParticipant
from .serializers import (
    ConversationSerializer,
    CreateConversationSerializer,
    MessageSerializer,
)


class ConversationListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/chat/conversations/
        Returns ALL conversations the authenticated user participates in
        as a plain JSON array (no pagination — sidebar always shows everything).
        Ordered by most-recent message (Conversation.updated_at DESC).

    POST /api/v1/chat/conversations/
        Creates a new conversation.
        Body: { "participant_ids": ["<uuid>", ...] }
        If a 1-on-1 conversation with the given participant already exists,
        that conversation is returned (idempotent create).

    Response 200/201: ConversationSerializer data
    """

    permission_classes = [IsAuthenticated]
    serializer_class = ConversationSerializer
    # Conversations are always returned as a plain array — no pagination.
    # The global DEFAULT_PAGINATION_CLASS must not apply here or the response
    # becomes {next, previous, results:[]} which breaks frontend .map() calls.
    pagination_class = None

    def get_queryset(self):
        return (
            Conversation.objects.filter(participant_set__user=self.request.user)
            .prefetch_related(
                "participant_set",           # for get_unread_count loop
                "participant_set__user",     # for UserPublicSerializer in participants field
                "messages",                  # for last_message / unread counts
            )
            .distinct()
            .order_by("-updated_at")
        )

    def create(self, request, *args, **kwargs):
        create_serializer = CreateConversationSerializer(
            data=request.data, context={"request": request}
        )
        create_serializer.is_valid(raise_exception=True)
        conversation = create_serializer.save()
        response_serializer = ConversationSerializer(
            conversation, context={"request": request}
        )
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)



class ConversationDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/chat/conversations/<uuid>/

    Returns the full conversation detail including all participants.
    The requesting user must be a participant.

    Response 200: ConversationSerializer data
    """

    permission_classes = [IsAuthenticated, IsConversationParticipant]
    serializer_class = ConversationSerializer

    def get_queryset(self):
        return Conversation.objects.filter(
            participant_set__user=self.request.user
        ).prefetch_related("participant_set__user")

    def get_object(self):
        obj = generics.get_object_or_404(
            self.get_queryset(), pk=self.kwargs["conversation_id"]
        )
        self.check_object_permissions(self.request, obj)
        return obj


class MarkConversationReadView(APIView):
    """
    POST /api/v1/chat/conversations/<uuid>/read/

    Sets ConversationParticipant.last_read_at = now() for the requesting user.
    This resets the unread_count to 0 for this participant.

    The frontend should call this when:
      - The user opens a conversation
      - The user scrolls to the bottom of the message thread
      - A real-time message is received while the conversation is open

    Response 204: No content
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id):
        updated = ConversationParticipant.objects.filter(
            conversation_id=conversation_id,
            user=request.user,
        ).update(last_read_at=timezone.now())

        if not updated:
            return Response(
                {"error": "You are not a participant in this conversation."},
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


class MessageListView(generics.ListAPIView):
    """
    GET /api/v1/chat/conversations/<uuid>/messages/

    Returns the message history for a conversation, newest first,
    with cursor-based pagination (50 messages per page).

    The cursor comes from the ?cursor= query parameter returned in the
    previous response's 'next' link.

    Response 200:
        {
          "next": "<cursor_url | null>",
          "previous": "<cursor_url | null>",
          "results": [ ...MessageSerializer data... ]
        }
    """

    permission_classes = [IsAuthenticated, IsConversationParticipant]
    serializer_class = MessageSerializer
    pagination_class = MessageCursorPagination

    def get_conversation(self):
        if not hasattr(self, "_conversation"):
            self._conversation = generics.get_object_or_404(
                Conversation.objects.filter(participant_set__user=self.request.user),
                pk=self.kwargs["conversation_id"],
            )
            self.check_object_permissions(self.request, self._conversation)
        return self._conversation

    def get_queryset(self):
        conversation = self.get_conversation()
        return (
            Message.objects.filter(conversation=conversation)
            .select_related("sender")
            .order_by("-created_at")  # newest first for cursor pagination
        )
