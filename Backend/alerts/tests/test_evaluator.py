from alerts.services.constants import (
    ALERT_RULE_VERSION,
    AlertLevel,
    RiskStatus,
)
from alerts.services.evaluator import (
    evaluate_alert_with_recommendations,
)
from alerts.services.recommendation import (
    NOTIFY_RESPONSIBLE_OPERATOR,
)
from arkl.services.constants import RQ_ABOVE_REFERENCE_LEVEL


def test_evaluator_combines_decision_and_recommendations():
    result = evaluate_alert_with_recommendations(
        environmental_severity="WARNING",
        risk_interpretation=RQ_ABOVE_REFERENCE_LEVEL,
    )

    assert result.decision.alert_level == AlertLevel.HIGH
    assert result.decision.risk_status == RiskStatus.RISK_MANAGEMENT_REQUIRED
    assert result.decision.alert_rule_version == ALERT_RULE_VERSION

    assert NOTIFY_RESPONSIBLE_OPERATOR in result.recommendation_codes


def test_evaluator_is_deterministic():
    first = evaluate_alert_with_recommendations(
        environmental_severity="DANGER",
        risk_interpretation=RQ_ABOVE_REFERENCE_LEVEL,
    )

    second = evaluate_alert_with_recommendations(
        environmental_severity="DANGER",
        risk_interpretation=RQ_ABOVE_REFERENCE_LEVEL,
    )

    assert first == second
