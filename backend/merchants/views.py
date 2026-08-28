from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsMerchant, IsVendor
from .serializers import (
    MerchantRosterEntrySerializer,
    MerchantSerializer,
    VendorSerializer,
)


class MerchantMeView(APIView):
    """A merchant's own profile. Nothing here, or anywhere else a
    merchant can reach, ever includes another merchant's data."""

    permission_classes = [IsMerchant]

    def get(self, request):
        return Response(MerchantSerializer(request.auth.merchant).data)


class VendorMeView(APIView):
    permission_classes = [IsVendor]

    def get(self, request):
        return Response(VendorSerializer(request.auth.vendor).data)


class VendorRosterView(APIView):
    """The vendor's onboarded merchants — verification status only.
    Aggregate volume/on-time-rate lives in agreements.views since it's
    computed from Agreement rows; this endpoint is identity/roster only."""

    permission_classes = [IsVendor]

    def get(self, request):
        merchants = request.auth.vendor.merchants.all().order_by("-created_at")
        return Response(MerchantRosterEntrySerializer(merchants, many=True).data)
