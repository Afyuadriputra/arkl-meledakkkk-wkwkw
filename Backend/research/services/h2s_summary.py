from dataclasses import dataclass
from datetime import datetime

from django.db.models import Avg, Count, Max, Min

from research.services.filters import (
    ResearchFilters,
    filter_h2s_readings,
)


@dataclass(frozen=True)
class H2SSummary:
    sample_count: int

    minimum_ppm: float | None
    maximum_ppm: float | None
    average_ppm: float | None

    first_reading_at: datetime | None
    last_reading_at: datetime | None

    simulated_count: int
    physical_count: int
    device_count: int


def calculate_h2s_summary(
    *,
    filters: ResearchFilters,
) -> H2SSummary:
    queryset = filter_h2s_readings(
        filters=filters
    )

    summary = queryset.aggregate(
        sample_count=Count("id"),
        minimum_ppm=Min("ppm"),
        maximum_ppm=Max("ppm"),
        average_ppm=Avg("ppm"),
        first_reading_at=Min("received_at"),
        last_reading_at=Max("received_at"),
    )

    simulated_count = queryset.filter(
        simulated=True
    ).count()

    physical_count = queryset.filter(
        simulated=False
    ).count()

    device_count = (
        queryset.values("device_id")
        .distinct()
        .count()
    )

    return H2SSummary(
        sample_count=summary["sample_count"],
        minimum_ppm=summary["minimum_ppm"],
        maximum_ppm=summary["maximum_ppm"],
        average_ppm=summary["average_ppm"],
        first_reading_at=summary[
            "first_reading_at"
        ],
        last_reading_at=summary[
            "last_reading_at"
        ],
        simulated_count=simulated_count,
        physical_count=physical_count,
        device_count=device_count,
    )