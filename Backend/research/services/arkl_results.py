from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal

from arkl.models import ARKLResult


@dataclass(frozen=True)
class ARKLResearchFilters:
    calculation_version: str

    worker_code: str | None = None

    calculation_type: str | None = None

    source_simulated: bool | None = None

    start: datetime | None = None
    end: datetime | None = None


@dataclass(frozen=True)
class ARKLResearchResult:
    id: int

    worker_code: str

    calculation_type: str

    concentration_ppm: Decimal
    concentration_mg_m3: Decimal

    exposure_concentration_mg_m3: (
        Decimal | None
    )

    averaging_time: Decimal | None
    intake: Decimal | None

    rfc: Decimal
    rq: Decimal

    interpretation: str

    calculation_version: str

    source_simulated: bool

    reading_id: int | None

    period_start: datetime | None
    period_end: datetime | None

    reading_count: int | None

    created_at: datetime


@dataclass(frozen=True)
class ARKLResearchCollection:
    calculation_version: str

    count: int

    results: list[ARKLResearchResult]


def get_arkl_research_results(
    *,
    filters: ARKLResearchFilters,
) -> ARKLResearchCollection:
    """
    Return ARKL results for exactly one calculation version.

    Research must never silently mix ARKL methodologies.

    Example:

        calculation_version = 2.0.0-MVP

    only returns results produced by that version.
    """

    queryset = (
        ARKLResult.objects
        .select_related(
            "worker",
            "reading",
        )
        .filter(
            calculation_version=(
                filters.calculation_version
            )
        )
    )

    if filters.worker_code:
        queryset = queryset.filter(
            worker__code=filters.worker_code
        )

    if filters.calculation_type:
        queryset = queryset.filter(
            calculation_type=(
                filters.calculation_type
            )
        )

    if filters.source_simulated is not None:
        queryset = queryset.filter(
            source_simulated=(
                filters.source_simulated
            )
        )

    if filters.start is not None:
        queryset = queryset.filter(
            created_at__gte=filters.start
        )

    if filters.end is not None:
        queryset = queryset.filter(
            created_at__lte=filters.end
        )

    queryset = queryset.order_by(
        "-created_at",
        "-id",
    )

    results = [
        ARKLResearchResult(
            id=result.id,
            worker_code=result.worker.code,
            calculation_type=(
                result.calculation_type
            ),
            concentration_ppm=(
                result.concentration_ppm
            ),
            concentration_mg_m3=(
                result.concentration_mg_m3
            ),
            exposure_concentration_mg_m3=(
                result.exposure_concentration_mg_m3
            ),
            averaging_time=(
                result.averaging_time
            ),
            intake=result.intake,
            rfc=result.rfc,
            rq=result.rq,
            interpretation=(
                result.interpretation
            ),
            calculation_version=(
                result.calculation_version
            ),
            source_simulated=(
                result.source_simulated
            ),
            reading_id=result.reading_id,
            period_start=result.period_start,
            period_end=result.period_end,
            reading_count=result.reading_count,
            created_at=result.created_at,
        )
        for result in queryset
    ]

    return ARKLResearchCollection(
        calculation_version=(
            filters.calculation_version
        ),
        count=len(results),
        results=results,
    )