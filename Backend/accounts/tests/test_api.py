import pytest
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from accounts.models import AccountProfile
from devices.models import Device, H2SReading
from exposure.models import Worker

from exposure.models import (
    ExposureProfile,
    Worker,
)


@pytest.fixture
def api_client():
    return APIClient()


def authenticate_client(
    client: APIClient,
    user,
):
    token = Token.objects.create(
        user=user,
    )

    client.credentials(
        HTTP_AUTHORIZATION=f"Token {token.key}"
    )

    return client


def create_h2s_reading(
    *,
    device,
    ppm,
    simulated=True,
):
    return H2SReading.objects.create(
        device=device,
        ppm=ppm,
        adc=1000,
        filtered_adc=995.5,
        level=1,
        status="CAUTION",
        uptime_ms=10000,
        simulated=simulated,
    )


# Authentication


@pytest.mark.django_db
def test_login_returns_token(
    api_client,
    operator_user,
):
    response = api_client.post(
        "/api/v1/auth/login/",
        {
            "username": "operator-test",
            "password": "StrongPass123!",
        },
        format="json",
    )

    assert response.status_code == 200

    data = response.json()

    assert "token" in data
    assert (
        data["user"]["role"]
        == AccountProfile.Role.OPERATOR
    )


@pytest.mark.django_db
def test_invalid_login_returns_400(
    api_client,
):
    response = api_client.post(
        "/api/v1/auth/login/",
        {
            "username": "unknown",
            "password": "wrong-password",
        },
        format="json",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_me_requires_authentication(
    api_client,
):
    response = api_client.get(
        "/api/v1/auth/me/"
    )

    assert response.status_code in (
        401,
        403,
    )


@pytest.mark.django_db
def test_worker_me_returns_worker_identity(
    api_client,
    worker_user,
):
    authenticate_client(
        api_client,
        worker_user,
    )

    response = api_client.get(
        "/api/v1/auth/me/"
    )

    assert response.status_code == 200

    data = response.json()

    assert (
        data["role"]
        == AccountProfile.Role.WORKER
    )
    assert (
        data["worker_code"]
        == "PML-AUTH-001"
    )
    assert (
        data["worker_name"]
        == "Worker Test"
    )


@pytest.mark.django_db
def test_logout_deletes_token(
    api_client,
    operator_user,
):
    authenticate_client(
        api_client,
        operator_user,
    )

    response = api_client.post(
        "/api/v1/auth/logout/"
    )

    assert response.status_code == 204

    assert not Token.objects.filter(
        user=operator_user,
    ).exists()


# Account administration


@pytest.mark.django_db
def test_admin_can_create_operator(
    api_client,
    admin_user,
):
    authenticate_client(
        api_client,
        admin_user,
    )

    response = api_client.post(
        "/api/v1/accounts/",
        {
            "username": "new-operator",
            "password": "StrongPass123!",
            "role": "OPERATOR",
        },
        format="json",
    )

    assert response.status_code == 201
    assert (
        response.json()["role"]
        == "OPERATOR"
    )


@pytest.mark.django_db
def test_operator_cannot_create_account(
    api_client,
    operator_user,
):
    authenticate_client(
        api_client,
        operator_user,
    )

    response = api_client.post(
        "/api/v1/accounts/",
        {
            "username": "forbidden-user",
            "password": "StrongPass123!",
            "role": "RESEARCHER",
        },
        format="json",
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_admin_can_create_worker_account(
    api_client,
    admin_user,
):
    worker = Worker.objects.create(
        code="PML-API-WORKER",
        name="Ahmad",
        age=42,
    )

    authenticate_client(
        api_client,
        admin_user,
    )

    response = api_client.post(
        "/api/v1/accounts/",
        {
            "username": "worker-api",
            "password": "StrongPass123!",
            "role": "WORKER",
            "worker_id": worker.id,
        },
        format="json",
    )

    assert response.status_code == 201

    data = response.json()

    assert data["role"] == "WORKER"
    assert data["worker"] == worker.id
    assert (
        data["worker_code"]
        == "PML-API-WORKER"
    )


# Worker monitoring


@pytest.mark.django_db
def test_worker_can_read_assigned_monitoring_device(
    api_client,
    worker_user,
):
    worker = (
        worker_user
        .account_profile
        .worker
    )

    device = Device.objects.create(
        device_code="H2S-WORKER-001",
        name="Sensor Zona A",
        location="Zona A",
        is_active=True,
    )

    worker.monitoring_device = device
    worker.save(
        update_fields=[
            "monitoring_device",
        ]
    )

    reading = create_h2s_reading(
        device=device,
        ppm=15.63,
        simulated=True,
    )

    authenticate_client(
        api_client,
        worker_user,
    )

    response = api_client.get(
        "/api/v1/me/monitoring/"
    )

    assert response.status_code == 200

    data = response.json()

    assert (
        data["device"]["id"]
        == device.pk
    )
    assert (
        data["device"]["device_code"]
        == "H2S-WORKER-001"
    )
    assert (
        data["device"]["location"]
        == "Zona A"
    )
    assert (
        data["reading"]["id"]
        == reading.pk
    )
    assert (
        data["reading"]["ppm"]
        == 15.63
    )
    assert (
        data["reading"]["simulated"]
        is True
    )


@pytest.mark.django_db
def test_worker_monitoring_uses_assigned_device(
    api_client,
    worker_user,
):
    worker = (
        worker_user
        .account_profile
        .worker
    )

    assigned_device = Device.objects.create(
        device_code="H2S-ASSIGNED-001",
        name="Sensor Worker",
        location="Zona Worker",
        is_active=True,
    )

    other_device = Device.objects.create(
        device_code="H2S-OTHER-001",
        name="Sensor Lain",
        location="Zona Lain",
        is_active=True,
    )

    worker.monitoring_device = assigned_device
    worker.save(
        update_fields=[
            "monitoring_device",
        ]
    )

    assigned_reading = create_h2s_reading(
        device=assigned_device,
        ppm=12.5,
    )

    create_h2s_reading(
        device=other_device,
        ppm=500.0,
    )

    authenticate_client(
        api_client,
        worker_user,
    )

    response = api_client.get(
        "/api/v1/me/monitoring/"
    )

    assert response.status_code == 200

    data = response.json()

    assert (
        data["device"]["id"]
        == assigned_device.pk
    )
    assert (
        data["reading"]["id"]
        == assigned_reading.pk
    )
    assert (
        data["reading"]["ppm"]
        == 12.5
    )


@pytest.mark.django_db
def test_worker_monitoring_returns_latest_reading(
    api_client,
    worker_user,
):
    worker = (
        worker_user
        .account_profile
        .worker
    )

    device = Device.objects.create(
        device_code="H2S-LATEST-001",
        name="Sensor Latest",
        location="Zona A",
        is_active=True,
    )

    worker.monitoring_device = device
    worker.save(
        update_fields=[
            "monitoring_device",
        ]
    )

    create_h2s_reading(
        device=device,
        ppm=5.0,
    )

    latest_reading = create_h2s_reading(
        device=device,
        ppm=25.0,
    )

    authenticate_client(
        api_client,
        worker_user,
    )

    response = api_client.get(
        "/api/v1/me/monitoring/"
    )

    assert response.status_code == 200

    data = response.json()

    assert (
        data["reading"]["id"]
        == latest_reading.pk
    )
    assert (
        data["reading"]["ppm"]
        == 25.0
    )


@pytest.mark.django_db
def test_worker_monitoring_returns_404_without_device(
    api_client,
    worker_user,
):
    authenticate_client(
        api_client,
        worker_user,
    )

    response = api_client.get(
        "/api/v1/me/monitoring/"
    )

    assert response.status_code == 404

    assert (
        response.json()["detail"]
        == "Monitoring device not assigned."
    )


@pytest.mark.django_db
def test_worker_monitoring_allows_empty_reading(
    api_client,
    worker_user,
):
    worker = (
        worker_user
        .account_profile
        .worker
    )

    device = Device.objects.create(
        device_code="H2S-NO-DATA-001",
        name="Sensor Baru",
        location="Zona Baru",
        is_active=True,
    )

    worker.monitoring_device = device
    worker.save(
        update_fields=[
            "monitoring_device",
        ]
    )

    authenticate_client(
        api_client,
        worker_user,
    )

    response = api_client.get(
        "/api/v1/me/monitoring/"
    )

    assert response.status_code == 200

    data = response.json()

    assert (
        data["device"]["id"]
        == device.pk
    )
    assert data["reading"] is None


@pytest.mark.django_db
def test_monitoring_requires_authentication(
    api_client,
):
    response = api_client.get(
        "/api/v1/me/monitoring/"
    )

    assert response.status_code in (
        401,
        403,
    )


@pytest.mark.django_db
def test_operator_cannot_access_worker_monitoring(
    api_client,
    operator_user,
):
    authenticate_client(
        api_client,
        operator_user,
    )

    response = api_client.get(
        "/api/v1/me/monitoring/"
    )

    assert response.status_code == 403

# Worker profile inhalation synchronization


@pytest.mark.django_db
def test_worker_age_change_syncs_inhalation_rate(
    api_client,
    worker_user,
):
    worker = (
        worker_user
        .account_profile
        .worker
    )

    worker.age = 40
    worker.save(
        update_fields=[
            "age",
        ]
    )

    exposure = (
        ExposureProfile.objects.create(
            worker=worker,
            body_weight=55,
            exposure_time=8,
            exposure_frequency=250,
            exposure_duration=10,
            inhalation_rate=0.83,
        )
    )

    authenticate_client(
        api_client,
        worker_user,
    )

    response = api_client.patch(
        "/api/v1/me/profile/",
        {
            "age": 10,
        },
        format="json",
    )

    assert response.status_code == 200

    worker.refresh_from_db()
    exposure.refresh_from_db()

    assert worker.age == 10

    assert (
        exposure.inhalation_rate
        == pytest.approx(0.50)
    )


@pytest.mark.django_db
def test_worker_unsupported_age_change_rolls_back(
    api_client,
    worker_user,
):
    worker = (
        worker_user
        .account_profile
        .worker
    )

    worker.age = 40
    worker.save(
        update_fields=[
            "age",
        ]
    )

    exposure = (
        ExposureProfile.objects.create(
            worker=worker,
            body_weight=55,
            exposure_time=8,
            exposure_frequency=250,
            exposure_duration=10,
            inhalation_rate=0.83,
        )
    )

    authenticate_client(
        api_client,
        worker_user,
    )

    response = api_client.patch(
        "/api/v1/me/profile/",
        {
            "age": 15,
        },
        format="json",
    )

    assert response.status_code == 400

    worker.refresh_from_db()
    exposure.refresh_from_db()

    assert worker.age == 40

    assert (
        exposure.inhalation_rate
        == pytest.approx(0.83)
    )

    assert (
        "age"

        in response.json()
    )

@pytest.mark.django_db
def test_worker_exposure_returns_inhalation_methodology(
    api_client,
    worker_user,
):
    worker = (
        worker_user
        .account_profile
        .worker
    )

    worker.age = 40
    worker.save(
        update_fields=[
            "age",
        ]
    )

    ExposureProfile.objects.create(
        worker=worker,
        body_weight=55,
        exposure_time=8,
        exposure_frequency=250,
        exposure_duration=10,
        inhalation_rate=0.83,
    )

    authenticate_client(
        api_client,
        worker_user,
    )

    response = api_client.get(
        "/api/v1/me/exposure/"
    )

    assert response.status_code == 200

    data = response.json()

    assert (
        data["inhalation_rate"]
        == pytest.approx(0.83)
    )

    assert (
        data["inhalation_category"]
        == "ADULT"
    )
