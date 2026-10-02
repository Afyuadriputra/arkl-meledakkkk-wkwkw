import pytest

from alerts.services.constants import AlertLifecycleStatus
from alerts.services.exceptions import AlertLifecycleError
from alerts.services.lifecycle import (
    acknowledge_alert,
    resolve_alert,
)


@pytest.mark.django_db
def test_open_alert_can_be_acknowledged(alert):
    result = acknowledge_alert(alert)

    assert result.status == AlertLifecycleStatus.ACKNOWLEDGED
    assert result.acknowledged_at is not None
    assert result.resolved_at is None


@pytest.mark.django_db
def test_acknowledge_is_idempotent(alert):
    first = acknowledge_alert(alert)
    first_timestamp = first.acknowledged_at

    second = acknowledge_alert(first)

    assert second.status == AlertLifecycleStatus.ACKNOWLEDGED
    assert second.acknowledged_at == first_timestamp


@pytest.mark.django_db
def test_acknowledged_alert_can_be_resolved(alert):
    acknowledged = acknowledge_alert(alert)

    result = resolve_alert(acknowledged)

    assert result.status == AlertLifecycleStatus.RESOLVED
    assert result.acknowledged_at is not None
    assert result.resolved_at is not None


@pytest.mark.django_db
def test_open_alert_can_be_resolved(alert):
    result = resolve_alert(alert)

    assert result.status == AlertLifecycleStatus.RESOLVED
    assert result.resolved_at is not None


@pytest.mark.django_db
def test_resolve_is_idempotent(alert):
    first = resolve_alert(alert)
    first_timestamp = first.resolved_at

    second = resolve_alert(first)

    assert second.status == AlertLifecycleStatus.RESOLVED
    assert second.resolved_at == first_timestamp


@pytest.mark.django_db
def test_resolved_alert_cannot_be_acknowledged(alert):
    resolved = resolve_alert(alert)

    with pytest.raises(
        AlertLifecycleError,
        match="cannot be acknowledged",
    ):
        acknowledge_alert(resolved)
