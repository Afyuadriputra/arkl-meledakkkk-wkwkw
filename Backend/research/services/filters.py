from dataclasses import dataclass
from datetime import datetime

from django.db.models import QuerySet

from devices.models import H2SReading


@dataclass(frozen=True)
class ResearchFilters:
    start: datetime | None = None
    end: datetime | None = None
    device_code: str | None = None

    # None  -> all sources
    # True  -> simulated only
    # False -> physical only
    source_simulated: bool | None = None


def validate_research_period(
    *,
    start: datetime | None,
    end: datetime | None,
) -> None:
    if start is not None and end is not None and start > end:
        raise ValueError(
            "start must be earlier than or equal to end."
        )


def build_research_filters(
    *,
    start=None,
    end=None,
    device_code=None,
    source_simulated=None,
) -> ResearchFilters:
    validate_research_period(
        start=start,
        end=end,
    )

    normalized_device_code = None

    if device_code:
        normalized_device_code = device_code.strip()

    return ResearchFilters(
        start=start,
        end=end,
        device_code=normalized_device_code,
        source_simulated=source_simulated,
    )


def filter_h2s_readings(
    filters: ResearchFilters,
) -> QuerySet:
    queryset = H2SReading.objects.select_related(
        "device"
    ).all()

    if filters.start is not None:
        queryset = queryset.filter(
            received_at__gte=filters.start
        )

    if filters.end is not None:
        queryset = queryset.filter(
            received_at__lte=filters.end
        )

    if filters.device_code:
        queryset = queryset.filter(
            device__device_code=filters.device_code
        )

    # IMPORTANT:
    # Only filter provenance when the client explicitly asks for it.
    if filters.source_simulated is not None:
        queryset = queryset.filter(
            simulated=filters.source_simulated
        )

    return queryset