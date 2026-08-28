from django.urls import path

from .views import (
    ConfirmEligibilityView,
    EligibilityHistoryView,
    EligibilityWitnessView,
    RiskProfileView,
)

urlpatterns = [
    path("profile/", RiskProfileView.as_view(), name="risk-profile"),
    path("eligibility/witness/", EligibilityWitnessView.as_view(), name="eligibility-witness"),
    path("eligibility/confirm/", ConfirmEligibilityView.as_view(), name="eligibility-confirm"),
    path("eligibility/history/", EligibilityHistoryView.as_view(), name="eligibility-history"),
]
