from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from arkl.models import ARKLResult
from arkl.services.calculator import (
    ARKLCalculationError, calculate_historical_risk,
    calculate_realtime_risk, calculate_realtime_risk_from_reading,
)
from devices.models import Device, H2SReading
from exposure.models import ExposureProfile, Worker


DATA = dict(body_weight=65, exposure_time=8, exposure_frequency=250, exposure_duration=10)


@pytest.fixture
def worker_client(worker_user):
    client = APIClient()
    client.force_authenticate(worker_user)
    return client


@pytest.mark.django_db
def test_worker_can_create_own_pending_profile(worker_client, linked_worker):
    other = Worker.objects.create(code="OTHER", name="Other", age=40)
    response = worker_client.post("/api/v1/me/exposure/", {
        **DATA, "worker": other.pk, "approval_status": "APPROVED",
        "inhalation_rate": 999, "review_note": "self approved",
    }, format="json")
    assert response.status_code == 201, response.data
    profile = ExposureProfile.objects.get(worker=linked_worker)
    assert profile.approval_status == "PENDING"
    assert profile.inhalation_rate == 0.83
    assert profile.review_note == ""
    assert profile.reviewed_by is None
    assert not ExposureProfile.objects.filter(worker=other).exists()
    assert worker_client.post("/api/v1/me/exposure/", DATA, format="json").status_code == 400
    assert ExposureProfile.objects.count() == 1


@pytest.mark.django_db
@pytest.mark.parametrize("changes", [{"exposure_time": 25}, {"exposure_frequency": 366},
                                      {"body_weight": 0}, {"exposure_duration": -1}])
def test_worker_create_validates_values(worker_client, changes):
    response = worker_client.post("/api/v1/me/exposure/", {**DATA, **changes}, format="json")
    assert response.status_code == 400
    assert not ExposureProfile.objects.exists()


@pytest.mark.django_db
@pytest.mark.parametrize("age", [None, 5, 15])
def test_worker_create_requires_supported_age(worker_client, linked_worker, age):
    linked_worker.age = age
    linked_worker.save()
    assert worker_client.post("/api/v1/me/exposure/", DATA, format="json").status_code == 400
    assert not ExposureProfile.objects.exists()


@pytest.mark.django_db
def test_only_staff_can_approve(worker_client, linked_worker, operator_user):
    worker_client.post("/api/v1/me/exposure/", DATA, format="json")
    profile = ExposureProfile.objects.get(worker=linked_worker)
    url = f"/api/v1/exposure-profiles/{profile.pk}/"
    assert worker_client.patch(url, {"approval_status": "APPROVED"}, format="json").status_code == 403
    worker_client.patch("/api/v1/me/exposure/", {"approval_status": "APPROVED"}, format="json")
    profile.refresh_from_db()
    assert profile.approval_status == "PENDING"
    staff = APIClient()
    staff.force_authenticate(operator_user)
    response = staff.patch(url, {"approval_status": "APPROVED"}, format="json")
    assert response.status_code == 200, response.data
    profile.refresh_from_db()
    assert profile.approval_status == "APPROVED"
    assert profile.reviewed_by == operator_user
    assert profile.reviewed_at is not None
    assert worker_client.get("/api/v1/me/exposure/").data["approval_status"] == "APPROVED"


@pytest.mark.django_db
def test_worker_edits_require_new_review(worker_client, linked_worker):
    profile = ExposureProfile.objects.create(worker=linked_worker, inhalation_rate=0.83, **DATA)
    response = worker_client.patch("/api/v1/me/exposure/", {"body_weight": 66}, format="json")
    assert response.status_code == 200
    profile.refresh_from_db()
    assert profile.approval_status == "PENDING"
    assert profile.body_weight == 66
    assert profile.reviewed_at is None


@pytest.mark.django_db
def test_worker_age_change_requires_new_review(worker_client, linked_worker):
    profile = ExposureProfile.objects.create(worker=linked_worker, inhalation_rate=0.83, **DATA)
    assert worker_client.patch("/api/v1/me/profile/", {"age": 41}, format="json").status_code == 200
    profile.refresh_from_db()
    assert profile.approval_status == "PENDING"


