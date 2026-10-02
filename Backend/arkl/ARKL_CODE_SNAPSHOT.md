# ARKL Module Code Snapshot

## `models.py`

```python
from django.db import models

from devices.models import H2SReading
from exposure.models import Worker


class ARKLResult(models.Model):
    class CalculationType(models.TextChoices):
        REALTIME = "REALTIME", "Realtime"
        HISTORICAL = "HISTORICAL", "Historical"

    worker = models.ForeignKey(
        Worker,
        on_delete=models.PROTECT,
        related_name="arkl_results",
    )

    reading = models.ForeignKey(
        H2SReading,
        on_delete=models.PROTECT,
        related_name="arkl_results",
        null=True,
        blank=True,
    )

    calculation_type = models.CharField(
        max_length=20,
        choices=CalculationType.choices,
    )

    concentration_ppm = models.DecimalField(
        max_digits=14,
        decimal_places=6,
    )

    concentration_mg_m3 = models.DecimalField(
        max_digits=14,
        decimal_places=6,
    )

    exposure_concentration_mg_m3 = models.DecimalField(
        max_digits=14,
        decimal_places=6,
        null=True,
        blank=True,
    )

    # Research / exposure snapshot fields.
    body_weight = models.DecimalField(
        max_digits=10,
        decimal_places=4,
    )

    exposure_time = models.DecimalField(
        max_digits=10,
        decimal_places=4,
    )

    exposure_frequency = models.DecimalField(
        max_digits=10,
        decimal_places=4,
    )

    exposure_duration = models.DecimalField(
        max_digits=10,
        decimal_places=4,
    )

    inhalation_rate = models.DecimalField(
        max_digits=10,
        decimal_places=4,
    )

    # Legacy v1.0 calculation fields.
    averaging_time = models.DecimalField(
        max_digits=14,
        decimal_places=4,
        null=True,
        blank=True,
    )

    intake = models.DecimalField(
        max_digits=24,
        decimal_places=12,
        null=True,
        blank=True,
    )

    rfc = models.DecimalField(
        max_digits=14,
        decimal_places=8,
    )

    rq = models.DecimalField(
        max_digits=24,
        decimal_places=12,
    )

    interpretation = models.CharField(
        max_length=50,
    )

    calculation_version = models.CharField(
        max_length=30,
    )

    source_simulated = models.BooleanField(
        default=False,
    )

    period_start = models.DateTimeField(
        null=True,
        blank=True,
    )

    period_end = models.DateTimeField(
        null=True,
        blank=True,
    )

    reading_count = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.calculation_type} {self.worker.code} RQ={self.rq}"
```

## `serializers.py`

```python
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from arkl.models import ARKLResult
from devices.models import Device
from exposure.models import Worker


class RealtimeARKLRequestSerializer(serializers.Serializer):
    worker = serializers.PrimaryKeyRelatedField(
        queryset=Worker.objects.filter(is_active=True),
    )

    device = serializers.PrimaryKeyRelatedField(
        queryset=Device.objects.filter(is_active=True),
    )


class HistoricalARKLRequestSerializer(serializers.Serializer):
    worker = serializers.PrimaryKeyRelatedField(
        queryset=Worker.objects.filter(is_active=True),
    )

    device = serializers.PrimaryKeyRelatedField(
        queryset=Device.objects.filter(is_active=True),
    )

    start_time = serializers.DateTimeField()
    end_time = serializers.DateTimeField()

    def validate(self, attrs):
        if attrs["start_time"] >= attrs["end_time"]:
            raise serializers.ValidationError(
                {"end_time": ("end_time must be later than start_time.")}
            )

        return attrs


class ARKLResultSerializer(serializers.ModelSerializer):
    worker_code = serializers.CharField(
        source="worker.code",
        read_only=True,
    )

    device_code = serializers.SerializerMethodField()

    class Meta:
        model = ARKLResult
        fields = [
            "id",
            "worker",
            "worker_code",
            "reading",
            "device_code",
            "calculation_type",
            "concentration_ppm",
            "concentration_mg_m3",
            "exposure_concentration_mg_m3",
            "body_weight",
            "exposure_time",
            "exposure_frequency",
            "exposure_duration",
            "inhalation_rate",
            "averaging_time",
            "intake",
            "rfc",
            "rq",
            "interpretation",
            "calculation_version",
            "source_simulated",
            "period_start",
            "period_end",
            "reading_count",
            "created_at",
        ]

        read_only_fields = fields

    @extend_schema_field(
        serializers.CharField(
            allow_null=True,
        )
    )
    def get_device_code(
        self,
        obj: ARKLResult,
    ) -> str | None:
        if obj.reading_id is None:
            return None

        return obj.reading.device.device_code

```

## `views.py`

