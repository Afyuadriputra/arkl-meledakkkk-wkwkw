from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import AccountProfile
from arkl.models import ARKLResult, ReferenceMeasurement
from arkl.services.calculator import ARKLCalculationError, calculate_realtime_risk
from arkl.services.reference import calculate_reference_risk
from devices.models import Device, H2SReading
from exposure.models import ExposureProfile, Worker

pytestmark = pytest.mark.django_db


@pytest.fixture
def setup_reference():
    worker = Worker.objects.create(code="REF-WORKER", name="Uji", age=40)
    profile = ExposureProfile.objects.create(
        worker=worker,
        body_weight=65,
        exposure_time=8,
        exposure_frequency=250,
        exposure_duration=10,
        inhalation_rate=0.83,
        approval_status="PENDING",
    )
    measurement = ReferenceMeasurement.objects.create(
        concentration_ppm="0.06",
        measured_at=timezone.now() - timedelta(hours=1),
        location="TPA Muara Fajar",
        source="Sensor referensi",
    )
    measurement.workers.add(worker)
    return worker, profile, measurement


def client_for(role, worker=None):
    user = get_user_model().objects.create_user(username=f"ref-{role}")
    AccountProfile.objects.create(user=user, role=role, worker=worker)
    client = APIClient()
    client.force_authenticate(user)
    return client


def test_reference_reuses_same_math_without_iot_or_alerts(setup_reference):
    worker, _, measurement = setup_reference
    result = calculate_reference_risk(worker=worker, measurement=measurement)
    assert result.calculation_type == "REFERENCE"
    assert result.reference_measurement == measurement
    assert result.reading is None
    assert result.concentration_ppm == Decimal("0.06")
    assert result.exposure_profile_verified is False
    assert result.calculation_version
    assert H2SReading.objects.count() == 0
    from alerts.models import Alert

    assert Alert.objects.count() == 0
    device = Device.objects.create(device_code="REF-COMPARE")
    worker.monitoring_device = device
    worker.save()
    H2SReading.objects.create(
        device=device,
        ppm=0.06,
        adc=10,
        filtered_adc=10,
        level=1,
        status="NORMAL",
        uptime_ms=1,
        simulated=False,
    )
    realtime = calculate_realtime_risk(worker=worker, device=device)
    assert result.rq == realtime.rq
    assert result.intake == realtime.intake


def test_reference_is_idempotent_and_new_profile_preserves_history(setup_reference):
    worker, profile, measurement = setup_reference
    first = calculate_reference_risk(worker=worker, measurement=measurement)
    assert (
        calculate_reference_risk(worker=worker, measurement=measurement).pk == first.pk
    )
    profile.body_weight = 70
    profile.approval_status = "APPROVED"
    profile.save()
    second = calculate_reference_risk(worker=worker, measurement=measurement)
    first.refresh_from_db()
    assert second.pk != first.pk
    assert first.exposure_profile_verified is False
    assert first.body_weight == Decimal("65")
    assert second.exposure_profile_verified is True
    assert second.body_weight == Decimal("70")
    from django.core.exceptions import ValidationError

    measurement.concentration_ppm = Decimal("0.09")
    with pytest.raises(ValidationError):
        measurement.save()
    measurement.refresh_from_db()
    assert measurement.concentration_ppm == Decimal("0.06")


@pytest.mark.parametrize(
    "problem", ["location", "scope", "future", "rejected", "inactive"]
)
def test_reference_prerequisites(setup_reference, problem):
    worker, profile, measurement = setup_reference
    if problem == "location":
        measurement.location = ""
        measurement.save()
    if problem == "scope":
        measurement.workers.clear()
    if problem == "future":
        measurement.measured_at = timezone.now() + timedelta(days=1)
        measurement.save()
    if problem == "rejected":
        profile.approval_status = "REJECTED"
        profile.save()
    if problem == "inactive":
        worker.is_active = False
        worker.save()
    with pytest.raises(ARKLCalculationError):
        calculate_reference_risk(worker=worker, measurement=measurement)
    assert ARKLResult.objects.count() == 0


def test_worker_only_sees_own_reference_and_cannot_write(setup_reference):
    worker, _, measurement = setup_reference
    result = calculate_reference_risk(worker=worker, measurement=measurement)
    other = Worker.objects.create(code="REF-OTHER", age=40, name="Other")
    client = client_for("WORKER", worker)
    response = client.get("/api/v1/me/arkl-results/")
    assert response.status_code == 200
    assert response.data[0]["reference_measurement"]["location"] == "TPA Muara Fajar"
    assert response.data[0]["id"] == result.pk
    assert "workers" not in response.data[0]["reference_measurement"]
    assert (
        client.post(
            "/api/v1/arkl/reference/",
            {"worker": worker.pk, "measurement": measurement.pk},
            format="json",
        ).status_code
        == 403
    )
    other_client = APIClient()
    other_user = get_user_model().objects.create_user(username="other-ref-user")
    AccountProfile.objects.create(user=other_user, role="WORKER", worker=other)
    other_client.force_authenticate(other_user)
    assert other_client.get("/api/v1/me/arkl-results/").data == []


def test_staff_creates_measurement_calculates_and_freezes_used_record(setup_reference):
    worker, _, _ = setup_reference
    client = client_for("OPERATOR")
    response = client.post(
        "/api/v1/arkl/reference-measurements/",
        {
            "concentration_ppm": "0.06",
            "measured_at": (timezone.now() - timedelta(minutes=30)).isoformat(),
            "location": "TPA Muara Fajar",
            "source": "Alat referensi",
            "workers": [worker.pk],
        },
        format="json",
    )
    assert response.status_code == 201, response.data
    measurement = ReferenceMeasurement.objects.get(pk=response.data["id"])
    assert measurement.created_by == client.handler._force_user
    assert measurement.arkl_results.count() == 1
    url = f"/api/v1/arkl/reference-measurements/{measurement.pk}/"
    assert (
        client.patch(url, {"concentration_ppm": "0.09"}, format="json").status_code
        == 400
    )
    assert client.delete(url).status_code == 405
    measurement.refresh_from_db()
    assert measurement.concentration_ppm == Decimal("0.06")


@pytest.mark.parametrize("role", ["WORKER", "RESEARCHER"])
def test_measurement_writes_deny_non_operational_roles(setup_reference, role):
    worker, _, measurement = setup_reference
    client = client_for(role, worker if role == "WORKER" else None)
    assert (
        client.post(
            "/api/v1/arkl/reference-measurements/", {}, format="json"
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/v1/arkl/reference/",
            {"worker": worker.pk, "measurement": measurement.pk},
            format="json",
        ).status_code
        == 403
    )


def test_later_worker_profile_save_computes_reference_even_without_iot(setup_reference):
    worker, profile, measurement = setup_reference
    profile.delete()
    client = client_for("WORKER", worker)
    response = client.post(
        "/api/v1/me/exposure/",
        {
            "body_weight": 65,
            "exposure_time": 8,
            "exposure_frequency": 250,
            "exposure_duration": 10,
        },
        format="json",
    )
    assert response.status_code == 201, response.data
    assert ARKLResult.objects.get(worker=worker).reference_measurement == measurement
    assert H2SReading.objects.count() == 0
