from alerts.models import Alert
from alerts.services.constants import (
    ALERT_LEVEL_PRIORITY,
    AlertLevel,
    AlertLifecycleStatus,
)


ACTIVE_ALERT_STATUSES = (
    AlertLifecycleStatus.OPEN,
    AlertLifecycleStatus.ACKNOWLEDGED,
)


def find_latest_active_alert(
    *,
    worker,
    device,
    lock: bool = False,
) -> Alert | None:
    """
    Return the latest active Alert for one
    Worker + Device pair.

    When lock=True, matching active rows are
    locked for update. This must only be used
    inside transaction.atomic().
    """
    queryset = (
        Alert.objects
        .filter(
            worker=worker,
            device=device,
            status__in=(
                ACTIVE_ALERT_STATUSES
            ),
        )
        .order_by(
            "-created_at",
            "-id",
        )
    )

    if lock:
        queryset = (
            queryset.select_for_update()
        )

    return queryset.first()


def find_active_duplicate(
    *,
    worker,
    device,
    alert_level,
) -> Alert | None:
    """
    Return the latest active alert with the
    same AlertLevel for Worker + Device.

    Kept as a focused query helper for tests
    and other Alert domain use cases.
    """
    level = AlertLevel(
        alert_level
    )

    return (
        Alert.objects
        .filter(
            worker=worker,
            device=device,
            alert_level=level,
            status__in=(
                ACTIVE_ALERT_STATUSES
            ),
        )
        .order_by(
            "-created_at",
            "-id",
        )
        .first()
    )


def is_escalation(
    *,
    existing_alert: Alert,
    new_alert_level,
) -> bool:
    current_level = AlertLevel(
        existing_alert.alert_level
    )

    incoming_level = AlertLevel(
        new_alert_level
    )

    return (
        ALERT_LEVEL_PRIORITY[
            incoming_level
        ]
        >
        ALERT_LEVEL_PRIORITY[
            current_level
        ]
    )