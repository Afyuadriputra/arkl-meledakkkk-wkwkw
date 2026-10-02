from dataclasses import dataclass

from alerts.services.alert_engine import (
    AlertDecision,
    evaluate_alert,
)
from alerts.services.recommendation import (
    get_recommendation_codes,
)


@dataclass(frozen=True)
class AlertEvaluation:
    decision: AlertDecision
    recommendation_codes: tuple[str, ...]


def evaluate_alert_with_recommendations(
    *,
    environmental_severity,
    risk_interpretation,
) -> AlertEvaluation:
    decision = evaluate_alert(
        environmental_severity=environmental_severity,
        risk_interpretation=risk_interpretation,
    )

    recommendations = get_recommendation_codes(decision.alert_level)

    return AlertEvaluation(
        decision=decision,
        recommendation_codes=recommendations,
    )
