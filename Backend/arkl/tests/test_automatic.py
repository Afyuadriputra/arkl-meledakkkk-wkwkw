from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone

from alerts.models import Alert
from arkl.models import ARKLResult
from arkl.services.automatic import (
    process_reading_for_assigned_workers,
)
from devices.models import (
    Device,
    H2SReading,
)
from exposure.models import (
    ExposureProfile,
    Worker,
)


def create_device(
    *,
    code: str,
) -> Device:
    return Device.objects.create(
        device_code=code,
        name=f"Sensor {code}",
        location="TPA Muara Fajar",
        is_active=True,
    )


def create_worker(
    *,
    code: str,
    device: Device | None,
    with_exposure: bool = True,
    is_active: bool = True,
) -> Worker:
    worker = Worker.objects.create(
        code=code,
        name=f"Worker {code}",
        age=40,
        is_active=is_active,
        monitoring_device=device,
    )

    if with_exposure:
        ExposureProfile.objects.create(
            worker=worker,
            body_weight=55,
            exposure_time=8,
            exposure_frequency=250,
            exposure_duration=10,
            inhalation_rate=0.83,
        )

    return worker


def create_reading(
    *,
    device: Device,
    ppm=Decimal("0.001"),
    status="NORMAL",
) -> H2SReading:
    return H2SReading.objects.create(
        device=device,
        ppm=ppm,
        adc=1000,
        filtered_adc=1000,
        level=1,
        status=status,
        uptime_ms=1000,
        simulated=True,
    )


def set_reading_time(
    reading: H2SReading,
    value,
) -> None:
    H2SReading.objects.filter(
        pk=reading.pk
    ).update(
        received_at=value
    )

    reading.refresh_from_db()


@pytest.mark.django_db
def test_first_reading_creates_realtime_arkl():
    device = create_device(
        code="H2S-AUTO-FIRST"
    )

    worker = create_worker(
        code="PML-AUTO-FIRST",
        device=device,
    )

    reading = create_reading(
        device=device,
    )

    result = (
        process_reading_for_assigned_workers(
            reading=reading
        )
    )

    assert result.processed == 1
    assert result.succeeded == 1
    assert result.skipped == 0
    assert result.failed == 0

    arkl_result = (
        ARKLResult.objects.get(
            worker=worker,
            calculation_type=(
                ARKLResult
                .CalculationType
                .REALTIME
            ),
        )
    )

    assert (
        arkl_result.reading_id
        == reading.pk
    )


@pytest.mark.django_db
def test_same_status_within_interval_is_skipped():
    device = create_device(
        code="H2S-AUTO-SKIP"
    )

    worker = create_worker(
        code="PML-AUTO-SKIP",
        device=device,
    )

    first = create_reading(
        device=device,
        status="NORMAL",
    )

    first_result = (
        process_reading_for_assigned_workers(
            reading=first
        )
    )

    assert (
        first_result.succeeded
        == 1
    )

    second = create_reading(
        device=device,
        status="NORMAL",
    )

    result = (
        process_reading_for_assigned_workers(
            reading=second
        )
    )

    assert result.processed == 1
    assert result.succeeded == 0
    assert result.skipped == 1
    assert result.failed == 0

    assert (
        ARKLResult.objects.filter(
            worker=worker,
            calculation_type=(
                ARKLResult
                .CalculationType
                .REALTIME
            ),
        ).count()
        == 1
    )


@pytest.mark.django_db
def test_status_change_bypasses_interval():
    device = create_device(
        code="H2S-AUTO-STATUS"
    )

    worker = create_worker(
        code="PML-AUTO-STATUS",
        device=device,
    )

    first = create_reading(
        device=device,
        ppm=Decimal("0.001"),
        status="NORMAL",
    )

    process_reading_for_assigned_workers(
        reading=first
    )

    second = create_reading(
        device=device,
        ppm=Decimal("0.001"),
        status="CAUTION",
    )

    result = (
        process_reading_for_assigned_workers(
            reading=second
        )
    )

    assert result.succeeded == 1
    assert result.skipped == 0

    results = (
        ARKLResult.objects
        .filter(
            worker=worker,
            calculation_type=(
                ARKLResult
                .CalculationType
                .REALTIME
            ),
        )
        .order_by("id")
    )

    assert results.count() == 2

    assert (
        results.last().reading_id
        == second.pk
    )


@pytest.mark.django_db
def test_same_status_after_interval_is_processed():
    device = create_device(
        code="H2S-AUTO-INTERVAL"
    )

    worker = create_worker(
        code="PML-AUTO-INTERVAL",
        device=device,
    )

    now = timezone.now()

    first = create_reading(
        device=device,
        status="NORMAL",
    )

    set_reading_time(
        first,
        now - timedelta(
            seconds=61
        ),
    )

    process_reading_for_assigned_workers(
        reading=first
    )

    second = create_reading(
        device=device,
        status="NORMAL",
    )

    set_reading_time(
        second,
        now,
    )

    result = (
        process_reading_for_assigned_workers(
            reading=second
        )
    )

    assert result.succeeded == 1
    assert result.skipped == 0

    assert (
        ARKLResult.objects.filter(
            worker=worker,
            calculation_type=(
                ARKLResult
                .CalculationType
                .REALTIME
            ),
        ).count()
        == 2
    )


