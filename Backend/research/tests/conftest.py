from datetime import timedelta

import pytest
from django.utils import timezone

from devices.models import Device, H2SReading


@pytest.fixture
def research_device():
    return Device.objects.create(
        device_code="H2S-RESEARCH-001",
        name="Research Test Device",
        location="TPA Research Test",
        is_active=True,
    )


@pytest.fixture
def second_research_device():
    return Device.objects.create(
        device_code="H2S-RESEARCH-002",
        name="Second Research Device",
        location="TPA Research Test 2",
        is_active=True,
    )


@pytest.fixture
def research_readings(
    research_device,
):
    now = timezone.now()

    definitions = [
        {
            "ppm": 1.0,
            "simulated": False,
            "hours_ago": 3,
        },
        {
            "ppm": 3.0,
            "simulated": False,
            "hours_ago": 2,
        },
        {
            "ppm": 5.0,
            "simulated": True,
            "hours_ago": 1,
        },
    ]

    readings = []

    for index, definition in enumerate(
        definitions,
        start=1,
    ):
        reading = H2SReading.objects.create(
            device=research_device,
            ppm=definition["ppm"],
            adc=1000,
            filtered_adc=1000.0,
            level=1,
            status="NORMAL",
            uptime_ms=index * 1000,
            simulated=definition[
                "simulated"
            ],
        )

        timestamp = now - timedelta(
            hours=definition["hours_ago"]
        )

        H2SReading.objects.filter(
            pk=reading.pk
        ).update(
            received_at=timestamp
        )

        reading.refresh_from_db()
        readings.append(reading)

    return readings