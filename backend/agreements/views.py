from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from merchants.models import Merchant
from merchants.permissions import IsMerchant, IsVendor

from . import services
from .models import Agreement, Payment
from .serializers import (
    AgreementDetailSerializer,
    AgreementSummarySerializer,
    ConfirmAgreementSerializer,
    ConfirmPaymentSerializer,
    CreateAgreementWitnessResponseSerializer,
    InitiateAgreementSerializer,
    RecordPaymentWitnessResponseSerializer,
)


class InitiateAgreementView(APIView):
    """Buyer-initiated: validates the purchase and returns the witness
    payload the frontend needs to build the createAgreement proof."""

    def post(self, request):
        serializer = InitiateAgreementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        merchant = get_object_or_404(Merchant, id=data["merchant_id"])

        try:
            payload = services.initiate_agreement(
                user=request.user,
                merchant=merchant,
                amount=data["amount"],
                installments=[
                    {"amount": i["amount"], "due_date": i["due_date"].isoformat()}
                    for i in data["installments"]
                ],
                item_description=data["item_description"],
                merchant_display_name=data["merchant_display_name"],
            )
        except services.MerchantNotVerified:
            return Response({"detail": "merchant is not verified"}, status=status.HTTP_400_BAD_REQUEST)
        except services.InvalidInstallmentSchedule as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        response = CreateAgreementWitnessResponseSerializer(
            {
                "agreement_id": payload.agreement_id,
                "merchant_id": payload.merchant_id,
                "amount": payload.amount,
                "installments": data["installments"],
                "salt": payload.salt,
            }
        )
        return Response(response.data, status=status.HTTP_201_CREATED)


class ConfirmAgreementView(APIView):
    def post(self, request, agreement_id):
        agreement = get_object_or_404(Agreement, id=agreement_id, user=request.user)
        serializer = ConfirmAgreementSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        agreement = services.confirm_agreement(
            agreement=agreement,
            onchain_agreement_id=serializer.validated_data["onchain_agreement_id"],
            tx_hash=serializer.validated_data["tx_hash"],
        )
        return Response(AgreementDetailSerializer(agreement).data)


class MyAgreementsView(APIView):
    """The user's own active agreements — decrypted, since this is the
    one party the visibility matrix says always sees full detail."""

    def get(self, request):
        agreements = request.user.agreements.order_by("-created_at")
        return Response(AgreementDetailSerializer(agreements, many=True).data)


class MyAgreementDetailView(APIView):
    def get(self, request, agreement_id):
        agreement = get_object_or_404(Agreement, id=agreement_id, user=request.user)
        return Response(AgreementDetailSerializer(agreement).data)


class InitiatePaymentView(APIView):
    """Buyer-initiated: validates the next installment is payable and
    returns the witness payload for the recordPayment proof."""

    def post(self, request, agreement_id):
        agreement = get_object_or_404(Agreement, id=agreement_id, user=request.user)
        try:
            payload = services.initiate_payment(agreement=agreement)
        except services.AgreementNotActive as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except services.InstallmentOutOfOrder as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        response = RecordPaymentWitnessResponseSerializer(
            {
                "payment_id": payload.payment_id,
                "merchant_id": payload.merchant_id,
                "amount": payload.amount,
                "installments": payload.installments,
                "salt": payload.salt,
                "installment_index": payload.installment_index,
                "payment_date_epoch_day": payload.payment_date_epoch_day,
            }
        )
        return Response(response.data, status=status.HTTP_201_CREATED)


class ConfirmPaymentView(APIView):
    def post(self, request, agreement_id, payment_id):
        payment = get_object_or_404(
            Payment, id=payment_id, agreement_id=agreement_id, agreement__user=request.user
        )
        serializer = ConfirmPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        services.confirm_payment(
            payment=payment,
            on_time=serializer.validated_data["on_time"],
            tx_hash=serializer.validated_data["tx_hash"],
        )
        agreement = get_object_or_404(Agreement, id=agreement_id, user=request.user)
        return Response(AgreementDetailSerializer(agreement).data)


