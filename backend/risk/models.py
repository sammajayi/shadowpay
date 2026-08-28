import uuid

from django.conf import settings
from django.db import models


class RiskProfile(models.Model):
    """The raw signals behind a user's risk score. Never exposed to
    merchants, vendors, or admin — only ever read back to the owning
    user, and only ever leaves this table as derived score components
    fed to the checkEligibility circuit as private witnesses."""

    class IncomeBracket(models.TextChoices):
        UNKNOWN = "unknown", "Unknown"
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="risk_profile")
    wallet_age_days = models.PositiveIntegerField(default=0)
    on_time_payment_count = models.PositiveIntegerField(default=0)
    late_payment_count = models.PositiveIntegerField(default=0)
    income_bracket = models.CharField(max_length=16, choices=IncomeBracket.choices, default=IncomeBracket.UNKNOWN)
    updated_at = models.DateTimeField(auto_now=True)


class EligibilityCheck(models.Model):
    """An audit trail of eligibility checks. Score/components are
    stored so the user can see their own history — this table is
    never queried by anyone but the owning user's own API calls."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="eligibility_checks")
    wallet_age_signal = models.PositiveIntegerField()
    repayment_signal = models.PositiveIntegerField()
    income_signal = models.PositiveIntegerField()
    threshold = models.PositiveIntegerField()
    expected_pass = models.BooleanField()
    # Filled in by the confirm step once the frontend has actually run
    # the checkEligibility circuit and submitted the transaction.
    onchain_confirmed = models.BooleanField(null=True, blank=True)
    onchain_user_key = models.CharField(max_length=64, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)

    @property
    def total_score(self) -> int:
        return self.wallet_age_signal + self.repayment_signal + self.income_signal


class RiskConfig(models.Model):
    """Singleton row holding the live eligibility threshold. Mirrors
    the contract's public `eligibilityThreshold` ledger value — admin
    can retune the bar (scope doc section 6) without redeploying the
    contract; a separate on-chain admin transaction updates the
    ledger value itself once the frontend/admin-view wiring for that
    exists (build order item 7)."""

    threshold = models.PositiveIntegerField(default=60)
    updated_at = models.DateTimeField(auto_now=True)

    @classmethod
    def current(cls) -> "RiskConfig":
        config, _ = cls.objects.get_or_create(pk=1)
        return config
