from dataclasses import dataclass

from django.db.models import Count

from arkl.models import ARKLResult
from arkl.services.constants import (
    ARKL_CALCULATION_VERSION,
)


@dataclass(frozen=True)
class RiskDistributionItem:
    interpretation: str
    count: int
    percentage: float


@dataclass(frozen=True)
class RiskDistribution:
    calculation_version: str
    total_count: int
    distribution: list[RiskDistributionItem]


def calculate_risk_distribution(
    *,
    calculation_version=ARKL_CALCULATION_VERSION,
    worker_code=None,
    source_simulated=None,
):
    queryset = ARKLResult.objects.filter(
        calculation_version=calculation_version
    )

    if worker_code:
        queryset = queryset.filter(
            worker__code=worker_code
        )

    if source_simulated is not None:
        queryset = queryset.filter(
            source_simulated=source_simulated
        )

    total_count = queryset.count()

    rows = (
        queryset.values("interpretation")
        .annotate(count=Count("id"))
        .order_by("interpretation")
    )

    distribution = []

    for row in rows:
        count = row["count"]

        percentage = (
            (count / total_count) * 100
            if total_count
            else 0.0
        )

        distribution.append(
            RiskDistributionItem(
                interpretation=row[
                    "interpretation"
                ],
                count=count,
                percentage=round(
                    percentage,
                    2,
                ),
            )
        )

    return RiskDistribution(
        calculation_version=calculation_version,
        total_count=total_count,
        distribution=distribution,
    )