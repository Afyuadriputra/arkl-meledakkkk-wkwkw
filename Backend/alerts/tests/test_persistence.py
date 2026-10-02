from decimal import Decimal

import pytest

from alerts.models import Alert
from alerts.services.constants import (
    AlertLevel,
    AlertLifecycleStatus,
)
from alerts.services.evaluator import (
    evaluate_alert_with_recommendations,
)
from alerts.services.exceptions import AlertValidationError
from alerts.services.lifecycle import (
    acknowledge_alert,
    resolve_alert,
)
from alerts.services.persistence import (
    persist_alert_evaluation,
)
from arkl.models import ARKLResult
from devices.models import Device, H2SReading
from exposure.models import ExposureProfile, Worker


@pytest.fixture
def worker():
    return Worker.objects.create(
        code="PML-ALERT-001",
        is_active=True,
    )


@pytest.fixture
def exposure_profile(worker):
    return ExposureProfile.objects.create(
        worker=worker,
        body_weight=55,
        exposure_time=8,
        exposure_frequency=250,
        exposure_duration=10,
        inhalation_rate=0.83,
    )


@pytest.fixture
def device():
    return Device.objects.create(
        device_code="H2S-ALERT-001",
        name="Alert Test Device",
        location="TPA Test",
        is_active=True,
    )


@pytest.fixture
def reading(device):
    return H2SReading.objects.create(
        device=device,
        ppm=25.4,
        adc=1000,
        filtered_adc=1000,
        level=2,
        status="WARNING",
        uptime_ms=1000,
        simulated=False,
    )


@pytest.fixture
def second_reading(device):
    return H2SReading.objects.create(
        device=device,
        ppm=55.0,
        adc=2000,
        filtered_adc=2000,
        level=3,
        status="DANGER",
        uptime_ms=2000,
        simulated=False,
    )


@pytest.fixture
def simulated_reading(device):
    return H2SReading.objects.create(
        device=device,
        ppm=25.4,
        adc=1000,
        filtered_adc=1000,
        level=2,
        status="WARNING",
        uptime_ms=1000,
        simulated=True,
    )


@pytest.fixture
def realtime_arkl_result(
    worker,
    exposure_profile,
    reading,
):
    return ARKLResult.objects.create(
        worker=worker,
        reading=reading,
        calculation_type="REALTIME",
        concentration_ppm=Decimal("25.400000"),
        concentration_mg_m3=Decimal("35.560000"),
        exposure_concentration_mg_m3=Decimal("8.118721"),
        body_weight=Decimal("55"),
        exposure_time=Decimal("8"),
        exposure_frequency=Decimal("250"),
        exposure_duration=Decimal("10"),
        inhalation_rate=Decimal("0.83"),
        averaging_time=None,
        intake=None,
        rfc=Decimal("0.002"),
        rq=Decimal("4059.360730593607"),
        interpretation="ABOVE_REFERENCE_LEVEL",
        calculation_version="1.1.0-MVP",
        source_simulated=False,
    )


@pytest.fixture
def second_realtime_arkl_result(
    worker,
    exposure_profile,
    second_reading,
):
    return ARKLResult.objects.create(
        worker=worker,
        reading=second_reading,
        calculation_type="REALTIME",
        concentration_ppm=Decimal("55.000000"),
        concentration_mg_m3=Decimal("77.000000"),
        exposure_concentration_mg_m3=Decimal("17.579909"),
        body_weight=Decimal("55"),
        exposure_time=Decimal("8"),
        exposure_frequency=Decimal("250"),
        exposure_duration=Decimal("10"),
        inhalation_rate=Decimal("0.83"),
        averaging_time=None,
        intake=None,
        rfc=Decimal("0.002"),
        rq=Decimal("8789.954337899543"),
        interpretation="ABOVE_REFERENCE_LEVEL",
        calculation_version="1.1.0-MVP",
        source_simulated=False,
    )


@pytest.fixture
def within_reference_arkl_result(
    worker,
    exposure_profile,
    reading,
):
    return ARKLResult.objects.create(
        worker=worker,
        reading=reading,
        calculation_type="REALTIME",
        concentration_ppm=Decimal("0.001000"),
        concentration_mg_m3=Decimal("0.001400"),
        exposure_concentration_mg_m3=Decimal("0.000320"),
        body_weight=Decimal("55"),
        exposure_time=Decimal("8"),
        exposure_frequency=Decimal("250"),
        exposure_duration=Decimal("10"),
        inhalation_rate=Decimal("0.83"),
        averaging_time=None,
        intake=None,
        rfc=Decimal("0.002"),
        rq=Decimal("0.160000000000"),
        interpretation="WITHIN_REFERENCE_LEVEL",
        calculation_version="1.1.0-MVP",
        source_simulated=False,
    )


