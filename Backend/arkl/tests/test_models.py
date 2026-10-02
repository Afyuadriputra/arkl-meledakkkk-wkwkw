from decimal import Decimal

import pytest

from arkl.models import ARKLResult
from arkl.services.constants import ARKL_CALCULATION_VERSION
from devices.models import Device, H2SReading
from exposure.models import Worker


@pytest.mark.django_db
def test_realtime_arkl_result_snapshot_can_be_stored():
    device = Device.objects.create(
        device_code="H2S-TPA-001",
    )

    reading = H2SReading.objects.create(
        device=device,
        ppm=10,
        adc=500,
        filtered_adc=500,
        level=2,
        status="TEST",
        uptime_ms=1000,
        simulated=True,
    )

    worker = Worker.objects.create(
        code="PML-001",
    )

    result = ARKLResult.objects.create(
        worker=worker,
        reading=reading,
        calculation_type=ARKLResult.CalculationType.REALTIME,
        concentration_ppm=Decimal("10"),
        concentration_mg_m3=Decimal("14"),
        exposure_concentration_mg_m3=Decimal("3.196347"),
        body_weight=Decimal("55"),
        exposure_time=Decimal("8"),
        exposure_frequency=Decimal("250"),
        exposure_duration=Decimal("10"),
        inhalation_rate=Decimal("0.83"),
        averaging_time=None,
        intake=None,
        rfc=Decimal("0.002"),
        rq=Decimal("1598.1735"),
        interpretation="ABOVE_REFERENCE_LEVEL",
        calculation_version=(ARKL_CALCULATION_VERSION),
        source_simulated=True,
    )

    result.refresh_from_db()

    assert result.pk is not None
    assert result.worker == worker
    assert result.reading == reading

    assert result.calculation_type == "REALTIME"

    assert result.exposure_concentration_mg_m3 is not None

    assert result.intake is None
    assert result.averaging_time is None

    assert result.calculation_version == ARKL_CALCULATION_VERSION


@pytest.mark.django_db
def test_legacy_v1_result_can_exist_without_exposure_concentration():
    worker = Worker.objects.create(
        code="PML-LEGACY-001",
    )

    result = ARKLResult.objects.create(
        worker=worker,
        calculation_type=(ARKLResult.CalculationType.HISTORICAL),
        concentration_ppm=Decimal("10"),
        concentration_mg_m3=Decimal("14"),
        exposure_concentration_mg_m3=None,
        body_weight=Decimal("55"),
        exposure_time=Decimal("8"),
        exposure_frequency=Decimal("250"),
        exposure_duration=Decimal("10"),
        inhalation_rate=Decimal("0.83"),
        averaging_time=Decimal("3650"),
        intake=Decimal("0.1"),
        rfc=Decimal("0.002"),
        rq=Decimal("50"),
        interpretation="ABOVE_REFERENCE_LEVEL",
        calculation_version="1.0.0-MVP",
        source_simulated=True,
    )

    result.refresh_from_db()

    assert result.calculation_version == "1.0.0-MVP"

    assert result.exposure_concentration_mg_m3 is None

    assert result.intake is not None
