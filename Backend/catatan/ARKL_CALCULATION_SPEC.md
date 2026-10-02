# ARKL Calculation Specification

**Project:** Smart H₂S — Environmental Health Risk Assessment
**Module:** Layer 3 — Smart ARKL Services
**Document:** `ARKL_CALCULATION_SPEC.md`
**Version:** `1.1.0-MVP`
**Status:** `MVP SCIENTIFIC LOCK`
**Last Updated:** 20 August 2026

---

# 1. Purpose

Dokumen ini merupakan **source of truth metodologi perhitungan risiko inhalasi H₂S untuk MVP Smart H₂S**.

Tujuan utama:

- deterministic;
- reproducible;
- dimensionally consistent;
- menggunakan satuan eksplisit;
- konstanta terdokumentasi;
- calculation versioned;
- tidak bergantung pada AI/LLM;
- dapat diuji menggunakan known-case tests;
- dapat diaudit kembali ketika metodologi penelitian berubah.

Prinsip:

```text
DEFINE THE SCIENCE
        ↓
IMPLEMENT THE SCIENCE
        ↓
TEST THE IMPLEMENTATION
        ↓
VERSION THE RESULT
```

---

# 2. Methodology Change — v1.1.0

Version `1.0.0-MVP` menggunakan:

```text
Intake (mg/kg-day)
        ↓
Intake / RfC (mg/m³)
        ↓
RQ
```

Pendekatan tersebut dihentikan sebagai primary H₂S risk calculation karena numerator dan denominator tidak menggunakan dimensi yang sama.

Version `1.1.0-MVP` menggunakan:

```text
Exposure Concentration (mg/m³)
        ↓
Exposure Concentration / RfC (mg/m³)
        ↓
RQ / HQ
```

Sehingga:

```text
mg/m³
──────
mg/m³

=
dimensionless
```

Status:

```text
LOCKED FOR MVP v1.1
```

---

# 3. MVP Scope

MVP Layer 3 melakukan analisis:

```text
Pollutant       : Hydrogen Sulfide / H₂S
Exposure route  : Inhalation
Risk type       : Non-carcinogenic
Primary metric  : Risk Quotient / Hazard Quotient
Reference value : Inhalation RfC
```

Sistem tidak melakukan:

```text
medical diagnosis
ISPA probability prediction
clinical diagnosis
individual disease prediction
```

RQ/HQ adalah:

```text
risk characterization relative to a reference concentration
```

bukan probability penyakit.

---

# 4. Calculation Pipeline

Pipeline v1.1:

```text
H₂S Reading
     +
Exposure Pattern
     ↓
Input Validation
     ↓
ppm → mg/m³
     ↓
Exposure Concentration Adjustment
     ↓
RfC
     ↓
RQ / HQ
     ↓
Interpretation
     ↓
ARKLResult
```

Backend:

```text
React
  ↓
API View
  ↓
Serializer
  ↓
calculator.py
  ↓
Pure Calculation Services
  ↓
ARKLResult
  ↓
SQLite
```

---

# 5. Architectural Rules

Scientific calculation hanya boleh berada di:

```text
arkl/services/
```

Target:

```text
arkl/
├── models.py
├── serializers.py
├── views.py
├── urls.py
└── services/
    ├── constants.py
    ├── conversion.py
    ├── validation.py
    ├── aggregation.py
    ├── exposure_concentration.py
    ├── rq.py
    ├── interpretation.py
    └── calculator.py
```

Tidak boleh ada formula di:

```text
React
views.py
serializers.py
models.py
AI / LLM
```

---

# 6. Deterministic Requirement

```text
same inputs
+
same constants
+
same calculation version
=
same result
```

Dilarang menggunakan:

```text
randomness
LLM-generated numeric values
hidden defaults
non-versioned constants
silent unit conversion
```

---

# 7. Scientific Separation

## Layer 1

Tujuan:

```text
environmental monitoring
realtime operational warning
OLED / LED / buzzer
environmental status
```

Referensi dapat berupa:

```text
NIOSH REL
OSHA PEL
NIOSH IDLH
acute effect literature
```

