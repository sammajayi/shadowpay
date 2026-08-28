"""Field-level encryption for off-chain agreement metadata.

Scope doc section 4: "stores off-chain metadata (item description,
merchant display info) encrypted, keyed to the user." The Postgres
database itself is already a private, access-controlled system (not
the public chain), so this is defense-in-depth on top of the API
access control in views.py — every read path here is scoped to
either the owning user or that specific merchant, never anyone else.

Uses a single project-level Fernet key (AGREEMENT_ENCRYPTION_KEY)
rather than deriving a key from the user's wallet, since the backend
never has access to the user's wallet private key (it lives in Lace,
client-side) — there is no server-side key to derive from. "Keyed to
the user" here means access-controlled to the user, not
cryptographically bound to their wallet key.
"""

from django.conf import settings
from cryptography.fernet import Fernet, InvalidToken


def _fernet() -> Fernet:
    key = settings.AGREEMENT_ENCRYPTION_KEY
    if not key:
        raise RuntimeError(
            "AGREEMENT_ENCRYPTION_KEY is not set. Generate one with: "
            "python -c \"from cryptography.fernet import Fernet; "
            "print(Fernet.generate_key().decode())\""
        )
    return Fernet(key.encode("utf-8") if isinstance(key, str) else key)


def encrypt_field(plaintext: str) -> str:
    return _fernet().encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_field(token: str) -> str:
    try:
        return _fernet().decrypt(token.encode("utf-8")).decode("utf-8")
    except InvalidToken as exc:
        raise ValueError("could not decrypt agreement field") from exc
