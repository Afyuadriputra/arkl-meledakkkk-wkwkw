from decimal import Decimal

import pytest

from alerts.models import Alert
from alerts.services.constants import (
    ALERT_RULE_VERSION,
    AlertLevel,
    AlertLifecycleStatus,
    EnvironmentalSeverity,
    RiskStatus,
)
from arkl.models import ARKLResult
from devices.models import Device, H2SReading
from exposure.models import ExposureProfile, Worker


@pytest.fixture
def alert(db):
    worker = Worker.objects.create(
        code="PML-LIFECYCLE-001",
        is_active=True,
    )

    ExposureProfile.objects.create(
        worker=worker,
        body_weight=55,
        exposure_time=8,
        exposure_frequency=250,
        exposure_duration=10,
        inhalation_rate=0.83,
    )

    device = Device.objects.create(
        device_code="H2S-LIFECYCLE-001",
        name="Lifecycle Test Device",
        location="TPA Test",
        is_active=True,
    )

    reading = H2SReading.objects.create(
        device=device,
        ppm=25.4,
        adc=1000,
        filtered_adc=1000,
        level=2,
        status="WARNING",
        uptime_ms=1000,
        simulated=False,
    )

    arkl_result = ARKLResult.objects.create(
        worker=worker,
        reading=reading,
        calculation_type="REALTIME",
        concentration_ppm=Decimal("25.400000"),
        concentration_mg_m3=Decimal("35.560000"),
        exposure_concentration_mg_m3=Decimal("8.118721"),
        body_weight=Decimal("55"),
        exposure_time=Decimal("8"),
        exposure_frequency=Decimal("250"),
        exposure_duration=Decimal("10"),
        inhalation_rate=Decimal("0.83"),
        averaging_time=None,
        intake=None,
        rfc=Decimal("0.002"),
        rq=Decimal("4059.360730593607"),
        interpretation="ABOVE_REFERENCE_LEVEL",
        calculation_version="1.1.0-MVP",
        source_simulated=False,
    )

    return Alert.objects.create(
        worker=worker,
        device=device,
        reading=reading,
        arkl_result=arkl_result,
        concentration_ppm=Decimal("25.400000"),
        environmental_level=2,
        environmental_status="WARNING",
        environmental_severity=EnvironmentalSeverity.WARNING,
        rq=arkl_result.rq,
        risk_interpretation=arkl_result.interpretation,
        calculation_version=arkl_result.calculation_version,
        alert_level=AlertLevel.HIGH,
        risk_status=RiskStatus.RISK_MANAGEMENT_REQUIRED,
        status=AlertLifecycleStatus.OPEN,
        recommendation_codes=[
            "REDUCE_EXPOSURE_DURATION",
            "MONITOR_H2S_LEVEL",
        ],
        alert_rule_version=ALERT_RULE_VERSION,
        source_simulated=False,
    )