```python
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from arkl.models import ARKLResult
from arkl.serializers import (
    ARKLResultSerializer,
    HistoricalARKLRequestSerializer,
    RealtimeARKLRequestSerializer,
)
from arkl.services.calculator import (
    ARKLCalculationError,
    calculate_historical_risk,
    calculate_realtime_risk,
)

ARKL_RESULT_QUERYSET = ARKLResult.objects.select_related(
    "worker",
    "reading",
    "reading__device",
)


class RealtimeARKLView(APIView):
    @extend_schema(
        request=RealtimeARKLRequestSerializer,
        responses={
            201: ARKLResultSerializer,
        },
        tags=["ARKL"],
        summary="Calculate realtime ARKL risk",
    )
    def post(self, request):
        serializer = RealtimeARKLRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = calculate_realtime_risk(
                worker=serializer.validated_data["worker"],
                device=serializer.validated_data["device"],
            )
        except ARKLCalculationError as exc:
            return Response(
                {
                    "detail": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            ARKLResultSerializer(result).data,
            status=status.HTTP_201_CREATED,
        )


class HistoricalARKLView(APIView):
    @extend_schema(
        request=HistoricalARKLRequestSerializer,
        responses={
            201: ARKLResultSerializer,
        },
        tags=["ARKL"],
        summary="Calculate historical ARKL risk",
    )
    def post(self, request):
        serializer = HistoricalARKLRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            result = calculate_historical_risk(
                worker=serializer.validated_data["worker"],
                device=serializer.validated_data["device"],
                period_start=serializer.validated_data["start_time"],
                period_end=serializer.validated_data["end_time"],
            )
        except ARKLCalculationError as exc:
            return Response(
                {
                    "detail": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            ARKLResultSerializer(result).data,
            status=status.HTTP_201_CREATED,
        )


@extend_schema(
    tags=["ARKL"],
    summary="List ARKL results",
)
class ARKLResultListView(ListAPIView):
    serializer_class = ARKLResultSerializer

    def get_queryset(self):
        queryset = ARKL_RESULT_QUERYSET.all()

        worker_code = self.request.query_params.get("worker_code")
        calculation_type = self.request.query_params.get("calculation_type")

        if worker_code:
            queryset = queryset.filter(worker__code=worker_code)

        if calculation_type:
            queryset = queryset.filter(calculation_type=calculation_type)

        return queryset


@extend_schema(
    tags=["ARKL"],
    summary="Retrieve ARKL result",
)
class ARKLResultDetailView(RetrieveAPIView):
    queryset = ARKL_RESULT_QUERYSET.all()
    serializer_class = ARKLResultSerializer

```

## `services/constants.py`

```python
from decimal import Decimal

H2S_PPM_TO_MG_M3 = Decimal("1.40")
H2S_RFC_MG_M3 = Decimal("0.002")

HOURS_PER_DAY = Decimal("24")
DAYS_PER_YEAR = Decimal("365")

ARKL_CALCULATION_VERSION = "1.1.0-MVP"

RQ_WITHIN_REFERENCE_LEVEL = "WITHIN_REFERENCE_LEVEL"
RQ_ABOVE_REFERENCE_LEVEL = "ABOVE_REFERENCE_LEVEL"

```

## `services/validation.py`

```python
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

from arkl.services.constants import (
    DAYS_PER_YEAR,
    HOURS_PER_DAY,
)


class ARKLValidationError(ValueError):
    pass


def to_decimal(
    value,
    field_name: str,
) -> Decimal:
    try:
        result = Decimal(str(value))
    except (
        InvalidOperation,
        ValueError,
        TypeError,
    ) as exc:
        raise ARKLValidationError(f"{field_name} must be numeric.") from exc

    if not result.is_finite():
        raise ARKLValidationError(f"{field_name} must be finite.")

    return result


@dataclass(frozen=True)
class ARKLInputData:
    concentration_ppm: Decimal
    body_weight_kg: Decimal
    exposure_time_hour_day: Decimal
    exposure_frequency_day_year: Decimal
    exposure_duration_year: Decimal
    inhalation_rate_m3_hour: Decimal


def validate_arkl_inputs(
    *,
    concentration_ppm,
    body_weight,
    exposure_time,
    exposure_frequency,
    exposure_duration,
    inhalation_rate,
) -> ARKLInputData:
    concentration = to_decimal(
        concentration_ppm,
        "concentration_ppm",
    )

    weight = to_decimal(
        body_weight,
        "body_weight",
    )

    exposure_time_value = to_decimal(
        exposure_time,
        "exposure_time",
    )

    exposure_frequency_value = to_decimal(
        exposure_frequency,
        "exposure_frequency",
    )

    duration = to_decimal(
        exposure_duration,
        "exposure_duration",
    )

    rate = to_decimal(
        inhalation_rate,
        "inhalation_rate",
    )

    if concentration < 0:
        raise ARKLValidationError("concentration_ppm cannot be negative.")

    if weight <= 0:
        raise ARKLValidationError("body_weight must be greater than zero.")

    if not (Decimal("0") <= exposure_time_value <= HOURS_PER_DAY):
        raise ARKLValidationError("exposure_time must be between 0 and 24 hour/day.")

    if not (Decimal("0") <= exposure_frequency_value <= DAYS_PER_YEAR):
        raise ARKLValidationError(
            "exposure_frequency must be between 0 and 365 day/year."
        )

    if duration <= 0:
        raise ARKLValidationError("exposure_duration must be greater than zero.")

    if rate < 0:
        raise ARKLValidationError("inhalation_rate cannot be negative.")

    return ARKLInputData(
        concentration_ppm=concentration,
        body_weight_kg=weight,
        exposure_time_hour_day=exposure_time_value,
        exposure_frequency_day_year=(exposure_frequency_value),
        exposure_duration_year=duration,
        inhalation_rate_m3_hour=rate,
    )

```

