from django.apps import AppConfig


class ChatConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.chat"
    verbose_name = "Chat"

    def ready(self):
        # Register signal handlers when the app is fully loaded.
        # Relative import — works correctly in both runtime and IDE static analysis.
        from . import signals  # noqa: F401
