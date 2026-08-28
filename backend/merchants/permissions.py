from rest_framework.permissions import BasePermission

from .authentication import MerchantPrincipal, VendorPrincipal


class IsMerchant(BasePermission):
    def has_permission(self, request, view):
        return isinstance(request.auth, MerchantPrincipal)


class IsVendor(BasePermission):
    def has_permission(self, request, view):
        return isinstance(request.auth, VendorPrincipal)
