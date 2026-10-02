from django.urls import path

from accounts.views import (
    AccountCreateView,
    CurrentUserView,
    LoginView,
    LogoutView,
    MyAlertListView,
    MyARKLResultListView,
    MyExposureView,
    MyProfileView,
    MyMonitoringView,
)


urlpatterns = [
    # Authentication
    path(
        "auth/login/",
        LoginView.as_view(),
        name="auth-login",
    ),
    path(
        "auth/logout/",
        LogoutView.as_view(),
        name="auth-logout",
    ),
    path(
        "auth/me/",
        CurrentUserView.as_view(),
        name="auth-me",
    ),

    # Account administration
    path(
        "accounts/",
        AccountCreateView.as_view(),
        name="account-create",
    ),

    # Personal Worker API
    path(
        "me/profile/",
        MyProfileView.as_view(),
        name="my-profile",
    ),
    path(
        "me/exposure/",
        MyExposureView.as_view(),
        name="my-exposure",
    ),
    path(
        "me/arkl-results/",
        MyARKLResultListView.as_view(),
        name="my-arkl-results",
    ),
    path(
        "me/alerts/",
        MyAlertListView.as_view(),
        name="my-alerts",
    ),
    path(
        "me/monitoring/",
        MyMonitoringView.as_view(),
        name="my-monitoring",
    ),
]