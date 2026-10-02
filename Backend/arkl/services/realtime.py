from dataclasses import dataclass

from django.db import transaction

from alerts.services.alert_service import (
    evaluate_realtime_arkl_alert,
)
from alerts.services.exceptions import (
    AlertValidationError,
)
from alerts.services.persistence import (
    AlertPersistenceResult,
)
from arkl.models import ARKLResult
from arkl.services.calculator import (
    ARKLCalculationError,
    calculate_realtime_risk,
    calculate_realtime_risk_from_reading,
)
from devices.models import (
    Device,
    H2SReading,
)
from exposure.models import Worker


class RealtimeARKLError(ValueError):
    """
    Public application-level error for
    realtime ARKL orchestration.
    """


@dataclass(frozen=True)
class RealtimeARKLExecutionResult:
    arkl_result: ARKLResult
    alert_evaluation: AlertPersistenceResult


@transaction.atomic
def run_realtime_arkl(
    *,
    worker: Worker,
    device: Device,
) -> RealtimeARKLExecutionResult:
    """
    Canonical realtime ARKL workflow for an
    explicit application/API request.

    The calculator uses the latest available
    reading from the requested Device.
    """
    try:
        arkl_result = (
            calculate_realtime_risk(
                worker=worker,
                device=device,
            )
        )

        alert_evaluation = (
            evaluate_realtime_arkl_alert(
                arkl_result=arkl_result
            )
        )

    except (
        ARKLCalculationError,
        AlertValidationError,
    ) as exc:
        raise RealtimeARKLError(
            str(exc)
        ) from exc

    return RealtimeARKLExecutionResult(
        arkl_result=arkl_result,
        alert_evaluation=(
            alert_evaluation
        ),
    )


@transaction.atomic
def run_realtime_arkl_for_reading(
    *,
    worker: Worker,
    reading: H2SReading,
) -> RealtimeARKLExecutionResult:
    """
    Canonical automatic realtime workflow for
    one exact persisted H2SReading.

    Used by MQTT automatic orchestration so the
    ARKL snapshot always references the exact
    reading that triggered the calculation.
    """
    try:
        arkl_result = (
            calculate_realtime_risk_from_reading(
                worker=worker,
                reading=reading,
            )
        )

        alert_evaluation = (
            evaluate_realtime_arkl_alert(
                arkl_result=arkl_result
            )
        )

    except (
        ARKLCalculationError,
        AlertValidationError,
    ) as exc:
        raise RealtimeARKLError(
            str(exc)
        ) from exc

    return RealtimeARKLExecutionResult(
        arkl_result=arkl_result,
        alert_evaluation=(
            alert_evaluation
        ),
    )