from django.urls import path

from .views import (
    ConfirmAgreementView,
    ConfirmCloseView,
    ConfirmPaymentView,
    InitiateAgreementView,
    InitiateCloseView,
    InitiatePaymentView,
    MerchantAgreementDetailView,
    MerchantAgreementsView,
    MerchantStatsView,
    MyAgreementDetailView,
    MyAgreementsView,
    VendorPayoutReconciliationView,
    VendorStatsView,
)

urlpatterns = [
    path("initiate/", InitiateAgreementView.as_view(), name="agreement-initiate"),
    path("<uuid:agreement_id>/confirm/", ConfirmAgreementView.as_view(), name="agreement-confirm"),
    path("<uuid:agreement_id>/payments/initiate/", InitiatePaymentView.as_view(), name="payment-initiate"),
    path(
        "<uuid:agreement_id>/payments/<uuid:payment_id>/confirm/",
        ConfirmPaymentView.as_view(),
        name="payment-confirm",
    ),
    path("<uuid:agreement_id>/close/initiate/", InitiateCloseView.as_view(), name="agreement-close-initiate"),
    path("<uuid:agreement_id>/close/confirm/", ConfirmCloseView.as_view(), name="agreement-close-confirm"),
    path("mine/", MyAgreementsView.as_view(), name="agreements-mine"),
    path("mine/<uuid:agreement_id>/", MyAgreementDetailView.as_view(), name="agreement-mine-detail"),
    path("merchant/", MerchantAgreementsView.as_view(), name="agreements-merchant"),
    path("merchant/stats/", MerchantStatsView.as_view(), name="agreements-merchant-stats"),
    path("merchant/<uuid:agreement_id>/", MerchantAgreementDetailView.as_view(), name="agreement-merchant-detail"),
    path("vendor/stats/", VendorStatsView.as_view(), name="agreements-vendor-stats"),
    path("vendor/payouts/", VendorPayoutReconciliationView.as_view(), name="agreements-vendor-payouts"),
]
