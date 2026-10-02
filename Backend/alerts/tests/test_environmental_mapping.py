import pytest

from alerts.services.constants import EnvironmentalSeverity
from alerts.services.environmental_mapping import (
    normalize_environmental_status,
)
from alerts.services.exceptions import AlertValidationError


@pytest.mark.parametrize(
    ("status", "expected"),
    [
        ("NORMAL", EnvironmentalSeverity.NORMAL),
        ("CAUTION", EnvironmentalSeverity.CAUTION),
        ("WARNING", EnvironmentalSeverity.WARNING),
        ("DANGER", EnvironmentalSeverity.DANGER),
        ("CRITICAL", EnvironmentalSeverity.CRITICAL),
        (" normal ", EnvironmentalSeverity.NORMAL),
        ("warning", EnvironmentalSeverity.WARNING),
    ],
)
def test_environmental_status_normalization(
    status,
    expected,
):
    result = normalize_environmental_status(status)

    assert result == expected


def test_enum_input_is_accepted():
    result = normalize_environmental_status(EnvironmentalSeverity.WARNING)

    assert result == EnvironmentalSeverity.WARNING


def test_unknown_status_is_rejected():
    with pytest.raises(
        AlertValidationError,
        match="Unsupported environmental status",
    ):
        normalize_environmental_status("UNKNOWN")


def test_non_string_status_is_rejected():
    with pytest.raises(
        AlertValidationError,
        match="must be a string",
    ):
        normalize_environmental_status(123)
