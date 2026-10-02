import pytest
from rest_framework.test import APIRequestFactory

from accounts.models import AccountProfile
from accounts.permissions import (
    IsAdminOrOperator,
    IsAdminRole,
    get_linked_worker,
    get_user_role,
)


@pytest.mark.django_db
def test_get_admin_role(
    admin_user,
):
    assert (
        get_user_role(admin_user)
        == AccountProfile.Role.ADMIN
    )


@pytest.mark.django_db
def test_worker_has_linked_worker(
    worker_user,
    linked_worker,
):
    assert (
        get_linked_worker(worker_user)
        == linked_worker
    )


@pytest.mark.django_db
def test_admin_permission_accepts_admin(
    admin_user,
):
    request = APIRequestFactory().get(
        "/"
    )

    request.user = admin_user

    permission = IsAdminRole()

    assert permission.has_permission(
        request,
        None,
    )


@pytest.mark.django_db
def test_admin_or_operator_accepts_operator(
    operator_user,
):
    request = APIRequestFactory().get(
        "/"
    )

    request.user = operator_user

    permission = IsAdminOrOperator()

    assert permission.has_permission(
        request,
        None,
    )


@pytest.mark.django_db
def test_admin_permission_rejects_worker(
    worker_user,
):
    request = APIRequestFactory().get(
        "/"
    )

    request.user = worker_user

    permission = IsAdminRole()

    assert not permission.has_permission(
        request,
        None,
    )