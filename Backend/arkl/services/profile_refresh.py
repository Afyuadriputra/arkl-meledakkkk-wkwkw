"""Refresh realtime risk after profile/review/device changes, without frontend maths."""
import logging
from decimal import Decimal

from django.db import transaction

from arkl.models import ARKLResult
from arkl.services.realtime import RealtimeARKLError, run_realtime_arkl_for_reading
from devices.models import H2SReading
from exposure.models import ExposureProfile, Worker

logger = logging.getLogger("smart_h2s.arkl.profile_refresh")


def calculation_prerequisite_status(worker):
    if not worker.is_active:
        return "WORKER_INACTIVE"
    if not worker.monitoring_device_id:
        return "DEVICE_UNASSIGNED"
    if not worker.monitoring_device.is_active:
        return "DEVICE_INACTIVE"
    profile = ExposureProfile.objects.filter(worker=worker).first()
    if profile is None:
        return "EXPOSURE_MISSING"
    if profile.approval_status == ExposureProfile.ApprovalStatus.REJECTED:
        return "PROFILE_REJECTED"
    if not H2SReading.objects.filter(device_id=worker.monitoring_device_id).exists():
        return "NO_IOT_READING"
    return "READY"


@transaction.atomic
def refresh_worker_realtime_risk(worker):
    # Match MQTT's worker lock; never choose a device or fabricate readings.
    worker = Worker.objects.select_for_update().select_related("monitoring_device").get(pk=worker.pk)
    from arkl.services.reference import refresh_worker_reference_risk
    refresh_worker_reference_risk(worker)
    prerequisite = calculation_prerequisite_status(worker)
    if prerequisite != "READY":
        return prerequisite
    profile = ExposureProfile.objects.select_for_update().get(worker=worker)
    reading = H2SReading.objects.filter(device_id=worker.monitoring_device_id).order_by("-received_at", "-id").first()
    last = ARKLResult.objects.filter(worker=worker, calculation_type="REALTIME").order_by("-id").first()
    verified = profile.approval_status == ExposureProfile.ApprovalStatus.APPROVED
    fields = ("body_weight", "exposure_time", "exposure_frequency", "exposure_duration", "inhalation_rate")
    # An identical save/ACC does not create a duplicate result or alert evaluation.
    if (last and last.reading_id == reading.pk and last.exposure_profile_verified == verified
            and all(getattr(last, field) == Decimal(str(getattr(profile, field)))
                    for field in fields)):
        return "CALCULATED"
    try:
        run_realtime_arkl_for_reading(worker=worker, reading=reading)
    except RealtimeARKLError:
        # Missing/invalid prerequisites must not discard the successfully saved profile.
        logger.warning("profile_refresh_failed worker_id=%s", worker.pk, exc_info=True)
        return "CALCULATION_FAILED"
    return "CALCULATED"
