"""
Cursor-based pagination for the message history endpoint.

Why cursor pagination instead of page/offset?
  - The message list grows continuously (new messages are inserted at the top)
  - Page/offset breaks when new messages are inserted: page 2 shifts and you
    get duplicate or skipped messages
  - Cursor pagination is stable — a cursor points to an exact position in the
    ordered result set regardless of insertions

Configuration:
  - page_size: 50 messages per request (configurable per-view via pagination_class.page_size)
  - ordering: "-created_at" (newest first, consistent with the query in MessageListView)
  - The frontend reverses the list before rendering so the user sees oldest-at-top
"""

from rest_framework.pagination import CursorPagination


class MessageCursorPagination(CursorPagination):
    """
    Cursor-based pagination for message threads.

    The cursor encodes the `created_at` timestamp of the last item on the
    current page.  The frontend passes it as ?cursor=<opaque_string> to
    fetch older messages (infinite scroll upward).
    """

    page_size = 50
    ordering = "-created_at"  # newest first
    cursor_query_param = "cursor"