@pytest.fixture
def historical_arkl_result(
    worker,
    exposure_profile,
):
    return ARKLResult.objects.create(
        worker=worker,
        reading=None,
        calculation_type="HISTORICAL",
        concentration_ppm=Decimal("25.400000"),
        concentration_mg_m3=Decimal("35.560000"),
        exposure_concentration_mg_m3=Decimal("8.118721"),
        body_weight=Decimal("55"),
        exposure_time=Decimal("8"),
        exposure_frequency=Decimal("250"),
        exposure_duration=Decimal("10"),
        inhalation_rate=Decimal("0.83"),
        averaging_time=None,
        intake=None,
        rfc=Decimal("0.002"),
        rq=Decimal("4059.360730593607"),
        interpretation="ABOVE_REFERENCE_LEVEL",
        calculation_version="1.1.0-MVP",
        source_simulated=False,
        reading_count=1,
    )


@pytest.mark.django_db
def test_persistence_creates_alert_snapshot(
    reading,
    realtime_arkl_result,
):
    evaluation = evaluate_alert_with_recommendations(
        environmental_severity="WARNING",
        risk_interpretation=realtime_arkl_result.interpretation,
    )

    result = persist_alert_evaluation(
        reading=reading,
        arkl_result=realtime_arkl_result,
        evaluation=evaluation,
    )

    assert result.created is True
    assert result.duplicate is False
    assert result.escalated is False
    assert result.alert is not None

    alert = result.alert

    assert alert.worker_id == realtime_arkl_result.worker_id
    assert alert.device_id == reading.device_id
    assert alert.reading_id == reading.id
    assert alert.arkl_result_id == realtime_arkl_result.id

    assert alert.concentration_ppm == Decimal("25.4")
    assert alert.environmental_level == reading.level
    assert alert.environmental_status == reading.status

    assert alert.rq == realtime_arkl_result.rq
    assert alert.risk_interpretation == realtime_arkl_result.interpretation
    assert alert.calculation_version == realtime_arkl_result.calculation_version

    assert alert.alert_level == AlertLevel.HIGH
    assert alert.status == AlertLifecycleStatus.OPEN


@pytest.mark.django_db
def test_same_active_alert_is_deduplicated(
    reading,
    realtime_arkl_result,
):
    evaluation = evaluate_alert_with_recommendations(
        environmental_severity="WARNING",
        risk_interpretation=realtime_arkl_result.interpretation,
    )

    first = persist_alert_evaluation(
        reading=reading,
        arkl_result=realtime_arkl_result,
        evaluation=evaluation,
    )

    second = persist_alert_evaluation(
        reading=reading,
        arkl_result=realtime_arkl_result,
        evaluation=evaluation,
    )

    assert first.created is True
    assert second.created is False
    assert second.duplicate is True
    assert second.escalated is False
    assert Alert.objects.count() == 1


@pytest.mark.django_db
def test_acknowledged_alert_is_still_deduplicated(
    reading,
    realtime_arkl_result,
):
    evaluation = evaluate_alert_with_recommendations(
        environmental_severity="WARNING",
        risk_interpretation=realtime_arkl_result.interpretation,
    )

    first = persist_alert_evaluation(
        reading=reading,
        arkl_result=realtime_arkl_result,
        evaluation=evaluation,
    )

    acknowledge_alert(first.alert)

    second = persist_alert_evaluation(
        reading=reading,
        arkl_result=realtime_arkl_result,
        evaluation=evaluation,
    )

    assert second.created is False
    assert second.duplicate is True
    assert Alert.objects.count() == 1


@pytest.mark.django_db
def test_resolved_alert_allows_new_alert(
    reading,
    realtime_arkl_result,
):
    evaluation = evaluate_alert_with_recommendations(
        environmental_severity="WARNING",
        risk_interpretation=realtime_arkl_result.interpretation,
    )

    first = persist_alert_evaluation(
        reading=reading,
        arkl_result=realtime_arkl_result,
        evaluation=evaluation,
    )

    resolve_alert(first.alert)

    second = persist_alert_evaluation(
        reading=reading,
        arkl_result=realtime_arkl_result,
        evaluation=evaluation,
    )

    assert second.created is True
    assert second.duplicate is False
    assert second.escalated is False
    assert Alert.objects.count() == 2


@pytest.mark.django_db
def test_medium_to_high_is_escalation(
    reading,
    realtime_arkl_result,
    second_reading,
    second_realtime_arkl_result,
):
    medium = evaluate_alert_with_recommendations(
        environmental_severity="NORMAL",
        risk_interpretation=realtime_arkl_result.interpretation,
    )

    high = evaluate_alert_with_recommendations(
        environmental_severity="WARNING",
        risk_interpretation=second_realtime_arkl_result.interpretation,
    )

    first = persist_alert_evaluation(
        reading=reading,
        arkl_result=realtime_arkl_result,
        evaluation=medium,
    )

    second = persist_alert_evaluation(
        reading=second_reading,
        arkl_result=second_realtime_arkl_result,
        evaluation=high,
    )

    assert first.alert is not None
    assert first.alert.alert_level == AlertLevel.MEDIUM

    assert second.created is True
    assert second.duplicate is False
    assert second.escalated is True
    assert second.alert is not None
    assert second.alert.alert_level == AlertLevel.HIGH

    assert Alert.objects.count() == 2


