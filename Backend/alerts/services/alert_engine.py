from dataclasses import dataclass

from alerts.services.constants import (
    ALERT_RULE_VERSION,
    AlertLevel,
    EnvironmentalSeverity,
    RiskStatus,
)
from alerts.services.environmental_mapping import (
    normalize_environmental_status,
)
from alerts.services.exceptions import AlertValidationError
from arkl.services.constants import (
    RQ_ABOVE_REFERENCE_LEVEL,
    RQ_WITHIN_REFERENCE_LEVEL,
)


@dataclass(frozen=True)
class AlertDecision:
    environmental_severity: EnvironmentalSeverity
    risk_interpretation: str
    alert_level: AlertLevel
    risk_status: RiskStatus
    alert_rule_version: str


_ALERT_MATRIX = {
    (
        EnvironmentalSeverity.NORMAL,
        RQ_WITHIN_REFERENCE_LEVEL,
    ): AlertLevel.NONE,
    (
        EnvironmentalSeverity.CAUTION,
        RQ_WITHIN_REFERENCE_LEVEL,
    ): AlertLevel.LOW,
    (
        EnvironmentalSeverity.WARNING,
        RQ_WITHIN_REFERENCE_LEVEL,
    ): AlertLevel.MEDIUM,
    (
        EnvironmentalSeverity.DANGER,
        RQ_WITHIN_REFERENCE_LEVEL,
    ): AlertLevel.HIGH,
    (
        EnvironmentalSeverity.CRITICAL,
        RQ_WITHIN_REFERENCE_LEVEL,
    ): AlertLevel.CRITICAL,
    (
        EnvironmentalSeverity.NORMAL,
        RQ_ABOVE_REFERENCE_LEVEL,
    ): AlertLevel.MEDIUM,
    (
        EnvironmentalSeverity.CAUTION,
        RQ_ABOVE_REFERENCE_LEVEL,
    ): AlertLevel.MEDIUM,
    (
        EnvironmentalSeverity.WARNING,
        RQ_ABOVE_REFERENCE_LEVEL,
    ): AlertLevel.HIGH,
    (
        EnvironmentalSeverity.DANGER,
        RQ_ABOVE_REFERENCE_LEVEL,
    ): AlertLevel.CRITICAL,
    (
        EnvironmentalSeverity.CRITICAL,
        RQ_ABOVE_REFERENCE_LEVEL,
    ): AlertLevel.CRITICAL,
}


_RISK_STATUS_BY_ALERT_LEVEL = {
    AlertLevel.NONE: RiskStatus.NO_ACTION_REQUIRED,
    AlertLevel.LOW: RiskStatus.MONITORING_REQUIRED,
    AlertLevel.MEDIUM: RiskStatus.MONITORING_REQUIRED,
    AlertLevel.HIGH: RiskStatus.RISK_MANAGEMENT_REQUIRED,
    AlertLevel.CRITICAL: RiskStatus.IMMEDIATE_ACTION_REQUIRED,
}


_ALLOWED_RISK_INTERPRETATIONS = {
    RQ_WITHIN_REFERENCE_LEVEL,
    RQ_ABOVE_REFERENCE_LEVEL,
}


def _validate_risk_interpretation(
    value,
) -> str:
    if value not in _ALLOWED_RISK_INTERPRETATIONS:
        raise AlertValidationError(f"Unsupported risk interpretation: {value!r}.")

    return value


def evaluate_alert(
    *,
    environmental_severity,
    risk_interpretation,
) -> AlertDecision:
    severity = normalize_environmental_status(environmental_severity)

    interpretation = _validate_risk_interpretation(risk_interpretation)

    try:
        alert_level = _ALERT_MATRIX[
            (
                severity,
                interpretation,
            )
        ]
    except KeyError as exc:
        raise AlertValidationError(
            "No alert rule exists for the supplied condition."
        ) from exc

    risk_status = _RISK_STATUS_BY_ALERT_LEVEL[alert_level]

    return AlertDecision(
        environmental_severity=severity,
        risk_interpretation=interpretation,
        alert_level=alert_level,
        risk_status=risk_status,
        alert_rule_version=ALERT_RULE_VERSION,
    )
