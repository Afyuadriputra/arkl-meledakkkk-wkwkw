from django.contrib.auth import get_user_model
import pytest
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from accounts.models import AccountProfile
from alerts.services.constants import (
    AlertLifecycleStatus,
)
from exposure.models import Worker


User = get_user_model()


# ============================================================
# Fixtures
# ============================================================


@pytest.fixture
def api_client():
    user = User.objects.create_user(
        username="alerts-operator",
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
        HTTP_AUTHORIZATION=(
            f"Token {token.key}"
        )
    )

    return client


# ============================================================
# Helpers
# ============================================================


def _results(response):
    data = response.json()

    if (
        isinstance(data, dict)
        and "results" in data
    ):
        return data["results"]

    return data


def _evaluate(
    api_client,
    arkl_result_id,
):
    return api_client.post(
        "/api/v1/alerts/evaluate/",
        {
            "arkl_result_id": (
                arkl_result_id
            ),
        },
        format="json",
    )


# ============================================================
# Alert read API
# ============================================================


@pytest.mark.django_db
def test_alert_list_api(
    api_client,
    alert,
):
    response = api_client.get(
        "/api/v1/alerts/"
    )

    assert response.status_code == 200

    results = _results(response)

    assert len(results) == 1

    assert results[0]["id"] == alert.id

    assert (
        results[0]["alert_level"]
        == alert.alert_level
    )

    assert (
        results[0]["worker_code"]
        == alert.worker.code
    )

    assert (
        results[0]["device_code"]
        == alert.device.device_code
    )


