import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

from accounts.models import AccountProfile
from exposure.models import Worker


User = get_user_model()


@pytest.mark.django_db
def test_admin_profile_can_exist_without_worker():
    user = User.objects.create_user(
        username="admin-model",
    )

    profile = AccountProfile(
        user=user,
        role=AccountProfile.Role.ADMIN,
    )

    profile.full_clean()
    profile.save()

    assert profile.worker is None


@pytest.mark.django_db
def test_worker_role_requires_worker():
    user = User.objects.create_user(
        username="worker-without-link",
    )

    profile = AccountProfile(
        user=user,
        role=AccountProfile.Role.WORKER,
    )

    with pytest.raises(ValidationError):
        profile.full_clean()


@pytest.mark.django_db
def test_non_worker_role_cannot_link_worker():
    worker = Worker.objects.create(
        code="PML-INVALID-LINK",
        name="Test Worker",
        age=35,
    )

    user = User.objects.create_user(
        username="operator-invalid-link",
    )

    profile = AccountProfile(
        user=user,
        role=AccountProfile.Role.OPERATOR,
        worker=worker,
    )

    with pytest.raises(ValidationError):
        profile.full_clean()


@pytest.mark.django_db
def test_worker_account_can_link_worker():
    worker = Worker.objects.create(
        code="PML-WORKER-LINK",
        name="Ahmad",
        age=45,
    )

    user = User.objects.create_user(
        username="worker-model",
    )

    profile = AccountProfile(
        user=user,
        role=AccountProfile.Role.WORKER,
        worker=worker,
    )

    profile.full_clean()
    profile.save()

    assert profile.worker == worker