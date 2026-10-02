from dataclasses import dataclass
from decimal import (
    Decimal,
    InvalidOperation,
)

from arkl.services.constants import (
    DAYS_PER_YEAR,
    HOURS_PER_DAY,
)


class ARKLValidationError(ValueError):
    pass


def to_decimal(
    value,
    field_name: str,
) -> Decimal:
    try:
        result = Decimal(
            str(value)
        )
    except (
        InvalidOperation,
        ValueError,
        TypeError,
    ) as exc:
        raise ARKLValidationError(
            f"{field_name} must be numeric."
        ) from exc

    if not result.is_finite():
        raise ARKLValidationError(
            f"{field_name} must be finite."
        )

    return result


@dataclass(frozen=True)
class ARKLInputData:
    concentration_ppm: Decimal
    body_weight_kg: Decimal
    exposure_time_hour_day: Decimal
    exposure_frequency_day_year: Decimal
    exposure_duration_year: Decimal
    inhalation_rate_m3_hour: Decimal


def validate_arkl_inputs(
    *,
    concentration_ppm,
    body_weight,
    exposure_time,
    exposure_frequency,
    exposure_duration,
    inhalation_rate,
) -> ARKLInputData:
    concentration = to_decimal(
        concentration_ppm,
        "concentration_ppm",
    )

    weight = to_decimal(
        body_weight,
        "body_weight",
    )

    exposure_time_value = (
        to_decimal(
            exposure_time,
            "exposure_time",
        )
    )

    exposure_frequency_value = (
        to_decimal(
            exposure_frequency,
            "exposure_frequency",
        )
    )

    duration = to_decimal(
        exposure_duration,
        "exposure_duration",
    )

    rate = to_decimal(
        inhalation_rate,
        "inhalation_rate",
    )


    if concentration < 0:
        raise ARKLValidationError(
            "concentration_ppm cannot "
            "be negative."
        )


    if weight <= 0:
        raise ARKLValidationError(
            "body_weight must be greater "
            "than zero."
        )


    if not (
        Decimal("0")
        < exposure_time_value
        <= HOURS_PER_DAY
    ):
        raise ARKLValidationError(
            "exposure_time must be greater "
            "than 0 and at most 24 hour/day."
        )


    if not (
        Decimal("0")
        < exposure_frequency_value
        <= DAYS_PER_YEAR
    ):
        raise ARKLValidationError(
            "exposure_frequency must be "
            "greater than 0 and at most "
            "365 day/year."
        )


    if duration <= 0:
        raise ARKLValidationError(
            "exposure_duration must be "
            "greater than zero."
        )


    if rate <= 0:
        raise ARKLValidationError(
            "inhalation_rate must be "
            "greater than zero."
        )


    return ARKLInputData(
        concentration_ppm=(
            concentration
        ),
        body_weight_kg=(
            weight
        ),
        exposure_time_hour_day=(
            exposure_time_value
        ),
        exposure_frequency_day_year=(
            exposure_frequency_value
        ),
        exposure_duration_year=(
            duration
        ),
        inhalation_rate_m3_hour=(
            rate
        ),
    )