Contoh:

```text
NIOSH IDLH = 100 ppm
```

Nilai tersebut bukan RfC.

## Layer 3

Digunakan untuk:

```text
exposure characterization
non-cancer inhalation risk characterization
RQ / HQ
```

Layer 1 threshold tidak digunakan sebagai penyebut RQ.

---

# 8. Environmental Data

Source:

```text
Device
   ↓
H2SReading
```

Fields:

```text
ppm
device
received_at
simulated
```

Realtime menggunakan latest deterministic reading:

```text
ORDER BY received_at DESC, id DESC
```

---

# 9. Exposure Data

Source:

```text
Worker
   ↓
ExposureProfile
```

ExposureProfile dapat tetap menyimpan:

```text
body_weight
exposure_time
exposure_frequency
exposure_duration
inhalation_rate
```

Namun pada calculation version `1.1.0-MVP`, parameter yang digunakan langsung untuk RQ/HQ adalah:

```text
exposure_time
exposure_frequency
```

Parameter berikut tetap disimpan untuk kebutuhan penelitian tetapi tidak masuk primary HQ calculation:

```text
body_weight
inhalation_rate
exposure_duration
```

`exposure_duration` tetap dapat disimpan sebagai metadata exposure scenario dan digunakan dalam explicit EC equation, tetapi pada satu chronic non-cancer exposure period nilainya saling menghilangkan dengan averaging time.

Tidak ada hidden defaults.

---

# 10. Sensor Concentration Unit

Layer 1:

```text
ppm
```

Status:

```text
LOCKED
```

---

# 11. Calculation Concentration Unit

Layer 3:

```text
mg/m³
```

Status:

```text
LOCKED
```

---

# 12. H₂S Conversion

Constant:

```text
H2S_PPM_TO_MG_M3 = 1.40
```

Formula:

```text
C_mg_m3 = C_ppm × 1.40
```

Example:

```text
10 ppm
× 1.40
=
14.00 mg/m³
```

Implementation:

```text
arkl/services/conversion.py
```

---

# 13. Exposure Concentration

Primary exposure metric:

```text
EC
```

Meaning:

```text
time-adjusted inhalation exposure concentration
```

Unit:

```text
mg/m³
```

EPA-compatible equation:

```text
EC = (CA × ET × EF × ED) / AT
```

Where:

```text
CA = concentration in air, mg/m³
ET = exposure time, hour/day
EF = exposure frequency, day/year
ED = exposure duration, year
AT = averaging time, hour
```

For chronic/subchronic non-cancer exposure:

```text
AT = ED × 365 × 24
```

Therefore for a single exposure period:

```text
EC
=
CA × ET × EF × ED
─────────────────
ED × 365 × 24
```

ED cancels:

```text
EC
=
CA × (ET / 24) × (EF / 365)
```

MVP implementation may therefore use the simplified but equivalent equation:

```text
EC = CA × (ET / 24) × (EF / 365)
```

Status:

```text
LOCKED FOR MVP v1.1
```

---

# 14. Exposure Time — ET

```text
Model field : exposure_time
Unit        : hour/day
```

Validation:

```text
0 <= ET <= 24
```

Status:

```text
LOCKED
```

---

# 15. Exposure Frequency — EF

```text
Model field : exposure_frequency
Unit        : day/year
```

Validation:

```text
0 <= EF <= 365
```

Status:

```text
LOCKED
```

---

# 16. Exposure Duration — ED

```text
Model field : exposure_duration
Unit        : year
```

Exposure duration remains part of the exposure profile.

For one chronic non-cancer period:

```text
AT = ED × 365 × 24
```

therefore ED cancels from the simplified EC result.

This does not mean exposure duration is scientifically irrelevant in all scenarios.

It remains relevant for:

```text
exposure scenario classification
multiple exposure periods
research metadata
subchronic/chronic interpretation
future methodological extensions
```

Constraint:

```text
ED > 0
```

for persisted active exposure scenarios.

---

# 17. Body Weight

```text
Model field : body_weight
Unit        : kg
```