@pytest.mark.django_db
def test_staff_can_request_correction_and_worker_resubmit(worker_client, linked_worker, operator_user):
    worker_client.post("/api/v1/me/exposure/", DATA, format="json")
    profile = ExposureProfile.objects.get(worker=linked_worker)
    staff = APIClient()
    staff.force_authenticate(operator_user)
    url = f"/api/v1/exposure-profiles/{profile.pk}/"
    assert staff.patch(url, {"approval_status": "REJECTED"}, format="json").status_code == 400
    assert staff.patch(url, {"approval_status": "REJECTED", "review_note": "Periksa berat badan"}, format="json").status_code == 200
    assert worker_client.get("/api/v1/me/exposure/").data["review_note"] == "Periksa berat badan"
    assert worker_client.patch("/api/v1/me/exposure/", {"body_weight": 66}, format="json").status_code == 200
    profile.refresh_from_db()
    assert profile.approval_status == "PENDING"
    assert profile.review_note == ""
    assert profile.reviewed_by is None


@pytest.mark.django_db
@pytest.mark.parametrize("approval_status", ["REJECTED"])
def test_every_calculation_entry_point_blocks_rejected_profile(linked_worker, approval_status):
    device = Device.objects.create(device_code="REVIEW-DEVICE", name="Review device", is_active=True)
    linked_worker.monitoring_device = device
    linked_worker.save()
    reading = H2SReading.objects.create(device=device, ppm=0.01, adc=1000,
        filtered_adc=995, level=1, status="CAUTION", uptime_ms=1000, simulated=True)
    profile = ExposureProfile.objects.create(worker=linked_worker, inhalation_rate=0.83,
        approval_status=approval_status, **DATA)
    calls = [
        lambda: calculate_realtime_risk(worker=linked_worker, device=device),
        lambda: calculate_realtime_risk_from_reading(worker=linked_worker, reading=reading),
        lambda: calculate_historical_risk(worker=linked_worker, device=device,
            period_start=timezone.now() - timedelta(days=1), period_end=timezone.now()),
    ]
    for call in calls:
        with pytest.raises(ARKLCalculationError, match="correction"):
            call()
    assert not ARKLResult.objects.exists()
    profile.approval_status = "APPROVED"
    profile.save()
    assert calculate_realtime_risk(worker=linked_worker, device=device).pk


@pytest.mark.django_db
def test_researcher_cannot_review(linked_worker, researcher_user):
    profile = ExposureProfile.objects.create(worker=linked_worker, inhalation_rate=0.83, **DATA)
    client = APIClient()
    client.force_authenticate(researcher_user)
    assert client.patch(f"/api/v1/exposure-profiles/{profile.pk}/",
        {"approval_status": "APPROVED"}, format="json").status_code == 403


@pytest.mark.django_db
def test_anonymous_cannot_create_profile():
    assert APIClient().post("/api/v1/me/exposure/", DATA, format="json").status_code in (401, 403)


@pytest.mark.django_db
def test_admin_form_derives_inhalation_rate(linked_worker):
    from exposure.admin import ExposureProfileAdminForm

    form = ExposureProfileAdminForm(data={
        "worker": linked_worker.pk, **DATA,
        "approval_status": "APPROVED", "review_note": "Diperiksa petugas",
    })
    assert form.is_valid(), form.errors
    profile = form.save()
    assert profile.inhalation_rate == 0.83
    assert profile.approval_status == "APPROVED"


def assign_device_with_reading(worker):
    device = Device.objects.create(device_code="SELF-IOT", name="Self IoT", is_active=True)
    worker.monitoring_device = device
    worker.save()
    reading = H2SReading.objects.create(device=device, ppm=0.01, adc=1000,
        filtered_adc=995, level=1, status="CAUTION", uptime_ms=1000, simulated=False)
    return device, reading


@pytest.mark.django_db
def test_save_profile_immediately_calculates_from_assigned_iot(worker_client, linked_worker):
    device, reading = assign_device_with_reading(linked_worker)
    other = Device.objects.create(device_code="UNRELATED", name="Unrelated", is_active=True)
    H2SReading.objects.create(device=other, ppm=999, adc=1000,
        filtered_adc=995, level=1, status="CAUTION", uptime_ms=1000, simulated=False)
    response = worker_client.post("/api/v1/me/exposure/", DATA, format="json")
    assert response.status_code == 201, response.data
    assert response.data["calculation_status"] == "CALCULATED"
    assert response.data["approval_status"] == "PENDING"
    result = ARKLResult.objects.get(worker=linked_worker)
    assert result.reading_id == reading.pk
    assert result.concentration_ppm == Decimal(str(reading.ppm))
    assert result.exposure_profile_verified is False
    assert result.source_simulated is False
    assert worker_client.get("/api/v1/me/arkl-results/").data[0]["exposure_profile_verified"] is False


