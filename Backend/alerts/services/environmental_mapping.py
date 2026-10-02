from alerts.services.constants import EnvironmentalSeverity
from alerts.services.exceptions import AlertValidationError

_CANONICAL_STATUSES = {
    EnvironmentalSeverity.NORMAL.value: EnvironmentalSeverity.NORMAL,
    EnvironmentalSeverity.CAUTION.value: EnvironmentalSeverity.CAUTION,
    EnvironmentalSeverity.WARNING.value: EnvironmentalSeverity.WARNING,
    EnvironmentalSeverity.DANGER.value: EnvironmentalSeverity.DANGER,
    EnvironmentalSeverity.CRITICAL.value: EnvironmentalSeverity.CRITICAL,
}


def normalize_environmental_status(
    status,
) -> EnvironmentalSeverity:
    if isinstance(status, EnvironmentalSeverity):
        return status

    if not isinstance(status, str):
        raise AlertValidationError("Environmental status must be a string.")

    normalized = status.strip().upper()

    try:
        return _CANONICAL_STATUSES[normalized]
    except KeyError as exc:
        raise AlertValidationError(
            f"Unsupported environmental status: {status!r}."
        ) from exc
