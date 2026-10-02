import json

import pytest

from alerts.models import Alert
from arkl.models import ARKLResult
from devices.models import Device, H2SReading
from devices.services.mqtt_ingestion import (
    ingest_mqtt_message,
)
from exposure.models import (
    ExposureProfile,
    Worker,
)


@pytest.mark.django_db
def test_mqtt_ingestion_triggers_automatic_arkl_and_alert():
    device = Device.objects.create(
        device_code="H2S-TPA-001",
        name="Sensor TPA 001",
        location="TPA Muara Fajar",
        is_active=True,
    )

    worker = Worker.objects.create(
        code="PML-MQTT-001",
        name="Worker MQTT",
        age=40,
        monitoring_device=device,
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

    payload = {
        "device_id": "H2S-TPA-001",
        "ppm": 52.75,
        "adc": 1000,
        "filtered_adc": 995.5,
        "level": 4,
        "status": "DANGER",
        "uptime_ms": 10000,
        "simulated": True,
    }

    reading = ingest_mqtt_message(
        topic=(
            "afyuadri/h2s-demo/"
            "device-001/telemetry"
        ),
        raw_payload=json.dumps(payload),
    )

    assert reading is not None

    assert H2SReading.objects.filter(
        pk=reading.pk,
        device=device,
    ).exists()

    arkl_result = ARKLResult.objects.get(
        worker=worker,
        reading=reading,
        calculation_type=(
            ARKLResult
            .CalculationType
            .REALTIME
        ),
    )

    assert arkl_result.reading_id == reading.pk
    assert arkl_result.worker_id == worker.pk

    alert = Alert.objects.get(
        worker=worker,
        arkl_result=arkl_result,
    )

    assert alert.reading_id == reading.pk


@pytest.mark.django_db
def test_mqtt_reading_is_preserved_when_automatic_arkl_fails():
    device = Device.objects.create(
        device_code="H2S-TPA-NO-EXPOSURE",
        name="Sensor TPA No Exposure",
        location="TPA Muara Fajar",
        is_active=True,
    )

    worker = Worker.objects.create(
        code="PML-MQTT-NO-EXPOSURE",
        name="Worker Tanpa Exposure",
        age=40,
        monitoring_device=device,
        is_active=True,
    )

    payload = {
        "device_id": "H2S-TPA-NO-EXPOSURE",
        "ppm": 52.75,
        "adc": 1000,
        "filtered_adc": 995.5,
        "level": 4,
        "status": "DANGER",
        "uptime_ms": 10000,
        "simulated": True,
    }

    reading = ingest_mqtt_message(
        topic="test/h2s/telemetry",
        raw_payload=json.dumps(payload),
    )

    assert reading is not None

    assert H2SReading.objects.filter(
        pk=reading.pk
    ).exists()

    assert not ARKLResult.objects.filter(
        worker=worker,
        reading=reading,
    ).exists()

    assert not Alert.objects.filter(
        worker=worker,
        reading=reading,
    ).exists()