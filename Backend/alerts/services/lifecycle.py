from django.contrib.auth.models import AbstractBaseUser
from django.db import transaction
from django.utils import timezone

from alerts.models import Alert
from alerts.services.constants import (
    AlertLifecycleStatus,
)
from alerts.services.exceptions import (
    AlertLifecycleError,
)


@transaction.atomic
def acknowledge_alert(
    alert: Alert,
    actor: AbstractBaseUser | None = None,
) -> Alert:
    alert = (
        Alert.objects
        .select_for_update()
        .get(pk=alert.pk)
    )

    if (
        alert.status
        == AlertLifecycleStatus.RESOLVED
    ):
        raise AlertLifecycleError(
            "Resolved alert cannot be acknowledged."
        )

    if (
        alert.status
        == AlertLifecycleStatus.ACKNOWLEDGED
    ):
        return alert

    alert.status = (
        AlertLifecycleStatus.ACKNOWLEDGED
    )

    alert.acknowledged_at = timezone.now()

    if actor is not None:
        alert.acknowledged_by = actor

    update_fields = [
        "status",
        "acknowledged_at",
        "updated_at",
    ]

    if actor is not None:
        update_fields.append(
            "acknowledged_by"
        )

    alert.save(
        update_fields=update_fields
    )

    return alert


@transaction.atomic
def resolve_alert(
    alert: Alert,
    actor: AbstractBaseUser | None = None,
) -> Alert:
    alert = (
        Alert.objects
        .select_for_update()
        .get(pk=alert.pk)
    )

    if (
        alert.status
        == AlertLifecycleStatus.RESOLVED
    ):
        return alert

    alert.status = (
        AlertLifecycleStatus.RESOLVED
    )

    alert.resolved_at = timezone.now()

    if actor is not None:
        alert.resolved_by = actor

    update_fields = [
        "status",
        "resolved_at",
        "updated_at",
    ]

    if actor is not None:
        update_fields.append(
            "resolved_by"
        )

    alert.save(
        update_fields=update_fields
    )
from django.contrib.auth.models import AbstractBaseUser
from django.db import transaction
from django.utils import timezone

from alerts.models import Alert
from alerts.services.constants import (
    AlertLifecycleStatus,
)
from alerts.services.exceptions import (
    AlertLifecycleError,
)


def _get_locked_alert(
    alert: Alert,
) -> Alert:
    """
    Reload and lock an Alert row for lifecycle mutation.

    Caller must execute inside transaction.atomic().
    """
    return (
        Alert.objects
        .select_for_update()
        .get(pk=alert.pk)
    )


@transaction.atomic
def acknowledge_alert(
    alert: Alert,
    actor: AbstractBaseUser | None = None,
) -> Alert:
    locked_alert = _get_locked_alert(
        alert
    )

    if (
        locked_alert.status
        == AlertLifecycleStatus.RESOLVED
    ):
        raise AlertLifecycleError(
            "Resolved alert cannot be acknowledged."
        )

    if (
        locked_alert.status
        == AlertLifecycleStatus.ACKNOWLEDGED
    ):
        return locked_alert

    locked_alert.status = (
        AlertLifecycleStatus.ACKNOWLEDGED
    )
    locked_alert.acknowledged_at = (
        timezone.now()
    )

    update_fields = [
        "status",
        "acknowledged_at",
        "updated_at",
    ]

    if actor is not None:
        locked_alert.acknowledged_by = (
            actor
        )
        update_fields.append(
            "acknowledged_by"
        )

    locked_alert.save(
        update_fields=update_fields,
    )

    return locked_alert


@transaction.atomic
def resolve_alert(
    alert: Alert,
    actor: AbstractBaseUser | None = None,
) -> Alert:
    """
    Resolve an alert explicitly.

    Used for the normal operational lifecycle
    performed by Admin/Operator.
    """
    locked_alert = _get_locked_alert(
        alert
    )

    if (
        locked_alert.status
        == AlertLifecycleStatus.RESOLVED
    ):
        return locked_alert

    locked_alert.status = (
        AlertLifecycleStatus.RESOLVED
    )
    locked_alert.resolved_at = (
        timezone.now()
    )

    update_fields = [
        "status",
        "resolved_at",
        "updated_at",
    ]

    if actor is not None:
        locked_alert.resolved_by = (
            actor
        )
        update_fields.append(
            "resolved_by"
        )

    locked_alert.save(
        update_fields=update_fields,
    )

    return locked_alert


def resolve_superseded_alert(
    alert: Alert,
) -> Alert:
    """
    Close an older active alert because a more
    severe alert supersedes it.

    This helper is internal to Alert persistence.

    It deliberately does not set resolved_by,
    because the transition is performed by the
    system rather than by an Admin/Operator.

    IMPORTANT:
    The caller must already be inside an atomic
    transaction and the alert should already be
    row-locked.
    """
    if (
        alert.status
        == AlertLifecycleStatus.RESOLVED
    ):
        return alert

    alert.status = (
        AlertLifecycleStatus.RESOLVED
    )
    alert.resolved_at = (
        timezone.now()
    )
    alert.resolved_by = None

    alert.save(
        update_fields=[
            "status",
            "resolved_at",
            "resolved_by",
            "updated_at",
        ],
    )

    return alert
    return alert