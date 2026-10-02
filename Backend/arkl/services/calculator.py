from django.db import transaction

from arkl.models import ARKLResult
from arkl.services.aggregation import (
    calculate_mean_concentration,
)
from arkl.services.constants import (
    ARKL_CALCULATION_VERSION,
    H2S_RFC,
)
from arkl.services.conversion import (
    ppm_to_mg_m3,
)
from arkl.services.intake import (
    calculate_averaging_time,
    calculate_intake,
)
from arkl.services.interpretation import (
    interpret_rq,
)
from arkl.services.rq import (
    calculate_rq,
)
from arkl.services.validation import (
    ARKLValidationError,
    validate_arkl_inputs,
)
from devices.models import (
    Device,
    H2SReading,
)
from exposure.models import (
    ExposureProfile,
    Worker,
)


class ARKLCalculationError(ValueError):
    pass


def _validate_active_worker(
    worker: Worker,
) -> None:
    if not worker.is_active:
        raise ARKLCalculationError(
            "Worker is inactive."
        )


def _validate_active_device(
    device: Device,
) -> None:
    if not device.is_active:
        raise ARKLCalculationError(
            "Device is inactive."
        )


def _validate_realtime_assignment(
    *,
    worker: Worker,
    device: Device,
) -> None:
    """
    REALTIME ARKL must use the monitoring
    device currently assigned to the Worker.

    Historical analysis intentionally does not
    use this rule because historical exposure
    may refer to a different device or period.
    """
    if worker.monitoring_device_id is None:
        raise ARKLCalculationError(
            "Worker does not have an assigned "
            "monitoring device."
        )

    if (
        worker.monitoring_device_id
        != device.id
    ):
        raise ARKLCalculationError(
            "Device is not assigned to this worker."
        )


def _get_exposure_profile(
    worker: Worker,
) -> ExposureProfile:
    try:
        profile = ExposureProfile.objects.select_for_update().get(worker=worker)
    except ExposureProfile.DoesNotExist as exc:
        raise ARKLCalculationError(
            "Worker does not have an exposure profile."
        ) from exc

    if profile.approval_status == ExposureProfile.ApprovalStatus.REJECTED:
        raise ARKLCalculationError(
            "Exposure profile requires correction before risk calculation."
        )
    return profile


def _get_latest_reading(
    device: Device,
) -> H2SReading:
    reading = (
        H2SReading.objects
        .filter(
            device=device,
        )
        .order_by(
            "-received_at",
            "-id",
        )
        .first()
    )

    if reading is None:
        raise ARKLCalculationError(
            "No H2S reading available for this device."
        )

    return reading


def _calculate_values(
    *,
    concentration_ppm,
    exposure_profile: ExposureProfile,
) -> dict:
    """
    Calculate ARKL inhalation risk.

    Pipeline:

        ppm
        ↓
        concentration mg/m³
        ↓
        averaging time
        ↓
        intake
        ↓
        RQ
        ↓
        interpretation

    Formula:

        I = (C × R × tE × fE × Dt)
            -----------------------
                  Wb × tavg

        RQ = I / RfC
    """
    validated = validate_arkl_inputs(
        concentration_ppm=concentration_ppm,
        body_weight=(
            exposure_profile.body_weight
        ),
        exposure_time=(
            exposure_profile.exposure_time
        ),
        exposure_frequency=(
            exposure_profile.exposure_frequency
        ),
        exposure_duration=(
            exposure_profile.exposure_duration
        ),
        inhalation_rate=(
            exposure_profile.inhalation_rate
        ),
    )

    concentration_mg_m3 = (
        ppm_to_mg_m3(
            validated.concentration_ppm
        )
    )

    averaging_time = (
        calculate_averaging_time(
            validated.exposure_duration_year
        )
    )

    intake = calculate_intake(
        concentration_mg_m3=(
            concentration_mg_m3
        ),
        inhalation_rate_m3_hour=(
            validated.inhalation_rate_m3_hour
        ),
        exposure_time_hour_day=(
            validated.exposure_time_hour_day
        ),
        exposure_frequency_day_year=(
            validated.exposure_frequency_day_year
        ),
        exposure_duration_year=(
            validated.exposure_duration_year
        ),
        body_weight_kg=(
            validated.body_weight_kg
        ),
        averaging_time_day=(
            averaging_time
        ),
    )

    rq = calculate_rq(
        intake=intake,
        rfc=H2S_RFC,
    )

    interpretation = (
        interpret_rq(rq)
    )

    return {
        "exposure_profile_verified": (
            exposure_profile.approval_status == ExposureProfile.ApprovalStatus.APPROVED
        ),
        "concentration_ppm": (
            validated.concentration_ppm
        ),
        "concentration_mg_m3": (
            concentration_mg_m3
        ),

        # Nullable legacy/research field.
        "exposure_concentration_mg_m3": None,

        # Exposure profile snapshot.
        "body_weight": (
            validated.body_weight_kg
        ),
        "exposure_time": (
            validated.exposure_time_hour_day
        ),
        "exposure_frequency": (
            validated.exposure_frequency_day_year
        ),
        "exposure_duration": (
            validated.exposure_duration_year
        ),
        "inhalation_rate": (
            validated.inhalation_rate_m3_hour
        ),

        # ARKL outputs.
        "averaging_time": (
            averaging_time
        ),
        "intake": intake,
        "rfc": H2S_RFC,
        "rq": rq,
        "interpretation": (
            interpretation
        ),
    }


