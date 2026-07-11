"""
Admin registration for the chat app.
"""

from django.contrib import admin

from .models import Conversation, ConversationParticipant, Message


class ParticipantInline(admin.TabularInline):
    """Inline display of participants inside the Conversation admin."""
    model = ConversationParticipant
    extra = 0
    readonly_fields = ["user", "joined_at", "last_read_at"]
    can_delete = False


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ["id", "participant_summary", "created_at", "updated_at"]
    readonly_fields = ["id", "created_at", "updated_at"]
    search_fields = ["id"]
    ordering = ["-updated_at"]
    inlines = [ParticipantInline]

    @admin.display(description="Participants")
    def participant_summary(self, obj):
        names = [p.user.display_name for p in obj.participant_set.select_related("user")[:5]]
        return ", ".join(names)


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["id", "sender", "conversation", "short_content", "created_at", "is_deleted"]
    list_filter = ["is_deleted", "created_at"]
    search_fields = ["sender__email", "sender__display_name", "content"]
    readonly_fields = ["id", "conversation", "sender", "created_at"]
    ordering = ["-created_at"]

    @admin.display(description="Content")
    def short_content(self, obj):
        if obj.is_deleted:
            return "[deleted]"
        return obj.content[:60] + ("..." if len(obj.content) > 60 else "")
