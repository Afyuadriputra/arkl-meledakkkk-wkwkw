from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from accounts.models import AccountProfile
from arkl.models import ARKLResult
from arkl.services.constants import (
    ARKL_CALCULATION_VERSION,
)
from exposure.models import Worker


User = get_user_model()


@pytest.fixture
def api_client():
    user = User.objects.create_user(
        username="research-api-user",
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

    return client

# ============================================================
# H2S SUMMARY
# ============================================================


@pytest.mark.django_db
def test_h2s_summary_api(
    api_client,
    research_readings,
):
    """
    Tanpa filter provenance, endpoint harus mengembalikan
    SEMUA reading: simulated + physical.
    """

    response = api_client.get(
        "/api/v1/research/h2s-summary/"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["sample_count"] == 3

    assert data["minimum_ppm"] == 1.0
    assert data["maximum_ppm"] == 5.0
    assert data["average_ppm"] == 3.0

    assert data["simulated_count"] == 1
    assert data["physical_count"] == 2

    assert data["device_count"] == 1

    assert data["first_reading_at"] is not None
    assert data["last_reading_at"] is not None


@pytest.mark.django_db
def test_h2s_summary_empty_dataset_api(
    api_client,
):
    response = api_client.get(
        "/api/v1/research/h2s-summary/"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["sample_count"] == 0

    assert data["minimum_ppm"] is None
    assert data["maximum_ppm"] is None
    assert data["average_ppm"] is None

    assert data["first_reading_at"] is None
    assert data["last_reading_at"] is None

    assert data["simulated_count"] == 0
    assert data["physical_count"] == 0
    assert data["device_count"] == 0


@pytest.mark.django_db
def test_h2s_summary_simulated_filter_api(
    api_client,
    research_readings,
):
    """
    source_simulated=true hanya mengambil data simulasi.
    """

    response = api_client.get(
        "/api/v1/research/h2s-summary/",
        {
            "source_simulated": "true",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["sample_count"] == 1
    assert data["average_ppm"] == 5.0

    assert data["simulated_count"] == 1
    assert data["physical_count"] == 0


@pytest.mark.django_db
def test_h2s_summary_physical_filter_api(
    api_client,
    research_readings,
):
    """
    source_simulated=false hanya mengambil data sensor fisik.
    """

    response = api_client.get(
        "/api/v1/research/h2s-summary/",
        {
            "source_simulated": "false",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["sample_count"] == 2

    assert data["minimum_ppm"] == 1.0
    assert data["maximum_ppm"] == 3.0
    assert data["average_ppm"] == 2.0

    assert data["simulated_count"] == 0
    assert data["physical_count"] == 2


@pytest.mark.django_db
def test_h2s_summary_device_filter_api(
    api_client,
    research_readings,
    research_device,
):
    response = api_client.get(
        "/api/v1/research/h2s-summary/",
        {
            "device_code": research_device.device_code,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["sample_count"] == 3
    assert data["device_count"] == 1


# ============================================================
# FILTER VALIDATION
# ============================================================


@pytest.mark.django_db
def test_invalid_period_returns_400(
    api_client,
):
    response = api_client.get(
        "/api/v1/research/h2s-summary/",
        {
            "start": "2026-08-20T12:00:00+07:00",
            "end": "2026-08-19T12:00:00+07:00",
        },
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_invalid_datetime_returns_400(
    api_client,
):
    response = api_client.get(
        "/api/v1/research/h2s-summary/",
        {
            "start": "not-a-datetime",
        },
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_invalid_source_simulated_returns_400(
    api_client,
):
    response = api_client.get(
        "/api/v1/research/h2s-summary/",
        {
            "source_simulated": "maybe",
        },
    )

    assert response.status_code == 400


# ============================================================
# H2S TRENDS
# ============================================================


@pytest.mark.django_db
def test_raw_h2s_trend_api(
    api_client,
    research_readings,
):
    """
    Raw trend tanpa provenance filter harus berisi semua reading.
    """

    response = api_client.get(
        "/api/v1/research/h2s-trends/",
        {
            "interval": "raw",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["interval"] == "raw"
    assert len(data["series"]) == 3

    first = data["series"][0]

    assert "timestamp" in first
    assert "ppm" in first
    assert "device_code" in first
    assert "simulated" in first


@pytest.mark.django_db
def test_raw_h2s_trend_simulated_filter_api(
    api_client,
    research_readings,
):
    response = api_client.get(
        "/api/v1/research/h2s-trends/",
        {
            "interval": "raw",
            "source_simulated": "true",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["interval"] == "raw"
    assert len(data["series"]) == 1

    assert data["series"][0]["simulated"] is True
    assert data["series"][0]["ppm"] == 5.0


@pytest.mark.django_db
def test_raw_h2s_trend_physical_filter_api(
    api_client,
    research_readings,
):
    response = api_client.get(
        "/api/v1/research/h2s-trends/",
        {
            "interval": "raw",
            "source_simulated": "false",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["interval"] == "raw"
    assert len(data["series"]) == 2

    assert all(
        point["simulated"] is False
        for point in data["series"]
    )


@pytest.mark.django_db
def test_hourly_h2s_trend_api(
    api_client,
    research_readings,
):
    response = api_client.get(
        "/api/v1/research/h2s-trends/",
        {
            "interval": "hour",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["interval"] == "hour"

    total_samples = sum(
        point["sample_count"]
        for point in data["series"]
    )

    assert total_samples == 3


@pytest.mark.django_db
def test_daily_h2s_trend_api(
    api_client,
    research_readings,
):
    response = api_client.get(
        "/api/v1/research/h2s-trends/",
        {
            "interval": "day",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["interval"] == "day"

    total_samples = sum(
        point["sample_count"]
        for point in data["series"]
    )

    assert total_samples == 3


@pytest.mark.django_db
def test_default_trend_interval_is_day(
    api_client,
    research_readings,
):
    response = api_client.get(
        "/api/v1/research/h2s-trends/"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["interval"] == "day"

    total_samples = sum(
        point["sample_count"]
        for point in data["series"]
    )

    assert total_samples == 3


@pytest.mark.django_db
def test_invalid_trend_interval_returns_400(
    api_client,
):
    response = api_client.get(
        "/api/v1/research/h2s-trends/",
        {
            "interval": "month",
        },
    )

    assert response.status_code == 400

@pytest.mark.django_db
def test_arkl_research_api_defaults_to_current_version(
    api_client,
):
    worker = Worker.objects.create(
        code="PML-ARKL-API-VERSION"
    )

    ARKLResult.objects.create(
        worker=worker,
        calculation_type="REALTIME",
        concentration_ppm=Decimal("10"),
        concentration_mg_m3=Decimal("14"),
        exposure_concentration_mg_m3=None,
        body_weight=Decimal("55"),
        exposure_time=Decimal("8"),
        exposure_frequency=Decimal("250"),
        exposure_duration=Decimal("10"),
        inhalation_rate=Decimal("0.83"),
        averaging_time=Decimal("3650"),
        intake=Decimal("0.01"),
        rfc=Decimal("0.002"),
        rq=Decimal("5"),
        interpretation="ABOVE_REFERENCE_LEVEL",
        calculation_version=ARKL_CALCULATION_VERSION,
        source_simulated=True,
    )

    ARKLResult.objects.create(
        worker=worker,
        calculation_type="REALTIME",
        concentration_ppm=Decimal("10"),
        concentration_mg_m3=Decimal("14"),
        exposure_concentration_mg_m3=Decimal("0.01"),
        body_weight=Decimal("55"),
        exposure_time=Decimal("8"),
        exposure_frequency=Decimal("250"),
        exposure_duration=Decimal("10"),
        inhalation_rate=Decimal("0.83"),
        averaging_time=None,
        intake=None,
        rfc=Decimal("0.002"),
        rq=Decimal("5"),
        interpretation="ABOVE_REFERENCE_LEVEL",
        calculation_version="1.1.0-MVP",
        source_simulated=True,
    )

    response = api_client.get(
        "/api/v1/research/arkl-results/"
    )

    assert response.status_code == 200

    data = response.json()

    assert (
        data["calculation_version"]
        == ARKL_CALCULATION_VERSION
    )

    assert data["count"] == 1

    assert (
        data["results"][0]["calculation_version"]
        == ARKL_CALCULATION_VERSION
    )


@pytest.mark.django_db
def test_arkl_research_api_can_explicitly_request_v1(
    api_client,
):
    worker = Worker.objects.create(
        code="PML-ARKL-API-V1"
    )

    ARKLResult.objects.create(
        worker=worker,
        calculation_type="REALTIME",
        concentration_ppm=Decimal("10"),
        concentration_mg_m3=Decimal("14"),
        exposure_concentration_mg_m3=Decimal("0.01"),
        body_weight=Decimal("55"),
        exposure_time=Decimal("8"),
        exposure_frequency=Decimal("250"),
        exposure_duration=Decimal("10"),
        inhalation_rate=Decimal("0.83"),
        averaging_time=None,
        intake=None,
        rfc=Decimal("0.002"),
        rq=Decimal("1"),
        interpretation="WITHIN_REFERENCE_LEVEL",
        calculation_version="1.1.0-MVP",
        source_simulated=True,
    )

    response = api_client.get(
        "/api/v1/research/arkl-results/",
        {
            "calculation_version": "1.1.0-MVP",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["count"] == 1

    assert (
        data["calculation_version"]
        == "1.1.0-MVP"
    )

    assert (
        data["results"][0]["calculation_version"]
        == "1.1.0-MVP"
    )


@pytest.mark.django_db
def test_arkl_research_api_does_not_mix_versions(
    api_client,
):
    worker = Worker.objects.create(
        code="PML-ARKL-NO-MIX"
    )

    for version in [
        "1.1.0-MVP",
        ARKL_CALCULATION_VERSION,
    ]:
        ARKLResult.objects.create(
            worker=worker,
            calculation_type="REALTIME",
            concentration_ppm=Decimal("10"),
            concentration_mg_m3=Decimal("14"),
            exposure_concentration_mg_m3=None,
            body_weight=Decimal("55"),
            exposure_time=Decimal("8"),
            exposure_frequency=Decimal("250"),
            exposure_duration=Decimal("10"),
            inhalation_rate=Decimal("0.83"),
            averaging_time=Decimal("3650"),
            intake=Decimal("0.01"),
            rfc=Decimal("0.002"),
            rq=Decimal("2"),
            interpretation="ABOVE_REFERENCE_LEVEL",
            calculation_version=version,
            source_simulated=True,
        )

    response = api_client.get(
        "/api/v1/research/arkl-results/"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["count"] == 1

    assert all(
        result["calculation_version"]
        == ARKL_CALCULATION_VERSION
        for result in data["results"]
    )

@pytest.mark.django_db
def test_risk_distribution_api(
    api_client,
):
    response = api_client.get(
        "/api/v1/research/risk-distribution/"
    )

    assert response.status_code == 200

    data = response.json()

    assert "calculation_version" in data
    assert "total_count" in data
    assert "distribution" in data


@pytest.mark.django_db
def test_exposure_summary_api(
    api_client,
):
    response = api_client.get(
        "/api/v1/research/exposure-summary/"
    )

    assert response.status_code == 200

    data = response.json()

    assert "worker_count" in data
    assert "average_body_weight" in data


@pytest.mark.django_db
def test_alert_summary_api(
    api_client,
):
    response = api_client.get(
        "/api/v1/research/alert-summary/"
    )

    assert response.status_code == 200

    data = response.json()

    assert "total_count" in data
    assert "by_level" in data
    assert "by_status" in data

@pytest.mark.django_db
def test_arkl_csv_export_api(
    api_client,
):
    response = api_client.get(
        "/api/v1/research/export/arkl.csv"
    )

    assert response.status_code == 200

    assert (
        response["Content-Type"]
        == "text/csv; charset=utf-8"
    )

    assert (
        "attachment;"
        in response["Content-Disposition"]
    )

    content = response.content.decode(
        "utf-8"
    )

    assert "calculation_version" in content
    assert "worker_code" in content
    assert "rq" in content

@pytest.mark.django_db
def test_arkl_csv_export_defaults_to_current_version(
    api_client,
):
    response = api_client.get(
        "/api/v1/research/export/arkl.csv"
    )

    assert response.status_code == 200

    assert (
        "2_0_0_MVP"
        in response["Content-Disposition"]
    )

@pytest.mark.django_db
def test_research_api_rejects_anonymous():
    client = APIClient()

    response = client.get(
        "/api/v1/research/h2s-summary/"
    )

    assert response.status_code == 401


@pytest.mark.django_db
def test_worker_cannot_access_research_api():
    worker = Worker.objects.create(
        code="PML-RESEARCH-DENIED",
        name="Worker Research Test",
        age=40,
    )

    user = User.objects.create_user(
        username="research-worker",
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
        "/api/v1/research/h2s-summary/"
    )

    assert response.status_code == 403