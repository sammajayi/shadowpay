import secrets

from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, WalletChallenge
from .serializers import (
    ChallengeRequestSerializer,
    ChallengeResponseSerializer,
    UserSerializer,
    VerifyRequestSerializer,
)
from .signature import get_verifier


class ChallengeView(APIView):
    """Step 1 of wallet auth: issue a nonce for the wallet to sign."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ChallengeRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        wallet_address = serializer.validated_data["wallet_address"].lower()

        challenge = WalletChallenge.objects.create(
            wallet_address=wallet_address,
            nonce=secrets.token_hex(16),
            expires_at=timezone.now() + timezone.timedelta(
                seconds=settings.WALLET_CHALLENGE_TTL_SECONDS
            ),
        )

        response = ChallengeResponseSerializer(
            {
                "challenge_id": challenge.id,
                "message": challenge.message,
                "expires_at": challenge.expires_at,
            }
        )
        return Response(response.data, status=status.HTTP_201_CREATED)


class VerifyView(APIView):
    """Step 2 of wallet auth: verify the signature over the challenge
    message and, on success, issue a JWT pair (matches the JWT/Privy
    pattern from shadowpay-mvp-scope.md section 4)."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        challenge = get_object_or_404(WalletChallenge, id=data["challenge_id"])
        wallet_address = data["wallet_address"].lower()

        if challenge.wallet_address != wallet_address:
            return Response(
                {"detail": "wallet_address does not match this challenge"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if challenge.is_used:
            return Response({"detail": "challenge already used"}, status=status.HTTP_400_BAD_REQUEST)
        if challenge.is_expired:
            return Response({"detail": "challenge expired"}, status=status.HTTP_400_BAD_REQUEST)

        verifier = get_verifier()
        if not verifier.verify(
            wallet_address=wallet_address,
            message=challenge.message,
            signature=data["signature"],
        ):
            return Response({"detail": "invalid signature"}, status=status.HTTP_401_UNAUTHORIZED)

        challenge.consumed_at = timezone.now()
        challenge.save(update_fields=["consumed_at"])

        user, _ = User.objects.get_or_create(wallet_address=wallet_address)

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            }
        )


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)
