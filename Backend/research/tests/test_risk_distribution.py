from decimal import Decimal

import pytest

from arkl.models import ARKLResult
from exposure.models import Worker
from research.services.risk_distribution import (
    calculate_risk_distribution,
)


def create_result(
    *,
    worker,
    interpretation,
    version="2.0.0-MVP",
):
    return ARKLResult.objects.create(
        worker=worker,
        calculation_type="REALTIME",

        concentration_ppm=Decimal("10"),
        concentration_mg_m3=Decimal("14"),

        exposure_concentration_mg_m3=None,

        body_weight=Decimal("55"),
        exposure_time=Decimal("8"),
        exposure_frequency=Decimal("250"),
        exposure_duration=Decimal("10"),
        inhalation_rate=Decimal("0.83"),

        averaging_time=Decimal("3650"),
        intake=Decimal("0.01"),

        rfc=Decimal("0.002"),
        rq=(
            Decimal("2")
            if interpretation
            == "ABOVE_REFERENCE_LEVEL"
            else Decimal("0.5")
        ),

        interpretation=interpretation,

        calculation_version=version,

        source_simulated=True,
    )


@pytest.mark.django_db
def test_risk_distribution():
    worker = Worker.objects.create(
        code="PML-RISK-DIST"
    )

    create_result(
        worker=worker,
        interpretation=(
            "WITHIN_REFERENCE_LEVEL"
        ),
    )

    create_result(
        worker=worker,
        interpretation=(
            "ABOVE_REFERENCE_LEVEL"
        ),
    )

    create_result(
        worker=worker,
        interpretation=(
            "ABOVE_REFERENCE_LEVEL"
        ),
    )

    result = calculate_risk_distribution(
        calculation_version="2.0.0-MVP"
    )

    assert result.total_count == 3

    values = {
        item.interpretation: item
        for item in result.distribution
    }

    assert (
        values[
            "WITHIN_REFERENCE_LEVEL"
        ].count
        == 1
    )

    assert (
        values[
            "ABOVE_REFERENCE_LEVEL"
        ].count
        == 2
    )

    assert (
        values[
            "ABOVE_REFERENCE_LEVEL"
        ].percentage
        == 66.67
    )


@pytest.mark.django_db
def test_risk_distribution_is_version_aware():
    worker = Worker.objects.create(
        code="PML-RISK-VERSION"
    )

    create_result(
        worker=worker,
        interpretation=(
            "WITHIN_REFERENCE_LEVEL"
        ),
        version="1.1.0-MVP",
    )

    create_result(
        worker=worker,
        interpretation=(
            "ABOVE_REFERENCE_LEVEL"
        ),
        version="2.0.0-MVP",
    )

    result = calculate_risk_distribution(
        calculation_version="2.0.0-MVP"
    )

    assert result.total_count == 1

    assert (
        result.distribution[0]
        .interpretation
        == "ABOVE_REFERENCE_LEVEL"
    )