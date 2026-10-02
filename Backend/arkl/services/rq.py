from decimal import Decimal

from arkl.services.constants import H2S_RFC
from arkl.services.validation import (
    ARKLValidationError,
    to_decimal,
)


def calculate_rq(
    *,
    intake,
    rfc=H2S_RFC,
) -> Decimal:
    """
    Calculate Risk Quotient.

    Formula:

        RQ = Intake / RfC

    RQ <= 1:
        Within reference level.

    RQ > 1:
        Above reference level.
    """

    intake_value = to_decimal(
        intake,
        "intake",
    )

    reference_value = to_decimal(
        rfc,
        "rfc",
    )

    if intake_value < 0:
        raise ARKLValidationError(
            "intake cannot be negative."
        )

    if reference_value <= 0:
        raise ARKLValidationError(
            "rfc must be greater than zero."
        )

    return intake_value / reference_value