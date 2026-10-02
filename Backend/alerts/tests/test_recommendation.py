import pytest

from alerts.services.constants import AlertLevel
from alerts.services.exceptions import AlertValidationError
from alerts.services.recommendation import (
    LIMIT_ACCESS_TO_EXPOSURE_AREA,
    MONITOR_H2S_LEVEL,
    NOTIFY_RESPONSIBLE_OPERATOR,
    REDUCE_EXPOSURE_DURATION,
    TEMPORARY_AREA_AVOIDANCE,
    get_recommendation_codes,
)


def test_none_has_no_recommendation():
    assert get_recommendation_codes(AlertLevel.NONE) == ()


def test_low_recommends_monitoring():
    result = get_recommendation_codes(AlertLevel.LOW)

    assert MONITOR_H2S_LEVEL in result


def test_medium_recommends_exposure_reduction():
    result = get_recommendation_codes(AlertLevel.MEDIUM)

    assert REDUCE_EXPOSURE_DURATION in result


def test_high_recommends_area_control():
    result = get_recommendation_codes(AlertLevel.HIGH)

    assert LIMIT_ACCESS_TO_EXPOSURE_AREA in result
    assert NOTIFY_RESPONSIBLE_OPERATOR in result


def test_critical_recommends_temporary_area_avoidance():
    result = get_recommendation_codes(AlertLevel.CRITICAL)

    assert TEMPORARY_AREA_AVOIDANCE in result


def test_recommendations_are_deterministic():
    first = get_recommendation_codes(AlertLevel.HIGH)
    second = get_recommendation_codes(AlertLevel.HIGH)

    assert first == second


def test_invalid_level_is_rejected():
    with pytest.raises(
        AlertValidationError,
        match="Unsupported alert level",
    ):
        get_recommendation_codes("UNKNOWN")
