from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from accounts.models import AccountProfile
from alerts.models import Alert
from alerts.services.constants import (
    AlertLifecycleStatus,
)
from arkl.models import ARKLResult
from devices.models import Device, H2SReading
from exposure.models import (
    ExposureProfile,
    Worker,
)


User = get_user_model()


def create_operator_client():
    user = User.objects.create_user(
        username="feature-operator",
        password="StrongPass123!",
    )

    AccountProfile.objects.create(
        user=user,
        role=AccountProfile.Role.OPERATOR,
    )

    token = Token.objects.create(
        user=user,
    )

    client = APIClient()

    client.credentials(
        HTTP_AUTHORIZATION=f"Token {token.key}"
    )

    return client


def create_worker_client(worker):
    user = User.objects.create_user(
        username=f"worker-{worker.code}",
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
        HTTP_AUTHORIZATION=f"Token {token.key}"
    )

    return client


@pytest.mark.django_db
def test_full_worker_h2s_risk_flow():
    # ========================================================
    # STEP 1 — WORKER + EXPOSURE
    # ========================================================

    worker = Worker.objects.create(
        code="PML-FEATURE-001",
        name="Budi",
        age=41,
        is_active=True,
    )

    exposure = ExposureProfile.objects.create(
        worker=worker,
        body_weight=55,
        exposure_time=8,
        exposure_frequency=250,
        exposure_duration=10,
        inhalation_rate=Decimal("0.83"),
    )

    assert worker.name == "Budi"
    assert worker.age == 41
    assert worker.is_active is True

    assert exposure.body_weight == 55
    assert exposure.exposure_time == 8
    assert exposure.exposure_frequency == 250
    assert exposure.exposure_duration == 10

    # ========================================================
    # STEP 2 — DEVICE ASSIGNMENT + H₂S READING
    # ========================================================

    device = Device.objects.create(
        device_code="H2S-FEATURE-001",
        name="Sensor TPA Muara Fajar",
        location="Zona Pemilahan",
        is_active=True,
    )

    worker.monitoring_device = device
    worker.save(
        update_fields=[
            "monitoring_device",
        ]
    )

    reading = H2SReading.objects.create(
        device=device,
        ppm=25.4,
        adc=1000,
        filtered_adc=1000,
        level=2,
        status="WARNING",
        uptime_ms=1000,
        simulated=True,
    )

    # ========================================================
    # STEP 3 — REALTIME ARKL + AUTOMATIC ALERT
    # ========================================================

    operator_client = (
        create_operator_client()
    )

    response = operator_client.post(
        "/api/v1/arkl/realtime/",
        {
            "worker": worker.pk,
            "device": device.pk,
        },
        format="json",
    )

    assert response.status_code == 201

    payload = response.json()

    assert "arkl_result" in payload
    assert "alert_evaluation" in payload

    arkl_data = payload[
        "arkl_result"
    ]

    alert_evaluation = payload[
        "alert_evaluation"
    ]

    # ========================================================
    # STEP 4 — VERIFY ARKL FORMULA
    # ========================================================

    expected_c = (
        Decimal("25.4")
        * Decimal("1.40")
    )

    expected_tavg = (
        Decimal("10")
        * Decimal("365")
    )

    expected_intake = (
        expected_c
        * Decimal("0.83")
        * Decimal("8")
        * Decimal("250")
        * Decimal("10")
        / (
            Decimal("55")
            * expected_tavg
        )
    )

    expected_rq = (
        expected_intake
        / Decimal("0.002")
    )

    assert (
        Decimal(
            str(
                arkl_data[
                    "concentration_mg_m3"
                ]
            )
        )
        == expected_c
    )

    assert (
        Decimal(
            str(
                arkl_data[
                    "averaging_time"
                ]
            )
        )
        == expected_tavg
    )

    actual_intake = Decimal(
        str(arkl_data["intake"])
    )

    actual_rq = Decimal(
        str(arkl_data["rq"])
    )

    assert (
        abs(
            actual_intake
            - expected_intake
        )
        < Decimal("0.000001")
    )

    assert (
        abs(
            actual_rq
            - expected_rq
        )
        < Decimal("0.01")
    )

    assert (
        arkl_data["interpretation"]
        == "ABOVE_REFERENCE_LEVEL"
    )

    assert (
        arkl_data["calculation_version"]
        == "2.0.0-MVP"
    )

    # ========================================================
    # STEP 5 — ARKL PERSISTENCE
    # ========================================================

    arkl_result = ARKLResult.objects.get(
        pk=arkl_data["id"]
    )

    assert arkl_result.worker == worker
    assert arkl_result.reading == reading
    assert arkl_result.source_simulated is True

    # ========================================================
    # STEP 6 — AUTOMATIC ALERT EVALUATION
    # ========================================================

    assert alert_evaluation["created"] is True
    assert alert_evaluation["duplicate"] is False
    assert alert_evaluation["escalated"] is False

    alert_data = (
        alert_evaluation["alert"]
    )

    assert alert_data is not None

    assert (
        alert_data[
            "environmental_status"
        ]
        == "WARNING"
    )

    assert (
        alert_data[
            "risk_interpretation"
        ]
        == "ABOVE_REFERENCE_LEVEL"
    )

    assert (
        alert_data["alert_level"]
        == "HIGH"
    )

    assert (
        alert_data["risk_status"]
        == "RISK_MANAGEMENT_REQUIRED"
    )

    assert (
        alert_data["status"]
        == AlertLifecycleStatus.OPEN
    )

    assert (
        len(
            alert_data[
                "recommendation_codes"
            ]
        )
        > 0
    )

    # ========================================================
    # STEP 7 — ALERT PERSISTENCE
    # ========================================================

    alert = Alert.objects.get(
        pk=alert_data["id"]
    )

    assert alert.worker == worker
    assert alert.device == device
    assert alert.reading == reading

    assert (
        alert.arkl_result
        == arkl_result
    )

    assert alert.alert_level == "HIGH"

    # ========================================================
    # STEP 8 — WORKER LOGIN
    # ========================================================

    worker_client = (
        create_worker_client(worker)
    )

    # ========================================================
    # STEP 9 — WORKER SEES OWN ARKL
    # ========================================================

    response = worker_client.get(
        "/api/v1/me/arkl-results/"
    )

    assert response.status_code == 200

    data = response.json()

    results = (
        data["results"]
        if isinstance(data, dict)
        and "results" in data
        else data
    )

    assert len(results) == 1

    assert (
        results[0]["id"]
        == arkl_result.id
    )

    # ========================================================
    # STEP 10 — WORKER SEES OWN ALERT
    # ========================================================

    response = worker_client.get(
        "/api/v1/me/alerts/"
    )

    assert response.status_code == 200

    data = response.json()

    results = (
        data["results"]
        if isinstance(data, dict)
        and "results" in data
        else data
    )

    assert len(results) == 1

    assert (
        results[0]["id"]
        == alert.id
    )

    assert (
        results[0]["alert_level"]
        == "HIGH"
    )

    # ========================================================
    # STEP 11 — WORKER DENIED GENERIC ALERT API
    # ========================================================

    response = worker_client.get(
        "/api/v1/alerts/"
    )

    assert response.status_code == 403