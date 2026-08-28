import json
import uuid

from django.conf import settings
from django.db import models

from merchants.models import Merchant

from .encryption import decrypt_field, encrypt_field


class Agreement(models.Model):
    """An off-chain record mirroring one createAgreement circuit call.

    The purchase amount, item description, merchant display name, and
    installment schedule are all encrypted at rest. The only fields
    safe to read in cleartext are exactly the ones the contract itself
    makes public: whether an agreement exists, and (once payments
    start) on-time status.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending on-chain confirmation"
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="agreements")
    merchant = models.ForeignKey(Merchant, on_delete=models.PROTECT, related_name="agreements")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)

    # Randomness bound into the on-chain commitment (agreementId =
    # persistentHash(buyerKey, merchantId, amount, installments, salt)).
    # Not secret on its own — needed again for recordPayment so the
    # same commitment can be recomputed — so it's not encrypted.
    salt = models.CharField(max_length=64)

    # Filled in once the frontend actually submits createAgreement and
    # we get the resulting public agreement id back.
    onchain_agreement_id = models.CharField(max_length=64, blank=True, default="")
    onchain_tx_hash = models.CharField(max_length=128, blank=True, default="")
    disputed = models.BooleanField(default=False)

    # Set once closeAgreement has actually been run and confirmed —
    # distinct from status=COMPLETED, which only means all 4
    # installments are paid and closing is now possible.
    onchain_closed_at = models.DateTimeField(null=True, blank=True)
    onchain_close_tx_hash = models.CharField(max_length=128, blank=True, default="")

    encrypted_amount = models.TextField()
    encrypted_item_description = models.TextField()
    encrypted_merchant_display_name = models.TextField()
    encrypted_installments = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)

    def set_amount(self, amount: int) -> None:
        self.encrypted_amount = encrypt_field(str(amount))

    def get_amount(self) -> int:
        return int(decrypt_field(self.encrypted_amount))

    def set_item_description(self, description: str) -> None:
        self.encrypted_item_description = encrypt_field(description)

    def get_item_description(self) -> str:
        return decrypt_field(self.encrypted_item_description)

    def set_merchant_display_name(self, name: str) -> None:
        self.encrypted_merchant_display_name = encrypt_field(name)

    def get_merchant_display_name(self) -> str:
        return decrypt_field(self.encrypted_merchant_display_name)

    def set_installments(self, installments: list[dict]) -> None:
        self.encrypted_installments = encrypt_field(json.dumps(installments))

    def get_installments(self) -> list[dict]:
        return json.loads(decrypt_field(self.encrypted_installments))


class Payment(models.Model):
    """One installment payment against an Agreement. Amount stays
    encrypted; only the on-time boolean is ever meant to become
    public (via the recordPayment circuit, build order item 4)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agreement = models.ForeignKey(Agreement, on_delete=models.CASCADE, related_name="payments")
    installment_index = models.PositiveSmallIntegerField()
    encrypted_amount = models.TextField()
    due_date = models.DateField()
    paid_at = models.DateTimeField(null=True, blank=True)
    on_time = models.BooleanField(null=True, blank=True)
    onchain_tx_hash = models.CharField(max_length=128, blank=True, default="")

    def set_amount(self, amount: int) -> None:
        self.encrypted_amount = encrypt_field(str(amount))

    def get_amount(self) -> int:
        return int(decrypt_field(self.encrypted_amount))

    class Meta:
        unique_together = ("agreement", "installment_index")
        ordering = ["installment_index"]
