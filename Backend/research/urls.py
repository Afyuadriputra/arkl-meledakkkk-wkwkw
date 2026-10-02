from django.urls import path

from research.views import (
    ARKLResearchResultView,
    AlertSummaryView,
    ExposureSummaryView,
    H2SSummaryView,
    H2STrendView,
    RiskDistributionView,
    ARKLExportCSVView,
)


urlpatterns = [
    path(
        "h2s-summary/",
        H2SSummaryView.as_view(),
        name="research-h2s-summary",
    ),

    path(
        "h2s-trends/",
        H2STrendView.as_view(),
        name="research-h2s-trends",
    ),

    path(
        "arkl-results/",
        ARKLResearchResultView.as_view(),
        name="research-arkl-results",
    ),

    path(
        "risk-distribution/",
        RiskDistributionView.as_view(),
        name="research-risk-distribution",
    ),

    path(
        "exposure-summary/",
        ExposureSummaryView.as_view(),
        name="research-exposure-summary",
    ),

    path(
        "alert-summary/",
        AlertSummaryView.as_view(),
        name="research-alert-summary",
    ),

    path(
    "export/arkl.csv",
    ARKLExportCSVView.as_view(),
    name="research-arkl-export-csv",
),
]