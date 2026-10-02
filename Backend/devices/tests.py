import json

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from accounts.models import AccountProfile
from devices.models import (
    Device,
    H2SReading,
)
from devices.services.mqtt_ingestion import (
    ingest_mqtt_message,
)
from devices.services.telemetry import (
    TelemetryValidationError,
    validate_telemetry_payload,
)
from exposure.models import Worker


User = get_user_model()


def authenticate_client(
    *,
    username,
    role,
):
    user = User.objects.create_user(
        username=username,
        password="StrongPass123!",
    )

    AccountProfile.objects.create(
        user=user,
        role=role,
    )

    token = Token.objects.create(
        user=user,
    )

    client = APIClient()

    client.credentials(
        HTTP_AUTHORIZATION=(
            f"Token {token.key}"
        )
    )

    return client


@pytest.fixture
def admin_api_client():
    return authenticate_client(
        username="devices-admin",
        role=AccountProfile.Role.ADMIN,
    )


@pytest.fixture
def operator_api_client():
    return authenticate_client(
        username="devices-operator",
        role=AccountProfile.Role.OPERATOR,
    )


@pytest.fixture
def researcher_api_client():
    return authenticate_client(
        username="devices-researcher",
        role=AccountProfile.Role.RESEARCHER,
    )


def valid_payload():
    return {
        "device_id": "H2S-TPA-001",
        "ppm": 12.45,
        "adc": 850,
        "filtered_adc": 848.3,
        "level": 3,
        "status": "WARNING",
        "uptime_ms": 120000,
        "simulated": True,
    }


# Device model


@pytest.mark.django_db
def test_device_can_be_created():
    device = Device.objects.create(
        device_code="H2S-TPA-001",
        name="H2S Simulator",
        location="Wokwi",
    )

    assert device.pk is not None
    assert (
        device.device_code
        == "H2S-TPA-001"
    )
    assert device.is_active is True


@pytest.mark.django_db
def test_device_code_must_be_unique():
    Device.objects.create(
        device_code="H2S-TPA-001",
    )

    with pytest.raises(
        IntegrityError
    ):
        Device.objects.create(
            device_code="H2S-TPA-001",
        )


# Device API


@pytest.mark.django_db
def test_admin_can_create_device(
    admin_api_client,
):
    response = admin_api_client.post(
        "/api/v1/devices/",
        {
            "device_code": "H2S-ADMIN-001",
            "name": "Sensor Admin",
            "location": "Zona A",
        },
        format="json",
    )

    assert response.status_code == 201

    data = response.json()

    assert (
        data["device_code"]
        == "H2S-ADMIN-001"
    )
    assert data["is_active"] is True


@pytest.mark.django_db
def test_operator_can_create_device(
    operator_api_client,
):
    response = operator_api_client.post(
        "/api/v1/devices/",
        {
            "device_code": "H2S-OPERATOR-001",
            "name": "Sensor Operator",
            "location": "Zona B",
        },
        format="json",
    )

    assert response.status_code == 201

    assert Device.objects.filter(
        device_code="H2S-OPERATOR-001"
    ).exists()


@pytest.mark.django_db
def test_operator_can_update_device(
    operator_api_client,
):
    device = Device.objects.create(
        device_code="H2S-UPDATE-001",
        name="Sensor Lama",
        location="Zona Lama",
    )

    response = operator_api_client.patch(
        f"/api/v1/devices/{device.pk}/",
        {
            "name": "Sensor Baru",
            "location": "Zona Baru",
        },
        format="json",
    )

    assert response.status_code == 200

    device.refresh_from_db()

    assert (
        device.name
        == "Sensor Baru"
    )
    assert (
        device.location
        == "Zona Baru"
    )


@pytest.mark.django_db
def test_operator_can_deactivate_device(
    operator_api_client,
):
    device = Device.objects.create(
        device_code="H2S-DEACTIVATE-001",
        is_active=True,
    )

    response = operator_api_client.patch(
        f"/api/v1/devices/{device.pk}/",
        {
            "is_active": False,
        },
        format="json",
    )

    assert response.status_code == 200

    device.refresh_from_db()

    assert device.is_active is False


