# Codebase Snapshot: Research Module

## File Structure

- `admin.py`
- `apps.py`
- `code.py`
- `models.py`
- `serializers.py`
- `services/filters.py`
- `services/h2s_summary.py`
- `services/h2s_trends.py`
- `services/reporting.py`
- `services/statistics.py`
- `tests/conftest.py`
- `tests/test_api.py`
- `tests/test_h2s_summary.py`
- `tests/test_h2s_trends.py`
- `urls.py`
- `views.py`

---

## Source Code

### `admin.py`
```python
# Register your models here.
```

### `apps.py`
```python
from django.apps import AppConfig


class ResearchConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "research"
```

### `code.py`
```python
from pathlib import Path

IGNORE_DIRS = {'__pycache__', '.venv', 'venv', '.git', 'migrations'}
IGNORE_FILES = {'RESEARCH_CODE_SNAPSHOT.md', 'dump_research.py', '__init__.py'}
OUTPUT_FILE = 'RESEARCH_CODE_SNAPSHOT.md'

def generate_snapshot():
    root = Path('.')
    lines = ["# Codebase Snapshot: Research Module\n"]
    
    files = [
        p for p in sorted(root.rglob('*.py'))
        if not any(d in p.parts for d in IGNORE_DIRS) and p.name not in IGNORE_FILES
    ]
    
    lines.append("## File Structure\n")
    for f in files:
        lines.append(f"- `{f.as_posix()}`")
    lines.append("\n---\n")
    
    lines.append("## Source Code\n")
    for f in files:
        content = f.read_text(encoding='utf-8').strip()
        if content:
            lines.append(f"### `{f.as_posix()}`")
            lines.append(f"```python\n{content}\n```\n")
            
    Path(OUTPUT_FILE).write_text('\n'.join(lines), encoding='utf-8')
    print(f"Snapshot berhasil dibuat: {OUTPUT_FILE} ({len(files)} files)")

if __name__ == '__main__':
    generate_snapshot()
```

### `models.py`
```python
# Create your models here.
```

### `serializers.py`
```python
from rest_framework import serializers

from research.services.filters import (
    build_research_filters,
)
from research.services.h2s_trends import TrendInterval


class ResearchFilterSerializer(
    serializers.Serializer
):
    start = serializers.DateTimeField(
        required=False,
    )

    end = serializers.DateTimeField(
        required=False,
    )

    device_code = serializers.CharField(
        required=False,
        allow_blank=False,
    )

    source_simulated = serializers.BooleanField(
        required=False,
    )

    def validate(self, attrs):
        start = attrs.get("start")
        end = attrs.get("end")

        if (
            start is not None
            and end is not None
            and start > end
        ):
            raise serializers.ValidationError(
                {
                    "end": (
                        "end must be greater than "
                        "or equal to start."
                    )
                }
            )

        return attrs

    def to_filters(self):
        if not hasattr(
            self,
            "validated_data",
        ):
            raise AssertionError(
                "is_valid() must be called first."
            )

        return build_research_filters(
            start=self.validated_data.get(
                "start"
            ),
            end=self.validated_data.get(
                "end"
            ),
            device_code=self.validated_data.get(
                "device_code"
            ),
            source_simulated=(
                self.validated_data.get(
                    "source_simulated"
                )
            ),
        )


class H2STrendQuerySerializer(
    ResearchFilterSerializer
):
    interval = serializers.ChoiceField(
        choices=[
            TrendInterval.RAW,
            TrendInterval.HOUR,
            TrendInterval.DAY,
        ],
        default=TrendInterval.DAY,
        required=False,
    )


class H2SSummarySerializer(serializers.Serializer):
    sample_count = serializers.IntegerField()

    minimum_ppm = serializers.FloatField(
        allow_null=True
    )

    maximum_ppm = serializers.FloatField(
        allow_null=True
    )

    average_ppm = serializers.FloatField(
        allow_null=True
    )

    first_reading_at = serializers.DateTimeField(
        allow_null=True
    )

    last_reading_at = serializers.DateTimeField(
        allow_null=True
    )

    simulated_count = serializers.IntegerField()

    physical_count = serializers.IntegerField()

    device_count = serializers.IntegerField()


class RawTrendPointSerializer(serializers.Serializer):
    timestamp = serializers.DateTimeField()
    ppm = serializers.FloatField()
    device_code = serializers.CharField()
    simulated = serializers.BooleanField()


class AggregatedTrendPointSerializer(
    serializers.Serializer
):
    timestamp = serializers.DateTimeField()
    average_ppm = serializers.FloatField()
    minimum_ppm = serializers.FloatField()
    maximum_ppm = serializers.FloatField()
    sample_count = serializers.IntegerField()


class H2STrendResponseSerializer(
    serializers.Serializer
):
    interval = serializers.ChoiceField(
        choices=[
            TrendInterval.RAW,
            TrendInterval.HOUR,
            TrendInterval.DAY,
        ]
    )

    series = serializers.ListField()
```

