from rest_framework import serializers

from .models import Agreement


class InstallmentSerializer(serializers.Serializer):
    amount = serializers.IntegerField(min_value=1)
    due_date = serializers.DateField()


class InitiateAgreementSerializer(serializers.Serializer):
    merchant_id = serializers.UUIDField()
    amount = serializers.IntegerField(min_value=1)
    installments = InstallmentSerializer(many=True)
    item_description = serializers.CharField(max_length=500)
    merchant_display_name = serializers.CharField(max_length=255)


class CreateAgreementWitnessResponseSerializer(serializers.Serializer):
    agreement_id = serializers.CharField()
    merchant_id = serializers.CharField()
    amount = serializers.IntegerField()
    installments = InstallmentSerializer(many=True)
    salt = serializers.CharField()


class ConfirmAgreementSerializer(serializers.Serializer):
    onchain_agreement_id = serializers.CharField(max_length=64)
    tx_hash = serializers.CharField(max_length=128)


class RecordPaymentWitnessResponseSerializer(serializers.Serializer):
    payment_id = serializers.CharField()
    merchant_id = serializers.CharField()
    amount = serializers.IntegerField()
    installments = InstallmentSerializer(many=True)
    salt = serializers.CharField()
    installment_index = serializers.IntegerField()
    payment_date_epoch_day = serializers.IntegerField()


class ConfirmPaymentSerializer(serializers.Serializer):
    on_time = serializers.BooleanField()
    tx_hash = serializers.CharField(max_length=128)


class PaymentSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    installment_index = serializers.IntegerField()
    due_date = serializers.DateField()
    paid_at = serializers.DateTimeField(allow_null=True)
    on_time = serializers.BooleanField(allow_null=True)


class AgreementSummarySerializer(serializers.ModelSerializer):
    """Public-shaped summary — matches what the chain itself would
    reveal (existence + status), safe for any authorized viewer scoped
    to this agreement (its own user or its own merchant)."""

    class Meta:
        model = Agreement
        fields = ["id", "status", "onchain_agreement_id", "created_at", "confirmed_at"]
        read_only_fields = fields


class AgreementDetailSerializer(AgreementSummarySerializer):
    """Decrypted purchase detail — only ever returned to the owning
    user or the owning merchant (enforced in views.py, not here)."""

    amount = serializers.SerializerMethodField()
    item_description = serializers.SerializerMethodField()
    merchant_display_name = serializers.SerializerMethodField()
    installments = serializers.SerializerMethodField()

    class Meta(AgreementSummarySerializer.Meta):
        fields = AgreementSummarySerializer.Meta.fields + [
            "amount",
            "item_description",
            "merchant_display_name",
            "installments",
            "payments",
        ]

    payments = PaymentSerializer(many=True, read_only=True)

    def get_amount(self, obj: Agreement) -> int:
        return obj.get_amount()

    def get_item_description(self, obj: Agreement) -> str:
        return obj.get_item_description()

    def get_merchant_display_name(self, obj: Agreement) -> str:
        return obj.get_merchant_display_name()

    def get_installments(self, obj: Agreement) -> list[dict]:
        return obj.get_installments()
