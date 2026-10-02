from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from accounts.models import AccountProfile
from alerts.models import Alert
from alerts.services.constants import (
    AlertLifecycleStatus,
)
from arkl.models import ARKLResult
from devices.models import (
    Device,
    H2SReading,
)
from exposure.models import (
    ExposureProfile,
    Worker,
)
from exposure.services.inhalation import (
    resolve_inhalation_methodology,
)


User = get_user_model()


# ============================================================
# HELPERS
# ============================================================


def make_authenticated_client(
    *,
    username: str,
    role: str,
    worker: Worker | None = None,
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

    return user, client


def make_operator_client(
    username="feature-operator",
):
    return make_authenticated_client(
        username=username,
        role=AccountProfile.Role.OPERATOR,
    )


def make_worker_client(
    worker: Worker,
    username: str,
):
    return make_authenticated_client(
        username=username,
        role=AccountProfile.Role.WORKER,
        worker=worker,
    )


def make_worker_with_exposure(
    *,
    code,
    name,
    age=40,
    body_weight=55,
    exposure_time=8,
    exposure_frequency=250,
    exposure_duration=10,
):
    worker = Worker.objects.create(
        code=code,
        name=name,
        age=age,
        is_active=True,
    )

    methodology = (
        resolve_inhalation_methodology(
            worker.age
        )
    )

    exposure = (
        ExposureProfile.objects.create(
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
    )

    return worker, exposure

def make_device(
    code,
):
    return Device.objects.create(
        device_code=code,
        name=f"Sensor {code}",
        location="TPA Muara Fajar",
        is_active=True,
    )


def make_reading(
    *,
    device,
    ppm,
    status,
    level=1,
    simulated=True,
):
    return H2SReading.objects.create(
        device=device,
        ppm=ppm,
        adc=1000,
        filtered_adc=1000,
        level=level,
        status=status,
        uptime_ms=1000,
        simulated=simulated,
    )


def assign_monitoring_device(
    *,
    worker: Worker,
    device: Device,
) -> None:
    """
    Assign the canonical realtime monitoring
    device to the Worker.

    REALTIME ARKL must only use readings from
    this assigned Device.
    """
    worker.monitoring_device = device

    worker.save(
        update_fields=[
            "monitoring_device",
        ]
    )


def calculate_realtime(
    *,
    client,
    worker,
    device,
):
    """
    Execute the complete realtime application
    flow:

        Worker + assigned Device
        → latest H2SReading
        → ARKL calculation
        → ARKLResult
        → automatic Alert evaluation

    Returns:
        (arkl_result_payload, alert_evaluation)
    """
    assign_monitoring_device(
        worker=worker,
        device=device,
    )

    response = client.post(
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

    assert (
        "alert_evaluation"
        in payload
    )

    return (
        payload["arkl_result"],
        payload["alert_evaluation"],
    )


def response_results(
    response,
):
    data = response.json()

    if (
        isinstance(data, dict)
        and "results" in data
    ):
        return data["results"]

    return data


# ============================================================
# 01–05
# WORKER RISK SCENARIOS
# ============================================================


@pytest.mark.django_db
@pytest.mark.parametrize(
    (
        "scenario_name",
        "ppm",
        "sensor_status",
        "expected_interpretation",
        "expected_alert_level",
    ),
    [
        (
            "Normal",
            Decimal("0.001"),
            "NORMAL",
            "WITHIN_REFERENCE_LEVEL",
            None,
        ),
        (
            "Waspada",
            Decimal("0.001"),
            "CAUTION",
            "WITHIN_REFERENCE_LEVEL",
            "LOW",
        ),
        (
            "Peringatan",
            Decimal("0.001"),
            "WARNING",
            "WITHIN_REFERENCE_LEVEL",
            "MEDIUM",
        ),
        (
            "Bahaya",
            Decimal("25.4"),
            "WARNING",
            "ABOVE_REFERENCE_LEVEL",
            "HIGH",
        ),
        (
            "Kritis",
            Decimal("100"),
            "CRITICAL",
            "ABOVE_REFERENCE_LEVEL",
            "CRITICAL",
        ),
    ],
)
def test_worker_risk_scenarios(
    scenario_name,
    ppm,
    sensor_status,
    expected_interpretation,
    expected_alert_level,
):
    worker, _ = (
        make_worker_with_exposure(
            code=(
                "PML-SCENARIO-"
                f"{scenario_name.upper()}"
            ),
            name=(
                f"Pemulung {scenario_name}"
            ),
        )
    )

    device = make_device(
        code=(
            "H2S-SCENARIO-"
            f"{scenario_name.upper()}"
        )
    )

    reading = make_reading(
        device=device,
        ppm=ppm,
        status=sensor_status,
        level=1,
        simulated=True,
    )

    _, operator = (
        make_operator_client(
            username=(
                "operator-"
                f"{scenario_name.lower()}"
            )
        )
    )

    (
        arkl_data,
        alert_evaluation,
    ) = calculate_realtime(
        client=operator,
        worker=worker,
        device=device,
    )

    # --------------------------------------------------------
    # ARKL
    # --------------------------------------------------------

    assert (
        Decimal(
            str(
                arkl_data[
                    "concentration_ppm"
                ]
            )
        )
        == ppm
    )

    assert (
        arkl_data["interpretation"]
        == expected_interpretation
    )

    arkl_result = (
        ARKLResult.objects.get(
            pk=arkl_data["id"]
        )
    )

    assert (
        arkl_result.worker
        == worker
    )

    assert (
        arkl_result.reading
        == reading
    )

    # --------------------------------------------------------
    # AUTOMATIC ALERT EVALUATION
    # --------------------------------------------------------

    if (
        expected_alert_level
        is None
    ):
        # NORMAL + RQ <= 1
        # → AlertLevel.NONE
        # → no Alert row is created.
        assert (
            alert_evaluation["alert"]
            is None
        )

        assert (
            alert_evaluation["created"]
            is False
        )

        assert (
            alert_evaluation["duplicate"]
            is False
        )

        assert (
            alert_evaluation["escalated"]
            is False
        )

        assert (
            Alert.objects.filter(
                worker=worker
            ).count()
            == 0
        )

        return

    assert (
        alert_evaluation["created"]
        is True
    )

    assert (
        alert_evaluation["duplicate"]
        is False
    )

    alert_data = (
        alert_evaluation["alert"]
    )

    assert alert_data is not None

    assert (
        alert_data["alert_level"]
        == expected_alert_level
    )

    assert (
        alert_data[
            "risk_interpretation"
        ]
        == expected_interpretation
    )

    assert (
        alert_data[
            "environmental_status"
        ]
        == sensor_status
    )

    assert (
        alert_data["status"]
        == AlertLifecycleStatus.OPEN
    )

    assert (
        Alert.objects.filter(
            worker=worker
        ).count()
        == 1
    )


# ============================================================
# 06
# WORKER OWNERSHIP
# ============================================================


@pytest.mark.django_db
def test_worker_only_sees_own_risk_data():
    worker_a, _ = (
        make_worker_with_exposure(
            code="PML-OWNERSHIP-A",
            name="Pemulung A",
        )
    )

    worker_b, _ = (
        make_worker_with_exposure(
            code="PML-OWNERSHIP-B",
            name="Pemulung B",
        )
    )

    device = make_device(
        "H2S-OWNERSHIP"
    )

    make_reading(
        device=device,
        ppm=25.4,
        status="WARNING",
    )

    _, operator = (
        make_operator_client(
            "ownership-operator"
        )
    )

    (
        arkl_a,
        alert_evaluation,
    ) = calculate_realtime(
        client=operator,
        worker=worker_a,
        device=device,
    )

    assert (
        alert_evaluation["created"]
        is True
    )

    alert_data = (
        alert_evaluation["alert"]
    )

    assert alert_data is not None

    _, worker_a_client = (
        make_worker_client(
            worker_a,
            "ownership-worker-a",
        )
    )

    _, worker_b_client = (
        make_worker_client(
            worker_b,
            "ownership-worker-b",
        )
    )

    # --------------------------------------------------------
    # Worker A can see only its own ARKL.
    # --------------------------------------------------------

    response = worker_a_client.get(
        "/api/v1/me/arkl-results/"
    )

    assert response.status_code == 200

    results = response_results(
        response
    )

    assert len(results) == 1

    assert (
        results[0]["id"]
        == arkl_a["id"]
    )

    # --------------------------------------------------------
    # Worker A can see its own Alert.
    # --------------------------------------------------------

    response = worker_a_client.get(
        "/api/v1/me/alerts/"
    )

    assert response.status_code == 200

    results = response_results(
        response
    )

    assert len(results) == 1

    assert (
        results[0]["id"]
        == alert_data["id"]
    )

    # --------------------------------------------------------
    # Worker B cannot see Worker A ARKL.
    # --------------------------------------------------------

    response = worker_b_client.get(
        "/api/v1/me/arkl-results/"
    )

    assert response.status_code == 200

    assert (
        len(
            response_results(
                response
            )
        )
        == 0
    )

    # --------------------------------------------------------
    # Worker B cannot see Worker A Alert.
    # --------------------------------------------------------

    response = worker_b_client.get(
        "/api/v1/me/alerts/"
    )

    assert response.status_code == 200

    assert (
        len(
            response_results(
                response
            )
        )
        == 0
    )


# ============================================================
# 07
# INVALID EXPOSURE DATA
# ============================================================


@pytest.mark.django_db
@pytest.mark.parametrize(
    (
        "field",
        "invalid_value",
    ),
    [
        (
            "body_weight",
            0,
        ),
        (
            "exposure_time",
            25,
        ),
        (
            "exposure_frequency",
            366,
        ),
        (
            "exposure_duration",
            0,
        ),
    ],
)
def test_invalid_exposure_data_is_rejected(
    field,
    invalid_value,
):
    worker = Worker.objects.create(
        code=f"PML-INVALID-{field}",
        name="Pemulung Invalid",
        age=40,
        is_active=True,
    )

    _, operator = (
        make_operator_client(
            username=(
                f"operator-invalid-{field}"
            )
        )
    )

    payload = {
        "worker": worker.pk,
        "body_weight": 55,
        "exposure_time": 8,
        "exposure_frequency": 250,
        "exposure_duration": 10,
    }

    payload[field] = (
        invalid_value
    )

    response = operator.post(
        "/api/v1/exposure-profiles/",
        payload,
        format="json",
    )

    assert (
        response.status_code
        == 400
    )

    assert (
        ExposureProfile.objects
        .filter(
            worker=worker
        )
        .exists()
        is False
    )


@pytest.mark.django_db
def test_client_cannot_override_inhalation_rate():
    worker = Worker.objects.create(
        code="PML-INHALATION-OVERRIDE",
        name="Pemulung Adult",
        age=40,
        is_active=True,
    )

    _, operator = (
        make_operator_client(
            username=(
                "operator-inhalation-override"
            )
        )
    )

    response = operator.post(
        "/api/v1/exposure-profiles/",
        {
            "worker": worker.pk,
            "body_weight": 55,
            "exposure_time": 8,
            "exposure_frequency": 250,
            "exposure_duration": 10,

            # Client attempts to manipulate
            # methodological parameter.
            "inhalation_rate": 0,
        },
        format="json",
    )

    # inhalation_rate is read-only.
    # The client-provided value must not be used.
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
        == pytest.approx(
            0.83
        )
    )

    assert (
        float(
            response.json()[
                "inhalation_rate"
            ]
        )
        == pytest.approx(
            0.83
        )
    )


# ============================================================
# 08
# LATEST SENSOR READING
# ============================================================


@pytest.mark.django_db
def test_latest_sensor_reading_is_used():
    device = make_device(
        "H2S-LATEST-FEATURE"
    )

    first = make_reading(
        device=device,
        ppm=1,
        status="NORMAL",
    )

    second = make_reading(
        device=device,
        ppm=25.4,
        status="WARNING",
    )

    assert second.pk > first.pk

    _, researcher = (
        make_authenticated_client(
            username="latest-researcher",
            role=(
                AccountProfile
                .Role
                .RESEARCHER
            ),
        )
    )

    response = researcher.get(
        "/api/v1/readings/latest/"
    )

    assert response.status_code == 200

    data = response.json()

    assert (
        data["id"]
        == second.pk
    )

    assert (
        Decimal(
            str(data["ppm"])
        )
        == Decimal("25.4")
    )

    assert (
        data["status"]
        == "WARNING"
    )


# ============================================================
# 09
# HISTORICAL ARKL
# ============================================================


@pytest.mark.django_db
def test_historical_arkl_uses_mean_h2s():
    worker, _ = (
        make_worker_with_exposure(
            code="PML-HIST-FEATURE",
            name="Pemulung Historical",
        )
    )

    device = make_device(
        "H2S-HIST-FEATURE"
    )

    now = timezone.now()

    readings = []

    for ppm in [
        Decimal("10"),
        Decimal("20"),
        Decimal("30"),
    ]:
        reading = make_reading(
            device=device,
            ppm=ppm,
            status="WARNING",
        )

        readings.append(
            reading
        )

    for index, reading in enumerate(
        readings
    ):
        received_at = (
            now
            - timedelta(
                minutes=(
                    30
                    - (index * 10)
                )
            )
        )

        H2SReading.objects.filter(
            pk=reading.pk
        ).update(
            received_at=received_at
        )

    _, operator = (
        make_operator_client(
            "historical-operator"
        )
    )

    response = operator.post(
        "/api/v1/arkl/historical/",
        {
            "worker": worker.pk,
            "device": device.pk,
            "start_time": (
                now
                - timedelta(hours=1)
            ).isoformat(),
            "end_time": (
                now.isoformat()
            ),
        },
        format="json",
    )

    assert response.status_code == 201

    data = response.json()

    assert (
        data["calculation_type"]
        == "HISTORICAL"
    )

    assert (
        data["reading"]
        is None
    )

    assert (
        data["reading_count"]
        == 3
    )

    assert (
        Decimal(
            str(
                data[
                    "concentration_ppm"
                ]
            )
        )
        == Decimal("20")
    )

    assert (
        Decimal(
            str(
                data[
                    "concentration_mg_m3"
                ]
            )
        )
        == Decimal("28")
    )

    assert (
        Decimal(
            str(data["rq"])
        )
        > 0
    )


# ============================================================
# 10
# ACK → RESOLVED + ACTOR AUDIT
# ============================================================


@pytest.mark.django_db
def test_alert_lifecycle_preserves_actor_audit():
    worker, _ = (
        make_worker_with_exposure(
            code=(
                "PML-LIFECYCLE-FEATURE"
            ),
            name="Pemulung Lifecycle",
        )
    )

    device = make_device(
        "H2S-LIFECYCLE-FEATURE"
    )

    make_reading(
        device=device,
        ppm=25.4,
        status="WARNING",
    )

    operator_user, operator = (
        make_operator_client(
            "lifecycle-operator"
        )
    )

    (
        _arkl,
        alert_evaluation,
    ) = calculate_realtime(
        client=operator,
        worker=worker,
        device=device,
    )

    assert (
        alert_evaluation["created"]
        is True
    )

    alert_data = (
        alert_evaluation["alert"]
    )

    assert alert_data is not None

    alert_id = (
        alert_data["id"]
    )

    # --------------------------------------------------------
    # ACKNOWLEDGE
    # --------------------------------------------------------

    acknowledge_response = (
        operator.patch(
            (
                f"/api/v1/alerts/"
                f"{alert_id}/"
                "acknowledge/"
            ),
            {},
            format="json",
        )
    )

    assert (
        acknowledge_response.status_code
        == 200
    )

    alert = Alert.objects.get(
        pk=alert_id
    )

    assert (
        alert.status
        == AlertLifecycleStatus.ACKNOWLEDGED
    )

    assert (
        alert.acknowledged_by_id
        == operator_user.id
    )

    assert (
        alert.acknowledged_at
        is not None
    )

    # --------------------------------------------------------
    # RESOLVE
    # --------------------------------------------------------

    resolve_response = (
        operator.patch(
            (
                f"/api/v1/alerts/"
                f"{alert_id}/"
                "resolve/"
            ),
            {},
            format="json",
        )
    )

    assert (
        resolve_response.status_code
        == 200
    )

    alert.refresh_from_db()

    assert (
        alert.status
        == AlertLifecycleStatus.RESOLVED
    )

    assert (
        alert.acknowledged_by_id
        == operator_user.id
    )

    assert (
        alert.resolved_by_id
        == operator_user.id
    )

    assert (
        alert.resolved_at
        is not None
    )


# ============================================================
# 11
# DUPLICATE ALERT
# ============================================================


@pytest.mark.django_db
def test_duplicate_alert_is_not_created_again():
    worker, _ = (
        make_worker_with_exposure(
            code="PML-DUP-FEATURE",
            name="Pemulung Duplicate",
        )
    )

    device = make_device(
        "H2S-DUP-FEATURE"
    )

    make_reading(
        device=device,
        ppm=25.4,
        status="WARNING",
    )

    _, operator = (
        make_operator_client(
            "duplicate-operator"
        )
    )

    # --------------------------------------------------------
    # First realtime execution creates the Alert.
    # --------------------------------------------------------

    (
        first_arkl,
        first_evaluation,
    ) = calculate_realtime(
        client=operator,
        worker=worker,
        device=device,
    )

    assert (
        first_evaluation["created"]
        is True
    )

    assert (
        first_evaluation["duplicate"]
        is False
    )

    assert (
        first_evaluation["escalated"]
        is False
    )

    first_alert = (
        first_evaluation["alert"]
    )

    assert first_alert is not None

    # --------------------------------------------------------
    # Same environmental/risk level evaluated again.
    #
    # A new ARKLResult may be created because calculation
    # requests are snapshots, but Alert must be deduplicated.
    # --------------------------------------------------------

    (
        second_arkl,
        second_evaluation,
    ) = calculate_realtime(
        client=operator,
        worker=worker,
        device=device,
    )

    assert (
        second_arkl["id"]
        != first_arkl["id"]
    )

    assert (
        second_evaluation["created"]
        is False
    )

    assert (
        second_evaluation["duplicate"]
        is True
    )

    assert (
        second_evaluation["escalated"]
        is False
    )

    assert (
        second_evaluation["alert"][
            "id"
        ]
        == first_alert["id"]
    )

    assert (
        Alert.objects.filter(
            worker=worker
        ).count()
        == 1
    )


# ============================================================
# 12
# ALERT ESCALATION
# ============================================================


@pytest.mark.django_db
def test_higher_risk_creates_escalated_alert():
    worker, _ = (
        make_worker_with_exposure(
            code=(
                "PML-ESCALATION-FEATURE"
            ),
            name="Pemulung Escalation",
        )
    )

    device = make_device(
        "H2S-ESCALATION-FEATURE"
    )

    # --------------------------------------------------------
    # Initial condition:
    #
    # CAUTION + WITHIN_REFERENCE_LEVEL
    # → LOW
    # --------------------------------------------------------

    make_reading(
        device=device,
        ppm=Decimal("0.001"),
        status="CAUTION",
    )

    _, operator = (
        make_operator_client(
            "escalation-operator"
        )
    )

    (
        first_arkl,
        first_evaluation,
    ) = calculate_realtime(
        client=operator,
        worker=worker,
        device=device,
    )

    assert (
        first_arkl["interpretation"]
        == "WITHIN_REFERENCE_LEVEL"
    )

    assert (
        first_evaluation["created"]
        is True
    )

    assert (
        first_evaluation["duplicate"]
        is False
    )

    assert (
        first_evaluation["escalated"]
        is False
    )

    first_alert_data = (
        first_evaluation["alert"]
    )

    assert first_alert_data is not None

    assert (
        first_alert_data[
            "alert_level"
        ]
        == "LOW"
    )

    first_alert = (
        Alert.objects.get(
            pk=(
                first_alert_data[
                    "id"
                ]
            )
        )
    )

    assert (
        first_alert.status
        == AlertLifecycleStatus.OPEN
    )

    # --------------------------------------------------------
    # Condition worsens:
    #
    # WARNING + ABOVE_REFERENCE_LEVEL
    # → HIGH
    # --------------------------------------------------------

    make_reading(
        device=device,
        ppm=Decimal("25.4"),
        status="WARNING",
    )

    (
        second_arkl,
        second_evaluation,
    ) = calculate_realtime(
        client=operator,
        worker=worker,
        device=device,
    )

    assert (
        second_arkl["interpretation"]
        == "ABOVE_REFERENCE_LEVEL"
    )

    assert (
        second_evaluation["created"]
        is True
    )

    assert (
        second_evaluation["duplicate"]
        is False
    )

    assert (
        second_evaluation["escalated"]
        is True
    )

    second_alert_data = (
        second_evaluation["alert"]
    )

    assert (
        second_alert_data
        is not None
    )

    assert (
        second_alert_data[
            "alert_level"
        ]
        == "HIGH"
    )

    second_alert = (
        Alert.objects.get(
            pk=(
                second_alert_data[
                    "id"
                ]
            )
        )
    )

    # --------------------------------------------------------
    # Previous LOW alert must be superseded.
    # --------------------------------------------------------

    first_alert.refresh_from_db()

    assert (
        first_alert.status
        == AlertLifecycleStatus.RESOLVED
    )

    assert (
        first_alert.resolved_at
        is not None
    )

    # Internal escalation is system-driven,
    # therefore there is no human resolver.
    assert (
        first_alert.resolved_by_id
        is None
    )

    # --------------------------------------------------------
    # New HIGH alert becomes authoritative.
    # --------------------------------------------------------

    assert (
        second_alert.status
        == AlertLifecycleStatus.OPEN
    )

    assert (
        second_alert.alert_level
        == "HIGH"
    )

    # Both snapshots remain available for audit/history.
    assert (
        Alert.objects.filter(
            worker=worker,
            device=device,
        ).count()
        == 2
    )

    # But exactly one Alert may remain active.
    active_alerts = (
        Alert.objects.filter(
            worker=worker,
            device=device,
            status__in=[
                AlertLifecycleStatus.OPEN,
                AlertLifecycleStatus.ACKNOWLEDGED,
            ],
        )
    )

    assert (
        active_alerts.count()
        == 1
    )

    authoritative_alert = (
        active_alerts.get()
    )

    assert (
        authoritative_alert.pk
        == second_alert.pk
    )

    assert (
        authoritative_alert.alert_level
        == "HIGH"
    )


@pytest.mark.django_db
def test_child_exposure_uses_child_inhalation_rate():
    worker = Worker.objects.create(
        code="PML-CHILD-RATE",
        name="Pemulung Anak",
        age=10,
        is_active=True,
    )

    _, operator = (
        make_operator_client(
            username=(
                "operator-child-rate"
            )
        )
    )

    response = operator.post(
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

    profile = (
        ExposureProfile.objects.get(
            worker=worker
        )
    )

    assert (
        profile.inhalation_rate
        == pytest.approx(
            0.50
        )
    )

    assert (
        response.json()[
            "inhalation_category"
        ]
        == "CHILD_6_12"
    )