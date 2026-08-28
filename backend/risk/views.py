from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .engine import compute_signals
from .models import EligibilityCheck, RiskConfig, RiskProfile
from .serializers import (
    ConfirmEligibilitySerializer,
    EligibilityCheckSerializer,
    EligibilityWitnessResponseSerializer,
    RiskProfileUpdateSerializer,
)


class RiskProfileView(APIView):
    def get(self, request):
        profile, _ = RiskProfile.objects.get_or_create(user=request.user)
        return Response(RiskProfileUpdateSerializer(profile).data)

    def patch(self, request):
        profile, _ = RiskProfile.objects.get_or_create(user=request.user)
        serializer = RiskProfileUpdateSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class EligibilityWitnessView(APIView):
    """Computes this user's current risk signals and hands back exactly
    the payload the frontend needs to answer the checkEligibility
    circuit's `eligibilityScoreInputs()` witness call. The score itself
    is never sent anywhere except back to this same authenticated user
    — it is the private input to a ZK proof they generate client-side,
    not a value ShadowPay publishes anywhere."""

    def post(self, request):
        profile, _ = RiskProfile.objects.get_or_create(user=request.user)

        signals = compute_signals(
            wallet_age_days=profile.wallet_age_days,
            on_time_payment_count=profile.on_time_payment_count,
            late_payment_count=profile.late_payment_count,
            income_bracket=profile.income_bracket,
        )
        threshold = RiskConfig.current().threshold
        expected_pass = signals.total_score >= threshold

        check = EligibilityCheck.objects.create(
            user=request.user,
            wallet_age_signal=signals.wallet_age_signal,
            repayment_signal=signals.repayment_signal,
            income_signal=signals.income_signal,
            threshold=threshold,
            expected_pass=expected_pass,
        )

        response = EligibilityWitnessResponseSerializer(
            {
                "check_id": check.id,
                "wallet_age_signal": signals.wallet_age_signal,
                "repayment_signal": signals.repayment_signal,
                "income_signal": signals.income_signal,
                "threshold": threshold,
                "expected_pass": expected_pass,
            }
        )
        return Response(response.data, status=status.HTTP_201_CREATED)


class ConfirmEligibilityView(APIView):
    """Called after the frontend actually runs the checkEligibility
    circuit and submits the transaction — records the real on-chain
    outcome against the earlier witness-generation record."""

    def post(self, request):
        serializer = ConfirmEligibilitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        check = get_object_or_404(EligibilityCheck, id=data["check_id"], user=request.user)
        check.onchain_confirmed = data["passed"]
        check.onchain_user_key = data["onchain_user_key"]
        check.confirmed_at = timezone.now()
        check.save(update_fields=["onchain_confirmed", "onchain_user_key", "confirmed_at"])

        return Response(EligibilityCheckSerializer(check).data)


class EligibilityHistoryView(APIView):
    def get(self, request):
        checks = request.user.eligibility_checks.order_by("-created_at")[:50]
        return Response(EligibilityCheckSerializer(checks, many=True).data)