## `services/rq.py`

```python
from decimal import Decimal

from arkl.services.constants import H2S_RFC_MG_M3
from arkl.services.validation import (
    ARKLValidationError,
    to_decimal,
)


def calculate_rq(
    *,
    exposure_concentration_mg_m3,
    rfc=H2S_RFC_MG_M3,
) -> Decimal:
    exposure_concentration = to_decimal(
        exposure_concentration_mg_m3,
        "exposure_concentration_mg_m3",
    )

    reference_concentration = to_decimal(
        rfc,
        "rfc",
    )

    if exposure_concentration < 0:
        raise ARKLValidationError("exposure_concentration_mg_m3 cannot be negative.")

    if reference_concentration <= 0:
        raise ARKLValidationError("rfc must be greater than zero.")

    return exposure_concentration / reference_concentration

```

## `services/calculator.py`

```python
from django.db import transaction

from arkl.models import ARKLResult
from arkl.services.aggregation import calculate_mean_concentration
from arkl.services.constants import (
    ARKL_CALCULATION_VERSION,
    H2S_RFC_MG_M3,
)
from arkl.services.conversion import ppm_to_mg_m3
from arkl.services.exposure_concentration import (
    calculate_exposure_concentration,
)
from arkl.services.interpretation import interpret_rq
from arkl.services.rq import calculate_rq
from arkl.services.validation import (
    ARKLValidationError,
    validate_arkl_inputs,
)
from devices.models import Device, H2SReading
from exposure.models import ExposureProfile, Worker


class ARKLCalculationError(ValueError):
    pass


def _get_exposure_profile(
    worker: Worker,
) -> ExposureProfile:
    try:
        return worker.exposure_profile
    except ExposureProfile.DoesNotExist as exc:
        raise ARKLCalculationError("Worker does not have an exposure profile.") from exc


def _validate_active_device(
    device: Device,
) -> None:
    if not device.is_active:
        raise ARKLCalculationError("Device is inactive.")


def _get_latest_reading(
    device: Device,
) -> H2SReading:
    reading = (
        H2SReading.objects.filter(
            device=device,
        )
        .order_by(
            "-received_at",
            "-id",
        )
        .first()
    )

    if reading is None:
        raise ARKLCalculationError("No H2S reading available for this device.")

    return reading


def _calculate_values(
    *,
    concentration_ppm,
    exposure_profile: ExposureProfile,
) -> dict:
    validated = validate_arkl_inputs(
        concentration_ppm=concentration_ppm,
        body_weight=exposure_profile.body_weight,
        exposure_time=exposure_profile.exposure_time,
        exposure_frequency=(exposure_profile.exposure_frequency),
        exposure_duration=(exposure_profile.exposure_duration),
        inhalation_rate=(exposure_profile.inhalation_rate),
    )

    concentration_mg_m3 = ppm_to_mg_m3(validated.concentration_ppm)

    exposure_concentration_mg_m3 = calculate_exposure_concentration(
        concentration_mg_m3=(concentration_mg_m3),
        exposure_time_hour_day=(validated.exposure_time_hour_day),
        exposure_frequency_day_year=(validated.exposure_frequency_day_year),
    )

    rq = calculate_rq(
        exposure_concentration_mg_m3=(exposure_concentration_mg_m3),
        rfc=H2S_RFC_MG_M3,
    )

    return {
        "concentration_ppm": (validated.concentration_ppm),
        "concentration_mg_m3": (concentration_mg_m3),
        "exposure_concentration_mg_m3": (exposure_concentration_mg_m3),
        "body_weight": (validated.body_weight_kg),
        "exposure_time": (validated.exposure_time_hour_day),
        "exposure_frequency": (validated.exposure_frequency_day_year),
        "exposure_duration": (validated.exposure_duration_year),
        "inhalation_rate": (validated.inhalation_rate_m3_hour),
        "averaging_time": None,
        "intake": None,
        "rfc": H2S_RFC_MG_M3,
        "rq": rq,
        "interpretation": interpret_rq(rq),
    }


@transaction.atomic
def calculate_realtime_risk(
    *,
    worker: Worker,
    device: Device,
) -> ARKLResult:
    _validate_active_device(device)

    exposure_profile = _get_exposure_profile(worker)
    reading = _get_latest_reading(device)

    try:
        values = _calculate_values(
            concentration_ppm=reading.ppm,
            exposure_profile=exposure_profile,
        )
    except ARKLValidationError as exc:
        raise ARKLCalculationError(str(exc)) from exc

    return ARKLResult.objects.create(
        worker=worker,
        reading=reading,
        calculation_type=(ARKLResult.CalculationType.REALTIME),
        calculation_version=ARKL_CALCULATION_VERSION,
        source_simulated=reading.simulated,
        **values,
    )


@transaction.atomic
def calculate_historical_risk(
    *,
    worker: Worker,
    device: Device,
    period_start,
    period_end,
) -> ARKLResult:
    if period_start >= period_end:
        raise ARKLCalculationError("period_start must be earlier than period_end.")

    _validate_active_device(device)

    exposure_profile = _get_exposure_profile(worker)

    readings = list(
        H2SReading.objects.filter(
            device=device,
            received_at__gte=period_start,
            received_at__lte=period_end,
        ).order_by(
            "received_at",
            "id",
        )
    )

    if not readings:
        raise ARKLCalculationError("No H2S readings available in the selected period.")

    mean_ppm = calculate_mean_concentration([reading.ppm for reading in readings])

    try:
        values = _calculate_values(
            concentration_ppm=mean_ppm,
            exposure_profile=exposure_profile,
        )
    except ARKLValidationError as exc:
        raise ARKLCalculationError(str(exc)) from exc

    return ARKLResult.objects.create(
        worker=worker,
        reading=None,
        calculation_type=(ARKLResult.CalculationType.HISTORICAL),
        calculation_version=ARKL_CALCULATION_VERSION,
        source_simulated=any(reading.simulated for reading in readings),
        period_start=period_start,
        period_end=period_end,
        reading_count=len(readings),
        **values,
    )

```

