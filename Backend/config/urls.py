from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)

urlpatterns = [
    path(
        "admin/",
        admin.site.urls,
    ),

    # Devices
    path(
        "api/v1/",
        include("devices.urls"),
    ),

    # Exposure
    path(
        "api/v1/",
        include("exposure.urls"),
    ),

    # Smart ARKL
    path(
        "api/v1/",
        include("arkl.urls"),
    ),

    # Alerts & Risk Management
    path(
        "api/v1/alerts/",
        include("alerts.urls"),
    ),

    # Research & Reporting
    path(
        "api/v1/research/",
        include("research.urls"),
    ),

    # OpenAPI Schema
    path(
        "api/schema/",
        SpectacularAPIView.as_view(),
        name="schema",
    ),

    # Swagger UI
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(
            url_name="schema",
        ),
        name="swagger-ui",
    ),

    # Accounts
    path(
    "api/v1/",
    include("accounts.urls"),
),

]