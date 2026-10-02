import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from accounts.models import AccountProfile
from devices.models import Device
from exposure.models import (
    ExposureProfile,
    Worker,
)
from exposure.services.inhalation import (
    UnsupportedInhalationMethodologyError,
    resolve_inhalation_methodology,
)
from exposure.services.validation import (
    ExposureValidationError,
    validate_exposure_data,
)


User = get_user_model()


# ============================================================
# Helpers
# ============================================================


def authenticate_client(
    *,
    username,
    role,
    worker=None,
):
    user = User.objects.create_user(
        username=username,
        password="StrongPass123!",
    )

    AccountProfile.objects.create(
        user=user,
        role=role,
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

    return client


@pytest.fixture
def operator_api_client():
    return authenticate_client(
        username="exposure-operator",
        role=AccountProfile.Role.OPERATOR,
    )


def create_adult_worker(
    *,
    code="PML-ADULT-001",
    name="Ahmad",
    age=40,
):
    return Worker.objects.create(
        code=code,
        name=name,
        age=age,
    )


def create_child_worker(
    *,
    code="PML-CHILD-001",
    name="Budi",
    age=10,
):
    return Worker.objects.create(
        code=code,
        name=name,
        age=age,
    )


def create_exposure_profile(
    *,
    worker,
    body_weight=55,
    exposure_time=8,
    exposure_frequency=250,
    exposure_duration=10,
):
    methodology = (
        resolve_inhalation_methodology(
            worker.age
        )
    )

    return ExposureProfile.objects.create(
        worker=worker,
        body_weight=body_weight,
        exposure_time=exposure_time,
        exposure_frequency=(
            exposure_frequency
        ),
        exposure_duration=(
            exposure_duration
        ),
        inhalation_rate=float(
            methodology.inhalation_rate
        ),
    )


# ============================================================
# Worker model
# ============================================================


@pytest.mark.django_db
def test_worker_can_be_created():
    worker = Worker.objects.create(
        code="PML-001",
    )

    assert worker.pk is not None
    assert worker.code == "PML-001"
    assert worker.name is None
    assert worker.age is None
    assert worker.is_active is True


@pytest.mark.django_db
def test_worker_identity_can_be_stored():
    worker = Worker.objects.create(
        code="PML-IDENTITY-001",
        name="Sudirman",
        age=45,
    )

    assert worker.name == "Sudirman"
    assert worker.age == 45

    assert (
        str(worker)
        == "PML-IDENTITY-001 - Sudirman"
    )


@pytest.mark.django_db
def test_worker_code_must_be_unique():
    Worker.objects.create(
        code="PML-001",
    )

    with pytest.raises(
        IntegrityError
    ):
        Worker.objects.create(
            code="PML-001",
        )


@pytest.mark.django_db
def test_worker_model_rejects_invalid_age():
    worker = Worker(
        code="PML-INVALID-AGE",
        name="Ahmad",
        age=0,
    )

    with pytest.raises(
        ValidationError
    ):
        worker.full_clean()


# ============================================================
# Inhalation methodology
# ============================================================


def test_child_inhalation_methodology():
    methodology = (
        resolve_inhalation_methodology(
            10
        )
    )

    assert (
        methodology.category
        == "CHILD_6_12"
    )

    assert (
        float(
            methodology.inhalation_rate
        )
        == 0.50
    )


def test_adult_inhalation_methodology():
    methodology = (
        resolve_inhalation_methodology(
            40
        )
    )

    assert (
        methodology.category
        == "ADULT"
    )

    assert (
        float(
            methodology.inhalation_rate
        )
        == 0.83
    )


@pytest.mark.parametrize(
    "age",
    [
        1,
        5,
        13,
        15,
        17,
    ],
)
def test_unsupported_age_methodology_is_rejected(
    age,
):
    with pytest.raises(
        UnsupportedInhalationMethodologyError
    ):
        resolve_inhalation_methodology(
            age
        )


# ============================================================
# Exposure model
# ============================================================


@pytest.mark.django_db
def test_exposure_profile_can_be_created():
    worker = create_adult_worker(
        code="PML-EXP-MODEL"
    )

    profile = create_exposure_profile(
        worker=worker
    )

    assert profile.pk is not None
    assert profile.worker == worker

    assert (
        profile.body_weight
        == 55
    )

    assert (
        profile.exposure_time
        == 8
    )

    assert (
        profile.exposure_frequency
        == 250
    )

    assert (
        profile.exposure_duration
        == 10
    )

    assert (
        profile.inhalation_rate
        == 0.83
    )


@pytest.mark.django_db
def test_child_exposure_profile_uses_child_rate():
    worker = create_child_worker(
        code="PML-CHILD-MODEL"
    )

    profile = create_exposure_profile(
        worker=worker,
        body_weight=30,
    )

    assert (
        profile.inhalation_rate
        == 0.50
    )


@pytest.mark.django_db
def test_worker_has_one_exposure_profile():
    worker = create_adult_worker(
        code="PML-ONE-PROFILE"
    )

    create_exposure_profile(
        worker=worker
    )

    assert (
        worker
        .exposure_profile
        .body_weight
        == 55
    )


@pytest.mark.django_db
def test_worker_cannot_have_duplicate_exposure_profile():
    worker = create_adult_worker(
        code="PML-DUP-PROFILE"
    )

    create_exposure_profile(
        worker=worker
    )

    with pytest.raises(
        IntegrityError
    ):
        ExposureProfile.objects.create(
            worker=worker,
            body_weight=60,
            exposure_time=8,
            exposure_frequency=250,
            exposure_duration=10,
            inhalation_rate=0.83,
        )


@pytest.mark.django_db
def test_model_validation_rejects_negative_body_weight():
    worker = create_adult_worker(
        code="PML-WEIGHT-MODEL"
    )

    profile = ExposureProfile(
        worker=worker,
        body_weight=-10,
        exposure_time=8,
        exposure_frequency=250,
        exposure_duration=10,
        inhalation_rate=0.83,
    )

    with pytest.raises(
        ValidationError
    ):
        profile.full_clean()


@pytest.mark.django_db
def test_model_validation_rejects_exposure_time_above_24():
    worker = create_adult_worker(
        code="PML-TIME-MODEL"
    )

    profile = ExposureProfile(
        worker=worker,
        body_weight=55,
        exposure_time=25,
        exposure_frequency=250,
        exposure_duration=10,
        inhalation_rate=0.83,
    )

    with pytest.raises(
        ValidationError
    ):
        profile.full_clean()


@pytest.mark.django_db
def test_model_validation_rejects_frequency_above_365():
    worker = create_adult_worker(
        code="PML-FREQ-MODEL"
    )

    profile = ExposureProfile(
        worker=worker,
        body_weight=55,
        exposure_time=8,
        exposure_frequency=366,
        exposure_duration=10,
        inhalation_rate=0.83,
    )

    with pytest.raises(
        ValidationError
    ):
        profile.full_clean()


# ============================================================
# Domain validation
# ============================================================


def test_valid_exposure_data():
    result = validate_exposure_data(
        body_weight=55,
        exposure_time=8,
        exposure_frequency=250,
        exposure_duration=10,
        inhalation_rate=0.83,
    )

    assert result.body_weight == 55.0
    assert result.exposure_time == 8.0

    assert (
        result.exposure_frequency
        == 250.0
    )

    assert (
        result.exposure_duration
        == 10.0
    )

    assert (
        result.inhalation_rate
        == 0.83
    )


def test_body_weight_zero_is_rejected():
    with pytest.raises(
        ExposureValidationError,
        match=(
            "body_weight must be "
            "greater than zero"
        ),
    ):
        validate_exposure_data(
            body_weight=0,
            exposure_time=8,
            exposure_frequency=250,
            exposure_duration=10,
            inhalation_rate=0.83,
        )


def test_zero_exposure_time_is_rejected():
    with pytest.raises(
        ExposureValidationError,
        match=(
            "exposure_time must be "
            "greater than zero"
        ),
    ):
        validate_exposure_data(
            body_weight=55,
            exposure_time=0,
            exposure_frequency=250,
            exposure_duration=10,
            inhalation_rate=0.83,
        )


def test_negative_exposure_time_is_rejected():
    with pytest.raises(
        ExposureValidationError,
        match=(
            "exposure_time must be "
            "greater than zero"
        ),
    ):
        validate_exposure_data(
            body_weight=55,
            exposure_time=-1,
            exposure_frequency=250,
            exposure_duration=10,
            inhalation_rate=0.83,
        )


def test_exposure_time_above_24_is_rejected():
    with pytest.raises(
        ExposureValidationError,
        match=(
            "exposure_time cannot exceed "
            "24 hours/day"
        ),
    ):
        validate_exposure_data(
            body_weight=55,
            exposure_time=25,
            exposure_frequency=250,
            exposure_duration=10,
            inhalation_rate=0.83,
        )


def test_zero_exposure_frequency_is_rejected():
    with pytest.raises(
        ExposureValidationError,
        match=(
            "exposure_frequency must be "
            "greater than zero"
        ),
    ):
        validate_exposure_data(
            body_weight=55,
            exposure_time=8,
            exposure_frequency=0,
            exposure_duration=10,
            inhalation_rate=0.83,
        )


def test_exposure_frequency_above_365_is_rejected():
    with pytest.raises(
        ExposureValidationError,
        match=(
            "exposure_frequency cannot exceed "
            "365 days/year"
        ),
    ):
        validate_exposure_data(
            body_weight=55,
            exposure_time=8,
            exposure_frequency=366,
            exposure_duration=10,
            inhalation_rate=0.83,
        )


def test_zero_exposure_duration_is_rejected():
    with pytest.raises(
        ExposureValidationError,
        match=(
            "exposure_duration must be "
            "greater than zero"
        ),
    ):
        validate_exposure_data(
            body_weight=55,
            exposure_time=8,
            exposure_frequency=250,
            exposure_duration=0,
            inhalation_rate=0.83,
        )


def test_zero_inhalation_rate_is_rejected():
    with pytest.raises(
        ExposureValidationError,
        match=(
            "inhalation_rate must be "
            "greater than zero"
        ),
    ):
        validate_exposure_data(
            body_weight=55,
            exposure_time=8,
            exposure_frequency=250,
            exposure_duration=10,
            inhalation_rate=0,
        )


def test_non_numeric_exposure_value_is_rejected():
    with pytest.raises(
        ExposureValidationError,
        match=(
            "body_weight must be numeric"
        ),
    ):
        validate_exposure_data(
            body_weight="55",
            exposure_time=8,
            exposure_frequency=250,
            exposure_duration=10,
            inhalation_rate=0.83,
        )


# ============================================================
# Worker API
# ============================================================


@pytest.mark.django_db
def test_worker_can_be_created_via_api(
    operator_api_client,
):
    response = operator_api_client.post(
        "/api/v1/workers/",
        {
            "code": "PML-API-001",
            "name": "Ahmad",
            "age": 40,
        },
        format="json",
    )

    assert (
        response.status_code
        == 201
    )

    worker = Worker.objects.get(
        code="PML-API-001"
    )

    assert worker.name == "Ahmad"
    assert worker.age == 40
    assert worker.is_active is True


@pytest.mark.django_db
def test_worker_api_requires_name(
    operator_api_client,
):
    response = operator_api_client.post(
        "/api/v1/workers/",
        {
            "code": "PML-NO-NAME",
            "age": 35,
        },
        format="json",
    )

    assert (
        response.status_code
        == 400
    )


@pytest.mark.django_db
def test_worker_api_requires_age(
    operator_api_client,
):
    response = operator_api_client.post(
        "/api/v1/workers/",
        {
            "code": "PML-NO-AGE",
            "name": "Ahmad",
        },
        format="json",
    )

    assert (
        response.status_code
        == 400
    )


@pytest.mark.django_db
def test_worker_api_rejects_blank_name(
    operator_api_client,
):
    response = operator_api_client.post(
        "/api/v1/workers/",
        {
            "code": "PML-BLANK-NAME",
            "name": "   ",
            "age": 35,
        },
        format="json",
    )

    assert (
        response.status_code
        == 400
    )


@pytest.mark.django_db
def test_worker_api_rejects_invalid_age(
    operator_api_client,
):
    response = operator_api_client.post(
        "/api/v1/workers/",
        {
            "code": "PML-AGE-INVALID",
            "name": "Ahmad",
            "age": 0,
        },
        format="json",
    )

    assert (
        response.status_code
        == 400
    )


@pytest.mark.django_db
def test_worker_api_returns_identity(
    operator_api_client,
):
    worker = create_adult_worker(
        code="PML-DETAIL-001",
        name="Sudirman",
        age=45,
    )

    response = operator_api_client.get(
        f"/api/v1/workers/{worker.pk}/"
    )

    assert (
        response.status_code
        == 200
    )

    data = response.json()

    assert (
        data["code"]
        == "PML-DETAIL-001"
    )

    assert (
        data["name"]
        == "Sudirman"
    )

    assert (
        data["age"]
        == 45
    )


@pytest.mark.django_db
def test_operator_can_update_worker(
    operator_api_client,
):
    worker = create_adult_worker(
        code="PML-UPDATE-001",
        name="Nama Lama",
        age=40,
    )

    response = operator_api_client.patch(
        f"/api/v1/workers/{worker.pk}/",
        {
            "name": "Nama Baru",
            "age": 41,
        },
        format="json",
    )

    assert (
        response.status_code
        == 200
    )

    worker.refresh_from_db()

    assert (
        worker.name
        == "Nama Baru"
    )

    assert (
        worker.age
        == 41
    )


@pytest.mark.django_db
def test_age_change_updates_existing_inhalation_rate(
    operator_api_client,
):
    worker = create_adult_worker(
        code="PML-AGE-SYNC",
        age=40,
    )

    profile = create_exposure_profile(
        worker=worker
    )

    assert (
        profile.inhalation_rate
        == 0.83
    )

    response = operator_api_client.patch(
        f"/api/v1/workers/{worker.pk}/",
        {
            "age": 10,
        },
        format="json",
    )

    assert (
        response.status_code
        == 200
    )

    worker.refresh_from_db()
    profile.refresh_from_db()

    assert (
        worker.age
        == 10
    )

    assert (
        profile.inhalation_rate
        == 0.50
    )


@pytest.mark.django_db
def test_unsupported_age_change_rolls_back(
    operator_api_client,
):
    worker = create_adult_worker(
        code="PML-AGE-ROLLBACK",
        age=40,
    )

    profile = create_exposure_profile(
        worker=worker
    )

    response = operator_api_client.patch(
        f"/api/v1/workers/{worker.pk}/",
        {
            "age": 15,
        },
        format="json",
    )

    assert (
        response.status_code
        == 400
    )

    worker.refresh_from_db()
    profile.refresh_from_db()

    assert (
        worker.age
        == 40
    )

    assert (
        profile.inhalation_rate
        == 0.83
    )


@pytest.mark.django_db
def test_operator_can_deactivate_worker(
    operator_api_client,
):
    worker = create_adult_worker(
        code="PML-DEACTIVATE-001",
        age=40,
    )

    response = operator_api_client.patch(
        f"/api/v1/workers/{worker.pk}/",
        {
            "is_active": False,
        },
        format="json",
    )

    assert (
        response.status_code
        == 200
    )

    worker.refresh_from_db()

    assert (
        worker.is_active
        is False
    )


@pytest.mark.django_db
def test_worker_delete_is_not_allowed(
    operator_api_client,
):
    worker = create_adult_worker(
        code="PML-NO-DELETE"
    )

    response = operator_api_client.delete(
        f"/api/v1/workers/{worker.pk}/"
    )

    assert (
        response.status_code
        == 405
    )


# ============================================================
# Exposure API
# ============================================================


@pytest.mark.django_db
def test_adult_exposure_profile_can_be_created_via_api(
    operator_api_client,
):
    worker = create_adult_worker(
        code="PML-EXP-ADULT",
        name="Ahmad",
        age=40,
    )

    response = operator_api_client.post(
        "/api/v1/exposure-profiles/",
        {
            "worker": worker.pk,
            "body_weight": 55,
            "exposure_time": 8,
            "exposure_frequency": 250,
            "exposure_duration": 10,
        },
        format="json",
    )

    assert (
        response.status_code
        == 201
    )

    data = response.json()

    assert (
        data["worker"]
        == worker.pk
    )

    assert (
        data["worker_code"]
        == "PML-EXP-ADULT"
    )

    assert (
        data["worker_name"]
        == "Ahmad"
    )

    assert (
        float(
            data["inhalation_rate"]
        )
        == 0.83
    )

    assert (
        data["inhalation_category"]
        == "ADULT"
    )

    profile = (
        ExposureProfile.objects.get(
            worker=worker
        )
    )

    assert (
        profile.inhalation_rate
        == 0.83
    )


@pytest.mark.django_db
def test_child_exposure_profile_can_be_created_via_api(
    operator_api_client,
):
    worker = create_child_worker(
        code="PML-EXP-CHILD",
        name="Budi",
        age=10,
    )

    response = operator_api_client.post(
        "/api/v1/exposure-profiles/",
        {
            "worker": worker.pk,
            "body_weight": 30,
            "exposure_time": 4,
            "exposure_frequency": 200,
            "exposure_duration": 2,
        },
        format="json",
    )

    assert (
        response.status_code
        == 201
    )

    data = response.json()

    assert (
        float(
            data["inhalation_rate"]
        )
        == 0.50
    )

    assert (
        data["inhalation_category"]
        == "CHILD_6_12"
    )

    profile = (
        ExposureProfile.objects.get(
            worker=worker
        )
    )

    assert (
        profile.inhalation_rate
        == 0.50
    )


@pytest.mark.django_db
def test_operator_cannot_override_inhalation_rate(
    operator_api_client,
):
    worker = create_adult_worker(
        code="PML-EXP-OVERRIDE",
        age=40,
    )

    response = operator_api_client.post(
        "/api/v1/exposure-profiles/",
        {
            "worker": worker.pk,
            "body_weight": 55,
            "exposure_time": 8,
            "exposure_frequency": 250,
            "exposure_duration": 10,

            # Must be ignored because the field
            # is read-only and methodology-driven.
            "inhalation_rate": 9.99,
        },
        format="json",
    )

    assert (
        response.status_code
        == 201
    )

    profile = (
        ExposureProfile.objects.get(
            worker=worker
        )
    )

    assert (
        profile.inhalation_rate
        == 0.83
    )

    assert (
        float(
            response.json()[
                "inhalation_rate"
            ]
        )
        == 0.83
    )


@pytest.mark.django_db
@pytest.mark.parametrize(
    "age",
    [
        5,
        13,
        15,
        17,
    ],
)
def test_exposure_api_rejects_unsupported_age(
    operator_api_client,
    age,
):
    worker = Worker.objects.create(
        code=f"PML-UNSUPPORTED-{age}",
        name="Pemulung",
        age=age,
    )

    response = operator_api_client.post(
        "/api/v1/exposure-profiles/",
        {
            "worker": worker.pk,
            "body_weight": 40,
            "exposure_time": 8,
            "exposure_frequency": 250,
            "exposure_duration": 5,
        },
        format="json",
    )

    assert (
        response.status_code
        == 400
    )

    assert (
        ExposureProfile.objects.filter(
            worker=worker
        ).exists()
        is False
    )


@pytest.mark.django_db
def test_exposure_profile_can_be_patched(
    operator_api_client,
):
    worker = create_adult_worker(
        code="PML-EXP-PATCH",
        age=40,
    )

    profile = create_exposure_profile(
        worker=worker
    )

    response = operator_api_client.patch(
        (
            "/api/v1/exposure-profiles/"
            f"{profile.pk}/"
        ),
        {
            "body_weight": 60,
        },
        format="json",
    )

    assert (
        response.status_code
        == 200
    )

    profile.refresh_from_db()

    assert (
        profile.body_weight
        == 60
    )

    assert (
        profile.inhalation_rate
        == 0.83
    )


@pytest.mark.django_db
def test_patch_cannot_override_inhalation_rate(
    operator_api_client,
):
    worker = create_child_worker(
        code="PML-PATCH-RATE",
        age=10,
    )

    profile = create_exposure_profile(
        worker=worker,
        body_weight=30,
    )

    response = operator_api_client.patch(
        (
            "/api/v1/exposure-profiles/"
            f"{profile.pk}/"
        ),
        {
            "inhalation_rate": 9.99,
        },
        format="json",
    )

    assert (
        response.status_code
        == 200
    )

    profile.refresh_from_db()

    assert (
        profile.inhalation_rate
        == 0.50
    )


@pytest.mark.django_db
def test_invalid_exposure_returns_400(
    operator_api_client,
):
    worker = create_adult_worker(
        code="PML-EXP-INVALID"
    )

    response = operator_api_client.post(
        "/api/v1/exposure-profiles/",
        {
            "worker": worker.pk,
            "body_weight": -1,
            "exposure_time": 8,
            "exposure_frequency": 250,
            "exposure_duration": 10,
        },
        format="json",
    )

    assert (
        response.status_code
        == 400
    )


@pytest.mark.django_db
def test_exposure_api_rejects_time_above_24(
    operator_api_client,
):
    worker = create_adult_worker(
        code="PML-TIME-API"
    )

    response = operator_api_client.post(
        "/api/v1/exposure-profiles/",
        {
            "worker": worker.pk,
            "body_weight": 55,
            "exposure_time": 25,
            "exposure_frequency": 250,
            "exposure_duration": 10,
        },
        format="json",
    )

    assert (
        response.status_code
        == 400
    )


@pytest.mark.django_db
def test_exposure_api_rejects_frequency_above_365(
    operator_api_client,
):
    worker = create_adult_worker(
        code="PML-FREQ-API"
    )

    response = operator_api_client.post(
        "/api/v1/exposure-profiles/",
        {
            "worker": worker.pk,
            "body_weight": 55,
            "exposure_time": 8,
            "exposure_frequency": 366,
            "exposure_duration": 10,
        },
        format="json",
    )

    assert (
        response.status_code
        == 400
    )


@pytest.mark.django_db
def test_exposure_delete_is_not_allowed(
    operator_api_client,
):
    worker = create_adult_worker(
        code="PML-EXP-NO-DELETE"
    )

    profile = create_exposure_profile(
        worker=worker
    )

    response = operator_api_client.delete(
        (
            "/api/v1/exposure-profiles/"
            f"{profile.pk}/"
        )
    )

    assert (
        response.status_code
        == 405
    )


# ============================================================
# Access control
# ============================================================


@pytest.mark.django_db
def test_anonymous_cannot_access_workers_api(
    client,
):
    response = client.get(
        "/api/v1/workers/"
    )

    assert (
        response.status_code
        == 401
    )


@pytest.mark.django_db
def test_worker_role_cannot_access_workers_admin_api():
    worker = create_adult_worker(
        code="PML-WORKER-ROLE",
        name="Worker Role",
    )

    client = authenticate_client(
        username="exposure-worker",
        role=AccountProfile.Role.WORKER,
        worker=worker,
    )

    response = client.get(
        "/api/v1/workers/"
    )

    assert (
        response.status_code
        == 403
    )


@pytest.mark.django_db
def test_researcher_cannot_access_workers_admin_api():
    client = authenticate_client(
        username="exposure-researcher",
        role=(
            AccountProfile
            .Role
            .RESEARCHER
        ),
    )

    response = client.get(
        "/api/v1/workers/"
    )

    assert (
        response.status_code
        == 403
    )


@pytest.mark.django_db
def test_researcher_cannot_update_worker():
    worker = create_adult_worker(
        code="PML-RESEARCH-DENIED"
    )

    client = authenticate_client(
        username=(
            "exposure-researcher-update"
        ),
        role=(
            AccountProfile
            .Role
            .RESEARCHER
        ),
    )

    response = client.patch(
        f"/api/v1/workers/{worker.pk}/",
        {
            "name": "Tidak Boleh",
        },
        format="json",
    )

    assert (
        response.status_code
        == 403
    )


# ============================================================
# Monitoring assignment
# ============================================================


@pytest.mark.django_db
def test_operator_can_assign_monitoring_device_to_worker(
    operator_api_client,
):
    worker = create_adult_worker(
        code="PML-MONITOR-001"
    )

    device = Device.objects.create(
        device_code="H2S-MONITOR-001",
        name="Sensor Zona A",
        location="Zona A",
        is_active=True,
    )

    response = operator_api_client.patch(
        f"/api/v1/workers/{worker.pk}/",
        {
            "monitoring_device": (
                device.pk
            ),
        },
        format="json",
    )

    assert (
        response.status_code
        == 200
    )

    worker.refresh_from_db()

    assert (
        worker.monitoring_device_id
        == device.pk
    )

    data = response.json()

    assert (
        data["monitoring_device"]
        == device.pk
    )

    assert (
        data["monitoring_device_code"]
        == "H2S-MONITOR-001"
    )

    assert (
        data["monitoring_device_name"]
        == "Sensor Zona A"
    )

    assert (
        data[
            "monitoring_device_location"
        ]
        == "Zona A"
    )


@pytest.mark.django_db
def test_operator_can_remove_monitoring_device(
    operator_api_client,
):
    device = Device.objects.create(
        device_code=(
            "H2S-MONITOR-REMOVE"
        ),
        name="Sensor Zona B",
        location="Zona B",
        is_active=True,
    )

    worker = create_adult_worker(
        code="PML-MONITOR-REMOVE",
        name="Budi",
        age=39,
    )

    worker.monitoring_device = (
        device
    )

    worker.save(
        update_fields=[
            "monitoring_device",
        ]
    )

    response = operator_api_client.patch(
        f"/api/v1/workers/{worker.pk}/",
        {
            "monitoring_device": None,
        },
        format="json",
    )

    assert (
        response.status_code
        == 200
    )

    worker.refresh_from_db()

    assert (
        worker.monitoring_device
        is None
    )

    assert (
        response.json()[
            "monitoring_device"
        ]
        is None
    )


@pytest.mark.django_db
def test_inactive_device_cannot_be_assigned(
    operator_api_client,
):
    worker = create_adult_worker(
        code="PML-MONITOR-INACTIVE",
        name="Sudirman",
        age=44,
    )

    device = Device.objects.create(
        device_code="H2S-INACTIVE-001",
        name="Sensor Tidak Aktif",
        location="Zona C",
        is_active=False,
    )

    response = operator_api_client.patch(
        f"/api/v1/workers/{worker.pk}/",
        {
            "monitoring_device": (
                device.pk
            ),
        },
        format="json",
    )

    assert (
        response.status_code
        == 400
    )

    worker.refresh_from_db()

    assert (
        worker.monitoring_device
        is None
    )