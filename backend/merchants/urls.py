from django.urls import path

from .views import MerchantMeView, VendorMeView, VendorRosterView

urlpatterns = [
    path("me/", MerchantMeView.as_view(), name="merchant-me"),
    path("vendor/me/", VendorMeView.as_view(), name="vendor-me"),
    path("vendor/roster/", VendorRosterView.as_view(), name="vendor-roster"),
]