class MerchantAgreementsView(APIView):
    """A merchant's own agreements — decrypted detail, but strictly
    scoped to `request.auth.merchant`. Never any other merchant's
    rows; enforced by filtering on merchant_id, not by trusting a
    client-supplied merchant id."""

    permission_classes = [IsMerchant]

    def get(self, request):
        agreements = Agreement.objects.filter(merchant=request.auth.merchant).order_by("-created_at")
        return Response(AgreementDetailSerializer(agreements, many=True).data)


class MerchantAgreementDetailView(APIView):
    permission_classes = [IsMerchant]

    def get(self, request, agreement_id):
        agreement = get_object_or_404(Agreement, id=agreement_id, merchant=request.auth.merchant)
        return Response(AgreementDetailSerializer(agreement).data)


class MerchantStatsView(APIView):
    """Own aggregate stats only — volume and on-time rate for this
    merchant's own agreements (scope doc section 6)."""

    permission_classes = [IsMerchant]

    def get(self, request):
        agreements = Agreement.objects.filter(merchant=request.auth.merchant)
        active_or_completed = agreements.filter(
            Q(status=Agreement.Status.ACTIVE) | Q(status=Agreement.Status.COMPLETED)
        )
        total_volume = sum(a.get_amount() for a in active_or_completed)
        payments = [p for a in active_or_completed for p in a.payments.filter(on_time__isnull=False)]
        on_time_count = sum(1 for p in payments if p.on_time)

        return Response(
            {
                "agreement_count": active_or_completed.count(),
                "total_volume": total_volume,
                "on_time_rate": (on_time_count / len(payments)) if payments else None,
            }
        )


class VendorStatsView(APIView):
    """Aggregate volume and on-time rate across the vendor's whole
    merchant roster — aggregate only, never a drill-down into any one
    merchant's or user's data (scope doc section 6). Note this never
    returns anything grouped by merchant; if it ever needs to, that's
    a deliberate product decision, not a default to add casually —
    a vendor seeing "merchant X moves $Y" is a real privacy narrowing
    even without amounts/identities of individual purchases."""

    permission_classes = [IsVendor]

    def get(self, request):
        agreements = Agreement.objects.filter(merchant__vendor=request.auth.vendor)
        active_or_completed = agreements.filter(
            Q(status=Agreement.Status.ACTIVE) | Q(status=Agreement.Status.COMPLETED)
        )
        total_volume = sum(a.get_amount() for a in active_or_completed)
        payments = [p for a in active_or_completed for p in a.payments.filter(on_time__isnull=False)]
        on_time_count = sum(1 for p in payments if p.on_time)

        return Response(
            {
                "merchant_count": request.auth.vendor.merchants.count(),
                "agreement_count": active_or_completed.count(),
                "total_volume": total_volume,
                "on_time_rate": (on_time_count / len(payments)) if payments else None,
            }
        )


class VendorPayoutReconciliationView(APIView):
    """Per-merchant payout counts/volume across the roster — still
    aggregate per merchant, never a purchase-level breakdown. This is
    the one vendor endpoint that names individual merchants (their
    onboarding identity is not itself private — only their customers'
    purchases are), so it deliberately stops at counts and totals."""

    permission_classes = [IsVendor]

    def get(self, request):
        rows = []
        for merchant in request.auth.vendor.merchants.all():
            settled = Agreement.objects.filter(
                merchant=merchant, status__in=[Agreement.Status.ACTIVE, Agreement.Status.COMPLETED]
            )
            rows.append(
                {
                    "merchant_id": str(merchant.id),
                    "merchant_name": merchant.name,
                    "verified": merchant.verified,
                    "agreement_count": settled.count(),
                    "total_volume": sum(a.get_amount() for a in settled),
                }
            )
        return Response(rows)
