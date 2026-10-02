from decimal import Decimal

# H2S concentration conversion.
H2S_PPM_TO_MG_M3 = Decimal("1.40")

# Current H2S reference value.
#
# IMPORTANT:
# Verify the scientific source and unit compatibility with the
# intake-based ARKL calculation before publication/final research use.
H2S_RFC = Decimal("0.002")

HOURS_PER_DAY = Decimal("24")
DAYS_PER_YEAR = Decimal("365")

# ARKL v2 uses the intake-based inhalation formula:
#
# I = (C × R × tE × fE × Dt) / (Wb × tavg)
# RQ = I / RfC
ARKL_CALCULATION_VERSION = "2.0.0-MVP"

RQ_WITHIN_REFERENCE_LEVEL = "WITHIN_REFERENCE_LEVEL"
RQ_ABOVE_REFERENCE_LEVEL = "ABOVE_REFERENCE_LEVEL"