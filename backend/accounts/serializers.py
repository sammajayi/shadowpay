from rest_framework import serializers

from .models import User


class ChallengeRequestSerializer(serializers.Serializer):
    wallet_address = serializers.CharField(max_length=255)


class ChallengeResponseSerializer(serializers.Serializer):
    challenge_id = serializers.UUIDField()
    message = serializers.CharField()
    expires_at = serializers.DateTimeField()


class VerifyRequestSerializer(serializers.Serializer):
    challenge_id = serializers.UUIDField()
    wallet_address = serializers.CharField(max_length=255)
    signature = serializers.CharField()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "wallet_address", "role", "date_joined"]
        read_only_fields = fields
