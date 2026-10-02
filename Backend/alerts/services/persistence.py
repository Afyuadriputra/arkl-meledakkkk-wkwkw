from dataclasses import dataclass
from decimal import Decimal

from django.db import transaction

from alerts.models import Alert
from alerts.services.constants import (
    AlertLevel,
    AlertLifecycleStatus,
)
from alerts.services.deduplication import (
    find_latest_active_alert,
    is_escalation,
)
from alerts.services.evaluator import (
    AlertEvaluation,
)
from alerts.services.exceptions import (
    AlertValidationError,
)
from alerts.services.lifecycle import (
    resolve_superseded_alert,
)
from arkl.models import ARKLResult
from devices.models import H2SReading


REALTIME_CALCULATION_TYPE = (
    "REALTIME"
)


@dataclass(frozen=True)
class AlertPersistenceResult:
    alert: Alert | None
    created: bool
    duplicate: bool
    escalated: bool


def _no_alert_result() -> (
    AlertPersistenceResult
):
    return AlertPersistenceResult(
        alert=None,
        created=False,
        duplicate=False,
        escalated=False,
    )


def _existing_alert_result(
    *,
    alert: Alert,
    duplicate: bool = False,
) -> AlertPersistenceResult:
    return AlertPersistenceResult(
        alert=alert,
        created=False,
        duplicate=duplicate,
        escalated=False,
    )


def _validate_alert_sources(
    *,
    reading: H2SReading,
    arkl_result: ARKLResult,
) -> None:
    if (
        arkl_result.calculation_type
        != REALTIME_CALCULATION_TYPE
    ):
        raise AlertValidationError(
            "Only REALTIME ARKLResult can "
            "create realtime alerts."
        )

    if (
        arkl_result.reading_id
        != reading.id
    ):
        raise AlertValidationError(
            "ARKLResult reading does not match "
            "the supplied H2SReading."
        )

    if (
        arkl_result.worker_id
        is None
    ):
        raise AlertValidationError(
            "ARKLResult must reference a worker."
        )

    if (
        reading.device_id
        is None
    ):
        raise AlertValidationError(
            "H2SReading must reference a device."
        )


def _create_alert(
    *,
    reading: H2SReading,
    arkl_result: ARKLResult,
    evaluation: AlertEvaluation,
) -> Alert:
    decision = (
        evaluation.decision
    )

    return Alert.objects.create(
        worker=arkl_result.worker,
        device=reading.device,
        reading=reading,
        arkl_result=arkl_result,

        concentration_ppm=Decimal(
            str(reading.ppm)
        ),
        environmental_level=(
            reading.level
        ),
        environmental_status=(
            reading.status
        ),
        environmental_severity=(
            decision
            .environmental_severity
        ),

        rq=arkl_result.rq,
        risk_interpretation=(
            arkl_result.interpretation
        ),
        calculation_version=(
            arkl_result
            .calculation_version
        ),

        alert_level=(
            decision.alert_level
        ),
        risk_status=(
            decision.risk_status
        ),
        status=(
            AlertLifecycleStatus.OPEN
        ),
        recommendation_codes=list(
            evaluation
            .recommendation_codes
        ),
        alert_rule_version=(
            decision
            .alert_rule_version
        ),

        source_simulated=bool(
            reading.simulated
            or
            arkl_result.source_simulated
        ),
    )


@transaction.atomic
def persist_alert_evaluation(
    *,
    reading: H2SReading,
    arkl_result: ARKLResult,
    evaluation: AlertEvaluation,
) -> AlertPersistenceResult:
    """
    Persist one Alert evaluation.

    NONE:
        Do not create a new alert and do not
        automatically resolve an active alert.

    Same level:
        Return the active alert as duplicate.

    Lower level:
        Keep the existing higher alert active.

    Higher level:
        Resolve the old alert internally and
        create a new OPEN escalation snapshot.
    """
    decision = (
        evaluation.decision
    )


    if (
        decision.alert_level
        == AlertLevel.NONE
    ):
        return _no_alert_result()


    _validate_alert_sources(
        reading=reading,
        arkl_result=arkl_result,
    )


    existing = (
        find_latest_active_alert(
            worker=(
                arkl_result.worker
            ),
            device=reading.device,
            lock=True,
        )
    )


    if existing is not None:
        existing_level = AlertLevel(
            existing.alert_level
        )

        incoming_level = AlertLevel(
            decision.alert_level
        )


        if (
            existing_level
            == incoming_level
        ):
            return (
                _existing_alert_result(
                    alert=existing,
                    duplicate=True,
                )
            )


        if not is_escalation(
            existing_alert=existing,
            new_alert_level=(
                incoming_level
            ),
        ):
            return (
                _existing_alert_result(
                    alert=existing,
                )
            )


        resolve_superseded_alert(
            existing
        )


    alert = _create_alert(
        reading=reading,
        arkl_result=arkl_result,
        evaluation=evaluation,
    )


    return AlertPersistenceResult(
        alert=alert,
        created=True,
        duplicate=False,
        escalated=(
            existing is not None
        ),
    )