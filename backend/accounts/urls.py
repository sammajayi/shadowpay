from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import ChallengeView, MeView, VerifyView

urlpatterns = [
    path("challenge/", ChallengeView.as_view(), name="auth-challenge"),
    path("verify/", VerifyView.as_view(), name="auth-verify"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("me/", MeView.as_view(), name="auth-me"),
]