## `services/exposure_concentration.py`

```python
from decimal import Decimal

from arkl.services.constants import (
    DAYS_PER_YEAR,
    HOURS_PER_DAY,
)
from arkl.services.validation import (
    ARKLValidationError,
    to_decimal,
)


def calculate_exposure_concentration(
    *,
    concentration_mg_m3,
    exposure_time_hour_day,
    exposure_frequency_day_year,
) -> Decimal:
    concentration = to_decimal(
        concentration_mg_m3,
        "concentration_mg_m3",
    )

    exposure_time = to_decimal(
        exposure_time_hour_day,
        "exposure_time_hour_day",
    )

    exposure_frequency = to_decimal(
        exposure_frequency_day_year,
        "exposure_frequency_day_year",
    )

    if concentration < 0:
        raise ARKLValidationError("concentration_mg_m3 cannot be negative.")

    if not Decimal("0") <= exposure_time <= HOURS_PER_DAY:
        raise ARKLValidationError("exposure_time_hour_day must be between 0 and 24.")

    if not Decimal("0") <= exposure_frequency <= DAYS_PER_YEAR:
        raise ARKLValidationError(
            "exposure_frequency_day_year must be between 0 and 365."
        )

    return (
        concentration
        * (exposure_time / HOURS_PER_DAY)
        * (exposure_frequency / DAYS_PER_YEAR)
    )

```

## `tests/test_exposure_concentration.py`

```python
from decimal import Decimal

import pytest

from arkl.services.exposure_concentration import (
    calculate_exposure_concentration,
)
from arkl.services.validation import ARKLValidationError


def test_full_time_exposure_equals_air_concentration():
    result = calculate_exposure_concentration(
        concentration_mg_m3=Decimal("14"),
        exposure_time_hour_day=Decimal("24"),
        exposure_frequency_day_year=Decimal("365"),
    )

    assert result == Decimal("14")


def test_partial_exposure_concentration():
    result = calculate_exposure_concentration(
        concentration_mg_m3=Decimal("14"),
        exposure_time_hour_day=Decimal("8"),
        exposure_frequency_day_year=Decimal("250"),
    )

    expected = (
        Decimal("14")
        * (Decimal("8") / Decimal("24"))
        * (Decimal("250") / Decimal("365"))
    )

    assert result == expected


def test_zero_concentration_produces_zero_exposure():
    result = calculate_exposure_concentration(
        concentration_mg_m3=0,
        exposure_time_hour_day=8,
        exposure_frequency_day_year=250,
    )

    assert result == Decimal("0")


def test_exposure_time_above_24_is_rejected():
    with pytest.raises(
        ARKLValidationError,
        match="must be between 0 and 24",
    ):
        calculate_exposure_concentration(
            concentration_mg_m3=14,
            exposure_time_hour_day=25,
            exposure_frequency_day_year=250,
        )


def test_exposure_frequency_above_365_is_rejected():
    with pytest.raises(
        ARKLValidationError,
        match="must be between 0 and 365",
    ):
        calculate_exposure_concentration(
            concentration_mg_m3=14,
            exposure_time_hour_day=8,
            exposure_frequency_day_year=366,
        )


def test_negative_concentration_is_rejected():
    with pytest.raises(
        ARKLValidationError,
        match="cannot be negative",
    ):
        calculate_exposure_concentration(
            concentration_mg_m3=-1,
            exposure_time_hour_day=8,
            exposure_frequency_day_year=250,
        )

```

## `tests/test_rq.py`

