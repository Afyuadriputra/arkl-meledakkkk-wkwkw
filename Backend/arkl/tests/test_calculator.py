from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone

from arkl.services.calculator import (
    ARKLCalculationError,
    calculate_historical_risk,
    calculate_realtime_risk,
)
from arkl.services.constants import (
    ARKL_CALCULATION_VERSION,
)
from devices.models import (
    Device,
    H2SReading,
)
from exposure.models import (
    ExposureProfile,
    Worker,
)


def assign_monitoring_device(
    *,
    worker: Worker,
    device: Device,
) -> None:
    worker.monitoring_device = device

    worker.save(
        update_fields=[
            "monitoring_device",
        ]
    )


@pytest.mark.django_db
def test_realtime_risk_calculation_creates_result():
    device = Device.objects.create(
        device_code="H2S-REALTIME-001",
    )

    reading = H2SReading.objects.create(
        device=device,
        ppm=10,
        adc=500,
        filtered_adc=500,
        level=2,
        status="NORMAL",
        uptime_ms=1000,
        simulated=True,
    )

    worker = Worker.objects.create(
        code="PML-REALTIME-001",
    )

    ExposureProfile.objects.create(
        worker=worker,
        body_weight=55,
        exposure_time=8,
        exposure_frequency=250,
        exposure_duration=10,
        inhalation_rate=0.83,
    )

    assign_monitoring_device(
        worker=worker,
        device=device,
    )

    result = calculate_realtime_risk(
        worker=worker,
        device=device,
    )

    assert result.pk is not None
    assert result.reading == reading
    assert result.calculation_type == "REALTIME"

    assert (
        result.concentration_ppm
        == Decimal("10")
    )

    assert (
        result.concentration_mg_m3
        == Decimal("14.00")
    )

    assert result.rq > 0
    assert result.source_simulated is True

    assert (
        result.calculation_version
        == ARKL_CALCULATION_VERSION
    )


@pytest.mark.django_db
def test_realtime_uses_latest_reading():
    device = Device.objects.create(
        device_code="H2S-LATEST-001",
    )

    H2SReading.objects.create(
        device=device,
        ppm=5,
        adc=100,
        filtered_adc=100,
        level=1,
        status="NORMAL",
        uptime_ms=1000,
        simulated=True,
    )

    latest = H2SReading.objects.create(
        device=device,
        ppm=20,
        adc=200,
        filtered_adc=200,
        level=2,
        status="WARNING",
        uptime_ms=2000,
        simulated=True,
    )

    worker = Worker.objects.create(
        code="PML-LATEST-001",
    )

    ExposureProfile.objects.create(
        worker=worker,
        body_weight=55,
        exposure_time=8,
        exposure_frequency=250,
        exposure_duration=10,
        inhalation_rate=0.83,
    )

    assign_monitoring_device(
        worker=worker,
        device=device,
    )

    result = calculate_realtime_risk(
        worker=worker,
        device=device,
    )

    assert result.reading == latest

    assert (
        result.concentration_ppm
        == Decimal("20")
    )


@pytest.mark.django_db
def test_realtime_requires_exposure_profile():
    device = Device.objects.create(
        device_code="H2S-NO-PROFILE",
    )

    H2SReading.objects.create(
        device=device,
        ppm=10,
        adc=100,
        filtered_adc=100,
        level=1,
        status="NORMAL",
        uptime_ms=1000,
        simulated=True,
    )

    worker = Worker.objects.create(
        code="PML-NO-PROFILE",
    )

    with pytest.raises(
        ARKLCalculationError,
        match="does not have an exposure profile",
    ):
        calculate_realtime_risk(
            worker=worker,
            device=device,
        )


@pytest.mark.django_db
def test_realtime_requires_reading():
    device = Device.objects.create(
        device_code="H2S-NO-READING",
    )

    worker = Worker.objects.create(
        code="PML-NO-READING",
    )

    ExposureProfile.objects.create(
        worker=worker,
        body_weight=55,
        exposure_time=8,
        exposure_frequency=250,
        exposure_duration=10,
        inhalation_rate=0.83,
    )

    with pytest.raises(
        ARKLCalculationError,
        match="No H2S reading available",
    ):
        calculate_realtime_risk(
            worker=worker,
            device=device,
        )


@pytest.mark.django_db
def test_realtime_requires_monitoring_device_assignment():
    device = Device.objects.create(
        device_code="H2S-NO-ASSIGNMENT",
    )

    H2SReading.objects.create(
        device=device,
        ppm=10,
        adc=100,
        filtered_adc=100,
        level=1,
        status="NORMAL",
        uptime_ms=1000,
        simulated=True,
    )

    worker = Worker.objects.create(
        code="PML-NO-ASSIGNMENT",
    )

    ExposureProfile.objects.create(
        worker=worker,
        body_weight=55,
        exposure_time=8,
        exposure_frequency=250,
        exposure_duration=10,
        inhalation_rate=0.83,
    )

    with pytest.raises(
        ARKLCalculationError,
        match="assigned monitoring device",
    ):
        calculate_realtime_risk(
            worker=worker,
            device=device,
        )


