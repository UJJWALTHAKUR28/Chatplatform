"""
Custom DRF exception handler.

Normalises all error responses to a consistent shape:
  { "error": "<short_code>", "detail": "<human-readable message>" }

This makes frontend error handling predictable — the UI always looks for
response.data.detail rather than digging into variable DRF error structures.

DRF's default handler returns varying shapes depending on the exception:
  - ValidationError: { "field": ["message"] } or { "non_field_errors": [...] }
  - NotAuthenticated: { "detail": "..." }
  - PermissionDenied: { "detail": "..." }
  - NotFound: { "detail": "..." }

We standardise all of these so the Next.js client can handle them uniformly.
"""

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context) -> Response | None:
    """
    Call DRF's default handler first (so throttling, auth, etc. still work),
    then reshape the response data into our standard format.
    """
    response = exception_handler(exc, context)

    if response is None:
        # Unhandled exception — let Django's 500 handler deal with it
        return None

    original_data = response.data

    # ── Determine the error code ──────────────────────────────────────────────
    error_code = _get_error_code(response.status_code)

    # ── Determine a human-readable detail message ─────────────────────────────
    if isinstance(original_data, dict):
        if "detail" in original_data:
            # Standard DRF error (auth, permission, not-found)
            detail = str(original_data["detail"])
        elif "non_field_errors" in original_data:
            detail = "; ".join(original_data["non_field_errors"])
        else:
            # Validation errors — collect all field messages
            parts = []
            for field, messages in original_data.items():
                if isinstance(messages, list):
                    parts.append(f"{field}: {', '.join(str(m) for m in messages)}")
                else:
                    parts.append(f"{field}: {messages}")
            detail = "; ".join(parts)
    elif isinstance(original_data, list):
        detail = "; ".join(str(item) for item in original_data)
    else:
        detail = str(original_data)

    response.data = {
        "error": error_code,
        "detail": detail,
    }

    return response


def _get_error_code(status_code: int) -> str:
    """Map HTTP status codes to short, machine-readable error codes."""
    codes = {
        status.HTTP_400_BAD_REQUEST: "bad_request",
        status.HTTP_401_UNAUTHORIZED: "unauthorized",
        status.HTTP_403_FORBIDDEN: "forbidden",
        status.HTTP_404_NOT_FOUND: "not_found",
        status.HTTP_405_METHOD_NOT_ALLOWED: "method_not_allowed",
        status.HTTP_409_CONFLICT: "conflict",
        status.HTTP_429_TOO_MANY_REQUESTS: "rate_limited",
        status.HTTP_500_INTERNAL_SERVER_ERROR: "server_error",
    }
    return codes.get(status_code, "error")
