from rest_framework import serializers

from .models import Merchant, Vendor


class MerchantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Merchant
        fields = [
            "id",
            "name",
            "contact_email",
            "onchain_merchant_id",
            "verified",
            "vendor",
            "created_at",
        ]
        read_only_fields = fields


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ["id", "name", "contact_email", "verified", "created_at"]
        read_only_fields = fields


class MerchantRosterEntrySerializer(serializers.ModelSerializer):
    """What a vendor sees about a merchant on its own roster —
    verification status only, never that merchant's agreement/purchase
    data (scope doc section 6: vendor gets aggregate stats, no
    drill-down)."""

    class Meta:
        model = Merchant
        fields = ["id", "name", "verified", "created_at"]
        read_only_fields = fields
