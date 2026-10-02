from decimal import Decimal

import pytest

from arkl.services.rq import calculate_rq
from arkl.services.validation import ARKLValidationError


def test_zero_intake_produces_zero_rq():
    result = calculate_rq(
        intake=0,
        rfc=Decimal("0.002"),
    )

    assert result == Decimal("0")


def test_rq_equal_one():
    result = calculate_rq(
        intake=Decimal("0.002"),
        rfc=Decimal("0.002"),
    )

    assert result == Decimal("1")


def test_rq_below_one():
    result = calculate_rq(
        intake=Decimal("0.001"),
        rfc=Decimal("0.002"),
    )

    assert result == Decimal("0.5")


def test_rq_above_one():
    result = calculate_rq(
        intake=Decimal("0.004"),
        rfc=Decimal("0.002"),
    )

    assert result == Decimal("2")


def test_zero_rfc_is_rejected():
    with pytest.raises(
        ARKLValidationError,
        match="rfc must be greater than zero",
    ):
        calculate_rq(
            intake=1,
            rfc=0,
        )


def test_negative_intake_is_rejected():
    with pytest.raises(
        ARKLValidationError,
        match="intake cannot be negative",
    ):
        calculate_rq(
            intake=-1,
            rfc=Decimal("0.002"),
        )