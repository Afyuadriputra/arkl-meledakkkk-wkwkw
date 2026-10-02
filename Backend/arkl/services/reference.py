"""Reference measurements reuse ARKL maths without fabricating IoT telemetry."""

from django.db import transaction
from django.utils import timezone

from arkl.models import ARKLResult, ReferenceMeasurement
from arkl.services.calculator import (
    ARKLCalculationError,
    _calculate_values,
    _get_exposure_profile,
)
from arkl.services.constants import ARKL_CALCULATION_VERSION
from arkl.services.validation import ARKLValidationError
from exposure.models import Worker


@transaction.atomic
def calculate_reference_risk(*, worker, measurement):
    # Lock ordering matches profile refresh and MQTT (Worker -> ExposureProfile).
    worker = Worker.objects.select_for_update().get(pk=worker.pk)
    if not worker.is_active:
        raise ARKLCalculationError("Worker is inactive.")
    profile = _get_exposure_profile(worker)
    measurement = ReferenceMeasurement.objects.select_for_update().get(
        pk=measurement.pk
    )
    if not measurement.workers.filter(pk=worker.pk).exists():
        raise ARKLCalculationError(
            "Pengukuran referensi tidak ditetapkan untuk pekerja ini."
        )
    if not measurement.location.strip():
        raise ARKLCalculationError(
            "Lokasi pengukuran referensi harus dilengkapi sebelum digunakan."
        )
    if measurement.measured_at > timezone.now():
        raise ARKLCalculationError("Waktu pengukuran tidak boleh di masa depan.")
    try:
        values = _calculate_values(
            concentration_ppm=measurement.concentration_ppm, exposure_profile=profile
        )
    except ARKLValidationError as exc:
        raise ARKLCalculationError(str(exc)) from exc
    # Repeat requests for unchanged inputs are idempotent; profile changes create
    # a new snapshot rather than relabelling/recalculating previous results.
    last = (
        ARKLResult.objects.filter(
            worker=worker,
            reference_measurement=measurement,
            calculation_type="REFERENCE",
        )
        .order_by("-id")
        .first()
    )
    snapshot_fields = (
        "body_weight",
        "exposure_time",
        "exposure_frequency",
        "exposure_duration",
        "inhalation_rate",
        "exposure_profile_verified",
    )
    if last and all(getattr(last, field) == values[field] for field in snapshot_fields):
        return last
    return ARKLResult.objects.create(
        worker=worker,
        reference_measurement=measurement,
        calculation_type="REFERENCE",
        calculation_version=ARKL_CALCULATION_VERSION,
        source_simulated=False,
        **values,
    )


def refresh_worker_reference_risk(worker):
    measurement = worker.reference_measurements.order_by("-measured_at", "-id").first()
    if measurement is None:
        return "REFERENCE_UNASSIGNED"
    try:
        calculate_reference_risk(worker=worker, measurement=measurement)
    except ARKLCalculationError:
        return "REFERENCE_NOT_READY"
    return "CALCULATED"
