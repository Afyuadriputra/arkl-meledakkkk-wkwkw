from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone

from arkl.models import ARKLResult
from research.services.arkl_results import (
    ARKLResearchFilters,
    get_arkl_research_results,
)
from exposure.models import Worker


def create_arkl_result(
    *,
    worker,
    version,
    rq,
    calculation_type=(
        ARKLResult.CalculationType.REALTIME
    ),
    source_simulated=True,
):
    return ARKLResult.objects.create(
        worker=worker,
        reading=None,
        calculation_type=calculation_type,
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
        rq=Decimal(str(rq)),
        interpretation=(
            "ABOVE_REFERENCE_LEVEL"
            if Decimal(str(rq)) > 1
            else "WITHIN_REFERENCE_LEVEL"
        ),
        calculation_version=version,
        source_simulated=source_simulated,
    )


@pytest.mark.django_db
def test_arkl_research_filters_by_version():
    worker = Worker.objects.create(
        code="PML-RESEARCH-VERSION"
    )

    create_arkl_result(
        worker=worker,
        version="1.1.0-MVP",
        rq="0.5",
    )

    create_arkl_result(
        worker=worker,
        version="2.0.0-MVP",
        rq="2",
    )

    collection = get_arkl_research_results(
        filters=ARKLResearchFilters(
            calculation_version="2.0.0-MVP",
        )
    )

    assert collection.count == 1

    assert (
        collection.calculation_version
        == "2.0.0-MVP"
    )

    assert (
        collection.results[0]
        .calculation_version
        == "2.0.0-MVP"
    )


@pytest.mark.django_db
def test_arkl_research_v1_and_v2_are_not_mixed():
    worker = Worker.objects.create(
        code="PML-RESEARCH-NO-MIX"
    )

    for version in [
        "1.1.0-MVP",
        "2.0.0-MVP",
    ]:
        create_arkl_result(
            worker=worker,
            version=version,
            rq="2",
        )

    v1 = get_arkl_research_results(
        filters=ARKLResearchFilters(
            calculation_version="1.1.0-MVP",
        )
    )

    v2 = get_arkl_research_results(
        filters=ARKLResearchFilters(
            calculation_version="2.0.0-MVP",
        )
    )

    assert v1.count == 1
    assert v2.count == 1

    assert all(
        result.calculation_version
        == "1.1.0-MVP"
        for result in v1.results
    )

    assert all(
        result.calculation_version
        == "2.0.0-MVP"
        for result in v2.results
    )


@pytest.mark.django_db
def test_arkl_research_filters_worker():
    worker_one = Worker.objects.create(
        code="PML-R-001"
    )

    worker_two = Worker.objects.create(
        code="PML-R-002"
    )

    create_arkl_result(
        worker=worker_one,
        version="2.0.0-MVP",
        rq="2",
    )

    create_arkl_result(
        worker=worker_two,
        version="2.0.0-MVP",
        rq="3",
    )

    collection = get_arkl_research_results(
        filters=ARKLResearchFilters(
            calculation_version="2.0.0-MVP",
            worker_code="PML-R-001",
        )
    )

    assert collection.count == 1

    assert (
        collection.results[0].worker_code
        == "PML-R-001"
    )


@pytest.mark.django_db
def test_arkl_research_filters_source():
    worker = Worker.objects.create(
        code="PML-R-SOURCE"
    )

    create_arkl_result(
        worker=worker,
        version="2.0.0-MVP",
        rq="2",
        source_simulated=True,
    )

    create_arkl_result(
        worker=worker,
        version="2.0.0-MVP",
        rq="2",
        source_simulated=False,
    )

    collection = get_arkl_research_results(
        filters=ARKLResearchFilters(
            calculation_version="2.0.0-MVP",
            source_simulated=False,
        )
    )

    assert collection.count == 1
    assert collection.results[0].source_simulated is False


@pytest.mark.django_db
def test_arkl_research_filters_period():
    worker = Worker.objects.create(
        code="PML-R-PERIOD"
    )

    old_result = create_arkl_result(
        worker=worker,
        version="2.0.0-MVP",
        rq="1",
    )

    recent_result = create_arkl_result(
        worker=worker,
        version="2.0.0-MVP",
        rq="2",
    )

    now = timezone.now()

    ARKLResult.objects.filter(
        pk=old_result.pk
    ).update(
        created_at=now - timedelta(days=10)
    )

    ARKLResult.objects.filter(
        pk=recent_result.pk
    ).update(
        created_at=now - timedelta(hours=1)
    )

    collection = get_arkl_research_results(
        filters=ARKLResearchFilters(
            calculation_version="2.0.0-MVP",
            start=now - timedelta(days=1),
            end=now,
        )
    )

    assert collection.count == 1
    assert collection.results[0].id == recent_result.id