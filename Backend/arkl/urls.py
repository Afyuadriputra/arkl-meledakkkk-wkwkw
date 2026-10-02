from django.urls import path

from arkl.views import (
    ARKLResultDetailView,
    ARKLResultListView,
    HistoricalARKLView,
    RealtimeARKLView,
    ReferenceARKLView,
    ReferenceMeasurementListView,
    ReferenceMeasurementDetailView,
)

urlpatterns = [
    path("arkl/reference/", ReferenceARKLView.as_view(), name="arkl-reference"),
    path("arkl/reference-measurements/", ReferenceMeasurementListView.as_view(), name="reference-measurement-list"),
    path("arkl/reference-measurements/<int:pk>/", ReferenceMeasurementDetailView.as_view(), name="reference-measurement-detail"),
    path(
        "arkl/realtime/",
        RealtimeARKLView.as_view(),
        name="arkl-realtime",
    ),
    path(
        "arkl/historical/",
        HistoricalARKLView.as_view(),
        name="arkl-historical",
    ),
    path(
        "arkl/results/",
        ARKLResultListView.as_view(),
        name="arkl-result-list",
    ),
    path(
        "arkl/results/<int:pk>/",
        ARKLResultDetailView.as_view(),
        name="arkl-result-detail",
    ),
]
