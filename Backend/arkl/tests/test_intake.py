from decimal import Decimal

import pytest

from arkl.services.intake import (
    calculate_averaging_time,
    calculate_intake,
)
from arkl.services.validation import ARKLValidationError


def test_averaging_time_for_non_carcinogenic_exposure():
    result = calculate_averaging_time(
        Decimal("10")
    )

    assert result == Decimal("3650")


def test_known_intake_calculation():
    averaging_time = Decimal("3650")

    result = calculate_intake(
        concentration_mg_m3=Decimal("14"),
        inhalation_rate_m3_hour=Decimal("0.83"),
        exposure_time_hour_day=Decimal("8"),
        exposure_frequency_day_year=Decimal("250"),
        exposure_duration_year=Decimal("10"),
        body_weight_kg=Decimal("55"),
        averaging_time_day=averaging_time,
    )

    expected = (
        Decimal("14")
        * Decimal("0.83")
        * Decimal("8")
        * Decimal("250")
        * Decimal("10")
    ) / (
        Decimal("55")
        * averaging_time
    )

    assert result == expected


def test_zero_concentration_produces_zero_intake():
    result = calculate_intake(
        concentration_mg_m3=Decimal("0"),
        inhalation_rate_m3_hour=Decimal("0.83"),
        exposure_time_hour_day=Decimal("8"),
        exposure_frequency_day_year=Decimal("250"),
        exposure_duration_year=Decimal("10"),
        body_weight_kg=Decimal("55"),
        averaging_time_day=Decimal("3650"),
    )

    assert result == Decimal("0")


def test_zero_body_weight_is_rejected():
    with pytest.raises(
        ARKLValidationError,
        match="body_weight_kg must be greater than zero",
    ):
        calculate_intake(
            concentration_mg_m3=14,
            inhalation_rate_m3_hour=0.83,
            exposure_time_hour_day=8,
            exposure_frequency_day_year=250,
            exposure_duration_year=10,
            body_weight_kg=0,
            averaging_time_day=3650,
        )


def test_zero_averaging_time_is_rejected():
    with pytest.raises(
        ARKLValidationError,
        match="averaging_time_day must be greater than zero",
    ):
        calculate_intake(
            concentration_mg_m3=14,
            inhalation_rate_m3_hour=0.83,
            exposure_time_hour_day=8,
            exposure_frequency_day_year=250,
            exposure_duration_year=10,
            body_weight_kg=55,
            averaging_time_day=0,
        )