Status:

```text
RETAINED AS RESEARCH DATA
NOT USED IN PRIMARY v1.1 RQ FORMULA
```

The backend must not delete this parameter merely because version 1.1 does not use it for HQ calculation.

---

# 18. Inhalation Rate

```text
Model field : inhalation_rate
Unit        : m³/hour
```

Status:

```text
RETAINED AS RESEARCH DATA
NOT USED IN PRIMARY v1.1 RQ FORMULA
```

It may be used by future dose-oriented research calculations but not by the current EPA-compatible RfC comparison.

---

# 19. Reference Concentration

H₂S inhalation RfC:

```text
0.002 mg/m³
```

Constant:

```text
H2S_RFC_MG_M3 = Decimal("0.002")
```

Purpose:

```text
non-carcinogenic inhalation reference concentration
```

It is not:

```text
NIOSH REL
OSHA PEL
NIOSH IDLH
RfD
```

Status:

```text
LOCKED FOR MVP v1.1
```

---

# 20. Risk Quotient / Hazard Quotient

Primary formula:

```text
        EC
RQ = ───────
       RfC
```

Equivalent terminology:

```text
Hazard Quotient / HQ
```

Within this project the API may continue using:

```text
rq
```

for compatibility with the ARKL research terminology.

Scientific documentation must state:

```text
rq is a concentration-based inhalation hazard quotient
```

Units:

```text
EC  = mg/m³
RfC = mg/m³
RQ  = dimensionless
```

Implementation:

```text
arkl/services/rq.py
```

---

# 21. Interpretation

If:

```text
RQ <= 1
```

return:

```text
WITHIN_REFERENCE_LEVEL
```

If:

```text
RQ > 1
```

return:

```text
ABOVE_REFERENCE_LEVEL
```

Meaning of `RQ > 1`:

```text
the evaluated exposure concentration exceeds
the selected non-cancer reference concentration
```

It does not mean:

```text
probability > 100%
certain illness
certain ISPA
severity multiplier
```

---

# 22. Forbidden Interpretations

Forbidden:

```text
RQ = 2
→ disease probability is 200%
```

Forbidden:

```text
RQ > 1
→ worker has ISPA
```

Forbidden:

```text
RQ < 1
→ completely safe
```

Correct:

```text
RQ compares the evaluated exposure concentration
against a reference concentration.
```

---

# 23. Realtime ARKL

Realtime source:

```text
latest valid H2SReading
```

Pipeline:

```text
latest ppm
   ↓
ppm → mg/m³
   ↓
ET + EF
   ↓
calculate_exposure_concentration()
   ↓
calculate_rq()
   ↓
interpret_rq()
   ↓
ARKLResult
```

Target:

```python
calculate_realtime_risk()
```

---

# 24. Historical ARKL

Historical source:

```text
valid readings inside explicit time range
```

Aggregation:

```text
arithmetic mean ppm
```

Then:

```text
mean ppm
   ↓
mg/m³
   ↓
Exposure Concentration
   ↓
RQ
   ↓
Interpretation
   ↓
ARKLResult
```

Target:

```python
calculate_historical_risk()
```

---

# 25. Historical Time Range

Required:

```text
start_time
end_time
```

Query:

```text
received_at >= start_time
received_at <= end_time
```

Empty result:

```text
raise explicit error
```

Do not silently return zero.

---

# 26. Historical Aggregation

Formula:

```text
mean = Σ concentration / n
```

Empty collection:

```text
invalid
```

Implementation:

```text
aggregation.py
```

---

# 27. Valid Reading

Valid minimum:

```text
reading exists
device is active
ppm >= 0
payload passed ingestion validation
```

`simulated=true` remains valid for:

```text
development
PoC
integration
scientific pipeline testing
```

Provenance must remain explicit.

---

# 28. Simulated Provenance

Reading:

```text
simulated = true/false
```

ARKLResult:

```text
source_simulated
```

For any result containing simulated telemetry, provenance must not be silently represented as physical sensor data.

---

# 29. ARKLResult v1.1

