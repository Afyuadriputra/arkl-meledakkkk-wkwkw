from dataclasses import dataclass

from django.contrib.auth import get_user_model
from django.db import transaction

from accounts.models import AccountProfile
from exposure.models import Worker


User = get_user_model()


@dataclass(frozen=True)
class CreatedAccount:
    user: object
    profile: AccountProfile


@transaction.atomic
def create_account(
    *,
    username: str,
    password: str,
    role: str,
    email: str = "",
    worker: Worker | None = None,
) -> CreatedAccount:
    if role not in AccountProfile.Role.values:
        raise ValueError(
            "Invalid account role."
        )

    if (
        role == AccountProfile.Role.WORKER
        and worker is None
    ):
        raise ValueError(
            "WORKER account requires a Worker."
        )

    if (
        role != AccountProfile.Role.WORKER
        and worker is not None
    ):
        raise ValueError(
            "Only WORKER accounts may link "
            "to a Worker."
        )

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
    )

    profile = AccountProfile(
        user=user,
        role=role,
        worker=worker,
    )

    profile.full_clean()
    profile.save()

    return CreatedAccount(
        user=user,
        profile=profile,
    )