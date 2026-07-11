"""
Message encryption utilities using Fernet (AES-128-CBC + HMAC-SHA256).

All message content is encrypted before writing to the database and
decrypted transparently on read.  The encryption key is stored in
settings.MESSAGE_ENCRYPTION_KEY (loaded from the MESSAGE_ENCRYPTION_KEY
env variable).

Design notes:
  - Fernet guarantees confidentiality AND integrity (tamper detection).
  - The encrypted token is base64-encoded so it is safe to store in a
    plain TEXT column without any schema change.
  - If decryption fails (e.g. a legacy plaintext row or a truncated token),
    decrypt_text() returns a safe sentinel string rather than raising.
  - Thread-safe: Fernet instances are stateless and cheap to construct.
"""

import logging

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings

logger = logging.getLogger(__name__)


# ── Fernet instance (lazily constructed, cached at module level) ───────────────

_fernet_instance: Fernet | None = None


def get_fernet() -> Fernet:
    """
    Return a Fernet instance built from settings.MESSAGE_ENCRYPTION_KEY.

    Raises ValueError if the key is missing or invalid so that a
    misconfigured deployment fails loudly at startup rather than silently
    storing plaintext.
    """
    global _fernet_instance
    if _fernet_instance is not None:
        return _fernet_instance

    key: str = getattr(settings, "MESSAGE_ENCRYPTION_KEY", "")
    if not key:
        raise ValueError(
            "MESSAGE_ENCRYPTION_KEY is not set in settings / .env.  "
            "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )

    try:
        _fernet_instance = Fernet(key.encode())
    except Exception as exc:
        raise ValueError(f"MESSAGE_ENCRYPTION_KEY is invalid: {exc}") from exc

    return _fernet_instance


# ── Public helpers ─────────────────────────────────────────────────────────────

def encrypt_text(plaintext: str) -> str:
    """
    Encrypt *plaintext* and return a base64-encoded Fernet token string.

    The returned value is safe to store in a VARCHAR / TEXT column.
    """
    return get_fernet().encrypt(plaintext.encode("utf-8")).decode("ascii")


def decrypt_text(token: str) -> str:
    """
    Decrypt a Fernet *token* and return the original plaintext string.

    Returns a safe sentinel on any decryption failure so that a single
    corrupt or legacy row does not break the entire conversation view.
    """
    try:
        return get_fernet().decrypt(token.encode("ascii")).decode("utf-8")
    except (InvalidToken, Exception) as exc:
        logger.warning("Failed to decrypt message content: %s", exc)
        return "[message unavailable]"


def is_encrypted(value: str) -> bool:
    """
    Heuristic check: Fernet tokens always start with 'gAAAAA' (the base64
    encoding of the Fernet version byte 0x80).  Use this to detect whether
    a stored value is already encrypted or is legacy plaintext.
    """
    return isinstance(value, str) and value.startswith("gAAAAA")