### `services/filters.py`
```python
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
```

### `services/h2s_summary.py`
```python
from dataclasses import dataclass
from datetime import datetime

from django.db.models import Avg, Count, Max, Min

from research.services.filters import (
    ResearchFilters,
    filter_h2s_readings,
)


@dataclass(frozen=True)
class H2SSummary:
    sample_count: int

    minimum_ppm: float | None
    maximum_ppm: float | None
    average_ppm: float | None

    first_reading_at: datetime | None
    last_reading_at: datetime | None

    simulated_count: int
    physical_count: int
    device_count: int


def calculate_h2s_summary(
    *,
    filters: ResearchFilters,
) -> H2SSummary:
    queryset = filter_h2s_readings(
        filters=filters
    )

    summary = queryset.aggregate(
        sample_count=Count("id"),
        minimum_ppm=Min("ppm"),
        maximum_ppm=Max("ppm"),
        average_ppm=Avg("ppm"),
        first_reading_at=Min("received_at"),
        last_reading_at=Max("received_at"),
    )

    simulated_count = queryset.filter(
        simulated=True
    ).count()

    physical_count = queryset.filter(
        simulated=False
    ).count()

    device_count = (
        queryset.values("device_id")
        .distinct()
        .count()
    )

    return H2SSummary(
        sample_count=summary["sample_count"],
        minimum_ppm=summary["minimum_ppm"],
        maximum_ppm=summary["maximum_ppm"],
        average_ppm=summary["average_ppm"],
        first_reading_at=summary[
            "first_reading_at"
        ],
        last_reading_at=summary[
            "last_reading_at"
        ],
        simulated_count=simulated_count,
        physical_count=physical_count,
        device_count=device_count,
    )
```

