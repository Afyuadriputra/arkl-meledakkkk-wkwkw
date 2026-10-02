from decimal import Decimal

from arkl.services.constants import (
    RQ_ABOVE_REFERENCE_LEVEL,
    RQ_WITHIN_REFERENCE_LEVEL,
)
from arkl.services.validation import ARKLValidationError, to_decimal


def interpret_rq(rq) -> str:
    rq_value = to_decimal(
        rq,
        "rq",
    )

    if rq_value < 0:
        raise ARKLValidationError("rq cannot be negative.")

    if rq_value <= Decimal("1"):
        return RQ_WITHIN_REFERENCE_LEVEL

    return RQ_ABOVE_REFERENCE_LEVEL