@pytest.mark.django_db
def test_alert_detail_api(
    api_client,
    alert,
):
    response = api_client.get(
        f"/api/v1/alerts/{alert.id}/"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == alert.id

    assert (
        data["worker_code"]
        == alert.worker.code
    )

    assert (
        data["device_code"]
        == alert.device.device_code
    )

    assert (
        data["reading_id"]
        == alert.reading_id
    )

    assert (
        data["arkl_result_id"]
        == alert.arkl_result_id
    )


@pytest.mark.django_db
def test_alert_detail_not_found(
    api_client,
):
    response = api_client.get(
        "/api/v1/alerts/999999/"
    )

    assert response.status_code == 404


# ============================================================
# Lifecycle API
# ============================================================


@pytest.mark.django_db
def test_acknowledge_alert_api(
    api_client,
    alert,
):
    response = api_client.patch(
        (
            f"/api/v1/alerts/"
            f"{alert.id}/acknowledge/"
        ),
        data={},
        format="json",
    )

    assert response.status_code == 200

    data = response.json()

    assert (
        data["status"]
        == AlertLifecycleStatus.ACKNOWLEDGED
    )

    assert (
        data["acknowledged_at"]
        is not None
    )

    assert data["resolved_at"] is None

    assert (
        data["acknowledged_by"]
        is not None
    )

    assert (
        data[
            "acknowledged_by_username"
        ]
        == "alerts-operator"
    )

    alert.refresh_from_db()

    assert (
        alert.status
        == AlertLifecycleStatus.ACKNOWLEDGED
    )

    assert (
        alert.acknowledged_at
        is not None
    )

    assert (
        alert.acknowledged_by
        is not None
    )

    assert (
        alert.acknowledged_by.username
        == "alerts-operator"
    )

    assert alert.resolved_at is None
    assert alert.resolved_by is None


@pytest.mark.django_db
def test_resolve_alert_api(
    api_client,
    alert,
):
    response = api_client.patch(
        (
            f"/api/v1/alerts/"
            f"{alert.id}/resolve/"
        ),
        data={},
        format="json",
    )

    assert response.status_code == 200

    data = response.json()

    assert (
        data["status"]
        == AlertLifecycleStatus.RESOLVED
    )

    assert data["resolved_at"] is not None

    assert (
        data["resolved_by"]
        is not None
    )

    assert (
        data["resolved_by_username"]
        == "alerts-operator"
    )

    alert.refresh_from_db()

    assert (
        alert.status
        == AlertLifecycleStatus.RESOLVED
    )

    assert (
        alert.resolved_at
        is not None
    )

    assert (
        alert.resolved_by
        is not None
    )

    assert (
        alert.resolved_by.username
        == "alerts-operator"
    )


@pytest.mark.django_db
def test_resolved_alert_cannot_be_acknowledged_via_api(
    api_client,
    alert,
):
    resolve_response = (
        api_client.patch(
            (
                f"/api/v1/alerts/"
                f"{alert.id}/resolve/"
            ),
            data={},
            format="json",
        )
    )

    assert (
        resolve_response.status_code
        == 200
    )

    response = api_client.patch(
        (
            f"/api/v1/alerts/"
            f"{alert.id}/acknowledge/"
        ),
        data={},
        format="json",
    )

    assert response.status_code == 400
    assert "detail" in response.json()


# ============================================================
# Filtering
# ============================================================


@pytest.mark.django_db
def test_alert_list_filter_by_worker_code(
    api_client,
    alert,
):
    response = api_client.get(
        "/api/v1/alerts/",
        {
            "worker_code": (
                alert.worker.code
            ),
        },
    )

    assert response.status_code == 200

    results = _results(response)

    assert len(results) == 1

    assert results[0]["id"] == alert.id

    assert (
        results[0]["worker_code"]
        == alert.worker.code
    )


@pytest.mark.django_db
def test_alert_list_filter_by_device_code(
    api_client,
    alert,
):
    response = api_client.get(
        "/api/v1/alerts/",
        {
            "device_code": (
                alert.device.device_code
            ),
        },
    )

    assert response.status_code == 200

    results = _results(response)

    assert len(results) == 1

    assert results[0]["id"] == alert.id

    assert (
        results[0]["device_code"]
        == alert.device.device_code
    )


@pytest.mark.django_db
def test_alert_list_filter_by_level(
    api_client,
    alert,
):
    response = api_client.get(
        "/api/v1/alerts/",
        {
            "alert_level": (
                alert.alert_level
            ),
        },
    )

    assert response.status_code == 200

    results = _results(response)

    assert len(results) == 1

    assert results[0]["id"] == alert.id

    assert (
        results[0]["alert_level"]
        == alert.alert_level
    )


# ============================================================
# Alert evaluation API
# ============================================================


@pytest.mark.django_db
def test_evaluate_alert_api(
    api_client,
    alert,
):
    arkl_result = alert.arkl_result

    alert.delete()

    response = _evaluate(
        api_client,
        arkl_result.id,
    )

    assert response.status_code == 201

    data = response.json()

    assert data["created"] is True
    assert data["duplicate"] is False
    assert data["escalated"] is False

    alert_data = data["alert"]

    assert alert_data is not None

    assert (
        alert_data["worker_code"]
        == arkl_result.worker.code
    )

    assert (
        alert_data["device_code"]
        == (
            arkl_result
            .reading
            .device
            .device_code
        )
    )

    assert (
        alert_data["reading_id"]
        == arkl_result.reading_id
    )

    assert (
        alert_data["arkl_result_id"]
        == arkl_result.id
    )

    assert (
        alert_data[
            "environmental_status"
        ]
        == arkl_result.reading.status
    )

    assert (
        alert_data[
            "risk_interpretation"
        ]
        == arkl_result.interpretation
    )

    assert (
        alert_data[
            "calculation_version"
        ]
        == arkl_result.calculation_version
    )

    assert (
        alert_data["status"]
        == AlertLifecycleStatus.OPEN
    )


@pytest.mark.django_db
def test_evaluate_duplicate_alert_api(
    api_client,
    alert,
):
    response = _evaluate(
        api_client,
        alert.arkl_result_id,
    )

    assert response.status_code == 200

    data = response.json()

    assert data["created"] is False
    assert data["duplicate"] is True
    assert data["escalated"] is False

    assert data["alert"] is not None

    assert (
        data["alert"]["id"]
        == alert.id
    )

    assert (
        data["alert"]["worker_code"]
        == alert.worker.code
    )

    assert (
        data["alert"]["device_code"]
        == alert.device.device_code
    )


@pytest.mark.django_db
def test_evaluate_invalid_arkl_result_returns_400(
    api_client,
):
    response = _evaluate(
        api_client,
        999999,
    )

    assert response.status_code == 400


# ============================================================
# Permission tests
# ============================================================


@pytest.mark.django_db
def test_anonymous_cannot_access_alerts():
    client = APIClient()

    response = client.get(
        "/api/v1/alerts/"
    )

    assert response.status_code == 401


@pytest.mark.django_db
def test_researcher_can_read_alerts(
    alert,
):
    user = User.objects.create_user(
        username="alerts-researcher",
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
        HTTP_AUTHORIZATION=(
            f"Token {token.key}"
        )
    )

    response = client.get(
        "/api/v1/alerts/"
    )

    assert response.status_code == 200


@pytest.mark.django_db
def test_researcher_cannot_acknowledge_alert(
    alert,
):
    user = User.objects.create_user(
        username=(
            "alerts-researcher-ack"
        ),
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
        HTTP_AUTHORIZATION=(
            f"Token {token.key}"
        )
    )

    response = client.patch(
        (
            f"/api/v1/alerts/"
            f"{alert.id}/acknowledge/"
        ),
        data={},
        format="json",
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_researcher_cannot_resolve_alert(
    alert,
):
    user = User.objects.create_user(
        username=(
            "alerts-researcher-resolve"
        ),
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
        HTTP_AUTHORIZATION=(
            f"Token {token.key}"
        )
    )

    response = client.patch(
        (
            f"/api/v1/alerts/"
            f"{alert.id}/resolve/"
        ),
        data={},
        format="json",
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_researcher_cannot_evaluate_alert(
    alert,
):
    user = User.objects.create_user(
        username=(
            "alerts-researcher-evaluate"
        ),
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
        HTTP_AUTHORIZATION=(
            f"Token {token.key}"
        )
    )

    response = _evaluate(
        client,
        alert.arkl_result_id,
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_worker_cannot_access_generic_alert_api(
    alert,
):
    worker = Worker.objects.create(
        code="PML-ALERT-DENIED",
        name="Worker Alert Test",
        age=40,
    )

    user = User.objects.create_user(
        username="alerts-worker",
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
        "/api/v1/alerts/"
    )

    assert response.status_code == 403