from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/risk/", include("risk.urls")),
    path("api/merchants/", include("merchants.urls")),
    path("api/agreements/", include("agreements.urls")),
    path("api/admin/", include("adminapi.urls")),
]
