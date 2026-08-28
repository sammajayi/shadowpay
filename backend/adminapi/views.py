from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from agreements.models import Agreement, Payment
from merchants.models import Merchant, Vendor

from .permissions import IsPlatformAdmin
from .serializers import (
    CreateMerchantSerializer,
    CreateVendorSerializer,
    MerchantAdminSerializer,
    RiskConfigSerializer,
    VendorAdminSerializer,
)
from risk.models import RiskConfig


class OnboardingMerchantListCreateView(APIView):
    """Merchant onboarding queue. Creating a merchant here does NOT by
    itself verify it or write to the contract's merchantRegistry —
    that's a separate approve step below, kept distinct so "pending
    review" is a real, visible state."""

    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        merchants = Merchant.objects.all().order_by("-created_at")
        pending_only = request.query_params.get("pending") == "true"
        if pending_only:
            merchants = merchants.filter(verified=False)
        return Response(MerchantAdminSerializer(merchants, many=True).data)

    def post(self, request):
        serializer = CreateMerchantSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        vendor = None
        if data.get("vendor_id"):
            vendor = get_object_or_404(Vendor, id=data["vendor_id"])

        merchant, raw_api_key = Merchant.create_with_api_key(
            name=data["name"], contact_email=data["contact_email"], vendor=vendor
        )
        response = MerchantAdminSerializer(merchant).data
        response["api_key"] = raw_api_key  # shown exactly once
        return Response(response, status=status.HTTP_201_CREATED)


class ApproveMerchantView(APIView):
    """Approves a merchant. `onchain_registered_at` stays null until
    the merchantRegistry ledger write actually happens — see the note
    in merchants/models.py; that circuit is a Wave 1 follow-up, not
    yet wired to this endpoint."""

    permission_classes = [IsPlatformAdmin]

    def post(self, request, merchant_id):
        merchant = get_object_or_404(Merchant, id=merchant_id)
        merchant.verified = True
        merchant.save(update_fields=["verified"])
        return Response(MerchantAdminSerializer(merchant).data)


class RejectMerchantView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request, merchant_id):
        merchant = get_object_or_404(Merchant, id=merchant_id)
        merchant.verified = False
        merchant.save(update_fields=["verified"])
        return Response(MerchantAdminSerializer(merchant).data)


class OnboardingVendorListCreateView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        vendors = Vendor.objects.all().order_by("-created_at")
        return Response(VendorAdminSerializer(vendors, many=True).data)

    def post(self, request):
        serializer = CreateVendorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vendor, raw_api_key = Vendor.create_with_api_key(**serializer.validated_data)
        response = VendorAdminSerializer(vendor).data
        response["api_key"] = raw_api_key
        return Response(response, status=status.HTTP_201_CREATED)


class ApproveVendorView(APIView):
    permission_classes = [IsPlatformAdmin]

    def post(self, request, vendor_id):
        vendor = get_object_or_404(Vendor, id=vendor_id)
        vendor.verified = True
        vendor.save(update_fields=["verified"])
        return Response(VendorAdminSerializer(vendor).data)


class PoolMonitoringView(APIView):
    """Platform-wide aggregates only — total agreements, pool
    utilization, aggregate on-time rate. Deliberately cannot drill
    into any individual user/merchant/vendor's purchase data (scope
    doc section 6) — note every value below is a count or a sum,
    never a single agreement's amount."""

    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        agreements = Agreement.objects.exclude(status=Agreement.Status.PENDING)
        total_volume = sum(a.get_amount() for a in agreements)
        payments = Payment.objects.filter(agreement__in=agreements, on_time__isnull=False)
        on_time_count = payments.filter(on_time=True).count()
        total_payments = payments.count()

        return Response(
            {
                "total_agreements": agreements.count(),
                "active_agreements": agreements.filter(status=Agreement.Status.ACTIVE).count(),
                "completed_agreements": agreements.filter(status=Agreement.Status.COMPLETED).count(),
                "total_volume_disbursed": total_volume,
                "aggregate_on_time_rate": (on_time_count / total_payments) if total_payments else None,
                "disputed_agreements": agreements.filter(disputed=True).count(),
            }
        )


class DisputeQueueView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        from agreements.serializers import AgreementSummarySerializer

        disputed = Agreement.objects.filter(disputed=True).order_by("-created_at")
        return Response(AgreementSummarySerializer(disputed, many=True).data)


class RiskConfigView(APIView):
    """Adjustable threshold for checkEligibility — tune without
    redeploying the contract (scope doc section 6). Retuning here
    changes what the risk engine hands the frontend as the public
    `threshold` witness input; it does not itself update the
    contract's on-chain `eligibilityThreshold` — that still needs an
    admin-signed transaction, which is a build order item 7 concern."""

    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        return Response(RiskConfigSerializer(RiskConfig.current()).data)

    def patch(self, request):
        config = RiskConfig.current()
        serializer = RiskConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
