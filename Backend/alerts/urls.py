from django.urls import path

from alerts.views import (
    AlertAcknowledgeView,
    AlertDetailView,
    AlertEvaluateView,
    AlertListView,
    AlertResolveView,
)

urlpatterns = [
    path(
        "",
        AlertListView.as_view(),
        name="alert-list",
    ),
    path(
        "evaluate/",
        AlertEvaluateView.as_view(),
        name="alert-evaluate",
    ),
    path(
        "<int:pk>/",
        AlertDetailView.as_view(),
        name="alert-detail",
    ),
    path(
        "<int:pk>/acknowledge/",
        AlertAcknowledgeView.as_view(),
        name="alert-acknowledge",
    ),
    path(
        "<int:pk>/resolve/",
        AlertResolveView.as_view(),
        name="alert-resolve",
    ),
]