from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from .models import Merchant, Vendor, hash_api_key


class MerchantPrincipal:
    """Auth principal for a merchant-scoped API key. Deliberately not a
    Django User — a merchant can only ever see its own agreements/payouts
    (scope doc section 6), enforced by every merchant view filtering on
    `request.auth.merchant`, never on a broader queryset."""

    is_authenticated = True

    def __init__(self, merchant: Merchant):
        self.merchant = merchant


class VendorPrincipal:
    """Auth principal for a vendor-scoped API key. Vendors only ever see
    aggregate stats across their own merchant roster — never a single
    merchant's or user's underlying data."""

    is_authenticated = True

    def __init__(self, vendor: Vendor):
        self.vendor = vendor


class MerchantAPIKeyAuthentication(BaseAuthentication):
    """Authenticates requests carrying `Authorization: ApiKey <key>` as
    either a Merchant or a Vendor, based on which table the key's hash
    matches. Returns (None, principal) — merchant/vendor views must key
    off `request.auth`, not `request.user`."""

    keyword = "ApiKey"

    def authenticate(self, request):
        header = request.META.get("HTTP_AUTHORIZATION", "")
        if not header.startswith(f"{self.keyword} "):
            return None

        raw_key = header[len(self.keyword) + 1 :].strip()
        key_hash = hash_api_key(raw_key)

        merchant = Merchant.objects.filter(api_key_hash=key_hash).first()
        if merchant is not None:
            return (None, MerchantPrincipal(merchant))

        vendor = Vendor.objects.filter(api_key_hash=key_hash).first()
        if vendor is not None:
            return (None, VendorPrincipal(vendor))

        raise AuthenticationFailed("invalid API key")
