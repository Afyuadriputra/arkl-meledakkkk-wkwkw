# alerts/tests/test_alert_engine.py

import pytest

from alerts.services.alert_engine import evaluate_alert
from alerts.services.constants import (
    ALERT_RULE_VERSION,
    AlertLevel,
    RiskStatus,
)
from alerts.services.exceptions import AlertValidationError
from arkl.services.constants import (
    RQ_ABOVE_REFERENCE_LEVEL,
    RQ_WITHIN_REFERENCE_LEVEL,
)


@pytest.mark.parametrize(
    (
        "environmental_severity",
        "risk_interpretation",
        "expected_level",
    ),
    [
        ("NORMAL", RQ_WITHIN_REFERENCE_LEVEL, AlertLevel.NONE),
        ("CAUTION", RQ_WITHIN_REFERENCE_LEVEL, AlertLevel.LOW),
        ("WARNING", RQ_WITHIN_REFERENCE_LEVEL, AlertLevel.MEDIUM),
        ("DANGER", RQ_WITHIN_REFERENCE_LEVEL, AlertLevel.HIGH),
        ("CRITICAL", RQ_WITHIN_REFERENCE_LEVEL, AlertLevel.CRITICAL),
        ("NORMAL", RQ_ABOVE_REFERENCE_LEVEL, AlertLevel.MEDIUM),
        ("CAUTION", RQ_ABOVE_REFERENCE_LEVEL, AlertLevel.MEDIUM),
        ("WARNING", RQ_ABOVE_REFERENCE_LEVEL, AlertLevel.HIGH),
        ("DANGER", RQ_ABOVE_REFERENCE_LEVEL, AlertLevel.CRITICAL),
        ("CRITICAL", RQ_ABOVE_REFERENCE_LEVEL, AlertLevel.CRITICAL),
    ],
)
def test_alert_decision_matrix(
    environmental_severity,
    risk_interpretation,
    expected_level,
):
    result = evaluate_alert(
        environmental_severity=environmental_severity,
        risk_interpretation=risk_interpretation,
    )

    assert result.alert_level == expected_level
    assert result.alert_rule_version == ALERT_RULE_VERSION


@pytest.mark.parametrize(
    ("environmental_severity", "risk_interpretation", "expected_status"),
    [
        (
            "NORMAL",
            RQ_WITHIN_REFERENCE_LEVEL,
            RiskStatus.NO_ACTION_REQUIRED,
        ),
        (
            "CAUTION",
            RQ_WITHIN_REFERENCE_LEVEL,
            RiskStatus.MONITORING_REQUIRED,
        ),
        (
            "NORMAL",
            RQ_ABOVE_REFERENCE_LEVEL,
            RiskStatus.MONITORING_REQUIRED,
        ),
        (
            "WARNING",
            RQ_ABOVE_REFERENCE_LEVEL,
            RiskStatus.RISK_MANAGEMENT_REQUIRED,
        ),
        (
            "CRITICAL",
            RQ_ABOVE_REFERENCE_LEVEL,
            RiskStatus.IMMEDIATE_ACTION_REQUIRED,
        ),
    ],
)
def test_alert_risk_status_mapping(
    environmental_severity,
    risk_interpretation,
    expected_status,
):
    result = evaluate_alert(
        environmental_severity=environmental_severity,
        risk_interpretation=risk_interpretation,
    )

    assert result.risk_status == expected_status


def test_risk_never_reduces_environmental_severity():
    within = evaluate_alert(
        environmental_severity="DANGER",
        risk_interpretation=RQ_WITHIN_REFERENCE_LEVEL,
    )

    above = evaluate_alert(
        environmental_severity="DANGER",
        risk_interpretation=RQ_ABOVE_REFERENCE_LEVEL,
    )

    severity_order = {
        AlertLevel.NONE: 0,
        AlertLevel.LOW: 1,
        AlertLevel.MEDIUM: 2,
        AlertLevel.HIGH: 3,
        AlertLevel.CRITICAL: 4,
    }

    assert severity_order[above.alert_level] >= severity_order[within.alert_level]


def test_invalid_environmental_severity_is_rejected():
    with pytest.raises(
        AlertValidationError,
        match="Unsupported environmental status",
    ):
        evaluate_alert(
            environmental_severity="UNKNOWN",
            risk_interpretation=RQ_WITHIN_REFERENCE_LEVEL,
        )


def test_invalid_risk_interpretation_is_rejected():
    with pytest.raises(
        AlertValidationError,
        match="Unsupported risk interpretation",
    ):
        evaluate_alert(
            environmental_severity="NORMAL",
            risk_interpretation="UNKNOWN",
        )