```python
from decimal import Decimal

import pytest

from arkl.services.rq import calculate_rq
from arkl.services.validation import ARKLValidationError


def test_zero_exposure_concentration_produces_zero_rq():
    result = calculate_rq(
        exposure_concentration_mg_m3=0,
    )

    assert result == Decimal("0")


def test_rq_equal_one():
    result = calculate_rq(
        exposure_concentration_mg_m3=Decimal("0.002"),
    )

    assert result == Decimal("1")


def test_rq_below_one():
    result = calculate_rq(
        exposure_concentration_mg_m3=Decimal("0.001"),
    )

    assert result == Decimal("0.5")


def test_rq_above_one():
    result = calculate_rq(
        exposure_concentration_mg_m3=Decimal("0.004"),
    )

    assert result == Decimal("2")


def test_zero_rfc_is_rejected():
    with pytest.raises(
        ARKLValidationError,
        match="rfc must be greater than zero",
    ):
        calculate_rq(
            exposure_concentration_mg_m3=1,
            rfc=0,
        )


def test_negative_exposure_concentration_is_rejected():
    with pytest.raises(
        ARKLValidationError,
        match="cannot be negative",
    ):
        calculate_rq(
            exposure_concentration_mg_m3=-1,
        )

```

## `tests/test_calculator.py`

```python
from datetime import timedelta
from decimal import Decimal

import pytest
from django.utils import timezone

from arkl.services.calculator import (
    ARKLCalculationError,
    calculate_historical_risk,
    calculate_realtime_risk,
)
from arkl.services.constants import ARKL_CALCULATION_VERSION
from devices.models import Device, H2SReading
from exposure.models import ExposureProfile, Worker


@pytest.mark.django_db
def test_realtime_risk_calculation_creates_result():
    device = Device.objects.create(
        device_code="H2S-REALTIME-001",
    )

    reading = H2SReading.objects.create(
        device=device,
        ppm=10,
        adc=500,
        filtered_adc=500,
        level=2,
        status="TEST",
        uptime_ms=1000,
        simulated=True,
    )

    worker = Worker.objects.create(
        code="PML-REALTIME-001",
    )

    ExposureProfile.objects.create(
        worker=worker,
        body_weight=55,
        exposure_time=8,
        exposure_frequency=250,
        exposure_duration=10,
        inhalation_rate=0.83,
    )

    result = calculate_realtime_risk(
        worker=worker,
        device=device,
    )

    assert result.pk is not None
    assert result.reading == reading
    assert result.calculation_type == "REALTIME"
    assert result.concentration_ppm == Decimal("10")
    assert result.concentration_mg_m3 == Decimal("14.00")
    assert result.rq > 0
    assert result.source_simulated is True
    assert result.calculation_version == ARKL_CALCULATION_VERSION


@pytest.mark.django_db
def test_realtime_uses_latest_reading():
    device = Device.objects.create(
        device_code="H2S-LATEST-001",
    )

    H2SReading.objects.create(
        device=device,
        ppm=5,
        adc=100,
        filtered_adc=100,
        level=1,
        status="TEST",
        uptime_ms=1000,
        simulated=True,
    )

    latest = H2SReading.objects.create(
        device=device,
        ppm=20,
        adc=200,
        filtered_adc=200,
        level=2,
        status="TEST",
        uptime_ms=2000,
        simulated=True,
    )

    worker = Worker.objects.create(
        code="PML-LATEST-001",
    )

    ExposureProfile.objects.create(
        worker=worker,
        body_weight=55,
        exposure_time=8,
        exposure_frequency=250,
        exposure_duration=10,
        inhalation_rate=0.83,
    )

    result = calculate_realtime_risk(
        worker=worker,
        device=device,
    )

    assert result.reading == latest
    assert result.concentration_ppm == Decimal("20")


@pytest.mark.django_db
def test_realtime_requires_exposure_profile():
    device = Device.objects.create(
        device_code="H2S-NO-PROFILE",
    )

    H2SReading.objects.create(
        device=device,
        ppm=10,
        adc=100,
        filtered_adc=100,
        level=1,
        status="TEST",
        uptime_ms=1000,
        simulated=True,
    )

    worker = Worker.objects.create(
        code="PML-NO-PROFILE",
    )

    with pytest.raises(
        ARKLCalculationError,
        match="does not have an exposure profile",
    ):
        calculate_realtime_risk(
            worker=worker,
            device=device,
        )


@pytest.mark.django_db
def test_realtime_requires_reading():
    device = Device.objects.create(
        device_code="H2S-NO-READING",
    )

    worker = Worker.objects.create(
        code="PML-NO-READING",
    )

    ExposureProfile.objects.create(
        worker=worker,
        body_weight=55,
        exposure_time=8,
        exposure_frequency=250,
        exposure_duration=10,
        inhalation_rate=0.83,
    )

    with pytest.raises(
        ARKLCalculationError,
        match="No H2S reading available",
    ):
        calculate_realtime_risk(
            worker=worker,
            device=device,
        )


@pytest.mark.django_db
def test_historical_risk_uses_mean_concentration():
    device = Device.objects.create(
        device_code="H2S-HIST-001",
    )

    worker = Worker.objects.create(
        code="PML-HIST-001",
    )

    ExposureProfile.objects.create(
        worker=worker,
        body_weight=55,
        exposure_time=8,
        exposure_frequency=250,
        exposure_duration=10,
        inhalation_rate=0.83,
    )

    now = timezone.now()
    readings = []

    for ppm in [10, 20, 30]:
        reading = H2SReading.objects.create(
            device=device,
            ppm=ppm,
            adc=100,
            filtered_adc=100,
            level=1,
            status="TEST",
            uptime_ms=1000,
            simulated=True,
        )
        readings.append(reading)

    for index, reading in enumerate(readings):
        timestamp = now - timedelta(minutes=30 - (index * 10))

        H2SReading.objects.filter(pk=reading.pk).update(received_at=timestamp)

    result = calculate_historical_risk(
        worker=worker,
        device=device,
        period_start=now - timedelta(hours=1),
        period_end=now,
    )

    assert result.pk is not None
    assert result.reading is None
    assert result.calculation_type == "HISTORICAL"
    assert result.reading_count == 3
    assert result.concentration_ppm == Decimal("20")
    assert result.concentration_mg_m3 == Decimal("28.00")
    assert result.source_simulated is True


@pytest.mark.django_db
def test_historical_requires_readings():
    device = Device.objects.create(
        device_code="H2S-HIST-EMPTY",
    )

    worker = Worker.objects.create(
        code="PML-HIST-EMPTY",
    )

    ExposureProfile.objects.create(
        worker=worker,
        body_weight=55,
        exposure_time=8,
        exposure_frequency=250,
        exposure_duration=10,
        inhalation_rate=0.83,
    )

    now = timezone.now()

    with pytest.raises(
        ARKLCalculationError,
        match="No H2S readings available",
    ):
        calculate_historical_risk(
            worker=worker,
            device=device,
            period_start=now - timedelta(hours=1),
            period_end=now,
        )


@pytest.mark.django_db
def test_historical_rejects_invalid_period():
    device = Device.objects.create(
        device_code="H2S-HIST-PERIOD",
    )

    worker = Worker.objects.create(
        code="PML-HIST-PERIOD",
    )

    now = timezone.now()

    with pytest.raises(
        ARKLCalculationError,
        match="period_start must be earlier",
    ):
        calculate_historical_risk(
            worker=worker,
            device=device,
            period_start=now,
            period_end=now,
        )


@pytest.mark.django_db
def test_realtime_rejects_inactive_device():
    device = Device.objects.create(
        device_code="H2S-INACTIVE",
        is_active=False,
    )

    H2SReading.objects.create(
        device=device,
        ppm=10,
        adc=100,
        filtered_adc=100,
        level=1,
        status="TEST",
        uptime_ms=1000,
        simulated=True,
    )

    worker = Worker.objects.create(
        code="PML-INACTIVE",
    )

    ExposureProfile.objects.create(
        worker=worker,
        body_weight=55,
        exposure_time=8,
        exposure_frequency=250,
        exposure_duration=10,
        inhalation_rate=0.83,
    )

    with pytest.raises(
        ARKLCalculationError,
        match="Device is inactive",
    ):
        calculate_realtime_risk(
            worker=worker,
            device=device,
        )
```

