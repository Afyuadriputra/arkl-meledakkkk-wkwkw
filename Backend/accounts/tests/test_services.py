import pytest

from accounts.models import AccountProfile
from accounts.services import create_account
from exposure.models import Worker


@pytest.mark.django_db
def test_create_admin_account():
    result = create_account(
        username="admin-service",
        password="StrongPass123!",
        role=AccountProfile.Role.ADMIN,
    )

    assert (
        result.user.username
        == "admin-service"
    )

    assert (
        result.profile.role
        == AccountProfile.Role.ADMIN
    )

    assert result.user.check_password(
        "StrongPass123!"
    )


@pytest.mark.django_db
def test_create_worker_account():
    worker = Worker.objects.create(
        code="PML-SERVICE-001",
        name="Worker Service",
        age=40,
    )

    result = create_account(
        username="worker-service",
        password="StrongPass123!",
        role=AccountProfile.Role.WORKER,
        worker=worker,
    )

    assert result.profile.worker == worker


@pytest.mark.django_db
def test_worker_account_requires_worker():
    with pytest.raises(
        ValueError,
        match="requires a Worker",
    ):
        create_account(
            username="worker-invalid",
            password="StrongPass123!",
            role=AccountProfile.Role.WORKER,
        )


@pytest.mark.django_db
def test_operator_cannot_link_worker():
    worker = Worker.objects.create(
        code="PML-SERVICE-INVALID",
        name="Worker Invalid",
        age=40,
    )

    with pytest.raises(
        ValueError,
        match="Only WORKER",
    ):
        create_account(
            username="operator-invalid",
            password="StrongPass123!",
            role=AccountProfile.Role.OPERATOR,
            worker=worker,
        )