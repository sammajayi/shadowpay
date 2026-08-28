from django.urls import path

from .views import (
    ApproveMerchantView,
    ApproveVendorView,
    DisputeQueueView,
    OnboardingMerchantListCreateView,
    OnboardingVendorListCreateView,
    PoolMonitoringView,
    RejectMerchantView,
    RiskConfigView,
)

urlpatterns = [
    path("onboarding/merchants/", OnboardingMerchantListCreateView.as_view(), name="admin-merchants"),
    path("onboarding/merchants/<uuid:merchant_id>/approve/", ApproveMerchantView.as_view(), name="admin-merchant-approve"),
    path("onboarding/merchants/<uuid:merchant_id>/reject/", RejectMerchantView.as_view(), name="admin-merchant-reject"),
    path("onboarding/vendors/", OnboardingVendorListCreateView.as_view(), name="admin-vendors"),
    path("onboarding/vendors/<uuid:vendor_id>/approve/", ApproveVendorView.as_view(), name="admin-vendor-approve"),
    path("pool/", PoolMonitoringView.as_view(), name="admin-pool"),
    path("disputes/", DisputeQueueView.as_view(), name="admin-disputes"),
    path("risk-config/", RiskConfigView.as_view(), name="admin-risk-config"),
]