### `services/h2s_trends.py`
```python
from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum

from django.db.models import Avg, Count, Max, Min
from django.db.models.functions import TruncDay, TruncHour

from research.services.filters import (
    ResearchFilters,
    filter_h2s_readings,
)


class TrendInterval(StrEnum):
    RAW = "raw"
    HOUR = "hour"
    DAY = "day"


@dataclass(frozen=True)
class RawTrendPoint:
    timestamp: datetime
    ppm: float
    device_code: str
    simulated: bool


@dataclass(frozen=True)
class AggregatedTrendPoint:
    timestamp: datetime
    average_ppm: float
    minimum_ppm: float
    maximum_ppm: float
    sample_count: int


def get_raw_h2s_trend(
    *,
    filters: ResearchFilters,
) -> list[RawTrendPoint]:
    queryset = filter_h2s_readings(
        filters=filters
    ).order_by(
        "received_at",
        "id",
    )

    return [
        RawTrendPoint(
            timestamp=reading.received_at,
            ppm=reading.ppm,
            device_code=reading.device.device_code,
            simulated=reading.simulated,
        )
        for reading in queryset
    ]


def get_aggregated_h2s_trend(
    *,
    filters: ResearchFilters,
    interval: TrendInterval,
) -> list[AggregatedTrendPoint]:
    queryset = filter_h2s_readings(
        filters=filters
    )

    if interval == TrendInterval.HOUR:
        trunc_expression = TruncHour(
            "received_at"
        )
    elif interval == TrendInterval.DAY:
        trunc_expression = TruncDay(
            "received_at"
        )
    else:
        raise ValueError(
            "Aggregated interval must be hour or day."
        )

    rows = (
        queryset.annotate(
            timestamp=trunc_expression
        )
        .values("timestamp")
        .annotate(
            average_ppm=Avg("ppm"),
            minimum_ppm=Min("ppm"),
            maximum_ppm=Max("ppm"),
            sample_count=Count("id"),
        )
        .order_by("timestamp")
    )

    return [
        AggregatedTrendPoint(
            timestamp=row["timestamp"],
            average_ppm=row["average_ppm"],
            minimum_ppm=row["minimum_ppm"],
            maximum_ppm=row["maximum_ppm"],
            sample_count=row["sample_count"],
        )
        for row in rows
    ]


def get_h2s_trend(
    *,
    filters: ResearchFilters,
    interval: TrendInterval,
) -> (
    list[RawTrendPoint]
    | list[AggregatedTrendPoint]
):
    if interval == TrendInterval.RAW:
        return get_raw_h2s_trend(
            filters=filters
        )

    return get_aggregated_h2s_trend(
        filters=filters,
        interval=interval,
    )
```

### `tests/conftest.py`
```python
from datetime import timedelta

import pytest
from django.utils import timezone

from devices.models import Device, H2SReading


@pytest.fixture
def research_device():
    return Device.objects.create(
        device_code="H2S-RESEARCH-001",
        name="Research Test Device",
        location="TPA Research Test",
        is_active=True,
    )


@pytest.fixture
def second_research_device():
    return Device.objects.create(
        device_code="H2S-RESEARCH-002",
        name="Second Research Device",
        location="TPA Research Test 2",
        is_active=True,
    )


@pytest.fixture
def research_readings(
    research_device,
):
    now = timezone.now()

    definitions = [
        {
            "ppm": 1.0,
            "simulated": False,
            "hours_ago": 3,
        },
        {
            "ppm": 3.0,
            "simulated": False,
            "hours_ago": 2,
        },
        {
            "ppm": 5.0,
            "simulated": True,
            "hours_ago": 1,
        },
    ]

    readings = []

    for index, definition in enumerate(
        definitions,
        start=1,
    ):
        reading = H2SReading.objects.create(
            device=research_device,
            ppm=definition["ppm"],
            adc=1000,
            filtered_adc=1000.0,
            level=1,
            status="NORMAL",
            uptime_ms=index * 1000,
            simulated=definition[
                "simulated"
            ],
        )

        timestamp = now - timedelta(
            hours=definition["hours_ago"]
        )

        H2SReading.objects.filter(
            pk=reading.pk
        ).update(
            received_at=timestamp
        )

        reading.refresh_from_db()
        readings.append(reading)

    return readings
```

