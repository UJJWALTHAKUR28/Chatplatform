"""
Serializers for the accounts app.

  RegisterSerializer       — validate + create a new user, return JWT pair
  LoginSerializer          — authenticate email + password, return JWT pair
  UpdateProfileSerializer  — validate + apply display_name change for the authenticated user
  UserSerializer           — read-only public user data (safe to expose)
  UserPublicSerializer     — minimal data for embedding inside messages/conversations
"""

from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


# ── Helpers ──────────────────────────────────────────────────────────────────

def get_tokens_for_user(user) -> dict:
    """Generate a fresh access+refresh JWT pair for a given user instance."""
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


# ── Serializers ──────────────────────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    """
    Handles new account creation.

    Input:  { email, display_name, password, password_confirm }
    Output: { user: {...}, tokens: { access, refresh } }
    """

    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={"input_type": "password"},
        help_text="Minimum 8 characters.",
    )
    password_confirm = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
        help_text="Must match the password field.",
    )

    class Meta:
        model = User
        fields = ["email", "display_name", "password", "password_confirm"]

    def validate_email(self, value: str) -> str:
        value = value.lower().strip()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_display_name(self, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError("Display name must be at least 2 characters.")
        if User.objects.filter(display_name__iexact=value).exists():
            raise serializers.ValidationError("This display name is already taken.")
        return value

    def validate(self, data: dict) -> dict:
        if data["password"] != data.pop("password_confirm"):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return data

    def create(self, validated_data: dict) -> User:
        return User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            display_name=validated_data["display_name"],
        )

    def to_representation(self, instance: User) -> dict:
        tokens = get_tokens_for_user(instance)
        return {
            "user": UserSerializer(instance).data,
            "tokens": tokens,
        }


class LoginSerializer(serializers.Serializer):
    """
    Authenticates an existing user.

    Input:  { email, password }
    Output: { user: {...}, tokens: { access, refresh } }
    """

    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )

    def validate(self, data: dict) -> dict:
        email = data.get("email", "").lower().strip()
        password = data.get("password", "")

        user = authenticate(
            request=self.context.get("request"),
            username=email,  # Django's authenticate() uses USERNAME_FIELD internally
            password=password,
        )

        if not user:
            raise serializers.ValidationError(
                {"non_field_errors": "Invalid email or password. Please try again."}
            )
        if not user.is_active:
            raise serializers.ValidationError(
                {"non_field_errors": "This account has been deactivated."}
            )

        data["user"] = user
        return data

    def to_representation(self, validated_data: dict) -> dict:
        user = validated_data["user"]
        tokens = get_tokens_for_user(user)
        return {
            "user": UserSerializer(user).data,
            "tokens": tokens,
        }


class UpdateProfileSerializer(serializers.ModelSerializer):
    """
    Handles PATCH /api/v1/auth/me/ — lets the authenticated user update
    their display_name.

    Only display_name is writable.  Email changes are not supported (it is
    the login identifier and requires additional verification logic).

    Input:  { display_name: "new name" }
    Output: { id, email, display_name, date_joined }
    """

    display_name = serializers.CharField(
        min_length=2,
        max_length=50,
        help_text="Must be unique across all accounts. Min 2 characters.",
    )

    class Meta:
        model = User
        fields = ["display_name"]

    def validate_display_name(self, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError("Display name must be at least 2 characters.")
        # Exclude the current user from the uniqueness check
        qs = User.objects.filter(display_name__iexact=value).exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This display name is already taken.")
        return value

    def update(self, instance: User, validated_data: dict) -> User:
        instance.display_name = validated_data["display_name"]
        instance.save(update_fields=["display_name"])
        return instance

    def to_representation(self, instance: User) -> dict:
        return UserSerializer(instance).data


class UserSerializer(serializers.ModelSerializer):
    """
    Full user representation.
    Safe to return to the authenticated user themselves (e.g. /auth/me/).
    """

    class Meta:
        model = User
        fields = ["id", "email", "display_name", "date_joined"]
        read_only_fields = fields


class UserPublicSerializer(serializers.ModelSerializer):
    """
    Minimal user data embedded inside Message and Conversation objects.
    Does NOT expose email — only what other chat participants need to see.
    """

    class Meta:
        model = User
        fields = ["id", "display_name"]
        read_only_fields = fields


class LogoutSerializer(serializers.Serializer):
    """Accepts the refresh token to be blacklisted on logout."""
    refresh = serializers.CharField(help_text="The refresh token to invalidate.")
