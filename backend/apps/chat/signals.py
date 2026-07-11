"""
Django signals for the chat app.

Signal: post_save on Message
Effect: Update Conversation.updated_at so the conversation list
        stays sorted by most-recent activity.

Note: Conversation.updated_at uses auto_now=True, which is only updated
      when Conversation.save() is explicitly called. Creating a Message
      does NOT automatically touch the parent Conversation, so we do it here.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Message


@receiver(post_save, sender=Message)
def update_conversation_timestamp(sender, instance: Message, created: bool, **kwargs):
    """
    Bump Conversation.updated_at whenever a new message is created.
    This keeps the conversation list sorted by most-recent activity.

    We use update() instead of save() to avoid triggering other signals
    and to be efficient (single SQL UPDATE, no ORM overhead).
    """
    if created and not instance.is_deleted:
        from django.utils import timezone
        instance.conversation.__class__.objects.filter(
            pk=instance.conversation_id
        ).update(updated_at=timezone.now())