## `tests/test_models.py`

```python
from decimal import Decimal

import pytest

from arkl.models import ARKLResult
from arkl.services.constants import ARKL_CALCULATION_VERSION
from devices.models import Device, H2SReading
from exposure.models import Worker


@pytest.mark.django_db
def test_realtime_arkl_result_snapshot_can_be_stored():
    device = Device.objects.create(
        device_code="H2S-TPA-001",
    )

    reading = H2SReading.objects.create(
        device=device,
        ppm=10,
        adc=500,
        filtered_adc=500,
        level=2,
        status="TEST",
        uptime_ms=1000,
        simulated=True,
    )

    worker = Worker.objects.create(
        code="PML-001",
    )

    result = ARKLResult.objects.create(
        worker=worker,
        reading=reading,
        calculation_type=ARKLResult.CalculationType.REALTIME,
        concentration_ppm=Decimal("10"),
        concentration_mg_m3=Decimal("14"),
        exposure_concentration_mg_m3=Decimal("3.196347"),
        body_weight=Decimal("55"),
        exposure_time=Decimal("8"),
        exposure_frequency=Decimal("250"),
        exposure_duration=Decimal("10"),
        inhalation_rate=Decimal("0.83"),
        averaging_time=None,
        intake=None,
        rfc=Decimal("0.002"),
        rq=Decimal("1598.1735"),
        interpretation="ABOVE_REFERENCE_LEVEL",
        calculation_version=(ARKL_CALCULATION_VERSION),
        source_simulated=True,
    )

    result.refresh_from_db()

    assert result.pk is not None
    assert result.worker == worker
    assert result.reading == reading

    assert result.calculation_type == "REALTIME"

    assert result.exposure_concentration_mg_m3 is not None

    assert result.intake is None
    assert result.averaging_time is None

    assert result.calculation_version == ARKL_CALCULATION_VERSION


@pytest.mark.django_db
def test_legacy_v1_result_can_exist_without_exposure_concentration():
    worker = Worker.objects.create(
        code="PML-LEGACY-001",
    )

    result = ARKLResult.objects.create(
        worker=worker,
        calculation_type=(ARKLResult.CalculationType.HISTORICAL),
        concentration_ppm=Decimal("10"),
        concentration_mg_m3=Decimal("14"),
        exposure_concentration_mg_m3=None,
        body_weight=Decimal("55"),
        exposure_time=Decimal("8"),
        exposure_frequency=Decimal("250"),
        exposure_duration=Decimal("10"),
        inhalation_rate=Decimal("0.83"),
        averaging_time=Decimal("3650"),
        intake=Decimal("0.1"),
        rfc=Decimal("0.002"),
        rq=Decimal("50"),
        interpretation="ABOVE_REFERENCE_LEVEL",
        calculation_version="1.0.0-MVP",
        source_simulated=True,
    )

    result.refresh_from_db()

    assert result.calculation_version == "1.0.0-MVP"

    assert result.exposure_concentration_mg_m3 is None

    assert result.intake is not None

```

