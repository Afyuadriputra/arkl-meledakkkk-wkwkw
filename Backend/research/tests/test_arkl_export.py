import csv
from decimal import Decimal
from io import StringIO

import pytest

from arkl.models import ARKLResult
from exposure.models import Worker
from research.services.arkl_export import (
    export_arkl_csv,
)
from research.services.arkl_results import (
    ARKLResearchFilters,
)


def create_result(
    *,
    worker,
    version,
    rq="2",
):
    return ARKLResult.objects.create(
        worker=worker,
        reading=None,

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
        rq=Decimal(rq),

        interpretation=(
            "ABOVE_REFERENCE_LEVEL"
            if Decimal(rq) > 1
            else "WITHIN_REFERENCE_LEVEL"
        ),

        calculation_version=version,
        source_simulated=True,
    )


@pytest.mark.django_db
def test_arkl_csv_export_contains_header_and_row():
    worker = Worker.objects.create(
        code="PML-CSV-001"
    )

    create_result(
        worker=worker,
        version="2.0.0-MVP",
    )

    content = export_arkl_csv(
        filters=ARKLResearchFilters(
            calculation_version="2.0.0-MVP"
        )
    )

    rows = list(
        csv.DictReader(
            StringIO(content)
        )
    )

    assert len(rows) == 1

    row = rows[0]

    assert row["worker_code"] == "PML-CSV-001"

    assert (
        row["calculation_version"]
        == "2.0.0-MVP"
    )

    assert (
        row["interpretation"]
        == "ABOVE_REFERENCE_LEVEL"
    )


@pytest.mark.django_db
def test_arkl_csv_export_does_not_mix_versions():
    worker = Worker.objects.create(
        code="PML-CSV-VERSION"
    )

    create_result(
        worker=worker,
        version="1.1.0-MVP",
    )

    create_result(
        worker=worker,
        version="2.0.0-MVP",
    )

    content = export_arkl_csv(
        filters=ARKLResearchFilters(
            calculation_version="2.0.0-MVP"
        )
    )

    rows = list(
        csv.DictReader(
            StringIO(content)
        )
    )

    assert len(rows) == 1

    assert (
        rows[0]["calculation_version"]
        == "2.0.0-MVP"
    )


@pytest.mark.django_db
def test_empty_arkl_csv_export_returns_header_only():
    content = export_arkl_csv(
        filters=ARKLResearchFilters(
            calculation_version="2.0.0-MVP"
        )
    )

    rows = list(
        csv.DictReader(
            StringIO(content)
        )
    )

    assert rows == []