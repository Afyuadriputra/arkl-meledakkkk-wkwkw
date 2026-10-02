import pytest

from alerts.models import Alert
from alerts.services.constants import (
    ALERT_RULE_VERSION,
    AlertLevel,
    AlertLifecycleStatus,
    EnvironmentalSeverity,
    RiskStatus,
)


@pytest.mark.django_db
def test_alert_model_exists():
    assert Alert._meta.db_table == "alerts_alert"


def test_alert_choices_are_available():
    assert AlertLevel.HIGH.value == "HIGH"
    assert RiskStatus.RISK_MANAGEMENT_REQUIRED.value == "RISK_MANAGEMENT_REQUIRED"
    assert EnvironmentalSeverity.WARNING.value == "WARNING"
    assert AlertLifecycleStatus.OPEN.value == "OPEN"
    assert ALERT_RULE_VERSION == "1.0.0-MVP"
