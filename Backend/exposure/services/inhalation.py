from dataclasses import dataclass
from decimal import Decimal

from exposure.models import ExposureProfile, Worker
from exposure.services.constants import (
    ADULT_INHALATION_RATE_M3_HOUR,
    ADULT_MIN_AGE,
    CHILD_6_12_INHALATION_RATE_M3_HOUR,
    CHILD_MAX_AGE,
    CHILD_MIN_AGE,
)


class UnsupportedInhalationMethodologyError(
    ValueError
):
    pass


@dataclass(frozen=True)
class InhalationMethodology:
    category: str
    inhalation_rate: Decimal


def resolve_inhalation_methodology(
    age: int,
) -> InhalationMethodology:
    if not isinstance(
        age,
        int,
    ):
        raise UnsupportedInhalationMethodologyError(
            "Worker age must be an integer."
        )

    if (
        CHILD_MIN_AGE
        <= age
        <= CHILD_MAX_AGE
    ):
        return InhalationMethodology(
            category="CHILD_6_12",
            inhalation_rate=(
                CHILD_6_12_INHALATION_RATE_M3_HOUR
            ),
        )

    if age >= ADULT_MIN_AGE:
        return InhalationMethodology(
            category="ADULT",
            inhalation_rate=(
                ADULT_INHALATION_RATE_M3_HOUR
            ),
        )

    raise UnsupportedInhalationMethodologyError(
        "No approved inhalation-rate methodology "
        f"is configured for age {age}."
    )


def sync_worker_exposure_inhalation_rate(
    worker: Worker,
) -> None:
    """
    Synchronize an existing ExposureProfile
    with the approved age-based inhalation
    methodology.

    Workers without an ExposureProfile do not
    require synchronization.
    """
    try:
        exposure_profile = (
            worker.exposure_profile
        )

    except ExposureProfile.DoesNotExist:
        return

    if worker.age is None:
        raise UnsupportedInhalationMethodologyError(
            "Worker age is required to determine "
            "the inhalation methodology."
        )

    methodology = (
        resolve_inhalation_methodology(
            worker.age
        )
    )

    new_rate = float(
        methodology.inhalation_rate
    )

    if (
        exposure_profile.inhalation_rate
        == new_rate
    ):
        return

    exposure_profile.inhalation_rate = (
        new_rate
    )

    exposure_profile.save(
        update_fields=[
            "inhalation_rate",
            "updated_at",
        ]
    )