@pytest.mark.django_db
def test_multiple_workers_use_same_exact_reading():
    device = create_device(
        code="H2S-AUTO-MULTI"
    )

    worker_a = create_worker(
        code="PML-AUTO-A",
        device=device,
    )

    worker_b = create_worker(
        code="PML-AUTO-B",
        device=device,
    )

    reading = create_reading(
        device=device,
    )

    result = (
        process_reading_for_assigned_workers(
            reading=reading
        )
    )

    assert result.processed == 2
    assert result.succeeded == 2
    assert result.skipped == 0
    assert result.failed == 0

    for worker in (
        worker_a,
        worker_b,
    ):
        arkl_result = (
            ARKLResult.objects.get(
                worker=worker,
                calculation_type=(
                    ARKLResult
                    .CalculationType
                    .REALTIME
                ),
            )
        )

        assert (
            arkl_result.reading_id
            == reading.pk
        )


@pytest.mark.django_db
def test_unassigned_worker_is_not_processed():
    device = create_device(
        code="H2S-AUTO-ASSIGNED"
    )

    other_device = create_device(
        code="H2S-AUTO-OTHER"
    )

    assigned_worker = create_worker(
        code="PML-AUTO-ASSIGNED",
        device=device,
    )

    unassigned_worker = create_worker(
        code="PML-AUTO-OTHER",
        device=other_device,
    )

    reading = create_reading(
        device=device,
    )

    result = (
        process_reading_for_assigned_workers(
            reading=reading
        )
    )

    assert result.processed == 1
    assert result.succeeded == 1

    assert (
        ARKLResult.objects.filter(
            worker=assigned_worker
        ).exists()
        is True
    )

    assert (
        ARKLResult.objects.filter(
            worker=unassigned_worker
        ).exists()
        is False
    )


@pytest.mark.django_db
def test_inactive_worker_is_not_processed():
    device = create_device(
        code="H2S-AUTO-INACTIVE"
    )

    worker = create_worker(
        code="PML-AUTO-INACTIVE",
        device=device,
        is_active=False,
    )

    reading = create_reading(
        device=device,
    )

    result = (
        process_reading_for_assigned_workers(
            reading=reading
        )
    )

    assert result.processed == 0
    assert result.succeeded == 0
    assert result.skipped == 0
    assert result.failed == 0

    assert (
        ARKLResult.objects.filter(
            worker=worker
        ).exists()
        is False
    )


@pytest.mark.django_db
def test_worker_failure_does_not_block_other_workers():
    device = create_device(
        code="H2S-AUTO-FAILURE"
    )

    valid_worker = create_worker(
        code="PML-AUTO-VALID",
        device=device,
    )

    invalid_worker = create_worker(
        code="PML-AUTO-NO-EXPOSURE",
        device=device,
        with_exposure=False,
    )

    reading = create_reading(
        device=device,
    )

    result = (
        process_reading_for_assigned_workers(
            reading=reading
        )
    )

    assert result.processed == 2
    assert result.succeeded == 1
    assert result.skipped == 0
    assert result.failed == 1

    assert (
        ARKLResult.objects.filter(
            worker=valid_worker,
        ).exists()
        is True
    )

    assert (
        ARKLResult.objects.filter(
            worker=invalid_worker,
        ).exists()
        is False
    )


@pytest.mark.django_db
def test_automatic_flow_creates_alert():
    device = create_device(
        code="H2S-AUTO-ALERT"
    )

    worker = create_worker(
        code="PML-AUTO-ALERT",
        device=device,
    )

    reading = create_reading(
        device=device,
        ppm=Decimal("25.4"),
        status="WARNING",
    )

    result = (
        process_reading_for_assigned_workers(
            reading=reading
        )
    )

    assert result.succeeded == 1

    arkl_result = (
        ARKLResult.objects.get(
            worker=worker,
            reading=reading,
        )
    )

    alert = (
        Alert.objects.get(
            worker=worker
        )
    )

    assert (
        alert.arkl_result_id
        == arkl_result.pk
    )

    assert (
        alert.reading_id
        == reading.pk
    )


@pytest.mark.django_db
def test_same_exact_reading_is_not_processed_twice():
    device = create_device(
        code="H2S-AUTO-DUPLICATE"
    )

    worker = create_worker(
        code="PML-AUTO-DUPLICATE",
        device=device,
    )

    reading = create_reading(
        device=device,
    )

    first = (
        process_reading_for_assigned_workers(
            reading=reading
        )
    )

    second = (
        process_reading_for_assigned_workers(
            reading=reading
        )
    )

    assert first.succeeded == 1

    assert second.succeeded == 0
    assert second.skipped == 1

    assert (
        ARKLResult.objects.filter(
            worker=worker,
            reading=reading,
        ).count()
        == 1
    )