import pytest

from exposure.models import (
    ExposureProfile,
    Worker,
)
from research.services.exposure_summary import (
    calculate_exposure_summary,
)


@pytest.mark.django_db
def test_exposure_summary():
    worker_one = Worker.objects.create(
        code="PML-EXP-1"
    )

    worker_two = Worker.objects.create(
        code="PML-EXP-2"
    )

    ExposureProfile.objects.create(
        worker=worker_one,
        body_weight=50,
        exposure_time=6,
        exposure_frequency=200,
        exposure_duration=5,
        inhalation_rate=0.7,
    )

    ExposureProfile.objects.create(
        worker=worker_two,
        body_weight=60,
        exposure_time=10,
        exposure_frequency=300,
        exposure_duration=15,
        inhalation_rate=0.9,
    )

    summary = calculate_exposure_summary()

    assert summary.worker_count == 2

    assert summary.average_body_weight == 55
    assert summary.average_exposure_time == 8

    assert (
        summary.average_exposure_frequency
        == 250
    )

    assert (
        summary.average_exposure_duration
        == 10
    )

    assert (
        summary.average_inhalation_rate
        == pytest.approx(0.8)
    )


@pytest.mark.django_db
def test_empty_exposure_summary():
    summary = calculate_exposure_summary()

    assert summary.worker_count == 0
    assert summary.average_body_weight is None