from decimal import Decimal

import pytest

from arkl.services.exposure_concentration import (
    calculate_exposure_concentration,
)
from arkl.services.validation import ARKLValidationError


def test_full_time_exposure_equals_air_concentration():
    result = calculate_exposure_concentration(
        concentration_mg_m3=Decimal("14"),
        exposure_time_hour_day=Decimal("24"),
        exposure_frequency_day_year=Decimal("365"),
    )

    assert result == Decimal("14")


def test_partial_exposure_concentration():
    result = calculate_exposure_concentration(
        concentration_mg_m3=Decimal("14"),
        exposure_time_hour_day=Decimal("8"),
        exposure_frequency_day_year=Decimal("250"),
    )

    expected = (
        Decimal("14")
        * (Decimal("8") / Decimal("24"))
        * (Decimal("250") / Decimal("365"))
    )

    assert result == expected


def test_zero_concentration_produces_zero_exposure():
    result = calculate_exposure_concentration(
        concentration_mg_m3=0,
        exposure_time_hour_day=8,
        exposure_frequency_day_year=250,
    )

    assert result == Decimal("0")


def test_exposure_time_above_24_is_rejected():
    with pytest.raises(
        ARKLValidationError,
        match="must be between 0 and 24",
    ):
        calculate_exposure_concentration(
            concentration_mg_m3=14,
            exposure_time_hour_day=25,
            exposure_frequency_day_year=250,
        )


def test_exposure_frequency_above_365_is_rejected():
    with pytest.raises(
        ARKLValidationError,
        match="must be between 0 and 365",
    ):
        calculate_exposure_concentration(
            concentration_mg_m3=14,
            exposure_time_hour_day=8,
            exposure_frequency_day_year=366,
        )


def test_negative_concentration_is_rejected():
    with pytest.raises(
        ARKLValidationError,
        match="cannot be negative",
    ):
        calculate_exposure_concentration(
            concentration_mg_m3=-1,
            exposure_time_hour_day=8,
            exposure_frequency_day_year=250,
        )
