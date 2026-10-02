from enum import StrEnum

ALERT_RULE_VERSION = "1.0.0-MVP"


class EnvironmentalSeverity(StrEnum):
    NORMAL = "NORMAL"
    CAUTION = "CAUTION"
    WARNING = "WARNING"
    DANGER = "DANGER"
    CRITICAL = "CRITICAL"


class AlertLevel(StrEnum):
    NONE = "NONE"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class RiskStatus(StrEnum):
    NO_ACTION_REQUIRED = "NO_ACTION_REQUIRED"
    MONITORING_REQUIRED = "MONITORING_REQUIRED"
    RISK_MANAGEMENT_REQUIRED = "RISK_MANAGEMENT_REQUIRED"
    IMMEDIATE_ACTION_REQUIRED = "IMMEDIATE_ACTION_REQUIRED"


class AlertLifecycleStatus(StrEnum):
    OPEN = "OPEN"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"


ALERT_LEVEL_PRIORITY = {
    AlertLevel.NONE: 0,
    AlertLevel.LOW: 1,
    AlertLevel.MEDIUM: 2,
    AlertLevel.HIGH: 3,
    AlertLevel.CRITICAL: 4,
}
