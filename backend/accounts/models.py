import uuid

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, wallet_address, **extra_fields):
        if not wallet_address:
            raise ValueError("wallet_address is required")
        user = self.model(wallet_address=wallet_address.lower(), **extra_fields)
        user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, wallet_address, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        return self.create_user(wallet_address, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """A ShadowPay user, identified by their Lace wallet address.

    There is no password — auth is entirely the wallet-signature
    challenge flow in accounts/views.py.
    """

    class Role(models.TextChoices):
        USER = "user", "User"
        ADMIN = "admin", "Admin"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet_address = models.CharField(max_length=255, unique=True, db_index=True)
    email = models.EmailField(blank=True, default="")
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.USER)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "wallet_address"
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.wallet_address


class WalletChallenge(models.Model):
    """A one-time nonce a wallet must sign to authenticate.

    Flow: POST /api/auth/challenge/ {wallet_address} creates one of
    these and returns the message to sign. POST /api/auth/verify/
    checks the signature against it, consumes it, and issues JWTs.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet_address = models.CharField(max_length=255, db_index=True)
    nonce = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    consumed_at = models.DateTimeField(null=True, blank=True)

    @property
    def message(self) -> str:
        return (
            "Sign this message to authenticate with ShadowPay.\n\n"
            f"Nonce: {self.nonce}\n"
            f"Issued: {self.created_at.isoformat() if self.created_at else ''}"
        )

    @property
    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    @property
    def is_used(self) -> bool:
        return self.consumed_at is not None
