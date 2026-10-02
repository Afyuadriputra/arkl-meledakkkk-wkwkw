from decimal import Decimal

from arkl.services.validation import ARKLValidationError, to_decimal


def calculate_mean_concentration(values) -> Decimal:
    concentrations = [to_decimal(value, "concentration") for value in values]

    if not concentrations:
        raise ARKLValidationError("at least one concentration is required.")

    if any(value < 0 for value in concentrations):
        raise ARKLValidationError("concentration cannot be negative.")

    return sum(
        concentrations,
        start=Decimal("0"),
    ) / Decimal(len(concentrations))