@pytest.mark.django_db
def test_device_code_cannot_be_changed(
    operator_api_client,
):
    device = Device.objects.create(
        device_code="H2S-IMMUTABLE-001",
    )

    response = operator_api_client.patch(
        f"/api/v1/devices/{device.pk}/",
        {
            "device_code": (
                "H2S-IMMUTABLE-999"
            ),
        },
        format="json",
    )

    assert response.status_code == 400

    device.refresh_from_db()

    assert (
        device.device_code
        == "H2S-IMMUTABLE-001"
    )


@pytest.mark.django_db
def test_researcher_can_read_devices(
    researcher_api_client,
):
    Device.objects.create(
        device_code="H2S-RESEARCH-001",
    )

    response = researcher_api_client.get(
        "/api/v1/devices/"
    )

    assert response.status_code == 200


@pytest.mark.django_db
def test_researcher_cannot_create_device(
    researcher_api_client,
):
    response = researcher_api_client.post(
        "/api/v1/devices/",
        {
            "device_code": "H2S-DENIED-001",
        },
        format="json",
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_researcher_cannot_update_device(
    researcher_api_client,
):
    device = Device.objects.create(
        device_code="H2S-DENIED-002",
    )

    response = researcher_api_client.patch(
        f"/api/v1/devices/{device.pk}/",
        {
            "name": "Tidak Boleh",
        },
        format="json",
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_worker_cannot_access_devices():
    worker = Worker.objects.create(
        code="PML-DEVICE-DENIED",
        name="Worker Device Test",
        age=40,
    )

    user = User.objects.create_user(
        username="devices-worker",
        password="StrongPass123!",
    )

    AccountProfile.objects.create(
        user=user,
        role=AccountProfile.Role.WORKER,
        worker=worker,
    )

    token = Token.objects.create(
        user=user,
    )

    client = APIClient()

    client.credentials(
        HTTP_AUTHORIZATION=(
            f"Token {token.key}"
        )
    )

    response = client.get(
        "/api/v1/devices/"
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_delete_device_is_not_allowed(
    operator_api_client,
):
    device = Device.objects.create(
        device_code="H2S-NO-DELETE-001",
    )

    response = operator_api_client.delete(
        f"/api/v1/devices/{device.pk}/"
    )

    assert response.status_code == 405


# H2S reading model


@pytest.mark.django_db
def test_h2s_reading_can_be_stored():
    device = Device.objects.create(
        device_code="H2S-TPA-001",
    )

    reading = H2SReading.objects.create(
        device=device,
        ppm=12.45,
        adc=850,
        filtered_adc=848.3,
        level=3,
        status="WARNING",
        uptime_ms=120000,
        simulated=True,
    )

    assert reading.pk is not None
    assert reading.device == device
    assert reading.ppm == 12.45
    assert reading.adc == 850
    assert (
        reading.filtered_adc
        == 848.3
    )
    assert reading.level == 3
    assert (
        reading.status
        == "WARNING"
    )
    assert (
        reading.uptime_ms
        == 120000
    )
    assert reading.simulated is True
    assert (
        reading.received_at
        is not None
    )


@pytest.mark.django_db
def test_device_readings_relationship():
    device = Device.objects.create(
        device_code="H2S-TPA-001",
    )

    H2SReading.objects.create(
        device=device,
        ppm=1.0,
        adc=100,
        filtered_adc=100.0,
        level=1,
        status="NORMAL",
        uptime_ms=1000,
        simulated=True,
    )

    H2SReading.objects.create(
        device=device,
        ppm=2.0,
        adc=200,
        filtered_adc=200.0,
        level=2,
        status="WARNING",
        uptime_ms=2000,
        simulated=True,
    )

    assert (
        device.readings.count()
        == 2
    )


# Telemetry validation


def test_valid_telemetry_payload():
    data = validate_telemetry_payload(
        valid_payload()
    )

    assert (
        data.device_id
        == "H2S-TPA-001"
    )
    assert data.ppm == 12.45
    assert data.adc == 850
    assert data.simulated is True


def test_missing_telemetry_field_is_rejected():
    payload = valid_payload()

    del payload["ppm"]

    with pytest.raises(
        TelemetryValidationError,
        match="Missing required field",
    ):
        validate_telemetry_payload(
            payload
        )


def test_negative_ppm_is_rejected():
    payload = valid_payload()
    payload["ppm"] = -1

    with pytest.raises(
        TelemetryValidationError,
        match="ppm cannot be negative",
    ):
        validate_telemetry_payload(
            payload
        )


def test_adc_out_of_range_is_rejected():
    payload = valid_payload()
    payload["adc"] = 5000

    with pytest.raises(
        TelemetryValidationError,
        match="adc must be between",
    ):
        validate_telemetry_payload(
            payload
        )


def test_simulated_must_be_boolean():
    payload = valid_payload()
    payload["simulated"] = "true"

    with pytest.raises(
        TelemetryValidationError,
        match="simulated must be boolean",
    ):
        validate_telemetry_payload(
            payload
        )


# MQTT ingestion


@pytest.mark.django_db
def test_valid_mqtt_payload_is_stored():
    reading = ingest_mqtt_message(
        topic="test/topic",
        raw_payload=json.dumps(
            valid_payload()
        ),
    )

    assert reading is not None
    assert (
        H2SReading.objects.count()
        == 1
    )
    assert (
        Device.objects.count()
        == 1
    )

    saved = H2SReading.objects.get()

    assert saved.ppm == 12.45
    assert (
        saved.device.device_code
        == "H2S-TPA-001"
    )


@pytest.mark.django_db
def test_invalid_json_is_not_stored():
    reading = ingest_mqtt_message(
        topic="test/topic",
        raw_payload="{invalid-json}",
    )

    assert reading is None
    assert (
        H2SReading.objects.count()
        == 0
    )


@pytest.mark.django_db
def test_invalid_payload_is_not_stored():
    payload = valid_payload()
    del payload["ppm"]

    reading = ingest_mqtt_message(
        topic="test/topic",
        raw_payload=json.dumps(
            payload
        ),
    )

    assert reading is None
    assert (
        H2SReading.objects.count()
        == 0
    )


@pytest.mark.django_db
def test_existing_device_is_reused():
    Device.objects.create(
        device_code="H2S-TPA-001",
    )

    ingest_mqtt_message(
        topic="test/topic",
        raw_payload=json.dumps(
            valid_payload()
        ),
    )

    assert (
        Device.objects.count()
        == 1
    )
    assert (
        H2SReading.objects.count()
        == 1
    )


# Reading API


@pytest.mark.django_db
def test_latest_reading_api(
    researcher_api_client,
):
    device = Device.objects.create(
        device_code="H2S-TPA-001",
    )

    H2SReading.objects.create(
        device=device,
        ppm=12.45,
        adc=850,
        filtered_adc=848.3,
        level=3,
        status="WARNING",
        uptime_ms=120000,
        simulated=True,
    )

    response = researcher_api_client.get(
        "/api/v1/readings/latest/"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["ppm"] == 12.45
    assert (
        data["status"]
        == "WARNING"
    )
    assert data["simulated"] is True


@pytest.mark.django_db
def test_reading_list_is_paginated(
    researcher_api_client,
):
    device = Device.objects.create(
        device_code="H2S-TPA-001",
    )

    for index in range(3):
        H2SReading.objects.create(
            device=device,
            ppm=float(index),
            adc=index,
            filtered_adc=float(index),
            level=0,
            status="NORMAL",
            uptime_ms=index,
            simulated=True,
        )

    response = researcher_api_client.get(
        "/api/v1/readings/"
    )

    assert response.status_code == 200

    data = response.json()

    assert "count" in data
    assert "results" in data
    assert data["count"] == 3
    assert (
        len(data["results"])
        == 3
    )


@pytest.mark.django_db
def test_anonymous_cannot_access_readings(
    client,
):
    response = client.get(
        "/api/v1/readings/"
    )

    assert response.status_code == 401


@pytest.mark.django_db
def test_worker_cannot_access_device_readings():
    worker = Worker.objects.create(
        code="PML-READING-DENIED",
        name="Worker Reading Test",
        age=40,
    )

    user = User.objects.create_user(
        username="reading-worker",
        password="StrongPass123!",
    )

    AccountProfile.objects.create(
        user=user,
        role=AccountProfile.Role.WORKER,
        worker=worker,
    )

    token = Token.objects.create(
        user=user,
    )

    client = APIClient()

    client.credentials(
        HTTP_AUTHORIZATION=(
            f"Token {token.key}"
        )
    )

    response = client.get(
        "/api/v1/readings/"
    )

    assert response.status_code == 403