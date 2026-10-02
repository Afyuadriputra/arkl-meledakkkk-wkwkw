import pytest

from research.services.filters import (
    ResearchFilters,
)
from research.services.h2s_summary import (
    calculate_h2s_summary,
)


@pytest.mark.django_db
def test_h2s_summary_calculates_statistics(
    research_readings,
):
    summary = calculate_h2s_summary(
        filters=ResearchFilters()
    )

    assert summary.sample_count == 3

    assert summary.minimum_ppm == 1.0
    assert summary.maximum_ppm == 5.0
    assert summary.average_ppm == 3.0

    assert summary.simulated_count == 1
    assert summary.physical_count == 2
    assert summary.device_count == 1

    assert summary.first_reading_at is not None
    assert summary.last_reading_at is not None

    assert (
        summary.first_reading_at
        < summary.last_reading_at
    )


@pytest.mark.django_db
def test_h2s_summary_empty_dataset():
    summary = calculate_h2s_summary(
        filters=ResearchFilters()
    )

    assert summary.sample_count == 0

    assert summary.minimum_ppm is None
    assert summary.maximum_ppm is None
    assert summary.average_ppm is None

    assert summary.first_reading_at is None
    assert summary.last_reading_at is None

    assert summary.simulated_count == 0
    assert summary.physical_count == 0
    assert summary.device_count == 0


@pytest.mark.django_db
def test_h2s_summary_filters_simulated(
    research_readings,
):
    summary = calculate_h2s_summary(
        filters=ResearchFilters(
            source_simulated=True
        )
    )

    assert summary.sample_count == 1
    assert summary.minimum_ppm == 5.0
    assert summary.maximum_ppm == 5.0
    assert summary.average_ppm == 5.0

    assert summary.simulated_count == 1
    assert summary.physical_count == 0


@pytest.mark.django_db
def test_h2s_summary_filters_physical(
    research_readings,
):
    summary = calculate_h2s_summary(
        filters=ResearchFilters(
            source_simulated=False
        )
    )

    assert summary.sample_count == 2
    assert summary.minimum_ppm == 1.0
    assert summary.maximum_ppm == 3.0
    assert summary.average_ppm == 2.0


@pytest.mark.django_db
def test_h2s_summary_filters_device(
    research_readings,
    second_research_device,
):
    summary = calculate_h2s_summary(
        filters=ResearchFilters(
            device_code=(
                second_research_device.device_code
            )
        )
    )

    assert summary.sample_count == 0
    assert summary.device_count == 0