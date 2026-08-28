from rest_framework import serializers

from merchants.models import Merchant, Vendor
from risk.models import RiskConfig


class CreateMerchantSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    contact_email = serializers.EmailField()
    vendor_id = serializers.UUIDField(required=False, allow_null=True)


class CreateVendorSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    contact_email = serializers.EmailField()


class MerchantAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Merchant
        fields = [
            "id",
            "name",
            "contact_email",
            "vendor",
            "verified",
            "onchain_registered_at",
            "created_at",
        ]
        read_only_fields = fields


class VendorAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ["id", "name", "contact_email", "verified", "created_at"]
        read_only_fields = fields


class RiskConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = RiskConfig
        fields = ["threshold", "updated_at"]
        read_only_fields = ["updated_at"]