### `tests/test_api.py`
```python
import pytest
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


# ============================================================
# H2S SUMMARY
# ============================================================


@pytest.mark.django_db
def test_h2s_summary_api(
    api_client,
    research_readings,
):
    """
    Tanpa filter provenance, endpoint harus mengembalikan
    SEMUA reading: simulated + physical.
    """

    response = api_client.get(
        "/api/v1/research/h2s-summary/"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["sample_count"] == 3

    assert data["minimum_ppm"] == 1.0
    assert data["maximum_ppm"] == 5.0
    assert data["average_ppm"] == 3.0

    assert data["simulated_count"] == 1
    assert data["physical_count"] == 2

    assert data["device_count"] == 1

    assert data["first_reading_at"] is not None
    assert data["last_reading_at"] is not None


@pytest.mark.django_db
def test_h2s_summary_empty_dataset_api(
    api_client,
):
    response = api_client.get(
        "/api/v1/research/h2s-summary/"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["sample_count"] == 0

    assert data["minimum_ppm"] is None
    assert data["maximum_ppm"] is None
    assert data["average_ppm"] is None

    assert data["first_reading_at"] is None
    assert data["last_reading_at"] is None

    assert data["simulated_count"] == 0
    assert data["physical_count"] == 0
    assert data["device_count"] == 0


@pytest.mark.django_db
def test_h2s_summary_simulated_filter_api(
    api_client,
    research_readings,
):
    """
    source_simulated=true hanya mengambil data simulasi.
    """

    response = api_client.get(
        "/api/v1/research/h2s-summary/",
        {
            "source_simulated": "true",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["sample_count"] == 1
    assert data["average_ppm"] == 5.0

    assert data["simulated_count"] == 1
    assert data["physical_count"] == 0


@pytest.mark.django_db
def test_h2s_summary_physical_filter_api(
    api_client,
    research_readings,
):
    """
    source_simulated=false hanya mengambil data sensor fisik.
    """

    response = api_client.get(
        "/api/v1/research/h2s-summary/",
        {
            "source_simulated": "false",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["sample_count"] == 2

    assert data["minimum_ppm"] == 1.0
    assert data["maximum_ppm"] == 3.0
    assert data["average_ppm"] == 2.0

    assert data["simulated_count"] == 0
    assert data["physical_count"] == 2


@pytest.mark.django_db
def test_h2s_summary_device_filter_api(
    api_client,
    research_readings,
    research_device,
):
    response = api_client.get(
        "/api/v1/research/h2s-summary/",
        {
            "device_code": research_device.device_code,
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["sample_count"] == 3
    assert data["device_count"] == 1


# ============================================================
# FILTER VALIDATION
# ============================================================


@pytest.mark.django_db
def test_invalid_period_returns_400(
    api_client,
):
    response = api_client.get(
        "/api/v1/research/h2s-summary/",
        {
            "start": "2026-08-20T12:00:00+07:00",
            "end": "2026-08-19T12:00:00+07:00",
        },
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_invalid_datetime_returns_400(
    api_client,
):
    response = api_client.get(
        "/api/v1/research/h2s-summary/",
        {
            "start": "not-a-datetime",
        },
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_invalid_source_simulated_returns_400(
    api_client,
):
    response = api_client.get(
        "/api/v1/research/h2s-summary/",
        {
            "source_simulated": "maybe",
        },
    )

    assert response.status_code == 400


# ============================================================
# H2S TRENDS
# ============================================================


@pytest.mark.django_db
def test_raw_h2s_trend_api(
    api_client,
    research_readings,
):
    """
    Raw trend tanpa provenance filter harus berisi semua reading.
    """

    response = api_client.get(
        "/api/v1/research/h2s-trends/",
        {
            "interval": "raw",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["interval"] == "raw"
    assert len(data["series"]) == 3

    first = data["series"][0]

    assert "timestamp" in first
    assert "ppm" in first
    assert "device_code" in first
    assert "simulated" in first


@pytest.mark.django_db
def test_raw_h2s_trend_simulated_filter_api(
    api_client,
    research_readings,
):
    response = api_client.get(
        "/api/v1/research/h2s-trends/",
        {
            "interval": "raw",
            "source_simulated": "true",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["interval"] == "raw"
    assert len(data["series"]) == 1

    assert data["series"][0]["simulated"] is True
    assert data["series"][0]["ppm"] == 5.0


@pytest.mark.django_db
def test_raw_h2s_trend_physical_filter_api(
    api_client,
    research_readings,
):
    response = api_client.get(
        "/api/v1/research/h2s-trends/",
        {
            "interval": "raw",
            "source_simulated": "false",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["interval"] == "raw"
    assert len(data["series"]) == 2

    assert all(
        point["simulated"] is False
        for point in data["series"]
    )


@pytest.mark.django_db
def test_hourly_h2s_trend_api(
    api_client,
    research_readings,
):
    response = api_client.get(
        "/api/v1/research/h2s-trends/",
        {
            "interval": "hour",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["interval"] == "hour"

    total_samples = sum(
        point["sample_count"]
        for point in data["series"]
    )

    assert total_samples == 3


@pytest.mark.django_db
def test_daily_h2s_trend_api(
    api_client,
    research_readings,
):
    response = api_client.get(
        "/api/v1/research/h2s-trends/",
        {
            "interval": "day",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["interval"] == "day"

    total_samples = sum(
        point["sample_count"]
        for point in data["series"]
    )

    assert total_samples == 3


@pytest.mark.django_db
def test_default_trend_interval_is_day(
    api_client,
    research_readings,
):
    response = api_client.get(
        "/api/v1/research/h2s-trends/"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["interval"] == "day"

    total_samples = sum(
        point["sample_count"]
        for point in data["series"]
    )

    assert total_samples == 3


@pytest.mark.django_db
def test_invalid_trend_interval_returns_400(
    api_client,
):
    response = api_client.get(
        "/api/v1/research/h2s-trends/",
        {
            "interval": "month",
        },
    )

    assert response.status_code == 400
```

