from dataclasses import dataclass


class ExposureValidationError(ValueError):
    pass


@dataclass(frozen=True)
class ExposureData:
    body_weight: float
    exposure_time: float
    exposure_frequency: float
    exposure_duration: float
    inhalation_rate: float


def validate_exposure_data(
    *,
    body_weight: float,
    exposure_time: float,
    exposure_frequency: float,
    exposure_duration: float,
    inhalation_rate: float,
) -> ExposureData:
    """
    Validate complete exposure parameters.

    inhalation_rate remains part of domain
    validation because ARKL calculations require
    it, but API clients must not determine this
    value directly. The value is supplied by the
    approved inhalation methodology resolver.
    """
    values = {
        "body_weight": body_weight,
        "exposure_time": exposure_time,
        "exposure_frequency": (
            exposure_frequency
        ),
        "exposure_duration": (
            exposure_duration
        ),
        "inhalation_rate": (
            inhalation_rate
        ),
    }

    for name, value in values.items():
        if not isinstance(
            value,
            (int, float),
        ):
            raise ExposureValidationError(
                f"{name} must be numeric."
            )

    if body_weight <= 0:
        raise ExposureValidationError(
            "body_weight must be greater than zero."
        )

    if exposure_time <= 0:
        raise ExposureValidationError(
            "exposure_time must be greater than zero."
        )

    if exposure_time > 24:
        raise ExposureValidationError(
            "exposure_time cannot exceed "
            "24 hours/day."
        )

    if exposure_frequency <= 0:
        raise ExposureValidationError(
            "exposure_frequency must be "
            "greater than zero."
        )

    if exposure_frequency > 365:
        raise ExposureValidationError(
            "exposure_frequency cannot exceed "
            "365 days/year."
        )

    if exposure_duration <= 0:
        raise ExposureValidationError(
            "exposure_duration must be "
            "greater than zero."
        )

    if inhalation_rate <= 0:
        raise ExposureValidationError(
            "inhalation_rate must be "
            "greater than zero."
        )

    return ExposureData(
        body_weight=float(
            body_weight
        ),
        exposure_time=float(
            exposure_time
        ),
        exposure_frequency=float(
            exposure_frequency
        ),
        exposure_duration=float(
            exposure_duration
        ),
        inhalation_rate=float(
            inhalation_rate
        ),
    )