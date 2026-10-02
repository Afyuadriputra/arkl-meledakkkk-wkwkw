from decimal import Decimal

import pytest

from arkl.services.conversion import (
    ConcentrationConversionError,
    ppm_to_mg_m3,
)


def test_zero_ppm_conversion():
    assert ppm_to_mg_m3(0) == Decimal("0.00")


def test_ten_ppm_conversion():
    assert ppm_to_mg_m3(10) == Decimal("14.00")


def test_fractional_ppm_conversion():
    assert ppm_to_mg_m3("0.13") == Decimal("0.1820")


def test_negative_ppm_is_rejected():
    with pytest.raises(
        ConcentrationConversionError,
        match="ppm cannot be negative",
    ):
        ppm_to_mg_m3(-1)