@pytest.mark.django_db
def test_realtime_rejects_different_monitoring_device():
    assigned_device = Device.objects.create(
        device_code="H2S-ASSIGNED-001",
    )

    requested_device = Device.objects.create(
        device_code="H2S-REQUESTED-001",
    )

    H2SReading.objects.create(
        device=requested_device,
        ppm=10,
        adc=100,
        filtered_adc=100,
        level=1,
        status="NORMAL",
        uptime_ms=1000,
        simulated=True,
    )

    worker = Worker.objects.create(
        code="PML-WRONG-DEVICE",
        monitoring_device=assigned_device,
    )

    ExposureProfile.objects.create(
        worker=worker,
        body_weight=55,
        exposure_time=8,
        exposure_frequency=250,
        exposure_duration=10,
        inhalation_rate=0.83,
    )

    with pytest.raises(
        ARKLCalculationError,
        match="Device is not assigned to this worker",
    ):
        calculate_realtime_risk(
            worker=worker,
            device=requested_device,
        )


@pytest.mark.django_db
def test_historical_risk_uses_mean_concentration():
    device = Device.objects.create(
        device_code="H2S-HIST-001",
    )

    worker = Worker.objects.create(
        code="PML-HIST-001",
    )

    ExposureProfile.objects.create(
        worker=worker,
        body_weight=55,
        exposure_time=8,
        exposure_frequency=250,
        exposure_duration=10,
        inhalation_rate=0.83,
    )

    now = timezone.now()
    readings = []

    for ppm in [10, 20, 30]:
        reading = H2SReading.objects.create(
            device=device,
            ppm=ppm,
            adc=100,
            filtered_adc=100,
            level=1,
            status="NORMAL",
            uptime_ms=1000,
            simulated=True,
        )

        readings.append(reading)

    for index, reading in enumerate(
        readings
    ):
        timestamp = now - timedelta(
            minutes=30 - (index * 10)
        )

        H2SReading.objects.filter(
            pk=reading.pk,
        ).update(
            received_at=timestamp,
        )

    result = calculate_historical_risk(
        worker=worker,
        device=device,
        period_start=(
            now - timedelta(hours=1)
        ),
        period_end=now,
    )

    assert result.pk is not None
    assert result.reading is None
    assert result.calculation_type == "HISTORICAL"
    assert result.reading_count == 3

    assert (
        result.concentration_ppm
        == Decimal("20")
    )

    assert (
        result.concentration_mg_m3
        == Decimal("28.00")
    )

    assert (
        result.exposure_concentration_mg_m3
        is None
    )

    assert (
        result.averaging_time
        == Decimal("3650")
    )

    assert result.intake is not None
    assert result.intake > 0
    assert result.rq > 0

    assert result.source_simulated is True

    assert (
        result.calculation_version
        == "2.0.0-MVP"
    )


@pytest.mark.django_db
def test_historical_requires_readings():
    device = Device.objects.create(
        device_code="H2S-HIST-EMPTY",
    )

    worker = Worker.objects.create(
        code="PML-HIST-EMPTY",
    )

    ExposureProfile.objects.create(
        worker=worker,
        body_weight=55,
        exposure_time=8,
        exposure_frequency=250,
        exposure_duration=10,
        inhalation_rate=0.83,
    )

    now = timezone.now()

    with pytest.raises(
        ARKLCalculationError,
        match="No H2S readings available",
    ):
        calculate_historical_risk(
            worker=worker,
            device=device,
            period_start=(
                now - timedelta(hours=1)
            ),
            period_end=now,
        )


@pytest.mark.django_db
def test_historical_rejects_invalid_period():
    device = Device.objects.create(
        device_code="H2S-HIST-PERIOD",
    )

    worker = Worker.objects.create(
        code="PML-HIST-PERIOD",
    )

    now = timezone.now()

    with pytest.raises(
        ARKLCalculationError,
        match="period_start must be earlier",
    ):
        calculate_historical_risk(
            worker=worker,
            device=device,
            period_start=now,
            period_end=now,
        )


@pytest.mark.django_db
def test_realtime_rejects_inactive_device():
    device = Device.objects.create(
        device_code="H2S-INACTIVE",
        is_active=False,
    )

    H2SReading.objects.create(
        device=device,
        ppm=10,
        adc=100,
        filtered_adc=100,
        level=1,
        status="NORMAL",
        uptime_ms=1000,
        simulated=True,
    )

    worker = Worker.objects.create(
        code="PML-INACTIVE",
    )

    ExposureProfile.objects.create(
        worker=worker,
        body_weight=55,
        exposure_time=8,
        exposure_frequency=250,
        exposure_duration=10,
        inhalation_rate=0.83,
    )

    with pytest.raises(
        ARKLCalculationError,
        match="Device is inactive",
    ):
        calculate_realtime_risk(
            worker=worker,
            device=device,
        )