Recommended fields:

```text
ARKLResult
├── id
├── worker
├── reading
├── calculation_type
├── concentration_ppm
├── concentration_mg_m3
├── exposure_concentration_mg_m3
├── exposure_time
├── exposure_frequency
├── rq
├── rfc
├── interpretation
├── calculation_version
├── source_simulated
├── period_start
├── period_end
├── reading_count
└── created_at
```

Legacy/research snapshot fields may temporarily remain:

```text
body_weight
inhalation_rate
exposure_duration
intake
averaging_time
```

but must not be presented as inputs used to calculate v1.1 RQ unless explicitly documented.

---

# 30. Legacy Intake Field

`intake.py` from v1.0 is no longer part of primary RQ pipeline.

Status:

```text
LEGACY / RESEARCH-ONLY
```

Do not use:

```text
Intake / RfC
```

for H₂S v1.1.

The module may temporarily remain to:

```text
preserve historical tests
support research comparison
avoid destructive refactoring during migration
```

After version 1.1 migration is stable, evaluate whether the module should be retained or removed.

---

# 31. Calculation Version

```text
ARKL_CALCULATION_VERSION = "1.1.0-MVP"
```

Every new result must persist this version.

Existing `1.0.0-MVP` results must not be silently relabeled.

They remain historically identifiable as:

```text
legacy calculation methodology
```

---

# 32. Constants

```text
H2S_PPM_TO_MG_M3 = Decimal("1.40")
H2S_RFC_MG_M3 = Decimal("0.002")

HOURS_PER_DAY = Decimal("24")
DAYS_PER_YEAR = Decimal("365")

ARKL_CALCULATION_VERSION = "1.1.0-MVP"
```

---

# 33. Numeric Strategy

Use:

```text
Decimal
```

Convert ORM float using:

```python
Decimal(str(value))
```

Never:

```python
Decimal(value)
```

for Python floats.

---

# 34. Rounding

Rule:

```text
NO INTERMEDIATE ROUNDING
```

Pipeline:

```text
input
 ↓
Decimal
 ↓
full precision
 ↓
persist
 ↓
presentation rounding
```

---

# 35. Exposure Concentration Contract

Target:

```python
calculate_exposure_concentration(
    *,
    concentration_mg_m3,
    exposure_time_hour_day,
    exposure_frequency_day_year,
)
```

Formula:

```text
EC =
C
× ET / 24
× EF / 365
```

Validation:

```text
C >= 0
0 <= ET <= 24
0 <= EF <= 365
```

Function must be:

```text
pure
deterministic
database-independent
HTTP-independent
AI-independent
```

---

# 36. RQ Contract

Target:

```python
calculate_rq(
    *,
    exposure_concentration_mg_m3,
    rfc=H2S_RFC_MG_M3,
)
```

Formula:

```text
RQ = EC / RfC
```

Validation:

```text
EC >= 0
RfC > 0
```

Output:

```text
Decimal
dimensionless
```

---

# 37. Interpretation Contract

```python
interpret_rq(rq)
```

Rules:

```text
RQ <= 1
→ WITHIN_REFERENCE_LEVEL

RQ > 1
→ ABOVE_REFERENCE_LEVEL
```

---

# 38. Realtime Calculator Contract

Concept:

```text
worker
+
device
 ↓
ExposureProfile
+
latest deterministic H2SReading
 ↓
validate
 ↓
ppm → mg/m³
 ↓
EC
 ↓
RQ
 ↓
interpretation
 ↓
persist
```

Target:

```python
calculate_realtime_risk(
    *,
    worker,
    device,
)
```

---

# 39. Historical Calculator Contract

Concept:

```text
worker
+
device
+
period
 ↓
valid readings
 ↓
mean ppm
 ↓
mg/m³
 ↓
EC
 ↓
RQ
 ↓
interpretation
 ↓
persist
```

Store:

```text
period_start
period_end
reading_count
```

---

# 40. API Contract

Endpoints:

```text
POST /api/v1/arkl/realtime/
POST /api/v1/arkl/historical/

GET /api/v1/arkl/results/
GET /api/v1/arkl/results/{id}/
```