@pytest.mark.django_db
def test_acc_creates_verified_snapshot_without_rewriting_provisional_history(worker_client, linked_worker, operator_user):
    _, reading = assign_device_with_reading(linked_worker)
    worker_client.post("/api/v1/me/exposure/", DATA, format="json")
    first = ARKLResult.objects.get(worker=linked_worker)
    profile = ExposureProfile.objects.get(worker=linked_worker)
    staff = APIClient()
    staff.force_authenticate(operator_user)
    url = f"/api/v1/exposure-profiles/{profile.pk}/"
    response = staff.patch(url, {"approval_status": "APPROVED"}, format="json")
    assert response.status_code == 200, response.data
    last = ARKLResult.objects.filter(worker=linked_worker).latest("id")
    assert last.pk != first.pk
    assert last.reading_id == reading.pk
    assert last.exposure_profile_verified is True
    assert last.rq == first.rq
    first.refresh_from_db()
    assert first.exposure_profile_verified is False
    # Repeated ACC for the same profile/reading does not create a duplicate.
    staff.patch(url, {"approval_status": "APPROVED"}, format="json")
    assert ARKLResult.objects.filter(worker=linked_worker).count() == 2


@pytest.mark.django_db
def test_worker_edit_recalculates_immediately_and_resets_verification(worker_client, linked_worker, operator_user):
    _, reading = assign_device_with_reading(linked_worker)
    worker_client.post("/api/v1/me/exposure/", DATA, format="json")
    profile = ExposureProfile.objects.get(worker=linked_worker)
    staff = APIClient()
    staff.force_authenticate(operator_user)
    staff.patch(f"/api/v1/exposure-profiles/{profile.pk}/", {"approval_status": "APPROVED"}, format="json")
    response = worker_client.patch("/api/v1/me/exposure/", {"body_weight": 66}, format="json")
    assert response.status_code == 200
    assert response.data["calculation_status"] == "CALCULATED"
    result = ARKLResult.objects.filter(worker=linked_worker).latest("id")
    assert result.reading_id == reading.pk
    assert result.body_weight == 66
    assert result.exposure_profile_verified is False
    assert response.data["approval_status"] == "PENDING"


@pytest.mark.django_db
@pytest.mark.parametrize("assigned", [True, False])
def test_profile_saved_without_fabricating_missing_iot_data(worker_client, linked_worker, assigned):
    if assigned:
        linked_worker.monitoring_device = Device.objects.create(device_code="EMPTY", name="Empty")
        linked_worker.save()
    response = worker_client.post("/api/v1/me/exposure/", DATA, format="json")
    assert response.status_code == 201, response.data
    assert response.data["calculation_status"] == ("NO_IOT_READING" if assigned else "DEVICE_UNASSIGNED")
    assert ExposureProfile.objects.filter(worker=linked_worker).exists()
    assert not ARKLResult.objects.exists()


@pytest.mark.django_db
def test_assigning_device_after_profile_immediately_creates_result(worker_client, linked_worker, operator_user):
    from exposure.serializers import WorkerSerializer

    worker_client.post("/api/v1/me/exposure/", DATA, format="json")
    device, reading = assign_device_with_reading(linked_worker)
    linked_worker.monitoring_device = None
    linked_worker.save()
    serializer = WorkerSerializer(linked_worker, data={"monitoring_device": device.pk}, partial=True)
    assert serializer.is_valid(), serializer.errors
    serializer.save()
    assert ARKLResult.objects.get(worker=linked_worker).reading_id == reading.pk


@pytest.mark.django_db
def test_pending_profile_can_use_every_calculator_entry_point(linked_worker):
    device, reading = assign_device_with_reading(linked_worker)
    ExposureProfile.objects.create(worker=linked_worker, inhalation_rate=0.83,
        approval_status="PENDING", **DATA)
    results = [
        calculate_realtime_risk(worker=linked_worker, device=device),
        calculate_realtime_risk_from_reading(worker=linked_worker, reading=reading),
        calculate_historical_risk(worker=linked_worker, device=device,
            period_start=timezone.now() - timedelta(days=1), period_end=timezone.now()),
    ]
    assert all(result.exposure_profile_verified is False for result in results)
