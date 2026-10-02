import csv
from io import StringIO

from research.services.arkl_results import (
    ARKLResearchFilters,
    get_arkl_research_results,
)


CSV_FIELDS = [
    "id",
    "worker_code",
    "calculation_type",
    "concentration_ppm",
    "concentration_mg_m3",
    "exposure_concentration_mg_m3",
    "averaging_time",
    "intake",
    "rfc",
    "rq",
    "interpretation",
    "calculation_version",
    "source_simulated",
    "reading_id",
    "period_start",
    "period_end",
    "reading_count",
    "created_at",
]


def export_arkl_csv(
    *,
    filters: ARKLResearchFilters,
) -> str:
    collection = get_arkl_research_results(
        filters=filters
    )

    output = StringIO()

    writer = csv.DictWriter(
        output,
        fieldnames=CSV_FIELDS,
    )

    writer.writeheader()

    for result in collection.results:
        writer.writerow(
            {
                "id": result.id,
                "worker_code": result.worker_code,
                "calculation_type": (
                    result.calculation_type
                ),
                "concentration_ppm": (
                    result.concentration_ppm
                ),
                "concentration_mg_m3": (
                    result.concentration_mg_m3
                ),
                "exposure_concentration_mg_m3": (
                    result.exposure_concentration_mg_m3
                ),
                "averaging_time": (
                    result.averaging_time
                ),
                "intake": result.intake,
                "rfc": result.rfc,
                "rq": result.rq,
                "interpretation": (
                    result.interpretation
                ),
                "calculation_version": (
                    result.calculation_version
                ),
                "source_simulated": (
                    result.source_simulated
                ),
                "reading_id": (
                    result.reading_id
                ),
                "period_start": (
                    result.period_start.isoformat()
                    if result.period_start
                    else ""
                ),
                "period_end": (
                    result.period_end.isoformat()
                    if result.period_end
                    else ""
                ),
                "reading_count": (
                    result.reading_count
                ),
                "created_at": (
                    result.created_at.isoformat()
                ),
            }
        )

    return output.getvalue()