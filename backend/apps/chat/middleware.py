"""
JWT Authentication Middleware for Django Channels WebSocket connections.

Problem: DRF's JWTAuthentication only works for HTTP requests.
         WebSocket connections arrive via Django Channels' ASGI scope,
         not as standard HTTP requests, so DRF middleware never runs.

Solution: A custom ASGI middleware that:
  1. Reads the JWT access token from the WebSocket URL's ?token= query param
     (Authorization headers are not accessible in browser WebSocket APIs)
  2. Validates the token using SimpleJWT
  3. Fetches the corresponding user from the database
  4. Sets scope["user"] so the consumer can access it via self.scope["user"]

If the token is missing or invalid, scope["user"] is set to AnonymousUser.
The consumer then closes the connection with code 4001 (unauthorized).

Usage in asgi.py:
    "websocket": JwtAuthMiddlewareStack(URLRouter(websocket_urlpatterns))
"""

from urllib.parse import parse_qs

from channels.auth import AuthMiddlewareStack
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token_string: str):
    """
    Validate a JWT access token string and return the corresponding User.

    Returns AnonymousUser if the token is invalid, expired, or the user
    does not exist / is inactive.

    This function runs in a thread pool (via database_sync_to_async) because
    ORM calls are synchronous and must not block the async event loop.
    """
    try:
        # Validate the token — raises TokenError on any issue
        validated_token = AccessToken(token_string)
        user_id = validated_token["user_id"]
        user = User.objects.get(pk=user_id, is_active=True)
        return user
    except (TokenError, InvalidToken, User.DoesNotExist, KeyError):
        return AnonymousUser()


class JwtAuthMiddleware(BaseMiddleware):
    """
    ASGI middleware that authenticates WebSocket connections using a JWT
    access token passed as a URL query parameter: ?token=<access_token>

    Sets scope["user"] to the authenticated User or AnonymousUser.
    """

    async def __call__(self, scope, receive, send):
        # Only process WebSocket connections
        if scope["type"] == "websocket":
            query_string = scope.get("query_string", b"").decode("utf-8")
            params = parse_qs(query_string)
            token_list = params.get("token", [])

            if token_list:
                scope["user"] = await get_user_from_token(token_list[0])
            else:
                scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)


def JwtAuthMiddlewareStack(inner):
    """
    Convenience wrapper that stacks JwtAuthMiddleware on top of
    Django Channels' AuthMiddlewareStack.

    Use this in asgi.py instead of AuthMiddlewareStack:
        "websocket": JwtAuthMiddlewareStack(URLRouter(websocket_urlpatterns))
    """
    return JwtAuthMiddleware(AuthMiddlewareStack(inner))
