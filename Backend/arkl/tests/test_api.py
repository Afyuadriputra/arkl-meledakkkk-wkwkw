from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from accounts.models import AccountProfile
from arkl.models import ARKLResult
from devices.models import Device, H2SReading
from exposure.models import ExposureProfile, Worker


User = get_user_model()


# ============================================================
# Authentication fixtures
# ============================================================


@pytest.fixture
def operator_api_client():
    user = User.objects.create_user(
        username="arkl-operator",
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


@pytest.fixture
def researcher_api_client():
    user = User.objects.create_user(
        username="arkl-researcher",
        password="StrongPass123!",
    )

    AccountProfile.objects.create(
        user=user,
        role=AccountProfile.Role.RESEARCHER,
    )

    token = Token.objects.create(
        user=user,
    )

    client = APIClient()

    client.credentials(
        HTTP_AUTHORIZATION=f"Token {token.key}"
    )

    return client


# ============================================================
# Test data helpers
# ============================================================


def create_worker_with_profile(
    code="PML-API-001",
):
    worker = Worker.objects.create(
        code=code,
    )

    ExposureProfile.objects.create(
        worker=worker,
        body_weight=55,
        exposure_time=8,
        exposure_frequency=250,
        exposure_duration=10,
        inhalation_rate=0.83,
    )

    return worker


def create_device_with_reading(
    code="H2S-API-001",
    ppm=10,
    status="NORMAL",
):
    device = Device.objects.create(
        device_code=code,
    )

    reading = H2SReading.objects.create(
        device=device,
        ppm=ppm,
        adc=500,
        filtered_adc=500,
        level=1,
        status=status,
        uptime_ms=1000,
        simulated=True,
    )

    return device, reading


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


def get_realtime_arkl_data(
    response,
):
    payload = response.json()

    assert "arkl_result" in payload
    assert "alert_evaluation" in payload

    return payload["arkl_result"]


# ============================================================
# Realtime ARKL API
# ============================================================


@pytest.mark.django_db
def test_realtime_arkl_api_creates_result(
    operator_api_client,
):
    worker = create_worker_with_profile()

    device, reading = (
        create_device_with_reading()
    )

    assign_monitoring_device(
        worker=worker,
        device=device,
    )

    response = operator_api_client.post(
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

    assert ARKLResult.objects.count() == 1

    result = ARKLResult.objects.get()

    assert result.worker == worker
    assert result.reading == reading
    assert result.calculation_type == "REALTIME"
    assert (
        result.calculation_version
        == "2.0.0-MVP"
    )


@pytest.mark.django_db
def test_realtime_api_ignores_client_calculated_values(
    operator_api_client,
):
    worker = create_worker_with_profile(
        code="PML-CLIENT-CALC",
    )

    device, _ = create_device_with_reading(
        code="H2S-CLIENT-CALC",
        ppm=10,
    )

    assign_monitoring_device(
        worker=worker,
        device=device,
    )

    response = operator_api_client.post(
        "/api/v1/arkl/realtime/",
        {
            "worker": worker.pk,
            "device": device.pk,

            # Values calculated by clients must
            # never override backend calculation.
            "rq": 0,
            "intake": 0,
            "averaging_time": 0,
            "exposure_concentration_mg_m3": (
                999999
            ),
            "interpretation": (
                "WITHIN_REFERENCE_LEVEL"
            ),
            "calculation_version": (
                "CLIENT-FAKE-VERSION"
            ),
        },
        format="json",
    )

    assert response.status_code == 201

    data = get_realtime_arkl_data(
        response
    )

    assert float(data["rq"]) > 0
    assert float(data["intake"]) > 0

    assert (
        float(data["averaging_time"])
        > 0
    )

    assert (
        data[
            "exposure_concentration_mg_m3"
        ]
        is None
    )

    assert (
        data["calculation_version"]
        == "2.0.0-MVP"
    )

    assert (
        data["calculation_version"]
        != "CLIENT-FAKE-VERSION"
    )


@pytest.mark.django_db
def test_realtime_api_without_exposure_profile_returns_400(
    operator_api_client,
):
    worker = Worker.objects.create(
        code="PML-NO-PROFILE-API",
    )

    device, _ = create_device_with_reading(
        code="H2S-NO-PROFILE-API",
    )

    response = operator_api_client.post(
        "/api/v1/arkl/realtime/",
        {
            "worker": worker.pk,
            "device": device.pk,
        },
        format="json",
    )

    assert response.status_code == 400

    assert (
        "exposure profile"
        in response.json()["detail"].lower()
    )


@pytest.mark.django_db
def test_realtime_api_rejects_unassigned_device(
    operator_api_client,
):
    worker = create_worker_with_profile(
        code="PML-NO-DEVICE-ASSIGNMENT",
    )

    device, _ = create_device_with_reading(
        code="H2S-NO-DEVICE-ASSIGNMENT",
    )

    response = operator_api_client.post(
        "/api/v1/arkl/realtime/",
        {
            "worker": worker.pk,
            "device": device.pk,
        },
        format="json",
    )

    assert response.status_code == 400

    assert (
        "assigned monitoring device"
        in response.json()["detail"].lower()
    )


@pytest.mark.django_db
def test_realtime_api_invalid_worker_returns_400(
    operator_api_client,
):
    device, _ = create_device_with_reading(
        code="H2S-BAD-WORKER",
    )

    response = operator_api_client.post(
        "/api/v1/arkl/realtime/",
        {
            "worker": 999999,
            "device": device.pk,
        },
        format="json",
    )

    assert response.status_code == 400
    assert "worker" in response.json()


@pytest.mark.django_db
def test_realtime_api_invalid_device_returns_400(
    operator_api_client,
):
    worker = create_worker_with_profile(
        code="PML-BAD-DEVICE",
    )

    response = operator_api_client.post(
        "/api/v1/arkl/realtime/",
        {
            "worker": worker.pk,
            "device": 999999,
        },
        format="json",
    )

    assert response.status_code == 400
    assert "device" in response.json()


# ============================================================
# Historical ARKL API
# ============================================================


@pytest.mark.django_db
def test_historical_arkl_api_creates_result(
    operator_api_client,
):
    worker = create_worker_with_profile(
        code="PML-HIST-API",
    )

    device = Device.objects.create(
        device_code="H2S-HIST-API",
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

    response = operator_api_client.post(
        "/api/v1/arkl/historical/",
        {
            "worker": worker.pk,
            "device": device.pk,
            "start_time": (
                now - timedelta(hours=1)
            ).isoformat(),
            "end_time": now.isoformat(),
        },
        format="json",
    )

    assert response.status_code == 201

    data = response.json()

    assert (
        data["calculation_type"]
        == "HISTORICAL"
    )

    assert data["reading"] is None
    assert data["reading_count"] == 3

    assert (
        float(data["concentration_ppm"])
        == 20.0
    )

    assert (
        float(
            data["concentration_mg_m3"]
        )
        == 28.0
    )

    assert (
        data[
            "exposure_concentration_mg_m3"
        ]
        is None
    )

    assert (
        float(data["averaging_time"])
        > 0
    )

    assert float(data["intake"]) > 0
    assert float(data["rq"]) > 0

    assert (
        data["calculation_version"]
        == "2.0.0-MVP"
    )

    assert data["source_simulated"] is True


@pytest.mark.django_db
def test_historical_api_invalid_period_returns_400(
    operator_api_client,
):
    worker = create_worker_with_profile(
        code="PML-HIST-BAD-PERIOD",
    )

    device = Device.objects.create(
        device_code="H2S-HIST-BAD-PERIOD",
    )

    now = timezone.now()

    response = operator_api_client.post(
        "/api/v1/arkl/historical/",
        {
            "worker": worker.pk,
            "device": device.pk,
            "start_time": now.isoformat(),
            "end_time": now.isoformat(),
        },
        format="json",
    )

    assert response.status_code == 400
    assert "end_time" in response.json()


@pytest.mark.django_db
def test_historical_api_without_readings_returns_400(
    operator_api_client,
):
    worker = create_worker_with_profile(
        code="PML-HIST-EMPTY-API",
    )

    device = Device.objects.create(
        device_code="H2S-HIST-EMPTY-API",
    )

    now = timezone.now()

    response = operator_api_client.post(
        "/api/v1/arkl/historical/",
        {
            "worker": worker.pk,
            "device": device.pk,
            "start_time": (
                now - timedelta(hours=1)
            ).isoformat(),
            "end_time": now.isoformat(),
        },
        format="json",
    )

    assert response.status_code == 400

    assert (
        "no h2s readings"
        in response.json()["detail"].lower()
    )


# ============================================================
# ARKL result API
# ============================================================


@pytest.mark.django_db
def test_arkl_result_list_api(
    operator_api_client,
):
    worker = create_worker_with_profile(
        code="PML-LIST-API",
    )

    device, _ = create_device_with_reading(
        code="H2S-LIST-API",
    )

    assign_monitoring_device(
        worker=worker,
        device=device,
    )

    create_response = (
        operator_api_client.post(
            "/api/v1/arkl/realtime/",
            {
                "worker": worker.pk,
                "device": device.pk,
            },
            format="json",
        )
    )

    assert create_response.status_code == 201

    response = operator_api_client.get(
        "/api/v1/arkl/results/"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["count"] == 1
    assert len(data["results"]) == 1

    result = data["results"][0]

    assert (
        result["calculation_version"]
        == "2.0.0-MVP"
    )

    assert result["intake"] is not None
    assert result["averaging_time"] is not None


@pytest.mark.django_db
def test_arkl_result_detail_api(
    operator_api_client,
):
    worker = create_worker_with_profile(
        code="PML-DETAIL-API",
    )

    device, _ = create_device_with_reading(
        code="H2S-DETAIL-API",
    )

    assign_monitoring_device(
        worker=worker,
        device=device,
    )

    create_response = (
        operator_api_client.post(
            "/api/v1/arkl/realtime/",
            {
                "worker": worker.pk,
                "device": device.pk,
            },
            format="json",
        )
    )

    assert create_response.status_code == 201

    result_id = (
        create_response.json()[
            "arkl_result"
        ]["id"]
    )

    response = operator_api_client.get(
        (
            "/api/v1/arkl/results/"
            f"{result_id}/"
        )
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == result_id

    assert (
        data["calculation_type"]
        == "REALTIME"
    )

    assert (
        data["calculation_version"]
        == "2.0.0-MVP"
    )

    assert (
        data[
            "exposure_concentration_mg_m3"
        ]
        is None
    )

    assert data["intake"] is not None
    assert data["averaging_time"] is not None


@pytest.mark.django_db
def test_arkl_result_filter_by_worker_code(
    operator_api_client,
):
    worker = create_worker_with_profile(
        code="PML-FILTER-001",
    )

    device, _ = create_device_with_reading(
        code="H2S-FILTER-001",
    )

    assign_monitoring_device(
        worker=worker,
        device=device,
    )

    create_response = (
        operator_api_client.post(
            "/api/v1/arkl/realtime/",
            {
                "worker": worker.pk,
                "device": device.pk,
            },
            format="json",
        )
    )

    assert create_response.status_code == 201

    response = operator_api_client.get(
        (
            "/api/v1/arkl/results/"
            "?worker_code=PML-FILTER-001"
        )
    )

    assert response.status_code == 200
    assert response.json()["count"] == 1


@pytest.mark.django_db
def test_arkl_result_filter_by_calculation_type(
    operator_api_client,
):
    worker = create_worker_with_profile(
        code="PML-TYPE-FILTER",
    )

    device, _ = create_device_with_reading(
        code="H2S-TYPE-FILTER",
    )

    assign_monitoring_device(
        worker=worker,
        device=device,
    )

    create_response = (
        operator_api_client.post(
            "/api/v1/arkl/realtime/",
            {
                "worker": worker.pk,
                "device": device.pk,
            },
            format="json",
        )
    )

    assert create_response.status_code == 201

    response = operator_api_client.get(
        (
            "/api/v1/arkl/results/"
            "?calculation_type=REALTIME"
        )
    )

    assert response.status_code == 200
    assert response.json()["count"] == 1


# ============================================================
# Permission tests
# ============================================================


@pytest.mark.django_db
def test_anonymous_cannot_calculate_realtime_arkl(
    client,
):
    response = client.post(
        "/api/v1/arkl/realtime/",
        data={},
        content_type="application/json",
    )

    assert response.status_code == 401


@pytest.mark.django_db
def test_researcher_cannot_calculate_arkl(
    researcher_api_client,
):
    response = researcher_api_client.post(
        "/api/v1/arkl/realtime/",
        {},
        format="json",
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_researcher_can_read_arkl_results(
    operator_api_client,
    researcher_api_client,
):
    worker = create_worker_with_profile(
        code="PML-RESEARCH-READ",
    )

    device, _ = create_device_with_reading(
        code="H2S-RESEARCH-READ",
    )

    assign_monitoring_device(
        worker=worker,
        device=device,
    )

    create_response = (
        operator_api_client.post(
            "/api/v1/arkl/realtime/",
            {
                "worker": worker.pk,
                "device": device.pk,
            },
            format="json",
        )
    )

    assert create_response.status_code == 201

    response = researcher_api_client.get(
        "/api/v1/arkl/results/"
    )

    assert response.status_code == 200
    assert response.json()["count"] == 1


@pytest.mark.django_db
def test_worker_cannot_use_generic_arkl_api():
    worker = Worker.objects.create(
        code="PML-ARKL-WORKER-DENIED",
        name="Worker ARKL",
        age=40,
    )

    user = User.objects.create_user(
        username="arkl-worker",
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

    response = client.get(
        "/api/v1/arkl/results/"
    )

    assert response.status_code == 403