@pytest.mark.django_db
def test_deescalation_does_not_create_new_alert(
    reading,
    realtime_arkl_result,
    second_reading,
    second_realtime_arkl_result,
):
    high = evaluate_alert_with_recommendations(
        environmental_severity="WARNING",
        risk_interpretation=realtime_arkl_result.interpretation,
    )

    medium = evaluate_alert_with_recommendations(
        environmental_severity="NORMAL",
        risk_interpretation=second_realtime_arkl_result.interpretation,
    )

    first = persist_alert_evaluation(
        reading=reading,
        arkl_result=realtime_arkl_result,
        evaluation=high,
    )

    second = persist_alert_evaluation(
        reading=second_reading,
        arkl_result=second_realtime_arkl_result,
        evaluation=medium,
    )

    assert first.alert is not None
    assert first.alert.alert_level == AlertLevel.HIGH

    assert second.created is False
    assert second.duplicate is False
    assert second.escalated is False

    assert second.alert == first.alert
    assert Alert.objects.count() == 1


@pytest.mark.django_db
def test_none_alert_is_not_persisted(
    reading,
    within_reference_arkl_result,
):
    evaluation = evaluate_alert_with_recommendations(
        environmental_severity="NORMAL",
        risk_interpretation=within_reference_arkl_result.interpretation,
    )

    result = persist_alert_evaluation(
        reading=reading,
        arkl_result=within_reference_arkl_result,
        evaluation=evaluation,
    )

    assert result.alert is None
    assert result.created is False
    assert result.duplicate is False
    assert result.escalated is False

    assert Alert.objects.count() == 0


@pytest.mark.django_db
def test_historical_arkl_is_rejected(
    reading,
    historical_arkl_result,
):
    evaluation = evaluate_alert_with_recommendations(
        environmental_severity="WARNING",
        risk_interpretation=historical_arkl_result.interpretation,
    )

    with pytest.raises(
        AlertValidationError,
        match="Only REALTIME",
    ):
        persist_alert_evaluation(
            reading=reading,
            arkl_result=historical_arkl_result,
            evaluation=evaluation,
        )


@pytest.mark.django_db
def test_mismatched_reading_is_rejected(
    second_reading,
    realtime_arkl_result,
):
    evaluation = evaluate_alert_with_recommendations(
        environmental_severity="WARNING",
        risk_interpretation=realtime_arkl_result.interpretation,
    )

    with pytest.raises(
        AlertValidationError,
        match="does not match",
    ):
        persist_alert_evaluation(
            reading=second_reading,
            arkl_result=realtime_arkl_result,
            evaluation=evaluation,
        )


@pytest.mark.django_db
def test_simulated_reading_sets_alert_provenance(
    simulated_reading,
    worker,
    exposure_profile,
):
    arkl_result = ARKLResult.objects.create(
        worker=worker,
        reading=simulated_reading,
        calculation_type="REALTIME",
        concentration_ppm=Decimal("25.400000"),
        concentration_mg_m3=Decimal("35.560000"),
        exposure_concentration_mg_m3=Decimal("8.118721"),
        body_weight=Decimal("55"),
        exposure_time=Decimal("8"),
        exposure_frequency=Decimal("250"),
        exposure_duration=Decimal("10"),
        inhalation_rate=Decimal("0.83"),
        averaging_time=None,
        intake=None,
        rfc=Decimal("0.002"),
        rq=Decimal("4059.360730593607"),
        interpretation="ABOVE_REFERENCE_LEVEL",
        calculation_version="1.1.0-MVP",
        source_simulated=False,
    )

    evaluation = evaluate_alert_with_recommendations(
        environmental_severity="WARNING",
        risk_interpretation=arkl_result.interpretation,
    )

    result = persist_alert_evaluation(
        reading=simulated_reading,
        arkl_result=arkl_result,
        evaluation=evaluation,
    )

    assert result.alert is not None
    assert result.alert.source_simulated is True


@pytest.mark.django_db
def test_simulated_arkl_sets_alert_provenance(
    reading,
    worker,
    exposure_profile,
):
    arkl_result = ARKLResult.objects.create(
        worker=worker,
        reading=reading,
        calculation_type="REALTIME",
        concentration_ppm=Decimal("25.400000"),
        concentration_mg_m3=Decimal("35.560000"),
        exposure_concentration_mg_m3=Decimal("8.118721"),
        body_weight=Decimal("55"),
        exposure_time=Decimal("8"),
        exposure_frequency=Decimal("250"),
        exposure_duration=Decimal("10"),
        inhalation_rate=Decimal("0.83"),
        averaging_time=None,
        intake=None,
        rfc=Decimal("0.002"),
        rq=Decimal("4059.360730593607"),
        interpretation="ABOVE_REFERENCE_LEVEL",
        calculation_version="1.1.0-MVP",
        source_simulated=True,
    )

    evaluation = evaluate_alert_with_recommendations(
        environmental_severity="WARNING",
        risk_interpretation=arkl_result.interpretation,
    )

    result = persist_alert_evaluation(
        reading=reading,
        arkl_result=arkl_result,
        evaluation=evaluation,
    )

    assert result.alert is not None
    assert result.alert.source_simulated is True