Realtime request:

```json
{
  "worker": 2,
  "device": 2
}
```

Historical:

```json
{
  "worker": 2,
  "device": 2,
  "start_time": "2026-08-20T00:00:00+07:00",
  "end_time": "2026-08-20T08:00:00+07:00"
}
```

React never sends:

```text
EC
RfC
RQ
interpretation
```

Backend calculates them.

---

# 41. AI Boundary

Allowed:

```text
ARKLResult
   ↓
AI
   ↓
explanation
summary
research narrative
risk communication
```

Forbidden:

```text
AI → EC
AI → RfC
AI → RQ
AI → scientific threshold
```

---

# 42. Observability

Reuse existing infrastructure.

HTTP:

```text
global middleware
```

ARKL logger:

```text
smart_h2s.arkl
```

Do not rebuild:

```text
Request ID
request logging
error logging
security audit
performance monitoring
redaction
rotating logs
```

---

# 43. Known-Case Tests v1.1

Mandatory:

```text
conversion
├── 0 ppm
├── 10 ppm
├── fractional
└── invalid

exposure concentration
├── zero concentration
├── ET = 24, EF = 365
├── partial daily exposure
├── partial yearly exposure
├── invalid ET
└── invalid EF

RQ
├── EC = 0
├── RQ < 1
├── RQ = 1
├── RQ > 1
└── invalid RfC

interpretation
├── below threshold
├── exact threshold
└── above threshold

historical
├── one reading
├── multiple readings
└── empty period

calculator
├── latest reading
├── realtime persistence
├── historical persistence
├── inactive device
├── missing profile
└── invalid period

API
├── realtime
├── historical
├── result list
├── detail
└── invalid request
```

---

# 44. Migration Rules

Changing from `1.0.0-MVP` to `1.1.0-MVP` is a material methodology change.

Required:

```text
update specification
update calculation version
update constants
update services
update tests
update persistence schema if needed
update OpenAPI
repeat E2E
```

Existing v1.0 results:

```text
must remain identifiable
must not be overwritten
must not be silently recalculated
```

---

# 45. Full Regression

Required:

```bash
ruff check .
ruff format --check .
pytest -v
python manage.py check
pip-audit
```

Must not break:

```text
MQTT ingestion
Device API
Reading API
Worker API
ExposureProfile API
observability
```

---

# 46. Scientific Source Hierarchy

Tier 1:

```text
US EPA inhalation risk guidance
US EPA IRIS
CDC / NIOSH
```

Tier 2:

```text
peer-reviewed environmental health literature
```

Layer 1 occupational limits must not silently replace Layer 3 RfC.

---

# 47. Scientific Lock v1.1

```text
Pollutant
H₂S
LOCKED

Exposure route
Inhalation
LOCKED

Risk type
Non-carcinogenic
LOCKED

Sensor unit
ppm
LOCKED

Calculation unit
mg/m³
LOCKED

Conversion
1 ppm = 1.40 mg/m³
LOCKED

Exposure metric
Exposure Concentration
LOCKED

EC formula
C × (ET / 24) × (EF / 365)
LOCKED FOR MVP

RfC
0.002 mg/m³
LOCKED FOR MVP

Risk Quotient
EC / RfC
LOCKED

RQ unit
dimensionless
LOCKED

RQ <= 1
WITHIN_REFERENCE_LEVEL

RQ > 1
ABOVE_REFERENCE_LEVEL

Realtime concentration
latest deterministic valid reading
LOCKED

Historical concentration
arithmetic mean
LOCKED

Calculation version
1.1.0-MVP
LOCKED
```

---

# 48. Deprecated v1.0 Primary Formula

Deprecated:

```text
Intake / RfC
```

Reason:

```text
Intake = mg/kg-day
RfC    = mg/m³
```

The two quantities are not dimensionally equivalent.

This formula must not be used by the v1.1 production/MVP calculator.

---

# 49. Phase 4 Refactor Checklist

Scientific:

