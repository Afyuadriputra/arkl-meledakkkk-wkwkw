from decimal import Decimal, InvalidOperation

from arkl.services.constants import H2S_PPM_TO_MG_M3


class ConcentrationConversionError(ValueError):
    pass


def _to_decimal(value, field_name: str) -> Decimal:
    try:
        result = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError) as exc:
        raise ConcentrationConversionError(f"{field_name} must be numeric.") from exc

    if not result.is_finite():
        raise ConcentrationConversionError(f"{field_name} must be finite.")

    return result


def ppm_to_mg_m3(ppm) -> Decimal:
    ppm_value = _to_decimal(ppm, "ppm")

    if ppm_value < 0:
        raise ConcentrationConversionError("ppm cannot be negative.")

    return ppm_value * H2S_PPM_TO_MG_M3
