from dataclasses import dataclass
from typing import Any


class TelemetryValidationError(ValueError):
    pass


@dataclass(frozen=True)
class TelemetryData:
    device_id: str
    ppm: float
    adc: int
    filtered_adc: float
    level: int
    status: str
    uptime_ms: int
    simulated: bool


REQUIRED_FIELDS = {
    "device_id",
    "ppm",
    "adc",
    "filtered_adc",
    "level",
    "status",
    "uptime_ms",
    "simulated",
}


CANONICAL_ENVIRONMENTAL_STATUSES = {
    "NORMAL",
    "CAUTION",
    "WARNING",
    "DANGER",
    "CRITICAL",
}


STATUS_ALIASES = {
    # Canonical values
    "NORMAL": "NORMAL",
    "CAUTION": "CAUTION",
    "WARNING": "WARNING",
    "DANGER": "DANGER",
    "CRITICAL": "CRITICAL",

    # Indonesian / firmware aliases
    "AMAN": "NORMAL",
    "WASPADA": "CAUTION",
    "PERINGATAN": "WARNING",
    "BAHAYA": "DANGER",
    "BAHAYA TINGGI": "CRITICAL",
}


def normalize_environmental_status(
    value: object,
) -> str:
    status = str(value).strip().upper()

    if not status:
        raise TelemetryValidationError(
            "status cannot be empty."
        )

    normalized = STATUS_ALIASES.get(status)

    if normalized is None:
        raise TelemetryValidationError(
            f"Unsupported environmental status: {status!r}."
        )

    return normalized


def validate_telemetry_payload(
    payload: dict[str, Any],
) -> TelemetryData:
    if not isinstance(payload, dict):
        raise TelemetryValidationError(
            "Telemetry payload must be a JSON object."
        )

    missing_fields = REQUIRED_FIELDS - payload.keys()

    if missing_fields:
        missing = ", ".join(
            sorted(missing_fields)
        )

        raise TelemetryValidationError(
            f"Missing required field(s): {missing}"
        )

    try:
        device_id = str(
            payload["device_id"]
        ).strip()

        ppm = float(
            payload["ppm"]
        )

        adc = int(
            payload["adc"]
        )

        filtered_adc = float(
            payload["filtered_adc"]
        )

        level = int(
            payload["level"]
        )

        uptime_ms = int(
            payload["uptime_ms"]
        )

        simulated = payload[
            "simulated"
        ]

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise TelemetryValidationError(
            "Telemetry contains invalid data types."
        ) from exc

    status = normalize_environmental_status(
        payload["status"]
    )

    if not device_id:
        raise TelemetryValidationError(
            "device_id cannot be empty."
        )

    if not isinstance(
        simulated,
        bool,
    ):
        raise TelemetryValidationError(
            "simulated must be boolean."
        )

    if ppm < 0:
        raise TelemetryValidationError(
            "ppm cannot be negative."
        )

    if not 0 <= adc <= 4095:
        raise TelemetryValidationError(
            "adc must be between 0 and 4095."
        )

    if not 0 <= filtered_adc <= 4095:
        raise TelemetryValidationError(
            (
                "filtered_adc must be "
                "between 0 and 4095."
            )
        )

    if level < 0:
        raise TelemetryValidationError(
            "level cannot be negative."
        )

    if uptime_ms < 0:
        raise TelemetryValidationError(
            "uptime_ms cannot be negative."
        )

    return TelemetryData(
        device_id=device_id,
        ppm=ppm,
        adc=adc,
        filtered_adc=filtered_adc,
        level=level,
        status=status,
        uptime_ms=uptime_ms,
        simulated=simulated,
    )