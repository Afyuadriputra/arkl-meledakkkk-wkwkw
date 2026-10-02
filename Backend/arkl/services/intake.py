from decimal import Decimal

from arkl.services.constants import (
    DAYS_PER_YEAR,
    HOURS_PER_DAY,
)
from arkl.services.validation import (
    ARKLValidationError,
    to_decimal,
)


def calculate_averaging_time(
    exposure_duration_year,
) -> Decimal:
    """
    Calculate averaging time for non-carcinogenic exposure.

    tavg = Dt × 365

    Dt:
        Exposure duration in years.

    Result:
        Averaging time in days.
    """

    exposure_duration = to_decimal(
        exposure_duration_year,
        "exposure_duration_year",
    )

    if exposure_duration <= 0:
        raise ARKLValidationError(
            "exposure_duration_year must be greater than zero."
        )

    return exposure_duration * DAYS_PER_YEAR


def calculate_intake(
    *,
    concentration_mg_m3,
    inhalation_rate_m3_hour,
    exposure_time_hour_day,
    exposure_frequency_day_year,
    exposure_duration_year,
    body_weight_kg,
    averaging_time_day,
) -> Decimal:
    """
    Calculate inhalation intake.

    Formula:

        I = (C × R × tE × fE × Dt)
            -----------------------
                  Wb × tavg

    C:
        H2S concentration in mg/m3.

    R:
        Inhalation rate in m3/hour.

    tE:
        Exposure time in hour/day.

    fE:
        Exposure frequency in day/year.

    Dt:
        Exposure duration in years.

    Wb:
        Body weight in kg.

    tavg:
        Averaging time in days.
    """

    concentration = to_decimal(
        concentration_mg_m3,
        "concentration_mg_m3",
    )

    inhalation_rate = to_decimal(
        inhalation_rate_m3_hour,
        "inhalation_rate_m3_hour",
    )

    exposure_time = to_decimal(
        exposure_time_hour_day,
        "exposure_time_hour_day",
    )

    exposure_frequency = to_decimal(
        exposure_frequency_day_year,
        "exposure_frequency_day_year",
    )

    exposure_duration = to_decimal(
        exposure_duration_year,
        "exposure_duration_year",
    )

    body_weight = to_decimal(
        body_weight_kg,
        "body_weight_kg",
    )

    averaging_time = to_decimal(
        averaging_time_day,
        "averaging_time_day",
    )

    if concentration < 0:
        raise ARKLValidationError(
            "concentration_mg_m3 cannot be negative."
        )

    if inhalation_rate <= 0:
        raise ARKLValidationError(
            "inhalation_rate_m3_hour must be greater than zero."
        )

    if not Decimal("0") < exposure_time <= HOURS_PER_DAY:
        raise ARKLValidationError(
            "exposure_time_hour_day must be greater than 0 "
            "and at most 24."
        )

    if not Decimal("0") < exposure_frequency <= DAYS_PER_YEAR:
        raise ARKLValidationError(
            "exposure_frequency_day_year must be greater than 0 "
            "and at most 365."
        )

    if exposure_duration <= 0:
        raise ARKLValidationError(
            "exposure_duration_year must be greater than zero."
        )

    if body_weight <= 0:
        raise ARKLValidationError(
            "body_weight_kg must be greater than zero."
        )

    if averaging_time <= 0:
        raise ARKLValidationError(
            "averaging_time_day must be greater than zero."
        )

    numerator = (
        concentration
        * inhalation_rate
        * exposure_time
        * exposure_frequency
        * exposure_duration
    )

    denominator = body_weight * averaging_time

    return numerator / denominator