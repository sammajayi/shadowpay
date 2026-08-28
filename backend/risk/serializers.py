from rest_framework import serializers

from .models import EligibilityCheck, RiskProfile


class RiskProfileUpdateSerializer(serializers.ModelSerializer):
    """Self-reported signals a user can update before an eligibility
    check (income bracket today; wallet age / repayment counts are
    derived server-side, not user-editable)."""

    class Meta:
        model = RiskProfile
        fields = ["income_bracket"]


class EligibilityWitnessResponseSerializer(serializers.Serializer):
    check_id = serializers.UUIDField()
    wallet_age_signal = serializers.IntegerField()
    repayment_signal = serializers.IntegerField()
    income_signal = serializers.IntegerField()
    threshold = serializers.IntegerField()
    expected_pass = serializers.BooleanField()


class ConfirmEligibilitySerializer(serializers.Serializer):
    check_id = serializers.UUIDField()
    passed = serializers.BooleanField()
    onchain_user_key = serializers.CharField(max_length=64)


class EligibilityCheckSerializer(serializers.ModelSerializer):
    class Meta:
        model = EligibilityCheck
        fields = [
            "id",
            "threshold",
            "expected_pass",
            "onchain_confirmed",
            "created_at",
            "confirmed_at",
        ]
        read_only_fields = fields