## `tests/test_api.py`

```python
from datetime import timedelta

import pytest
from django.utils import timezone

from arkl.models import ARKLResult
from devices.models import Device, H2SReading
from exposure.models import ExposureProfile, Worker


def create_worker_with_profile(
    code="PML-API-001",
):
    worker = Worker.objects.create(
        code=code,
    )

    ExposureProfile.objects.create(
        worker=worker,
        body_weight=55,
        exposure_time=8,
        exposure_frequency=250,
        exposure_duration=10,
        inhalation_rate=0.83,
    )

    return worker


def create_device_with_reading(
    code="H2S-API-001",
    ppm=10,
):
    device = Device.objects.create(
        device_code=code,
    )

    reading = H2SReading.objects.create(
        device=device,
        ppm=ppm,
        adc=500,
        filtered_adc=500,
        level=2,
        status="TEST",
        uptime_ms=1000,
        simulated=True,
    )

    return device, reading


@pytest.mark.django_db
def test_realtime_arkl_api_creates_result(client):
    worker = create_worker_with_profile()
    device, reading = create_device_with_reading()

    response = client.post(
        "/api/v1/arkl/realtime/",
        data={
            "worker": worker.pk,
            "device": device.pk,
        },
        content_type="application/json",
    )

    assert response.status_code == 201

    data = response.json()

    assert data["calculation_type"] == "REALTIME"
    assert data["worker"] == worker.pk
    assert data["reading"] == reading.pk
    assert data["calculation_version"] == "1.1.0-MVP"

    assert data["interpretation"] in {
        "WITHIN_REFERENCE_LEVEL",
        "ABOVE_REFERENCE_LEVEL",
    }

    assert ARKLResult.objects.count() == 1


@pytest.mark.django_db
def test_realtime_api_ignores_client_calculated_values(
    client,
):
    worker = create_worker_with_profile(
        code="PML-CLIENT-CALC",
    )

    device, _ = create_device_with_reading(
        code="H2S-CLIENT-CALC",
        ppm=10,
    )

    response = client.post(
        "/api/v1/arkl/realtime/",
        data={
            "worker": worker.pk,
            "device": device.pk,
            "rq": 0,
            "exposure_concentration_mg_m3": 0,
            "interpretation": "WITHIN_REFERENCE_LEVEL",
        },
        content_type="application/json",
    )

    assert response.status_code == 201

    data = response.json()

    assert float(data["rq"]) > 0

    assert float(data["exposure_concentration_mg_m3"]) > 0

    assert data["intake"] is None
    assert data["averaging_time"] is None

    assert data["calculation_version"] == "1.1.0-MVP"
    worker = Worker.objects.create(
        code="PML-NO-PROFILE-API",
    )

    device, _ = create_device_with_reading(
        code="H2S-NO-PROFILE-API",
    )

    response = client.post(
        "/api/v1/arkl/realtime/",
        data={
            "worker": worker.pk,
            "device": device.pk,
        },
        content_type="application/json",
    )

    assert response.status_code == 400

    assert "exposure profile" in response.json()["detail"].lower()


@pytest.mark.django_db
def test_realtime_api_invalid_worker_returns_400(client):
    device, _ = create_device_with_reading(
        code="H2S-BAD-WORKER",
    )

    response = client.post(
        "/api/v1/arkl/realtime/",
        data={
            "worker": 999999,
            "device": device.pk,
        },
        content_type="application/json",
    )

    assert response.status_code == 400
    assert "worker" in response.json()


@pytest.mark.django_db
def test_realtime_api_invalid_device_returns_400(client):
    worker = create_worker_with_profile(
        code="PML-BAD-DEVICE",
    )

    response = client.post(
        "/api/v1/arkl/realtime/",
        data={
            "worker": worker.pk,
            "device": 999999,
        },
        content_type="application/json",
    )

    assert response.status_code == 400
    assert "device" in response.json()


@pytest.mark.django_db
def test_historical_arkl_api_creates_result(client):
    worker = create_worker_with_profile(
        code="PML-HIST-API",
    )

    device = Device.objects.create(
        device_code="H2S-HIST-API",
    )

    now = timezone.now()

    readings = []

    for ppm in [10, 20, 30]:
        reading = H2SReading.objects.create(
            device=device,
            ppm=ppm,
            adc=100,
            filtered_adc=100,
            level=1,
            status="TEST",
            uptime_ms=1000,
            simulated=True,
        )

        readings.append(reading)

    for index, reading in enumerate(readings):
        timestamp = now - timedelta(minutes=30 - (index * 10))

        H2SReading.objects.filter(pk=reading.pk).update(received_at=timestamp)

    response = client.post(
        "/api/v1/arkl/historical/",
        data={
            "worker": worker.pk,
            "device": device.pk,
            "start_time": (now - timedelta(hours=1)).isoformat(),
            "end_time": now.isoformat(),
        },
        content_type="application/json",
    )

    assert response.status_code == 201

    data = response.json()

    assert data["calculation_type"] == "HISTORICAL"
    assert data["reading"] is None
    assert data["reading_count"] == 3

    assert float(data["concentration_ppm"]) == 20.0


@pytest.mark.django_db
def test_historical_api_invalid_period_returns_400(client):
    worker = create_worker_with_profile(
        code="PML-HIST-BAD-PERIOD",
    )

    device = Device.objects.create(
        device_code="H2S-HIST-BAD-PERIOD",
    )

    now = timezone.now()

    response = client.post(
        "/api/v1/arkl/historical/",
        data={
            "worker": worker.pk,
            "device": device.pk,
            "start_time": now.isoformat(),
            "end_time": now.isoformat(),
        },
        content_type="application/json",
    )

    assert response.status_code == 400
    assert "end_time" in response.json()


@pytest.mark.django_db
def test_historical_api_without_readings_returns_400(client):
    worker = create_worker_with_profile(
        code="PML-HIST-EMPTY-API",
    )

    device = Device.objects.create(
        device_code="H2S-HIST-EMPTY-API",
    )

    now = timezone.now()

    response = client.post(
        "/api/v1/arkl/historical/",
        data={
            "worker": worker.pk,
            "device": device.pk,
            "start_time": (now - timedelta(hours=1)).isoformat(),
            "end_time": now.isoformat(),
        },
        content_type="application/json",
    )

    assert response.status_code == 400

    assert "no h2s readings" in response.json()["detail"].lower()


@pytest.mark.django_db
def test_arkl_result_list_api(client):
    worker = create_worker_with_profile(
        code="PML-LIST-API",
    )

    device, _ = create_device_with_reading(
        code="H2S-LIST-API",
    )

    create_response = client.post(
        "/api/v1/arkl/realtime/",
        data={
            "worker": worker.pk,
            "device": device.pk,
        },
        content_type="application/json",
    )

    assert create_response.status_code == 201

    response = client.get("/api/v1/arkl/results/")

    assert response.status_code == 200

    data = response.json()

    assert data["count"] == 1
    assert len(data["results"]) == 1


@pytest.mark.django_db
def test_arkl_result_detail_api(client):
    worker = create_worker_with_profile(
        code="PML-DETAIL-API",
    )

    device, _ = create_device_with_reading(
        code="H2S-DETAIL-API",
    )

    create_response = client.post(
        "/api/v1/arkl/realtime/",
        data={
            "worker": worker.pk,
            "device": device.pk,
        },
        content_type="application/json",
    )

    assert create_response.status_code == 201

    result_id = create_response.json()["id"]

    response = client.get(f"/api/v1/arkl/results/{result_id}/")

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == result_id
    assert data["calculation_type"] == "REALTIME"


@pytest.mark.django_db
def test_arkl_result_filter_by_worker_code(client):
    worker = create_worker_with_profile(
        code="PML-FILTER-001",
    )

    device, _ = create_device_with_reading(
        code="H2S-FILTER-001",
    )

    create_response = client.post(
        "/api/v1/arkl/realtime/",
        data={
            "worker": worker.pk,
            "device": device.pk,
        },
        content_type="application/json",
    )

    assert create_response.status_code == 201

    response = client.get("/api/v1/arkl/results/?worker_code=PML-FILTER-001")

    assert response.status_code == 200
    assert response.json()["count"] == 1


@pytest.mark.django_db
def test_arkl_result_filter_by_calculation_type(client):
    worker = create_worker_with_profile(
        code="PML-TYPE-FILTER",
    )

    device, _ = create_device_with_reading(
        code="H2S-TYPE-FILTER",
    )

    create_response = client.post(
        "/api/v1/arkl/realtime/",
        data={
            "worker": worker.pk,
            "device": device.pk,
        },
        content_type="application/json",
    )

    assert create_response.status_code == 201

    response = client.get("/api/v1/arkl/results/?calculation_type=REALTIME")

    assert response.status_code == 200
    assert response.json()["count"] == 1

```
