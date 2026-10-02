from alerts.services.constants import AlertLevel
from alerts.services.exceptions import AlertValidationError

MONITOR_H2S_LEVEL = "MONITOR_H2S_LEVEL"
INCREASE_MONITORING_FREQUENCY = "INCREASE_MONITORING_FREQUENCY"
REDUCE_EXPOSURE_DURATION = "REDUCE_EXPOSURE_DURATION"
LIMIT_ACCESS_TO_EXPOSURE_AREA = "LIMIT_ACCESS_TO_EXPOSURE_AREA"
TEMPORARY_AREA_AVOIDANCE = "TEMPORARY_AREA_AVOIDANCE"
USE_APPROPRIATE_PPE = "USE_APPROPRIATE_PPE"
NOTIFY_RESPONSIBLE_OPERATOR = "NOTIFY_RESPONSIBLE_OPERATOR"
PERFORM_FURTHER_RISK_EVALUATION = "PERFORM_FURTHER_RISK_EVALUATION"


_RECOMMENDATIONS = {
    AlertLevel.NONE: (),
    AlertLevel.LOW: (MONITOR_H2S_LEVEL,),
    AlertLevel.MEDIUM: (
        MONITOR_H2S_LEVEL,
        REDUCE_EXPOSURE_DURATION,
        PERFORM_FURTHER_RISK_EVALUATION,
    ),
    AlertLevel.HIGH: (
        INCREASE_MONITORING_FREQUENCY,
        REDUCE_EXPOSURE_DURATION,
        LIMIT_ACCESS_TO_EXPOSURE_AREA,
        USE_APPROPRIATE_PPE,
        NOTIFY_RESPONSIBLE_OPERATOR,
    ),
    AlertLevel.CRITICAL: (
        TEMPORARY_AREA_AVOIDANCE,
        LIMIT_ACCESS_TO_EXPOSURE_AREA,
        USE_APPROPRIATE_PPE,
        NOTIFY_RESPONSIBLE_OPERATOR,
    ),
}


def get_recommendation_codes(
    alert_level,
) -> tuple[str, ...]:
    try:
        level = AlertLevel(alert_level)
    except (ValueError, TypeError) as exc:
        raise AlertValidationError(
            f"Unsupported alert level: {alert_level!r}."
        ) from exc

    return _RECOMMENDATIONS[level]
