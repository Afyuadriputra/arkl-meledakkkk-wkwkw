from decimal import Decimal

import pytest

from arkl.services.aggregation import calculate_mean_concentration
from arkl.services.validation import ARKLValidationError


def test_mean_single_reading():
    result = calculate_mean_concentration([Decimal("10")])

    assert result == Decimal("10")


def test_mean_multiple_readings():
    result = calculate_mean_concentration(
        [
            Decimal("10"),
            Decimal("20"),
            Decimal("30"),
        ]
    )

    assert result == Decimal("20")


def test_empty_readings_are_rejected():
    with pytest.raises(
        ARKLValidationError,
        match="at least one concentration is required",
    ):
        calculate_mean_concentration([])
