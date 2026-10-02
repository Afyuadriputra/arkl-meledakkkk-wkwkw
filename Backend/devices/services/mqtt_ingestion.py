import json
import logging
from json import JSONDecodeError

from django.db import DatabaseError, transaction

from devices.models import Device, H2SReading
from devices.services.telemetry import (
    TelemetryValidationError,
    validate_telemetry_payload,
)

from arkl.services.automatic import (
    process_reading_for_assigned_workers,
)

logger = logging.getLogger("smart_h2s.mqtt")


class MQTTIngestionError(Exception):
    pass


def ingest_mqtt_message(
    topic: str,
    raw_payload: bytes | str,
) -> H2SReading | None:
    try:
        if isinstance(raw_payload, bytes):
            raw_payload = raw_payload.decode("utf-8")

        payload = json.loads(raw_payload)

    except (
        UnicodeDecodeError,
        JSONDecodeError,
        TypeError,
    ):
        logger.warning(
            "mqtt_payload_rejected topic=%s reason=invalid_json",
            topic,
        )

        return None

    try:
        telemetry = validate_telemetry_payload(payload)

    except TelemetryValidationError as exc:
        logger.warning(
            "mqtt_payload_rejected topic=%s reason=%s",
            topic,
            str(exc),
        )

        return None

    try:
        with transaction.atomic():
            device, created = Device.objects.get_or_create(
                device_code=telemetry.device_id,
                defaults={
                    "name": telemetry.device_id,
                },
            )

            reading = H2SReading.objects.create(
                device=device,
                ppm=telemetry.ppm,
                adc=telemetry.adc,
                filtered_adc=telemetry.filtered_adc,
                level=telemetry.level,
                status=telemetry.status,
                uptime_ms=telemetry.uptime_ms,
                simulated=telemetry.simulated,
            )

    except DatabaseError as exc:
        logger.exception(
            "mqtt_database_error topic=%s device=%s",
            topic,
            telemetry.device_id,
        )

        raise MQTTIngestionError("Failed to store MQTT telemetry.") from exc

    logger.info(
        (
            "mqtt_message_stored "
            "topic=%s device=%s reading_id=%s "
            "ppm=%.3f simulated=%s new_device=%s"
        ),
        topic,
        telemetry.device_id,
        reading.pk,
        telemetry.ppm,
        telemetry.simulated,
        created,
    )

    try:
        processing_result = (
            process_reading_for_assigned_workers(
                reading=reading
            )
        )

    except Exception:
        logger.exception(
            (
                "mqtt_automatic_arkl_unexpected_error "
                "reading_id=%s "
                "device=%s"
            ),
            reading.pk,
            telemetry.device_id,
        )

    else:
        logger.info(
            (
             "mqtt_automatic_arkl_finished "
             "reading_id=%s "
             "processed=%s "
             "succeeded=%s "
             "skipped=%s "
             "failed=%s"
            ),
            reading.pk,
            processing_result.processed,
            processing_result.succeeded,
            processing_result.skipped,
            processing_result.failed,
        )

    return reading
