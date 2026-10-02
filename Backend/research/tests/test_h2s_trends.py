import pytest

from research.services.filters import (
    ResearchFilters,
)
from research.services.h2s_trends import (
    TrendInterval,
    get_h2s_trend,
)


@pytest.mark.django_db
def test_raw_trend_is_chronological(
    research_readings,
):
    series = get_h2s_trend(
        filters=ResearchFilters(),
        interval=TrendInterval.RAW,
    )

    assert len(series) == 3

    timestamps = [
        point.timestamp
        for point in series
    ]

    assert timestamps == sorted(timestamps)


@pytest.mark.django_db
def test_raw_trend_contains_source_metadata(
    research_readings,
):
    series = get_h2s_trend(
        filters=ResearchFilters(),
        interval=TrendInterval.RAW,
    )

    assert all(
        point.device_code
        == "H2S-RESEARCH-001"
        for point in series
    )

    assert [
        point.ppm
        for point in series
    ] == [
        1.0,
        3.0,
        5.0,
    ]


@pytest.mark.django_db
def test_hourly_trend_preserves_sample_total(
    research_readings,
):
    series = get_h2s_trend(
        filters=ResearchFilters(),
        interval=TrendInterval.HOUR,
    )

    assert len(series) >= 1

    total_samples = sum(
        point.sample_count
        for point in series
    )

    assert total_samples == 3


@pytest.mark.django_db
def test_daily_trend_preserves_sample_total(
    research_readings,
):
    series = get_h2s_trend(
        filters=ResearchFilters(),
        interval=TrendInterval.DAY,
    )

    assert len(series) >= 1

    total_samples = sum(
        point.sample_count
        for point in series
    )

    assert total_samples == 3


@pytest.mark.django_db
def test_trend_simulated_filter(
    research_readings,
):
    series = get_h2s_trend(
        filters=ResearchFilters(
            source_simulated=True
        ),
        interval=TrendInterval.RAW,
    )

    assert len(series) == 1
    assert series[0].ppm == 5.0
    assert series[0].simulated is True


@pytest.mark.django_db
def test_empty_raw_trend_returns_empty_list():
    series = get_h2s_trend(
        filters=ResearchFilters(),
        interval=TrendInterval.RAW,
    )

    assert series == []