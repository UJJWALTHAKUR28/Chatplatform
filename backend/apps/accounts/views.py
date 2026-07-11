"""
Views for the accounts app.

  RegisterView    POST  /api/v1/auth/register/         — create account + JWT pair
  LoginView       POST  /api/v1/auth/login/            — authenticate + JWT pair
  LogoutView      POST  /api/v1/auth/logout/           — blacklist refresh token
  MeView          GET   /api/v1/auth/me/               — own user profile
              PATCH  /api/v1/auth/me/               — update display_name
  UserSearchView  GET   /api/v1/auth/users/search/?q=  — find users to chat with
"""

from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    LoginSerializer,
    LogoutSerializer,
    RegisterSerializer,
    UpdateProfileSerializer,
    UserPublicSerializer,
    UserSerializer,
)

User = get_user_model()


class RegisterView(APIView):
    """
    POST /api/v1/auth/register/

    Creates a new user account and immediately returns a JWT access+refresh pair.
    No email verification step — the account is active immediately.

    Request body:
        { email, display_name, password, password_confirm }

    Response 201:
        { user: {id, email, display_name, date_joined}, tokens: {access, refresh} }
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # to_representation on RegisterSerializer returns {user, tokens}
        return Response(serializer.to_representation(user), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """
    POST /api/v1/auth/login/

    Authenticates email + password and returns a fresh JWT pair.

    Request body:
        { email, password }

    Response 200:
        { user: {id, email, display_name, date_joined}, tokens: {access, refresh} }
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        return Response(
            serializer.to_representation(serializer.validated_data),
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/

    Blacklists the provided refresh token so it can never be used to generate
    a new access token.  The SimpleJWT token_blacklist app stores the blacklisted
    tokens in a Postgres table.

    The frontend should also delete the stored tokens from localStorage/cookies.

    Request body:
        { refresh: "<refresh_token_string>" }

    Response 205:  (Reset Content — signals the client to clear its auth state)
        {}
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            token = RefreshToken(serializer.validated_data["refresh"])
            token.blacklist()
        except TokenError as exc:
            return Response(
                {"error": "Token is invalid or already blacklisted.", "detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_205_RESET_CONTENT)


class MeView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/v1/auth/me/  — Returns the authenticated user's own profile.
    PATCH /api/v1/auth/me/  — Updates the authenticated user's display_name.

    GET Response 200:
        { id, email, display_name, date_joined }

    PATCH Request body (all fields optional, at least one required):
        { display_name: "new name" }

    PATCH Response 200:
        { id, email, display_name, date_joined }
    """

    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]  # no PUT

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method == "PATCH":
            return UpdateProfileSerializer
        return UserSerializer

    def partial_update(self, request, *args, **kwargs):
        """PATCH — update display_name only."""
        instance = self.get_object()
        serializer = UpdateProfileSerializer(
            instance,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        updated_user = serializer.save()
        return Response(serializer.to_representation(updated_user))


class UserSearchView(generics.ListAPIView):
    """
    GET /api/v1/auth/users/search/?q=<query>

    Searches for users by email or display_name.
    Used by the frontend when starting a new conversation.

    - Excludes the requesting user from results.
    - Case-insensitive substring match.
    - Returns at most 20 results (frontend should add a minimum query length).

    Response 200:
        [{ id, display_name }, ...]
    """

    permission_classes = [IsAuthenticated]
    serializer_class = UserPublicSerializer
    pagination_class = None  # No pagination — return up to 20 results directly

    def get_queryset(self):
        query = self.request.query_params.get("q", "").strip()
        if len(query) < 2:
            return User.objects.none()

        return (
            User.objects.filter(
                Q(email__icontains=query) | Q(display_name__icontains=query),
                is_active=True,
            )
            .exclude(pk=self.request.user.pk)
            .order_by("display_name")[:20]
        )
