"""
Custom permission classes for the chat app.
"""

from rest_framework.permissions import BasePermission

from .models import ConversationParticipant


class IsConversationParticipant(BasePermission):
    """
    Object-level permission that allows access to a Conversation only
    if the requesting user is a participant in it.

    Usage in views:
        permission_classes = [IsAuthenticated, IsConversationParticipant]

    The view must pass the Conversation instance to check_object_permissions().
    get_queryset() should already filter to the user's own conversations for
    list views; this permission is the safety check for detail/nested views.
    """

    message = "You are not a participant in this conversation."

    def has_object_permission(self, request, view, obj) -> bool:
        return ConversationParticipant.objects.filter(
            conversation=obj,
            user=request.user,
        ).exists()
