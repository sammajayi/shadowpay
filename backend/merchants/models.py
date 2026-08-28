import hashlib
import secrets
import uuid

from django.db import models


def _generate_api_key() -> str:
    return f"sp_{secrets.token_urlsafe(32)}"


def hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


class Vendor(models.Model):
    """The platform/aggregator layer managing multiple merchants under
    one umbrella (scope doc section 6 — distinct from an individual
    merchant's own storefront)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    contact_email = models.EmailField()
    verified = models.BooleanField(default=False)
    api_key_hash = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    @classmethod
    def create_with_api_key(cls, **fields) -> tuple["Vendor", str]:
        raw_key = _generate_api_key()
        vendor = cls.objects.create(api_key_hash=hash_api_key(raw_key), **fields)
        return vendor, raw_key


class Merchant(models.Model):
    """An individual business accepting ShadowPay at checkout.

    `onchain_merchant_id` is the Bytes<32> identifier used as the
    private `merchantId` witness in the createAgreement circuit and
    as the key into the contract's public merchantRegistry map — it
    is an opaque id, not the merchant's name/domain, so registering
    it on-chain does not itself disclose who the merchant is.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey(
        Vendor, on_delete=models.SET_NULL, null=True, blank=True, related_name="merchants"
    )
    name = models.CharField(max_length=255)
    contact_email = models.EmailField()
    onchain_merchant_id = models.CharField(max_length=64, unique=True, editable=False)
    verified = models.BooleanField(default=False)
    # Set once an admin action has actually written this merchant's
    # verified flag into the contract's merchantRegistry ledger map.
    # (registerMerchant / setMerchantVerified circuit — see
    # contracts README note; not one of the four circuits in scope
    # doc section 3, tracked separately.)
    onchain_registered_at = models.DateTimeField(null=True, blank=True)
    api_key_hash = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    @classmethod
    def create_with_api_key(cls, **fields) -> tuple["Merchant", str]:
        raw_key = _generate_api_key()
        merchant = cls.objects.create(
            onchain_merchant_id=secrets.token_hex(32),
            api_key_hash=hash_api_key(raw_key),
            **fields,
        )
        return merchant, raw_key
