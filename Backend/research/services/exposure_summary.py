from dataclasses import dataclass

from django.db.models import Avg, Count

from exposure.models import ExposureProfile


@dataclass(frozen=True)
class ExposureSummary:
    worker_count: int

    average_body_weight: float | None

    average_exposure_time: float | None

    average_exposure_frequency: float | None

    average_exposure_duration: float | None

    average_inhalation_rate: float | None


def calculate_exposure_summary():
    summary = ExposureProfile.objects.aggregate(
        worker_count=Count("worker_id"),
        average_body_weight=Avg(
            "body_weight"
        ),
        average_exposure_time=Avg(
            "exposure_time"
        ),
        average_exposure_frequency=Avg(
            "exposure_frequency"
        ),
        average_exposure_duration=Avg(
            "exposure_duration"
        ),
        average_inhalation_rate=Avg(
            "inhalation_rate"
        ),
    )

    return ExposureSummary(
        worker_count=summary[
            "worker_count"
        ],
        average_body_weight=summary[
            "average_body_weight"
        ],
        average_exposure_time=summary[
            "average_exposure_time"
        ],
        average_exposure_frequency=summary[
            "average_exposure_frequency"
        ],
        average_exposure_duration=summary[
            "average_exposure_duration"
        ],
        average_inhalation_rate=summary[
            "average_inhalation_rate"
        ],
    )