@transaction.atomic
def calculate_realtime_risk(
    *,
    worker: Worker,
    device: Device,
) -> ARKLResult:
    """
    Calculate and persist one REALTIME
    ARKLResult.

    Validation order intentionally reports
    missing domain prerequisites before the
    Worker ↔ Device assignment invariant.
    """
    _validate_active_worker(
        worker
    )

    _validate_active_device(
        device
    )

    exposure_profile = (
        _get_exposure_profile(
            worker
        )
    )

    reading = (
        _get_latest_reading(
            device
        )
    )

    _validate_realtime_assignment(
        worker=worker,
        device=device,
    )

    try:
        values = _calculate_values(
            concentration_ppm=(
                reading.ppm
            ),
            exposure_profile=(
                exposure_profile
            ),
        )
    except ARKLValidationError as exc:
        raise ARKLCalculationError(
            str(exc)
        ) from exc

    return ARKLResult.objects.create(
        worker=worker,
        reading=reading,
        calculation_type=(
            ARKLResult
            .CalculationType
            .REALTIME
        ),
        calculation_version=(
            ARKL_CALCULATION_VERSION
        ),
        source_simulated=(
            reading.simulated
        ),
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
    """
    Calculate ARKL from the arithmetic mean
    of readings in one historical period.

    Historical calculation does not create
    realtime Alerts and does not require the
    Device to be the Worker's current
    monitoring assignment.
    """
    if (
        period_start
        >= period_end
    ):
        raise ARKLCalculationError(
            "period_start must be earlier "
            "than period_end."
        )

    _validate_active_worker(
        worker
    )

    _validate_active_device(
        device
    )

    exposure_profile = (
        _get_exposure_profile(
            worker
        )
    )

    readings = list(
        H2SReading.objects
        .filter(
            device=device,
            received_at__gte=(
                period_start
            ),
            received_at__lte=(
                period_end
            ),
        )
        .order_by(
            "received_at",
            "id",
        )
    )

    if not readings:
        raise ARKLCalculationError(
            "No H2S readings available "
            "in the selected period."
        )

    mean_ppm = (
        calculate_mean_concentration(
            [
                reading.ppm
                for reading
                in readings
            ]
        )
    )

    try:
        values = _calculate_values(
            concentration_ppm=(
                mean_ppm
            ),
            exposure_profile=(
                exposure_profile
            ),
        )
    except ARKLValidationError as exc:
        raise ARKLCalculationError(
            str(exc)
        ) from exc

    return ARKLResult.objects.create(
        worker=worker,
        reading=None,
        calculation_type=(
            ARKLResult
            .CalculationType
            .HISTORICAL
        ),
        calculation_version=(
            ARKL_CALCULATION_VERSION
        ),
        source_simulated=any(
            reading.simulated
            for reading
            in readings
        ),
        period_start=(
            period_start
        ),
        period_end=(
            period_end
        ),
        reading_count=(
            len(readings)
        ),
        **values,
    )


@transaction.atomic
def calculate_realtime_risk_from_reading(
    *,
    worker: Worker,
    reading: H2SReading,
) -> ARKLResult:
    """
    Calculate REALTIME ARKL using one exact
    persisted H2SReading.

    Intended for automatic MQTT orchestration.
    """
    device = reading.device

    _validate_active_worker(
        worker
    )

    _validate_active_device(
        device
    )

    exposure_profile = (
        _get_exposure_profile(
            worker
        )
    )

    _validate_realtime_assignment(
        worker=worker,
        device=device,
    )

    try:
        values = _calculate_values(
            concentration_ppm=(
                reading.ppm
            ),
            exposure_profile=(
                exposure_profile
            ),
        )
    except ARKLValidationError as exc:
        raise ARKLCalculationError(
            str(exc)
        ) from exc

    return ARKLResult.objects.create(
        worker=worker,
        reading=reading,
        calculation_type=(
            ARKLResult
            .CalculationType
            .REALTIME
        ),
        calculation_version=(
            ARKL_CALCULATION_VERSION
        ),
        source_simulated=(
            reading.simulated
        ),
        **values,
    )
