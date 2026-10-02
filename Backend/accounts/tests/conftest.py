import pytest
from django.contrib.auth import get_user_model

from accounts.models import AccountProfile
from exposure.models import Worker


User = get_user_model()


@pytest.fixture
def admin_user():
    user = User.objects.create_user(
        username="admin-test",
        password="StrongPass123!",
    )

    AccountProfile.objects.create(
        user=user,
        role=AccountProfile.Role.ADMIN,
    )

    return user


@pytest.fixture
def operator_user():
    user = User.objects.create_user(
        username="operator-test",
        password="StrongPass123!",
    )

    AccountProfile.objects.create(
        user=user,
        role=AccountProfile.Role.OPERATOR,
    )

    return user


@pytest.fixture
def researcher_user():
    user = User.objects.create_user(
        username="researcher-test",
        password="StrongPass123!",
    )

    AccountProfile.objects.create(
        user=user,
        role=AccountProfile.Role.RESEARCHER,
    )

    return user


@pytest.fixture
def linked_worker():
    return Worker.objects.create(
        code="PML-AUTH-001",
        name="Worker Test",
        age=40,
        is_active=True,
    )


@pytest.fixture
def worker_user(
    linked_worker,
):
    user = User.objects.create_user(
        username="worker-test",
        password="StrongPass123!",
    )

    AccountProfile.objects.create(
        user=user,
        role=AccountProfile.Role.WORKER,
        worker=linked_worker,
    )

    return user