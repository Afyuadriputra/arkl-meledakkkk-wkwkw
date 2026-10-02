from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum

from django.db.models import Avg, Count, Max, Min
from django.db.models.functions import TruncDay, TruncHour

from research.services.filters import (
    ResearchFilters,
    filter_h2s_readings,
)


class TrendInterval(StrEnum):
    RAW = "raw"
    HOUR = "hour"
    DAY = "day"


@dataclass(frozen=True)
class RawTrendPoint:
    timestamp: datetime
    ppm: float
    device_code: str
    simulated: bool


@dataclass(frozen=True)
class AggregatedTrendPoint:
    timestamp: datetime
    average_ppm: float
    minimum_ppm: float
    maximum_ppm: float
    sample_count: int


def get_raw_h2s_trend(
    *,
    filters: ResearchFilters,
) -> list[RawTrendPoint]:
    queryset = filter_h2s_readings(
        filters=filters
    ).order_by(
        "received_at",
        "id",
    )

    return [
        RawTrendPoint(
            timestamp=reading.received_at,
            ppm=reading.ppm,
            device_code=reading.device.device_code,
            simulated=reading.simulated,
        )
        for reading in queryset
    ]


def get_aggregated_h2s_trend(
    *,
    filters: ResearchFilters,
    interval: TrendInterval,
) -> list[AggregatedTrendPoint]:
    queryset = filter_h2s_readings(
        filters=filters
    )

    if interval == TrendInterval.HOUR:
        trunc_expression = TruncHour(
            "received_at"
        )
    elif interval == TrendInterval.DAY:
        trunc_expression = TruncDay(
            "received_at"
        )
    else:
        raise ValueError(
            "Aggregated interval must be hour or day."
        )

    rows = (
        queryset.annotate(
            timestamp=trunc_expression
        )
        .values("timestamp")
        .annotate(
            average_ppm=Avg("ppm"),
            minimum_ppm=Min("ppm"),
            maximum_ppm=Max("ppm"),
            sample_count=Count("id"),
        )
        .order_by("timestamp")
    )

    return [
        AggregatedTrendPoint(
            timestamp=row["timestamp"],
            average_ppm=row["average_ppm"],
            minimum_ppm=row["minimum_ppm"],
            maximum_ppm=row["maximum_ppm"],
            sample_count=row["sample_count"],
        )
        for row in rows
    ]


def get_h2s_trend(
    *,
    filters: ResearchFilters,
    interval: TrendInterval,
) -> (
    list[RawTrendPoint]
    | list[AggregatedTrendPoint]
):
    if interval == TrendInterval.RAW:
        return get_raw_h2s_trend(
            filters=filters
        )

    return get_aggregated_h2s_trend(
        filters=filters,
        interval=interval,
    )