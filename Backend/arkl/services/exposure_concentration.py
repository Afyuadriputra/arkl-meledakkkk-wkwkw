from decimal import Decimal

from arkl.services.constants import (
    DAYS_PER_YEAR,
    HOURS_PER_DAY,
)
from arkl.services.validation import (
    ARKLValidationError,
    to_decimal,
)


def calculate_exposure_concentration(
    *,
    concentration_mg_m3,
    exposure_time_hour_day,
    exposure_frequency_day_year,
) -> Decimal:
    concentration = to_decimal(
        concentration_mg_m3,
        "concentration_mg_m3",
    )

    exposure_time = to_decimal(
        exposure_time_hour_day,
        "exposure_time_hour_day",
    )

    exposure_frequency = to_decimal(
        exposure_frequency_day_year,
        "exposure_frequency_day_year",
    )

    if concentration < 0:
        raise ARKLValidationError("concentration_mg_m3 cannot be negative.")

    if not Decimal("0") <= exposure_time <= HOURS_PER_DAY:
        raise ARKLValidationError("exposure_time_hour_day must be between 0 and 24.")

    if not Decimal("0") <= exposure_frequency <= DAYS_PER_YEAR:
        raise ARKLValidationError(
            "exposure_frequency_day_year must be between 0 and 365."
        )

    return (
        concentration
        * (exposure_time / HOURS_PER_DAY)
        * (exposure_frequency / DAYS_PER_YEAR)
    )