### `tests/test_h2s_summary.py`
```python
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
```

### `tests/test_h2s_trends.py`
```python
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
```

### `urls.py`
```python
from django.urls import path

from research.views import (
    H2SSummaryView,
    H2STrendView,
)


urlpatterns = [
    path(
        "h2s-summary/",
        H2SSummaryView.as_view(),
        name="research-h2s-summary",
    ),
    path(
        "h2s-trends/",
        H2STrendView.as_view(),
        name="research-h2s-trends",
    ),
]
```

### `views.py`
```python
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from research.serializers import (
    AggregatedTrendPointSerializer,
    H2SSummarySerializer,
    H2STrendQuerySerializer,
    H2STrendResponseSerializer,
    RawTrendPointSerializer,
    ResearchFilterSerializer,
)
from research.services.h2s_summary import (
    calculate_h2s_summary,
)
from research.services.h2s_trends import (
    TrendInterval,
    get_h2s_trend,
)


class H2SSummaryView(APIView):
    @extend_schema(
        parameters=[
            ResearchFilterSerializer,
        ],
        responses={
            200: H2SSummarySerializer,
        },
    )
    def get(self, request):
        query_serializer = (
            ResearchFilterSerializer(
                data=request.query_params
            )
        )
        query_serializer.is_valid(
            raise_exception=True
        )

        filters = query_serializer.to_filters()

        summary = calculate_h2s_summary(
            filters=filters
        )

        response_serializer = (
            H2SSummarySerializer(summary)
        )

        return Response(
            response_serializer.data,
            status=status.HTTP_200_OK,
        )


class H2STrendView(APIView):
    @extend_schema(
        parameters=[
            H2STrendQuerySerializer,
        ],
        responses={
            200: H2STrendResponseSerializer,
        },
    )
    def get(self, request):
        query_serializer = (
            H2STrendQuerySerializer(
                data=request.query_params
            )
        )
        query_serializer.is_valid(
            raise_exception=True
        )

        filters = query_serializer.to_filters()

        interval = TrendInterval(
            query_serializer.validated_data[
                "interval"
            ]
        )

        series = get_h2s_trend(
            filters=filters,
            interval=interval,
        )

        if interval == TrendInterval.RAW:
            series_data = (
                RawTrendPointSerializer(
                    series,
                    many=True,
                ).data
            )
        else:
            series_data = (
                AggregatedTrendPointSerializer(
                    series,
                    many=True,
                ).data
            )

        response_data = {
            "interval": interval,
            "series": series_data,
        }

        response_serializer = (
            H2STrendResponseSerializer(
                response_data
            )
        )

        return Response(
            response_serializer.data,
            status=status.HTTP_200_OK,
        )
```
