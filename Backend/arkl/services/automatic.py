import logging
from dataclasses import dataclass
from datetime import timedelta

from django.db import transaction

from arkl.models import ARKLResult
from arkl.services.realtime import (
    RealtimeARKLError,
    RealtimeARKLExecutionResult,
    run_realtime_arkl_for_reading,
)
from devices.models import H2SReading
from exposure.models import Worker


logger = logging.getLogger(
    "smart_h2s.arkl.automatic"
)


AUTOMATIC_ARKL_MIN_INTERVAL = timedelta(
    seconds=60
)


@dataclass(frozen=True)
class AutomaticARKLProcessingResult:
    processed: int
    succeeded: int
    skipped: int
    failed: int


@dataclass(frozen=True)
class _WorkerProcessingResult:
    state: str
    reason: str
    execution: RealtimeARKLExecutionResult | None


def _normalized_status(
    value: str | None,
) -> str:
    if value is None:
        return ""

    return value.strip().upper()


def _get_last_realtime_result(
    *,
    worker: Worker,
) -> ARKLResult | None:
    return (
        ARKLResult.objects
        .filter(
            worker=worker,
            calculation_type=(
                ARKLResult
                .CalculationType
                .REALTIME
            ),
            reading__isnull=False,
        )
        .select_related(
            "reading"
        )
        .order_by(
            "-reading__received_at",
            "-id",
        )
        .first()
    )


def _should_process_reading(
    *,
    reading: H2SReading,
    last_result:
        ARKLResult | None,
) -> tuple[bool, str]:
    """
    Decide whether the exact reading should
    trigger a new realtime ARKL snapshot.

    Policy:
    - first reading → process
    - stale/duplicate reading → skip
    - environmental status changed → process
    - same status after >= 60 seconds → process
    - otherwise → skip

    This prevents one ARKLResult per MQTT
    packet while still reacting immediately
    to environmental status transitions.
    """
    if last_result is None:
        return (
            True,
            "first_realtime_result",
        )

    last_reading = (
        last_result.reading
    )

    if last_reading is None:
        return (
            True,
            "previous_result_without_reading",
        )

    if (
        reading.received_at
        <= last_reading.received_at
    ):
        return (
            False,
            "stale_or_duplicate_reading",
        )

    current_status = (
        _normalized_status(
            reading.status
        )
    )

    previous_status = (
        _normalized_status(
            last_reading.status
        )
    )

    if (
        current_status
        != previous_status
    ):
        return (
            True,
            "environmental_status_changed",
        )

    elapsed = (
        reading.received_at
        - last_reading.received_at
    )

    if (
        elapsed
        >= AUTOMATIC_ARKL_MIN_INTERVAL
    ):
        return (
            True,
            "minimum_interval_elapsed",
        )

    return (
        False,
        "minimum_interval_not_elapsed",
    )


@transaction.atomic
def _process_worker_reading(
    *,
    worker_id: int,
    reading: H2SReading,
) -> _WorkerProcessingResult:
    """
    Serialize automatic ARKL decisions for one
    Worker.

    The Worker row is locked so concurrent MQTT
    callbacks cannot independently decide to
    create the same periodic ARKL snapshot.
    """
    worker = (
        Worker.objects
        .select_for_update()
        .select_related(
            "monitoring_device",
        )
        .get(
            pk=worker_id
        )
    )

    # Revalidate assignment after acquiring
    # the lock. The assignment may have changed
    # since the initial worker discovery query.
    if (
        not worker.is_active
        or worker.monitoring_device_id
        != reading.device_id
    ):
        return _WorkerProcessingResult(
            state="SKIPPED",
            reason=(
                "worker_no_longer_eligible"
            ),
            execution=None,
        )

    last_result = (
        _get_last_realtime_result(
            worker=worker
        )
    )

    should_process, reason = (
        _should_process_reading(
            reading=reading,
            last_result=last_result,
        )
    )

    if not should_process:
        return _WorkerProcessingResult(
            state="SKIPPED",
            reason=reason,
            execution=None,
        )

    execution = (
        run_realtime_arkl_for_reading(
            worker=worker,
            reading=reading,
        )
    )

    return _WorkerProcessingResult(
        state="SUCCEEDED",
        reason=reason,
        execution=execution,
    )


def process_reading_for_assigned_workers(
    *,
    reading: H2SReading,
) -> AutomaticARKLProcessingResult:
    """
    Run automatic realtime ARKL + Alert for
    active Workers assigned to the Device that
    produced this exact reading.

    Failure isolation:
    failure for one Worker must not prevent
    processing of another Worker.
    """
    worker_ids = list(
        Worker.objects
        .filter(
            monitoring_device_id=(
                reading.device_id
            ),
            is_active=True,
        )
        .order_by("id")
        .values_list(
            "id",
            flat=True,
        )
    )

    processed = 0
    succeeded = 0
    skipped = 0
    failed = 0

    for worker_id in worker_ids:
        processed += 1

        try:
            result = (
                _process_worker_reading(
                    worker_id=worker_id,
                    reading=reading,
                )
            )

        except RealtimeARKLError as exc:
            failed += 1

            logger.warning(
                (
                    "automatic_arkl_failed "
                    "reading_id=%s "
                    "device_id=%s "
                    "worker_id=%s "
                    "reason=%s"
                ),
                reading.pk,
                reading.device_id,
                worker_id,
                str(exc),
            )

            continue

        if (
            result.state
            == "SKIPPED"
        ):
            skipped += 1

            logger.debug(
                (
                    "automatic_arkl_skipped "
                    "reading_id=%s "
                    "device_id=%s "
                    "worker_id=%s "
                    "reason=%s"
                ),
                reading.pk,
                reading.device_id,
                worker_id,
                result.reason,
            )

            continue

        execution = (
            result.execution
        )

        if execution is None:
            failed += 1

            logger.error(
                (
                    "automatic_arkl_invalid_result "
                    "reading_id=%s "
                    "device_id=%s "
                    "worker_id=%s"
                ),
                reading.pk,
                reading.device_id,
                worker_id,
            )

            continue

        succeeded += 1

        logger.info(
            (
                "automatic_arkl_completed "
                "reading_id=%s "
                "device_id=%s "
                "worker_id=%s "
                "arkl_result_id=%s "
                "trigger=%s "
                "alert_created=%s "
                "alert_duplicate=%s "
                "alert_escalated=%s"
            ),
            reading.pk,
            reading.device_id,
            worker_id,
            execution.arkl_result.pk,
            result.reason,
            (
                execution
                .alert_evaluation
                .created
            ),
            (
                execution
                .alert_evaluation
                .duplicate
            ),
            (
                execution
                .alert_evaluation
                .escalated
            ),
        )

    return AutomaticARKLProcessingResult(
        processed=processed,
        succeeded=succeeded,
        skipped=skipped,
        failed=failed,
    )