```text
[x] dimensional mismatch identified
[x] EPA concentration methodology selected
[x] RfC retained
[x] EC contract defined
[x] RQ contract redefined
[x] version bumped to 1.1.0-MVP
```

Code:

```text
[ ] constants.py
[ ] exposure_concentration.py
[ ] validation.py
[ ] rq.py
[ ] calculator.py
[ ] ARKLResult model
[ ] migration if required
```

Tests:

```text
[ ] exposure concentration tests
[ ] RQ tests refactored
[ ] calculator tests refactored
[ ] model snapshot tests updated
[ ] API tests updated
[ ] full regression
```

E2E:

```text
[ ] Wokwi → MQTT
[ ] MQTT → H2SReading
[ ] H2SReading → realtime ARKL
[ ] EC persisted
[ ] RQ persisted
[ ] historical E2E
[ ] OpenAPI verified
```

---

# 50. Definition of Done

Phase 4 v1.1 is complete only when:

```text
[ ] calculate_exposure_concentration() exists
[ ] calculate_rq() uses EC
[ ] RQ is dimensionless
[ ] calculator no longer uses Intake / RfC
[ ] calculation version = 1.1.0-MVP

[ ] realtime calculation works
[ ] historical calculation works
[ ] ARKLResult stores reproducible snapshot

[ ] OpenAPI works
[ ] all ARKL tests pass
[ ] full backend regression passes
[ ] E2E passes

[ ] no formula in Views
[ ] no formula in Models
[ ] no formula in React
[ ] AI does not calculate risk

=============================================================================================================================================================
done

constants.py                       DONE
conversion.py                      DONE
validation.py                      DONE
aggregation.py                     DONE
exposure_concentration.py          DONE
rq.py                              DONE
interpretation.py                  DONE
calculator.py                      DONE

ARKLResult                         DONE
Realtime ARKL API                  DONE
Historical ARKL API                DONE
OpenAPI                            DONE

Known-case tests                   PASSED
Full regression                    PASSED
```

---

# 51. Next Development Step

Implementation order:

```text
1. Update constants.py
       ↓
2. Add exposure_concentration.py
       ↓
3. Refactor validation.py
       ↓
4. Refactor rq.py
       ↓
5. Refactor calculator.py
       ↓
6. Refactor ARKLResult
       ↓
7. Create migration if schema changes
       ↓
8. Refactor tests
       ↓
9. Run ARKL regression
       ↓
10. Run full regression
       ↓
11. Repeat realtime E2E
       ↓
12. Historical E2E
       ↓
13. Lock Phase 4
```

---

# 52. Core Principle

```text
THE MVP MAY EVOLVE,
BUT IT MUST NEVER HIDE ITS ASSUMPTIONS.

EXPOSURE METRICS MATCH TOXICITY VALUES.
FORMULAS ARE VERSIONED.
CONSTANTS ARE SOURCED.
UNITS ARE EXPLICIT.
RESULTS ARE REPRODUCIBLE.
AI DOES NOT DEFINE THE RISK.
```

```

### Yang berubah secara teknis

Perubahan terpenting dari spesifikasi lama adalah:

```text
v1.0
ppm
→ mg/m³
→ Intake (mg/kg-day)
→ / RfC (mg/m³)
→ RQ ❌
```

menjadi:

```text
v1.1
ppm
→ mg/m³
→ Exposure Concentration (mg/m³)
→ / RfC (mg/m³)
→ RQ/HQ dimensionless ✅
```

EPA bahkan secara eksplisit menyatakan intake equation berbasis inhalation rate dan body weight **tidak direkomendasikan untuk estimasi exposure inhalation dalam metodologi inhalation risk yang diperbarui**, dan merekomendasikan air concentration sebagai exposure metric. ([SEMS Pub](https://semspub.epa.gov/work/HQ/140530.pdf "RISK ASSESSMENT GUIDANCE FOR SUPERFUND VOLUME I: HUMAN HEALTH EVALUATION MANUAL (RAGS) PART F, SUPPLEMENTAL GUIDANCE FOR INHALATION RISK ASSESSMENT"))
