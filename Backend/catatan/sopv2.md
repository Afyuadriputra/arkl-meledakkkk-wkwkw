# SOP Pengembangan Backend Smart H₂S v2.0

> **Tujuan dokumen:** menjadi panduan kerja aktif dan source of truth engineering agar pengembangan backend Smart H₂S tetap terarah, sederhana, reproducible, dan tidak melompat-lompat antar-layer.
>
> **Stack:** Django + Django REST Framework + SQLite + Paho MQTT + React Frontend
>
> **Prinsip:** SOLID, KISS, YAGNI, deterministic calculation, explicit scientific assumptions
>
> **Status:** Active Development / Living SOP
>
> **Version:** 2.0
>
> **Scientific calculation source of truth:** `ARKL_CALCULATION_SPEC.md`
>
> **ARKL specification version:** `1.0.0-MVP`
>
> **ARKL specification status:** `MVP SCIENTIFIC LOCK`

---

# 1. Prinsip Kerja Utama

Selama pengembangan backend, gunakan aturan berikut.

1. Kerjakan satu tahap sampai acceptance criteria terpenuhi sebelum berpindah ke tahap berikutnya.
2. Jangan membuat fitur yang belum dibutuhkan. Terapkan YAGNI.
3. Jangan membuat abstraksi berlebihan. Terapkan KISS.
4. Pisahkan tanggung jawab kode. Terapkan SOLID.
5. Views harus tipis.
6. Serializer menangani request/response validation dan representation API.
7. Service menangani business logic, orchestration, MQTT processing, scientific calculation, alert rule, dan aggregation.
8. Model menangani struktur data, relasi, dan persistence.
9. Middleware/observability mengawasi HTTP request, error, performance, dan security.
10. MQTT/background process menggunakan logger `smart_h2s.*`.
11. Core observability yang sudah tersedia tidak boleh diimplementasikan ulang di masing-masing app.
12. Scientific calculation harus deterministic.
13. Semua konstanta ilmiah wajib memiliki sumber dan calculation version.
14. Semua satuan calculation harus eksplisit.
15. Tidak boleh ada hidden default untuk data responden.
16. Tidak boleh melakukan rounding pada intermediate scientific calculation.
17. AI/LLM tidak boleh menghitung Intake, RfC, atau RQ.
18. Wokwi/IoT tidak dikontrol backend.
19. Backend hanya menjadi consumer telemetry MQTT dan penyedia API.
20. Jangan mengubah Layer 1 yang sudah bekerja tanpa kebutuhan teknis yang jelas.
21. Data simulasi dan data sensor fisik harus dapat dibedakan.
22. Hasil ARKL adalah risk characterization, bukan diagnosis medis.
23. Testing adalah quality gate setiap phase, bukan pekerjaan yang ditunda sampai akhir.

---

# 2. Arsitektur Backend

Gunakan arsitektur sederhana:

```text
Presentation / API
views.py + serializers.py
        ↓
Application / Business Logic
services/
        ↓
Persistence
models.py + Django ORM
        ↓
SQLite
```

Alur HTTP:

```text
React
  ↓
Django View
  ↓
Serializer
  ↓
Service
  ↓
Model / ORM
  ↓
SQLite
```

Alur MQTT:

```text
Wokwi / ESP32
      ↓
MQTT Broker
      ↓
Django MQTT Subscriber
      ↓
Telemetry Validation
      ↓
MQTT Ingestion Service
      ↓
Device + H2SReading
      ↓
SQLite
```

Scientific calculation:

```text
H2SReading
    +
ExposureProfile
    ↓
Validation
    ↓
Conversion
    ↓
Aggregation bila diperlukan
    ↓
Intake
    ↓
RfC
    ↓
RQ
    ↓
Interpretation
    ↓
ARKLResult
```

---

# 3. Observability / CCTV Backend

Observability adalah infrastructure lintas-layer.

```text
                    BACKEND
                       │
      ┌────────────────┼────────────────┐
      │                │                │
     HTTP           Services          MQTT
      │                │                │
      └────────────────┼────────────────┘
                       ↓
                 OBSERVABILITY
```

## 3.1 Existing Observability

Infrastructure berikut sudah tersedia dan tidak boleh dibuat ulang:

```text
[x] Request ID / Trace ID
[x] Request logging
[x] Error logging
[x] Performance monitoring
[x] Security audit logging
[x] Sensitive data redaction
[x] Rotating file logs
[x] Unit tests
[x] Feature tests
```

HTTP menggunakan middleware global yang sudah terdaftar di `settings.py`.

Background process menggunakan logger:

```text
smart_h2s.*
```

Contoh:

```text
smart_h2s.mqtt
smart_h2s.arkl
smart_h2s.alerts
smart_h2s.research
```

## 3.2 Jangan Dicatat

Jangan menulis ke log:

- password;
- access token;
- Authorization header;
- sensitive cookie;
- full body berisi data pribadi;
- data kesehatan mentah yang tidak diperlukan;
- secret `.env`.

---

# 4. Roadmap Utama v2

```text
Phase 0 — Backend Foundation
        ↓
Phase 1 — Devices + MQTT Ingestion
        ↓
Phase 2 — Layer 2 Data Models
        ↓
Phase 3 — Layer 2 REST API
        ↓
Phase 4 — Smart ARKL
        ↓
Phase 5 — Alert & Risk Management
        ↓
Phase 6 — Research & Reporting
```

Testing dilakukan di dalam setiap phase.

---

# 5. Phase 0 — Backend Foundation

## Tujuan

Membangun fondasi Django yang bersih sebelum domain feature dikembangkan.

## Pekerjaan

- Membuat virtual environment Python.
- Membuat Django project.
- Mengaktifkan Django REST Framework.
- Menggunakan SQLite sebagai database MVP.
- Menambahkan CORS untuk React.
- Menambahkan `.env`.
- Menambahkan `.env.example`.
- Menambahkan `.gitignore`.
- Menambahkan drf-spectacular/OpenAPI.
- Menambahkan pytest.
- Menambahkan pytest-django.
- Menambahkan Ruff.
- Menambahkan pip-audit.
- Menyiapkan logging.
- Menyiapkan Request ID.
- Menyiapkan request logging.
- Menyiapkan error logging.
- Menyiapkan performance monitoring.
- Menyiapkan security audit logging.
- Menyiapkan redaction.
- Menyiapkan rotating logs.
- Menyiapkan unit + feature tests observability.

## Struktur

```text
backend/
├── config/
├── core/
│   ├── middleware/
│   ├── observability/
│   └── tests/
├── devices/
├── exposure/
├── arkl/
├── alerts/
├── research/
├── requirements/
├── .env
├── .env.example
├── .gitignore
├── pyproject.toml
├── pytest.ini
├── db.sqlite3
└── manage.py
```

## Definition of Done

```text
[x] Django berjalan.
[x] Migration dasar berhasil.
[x] DRF tersedia.
[x] React diperbolehkan mengakses API development.
[x] Request logging bekerja.
[x] Error logging bekerja.
[x] Request ID bekerja.
[x] Performance monitoring bekerja.
[x] Security audit bekerja.
[x] Redaction bekerja.
[x] pytest berjalan.
[x] Ruff berjalan.
[x] pip-audit tersedia.
```

Status:

```text
PHASE 0 = DONE
```

---

# 6. Phase 1 — Devices + MQTT Ingestion

## Tujuan

Backend menerima telemetry dari Layer 1 melalui MQTT tanpa mengontrol perangkat.

## Alur

```text
Wokwi / ESP32
      ↓
MQTT Publish
      ↓
MQTT Broker
      ↓
Django MQTT Subscriber
      ↓
Payload Validation
      ↓
Persistence
```

## Model

```text
Device
├── id
├── device_code
├── name
├── location
├── is_active
├── created_at
└── updated_at
```

```text
H2SReading
├── id
├── device
├── ppm
├── adc
├── filtered_adc
├── level
├── status
├── uptime_ms
├── simulated
└── received_at
```

`sensor_timestamp` belum menjadi baseline karena payload sensor saat ini belum menyediakan timestamp sensor terpercaya.

## Pekerjaan

```text
[x] Device model
[x] H2SReading model
[x] telemetry validator
[x] mqtt_ingestion.py
[x] run_mqtt management command
[x] Subscribe telemetry topic
[x] Parse JSON
[x] Required-field validation
[x] Reject invalid payload
[x] Store valid payload
[x] Device get_or_create
[x] received_at
[x] simulated provenance
[x] MQTT logging
[x] reconnect handling
[x] invalid message tidak mematikan subscriber
```

## MQTT Scope

Backend tidak boleh:

- mengontrol Wokwi;
- mengubah ADC;
- mengubah firmware;
- mengubah nilai ppm;
- melakukan ARKL calculation;
- membawa data pribadi melalui public MQTT.

## Deterministic Latest Reading

Definisi latest reading:

```text
ORDER BY received_at DESC, id DESC
```

Rule ini harus digunakan konsisten oleh:

```text
GET /api/v1/readings/latest/
```

dan:

```text
calculate_realtime_risk()
```

## Definition of Done

```text
[x] Wokwi publish telemetry
[x] React tetap menerima telemetry
[x] Backend menerima telemetry
[x] Valid reading tersimpan
[x] Invalid JSON ditolak
[x] Invalid payload ditolak
[x] Subscriber tetap hidup
[x] reconnect bekerja
[x] MQTT events logged
[x] no Layer 3 dependency
```

Status:

```text
PHASE 1 = DONE
```

---

# 7. Phase 2 — Layer 2 Data Models

## Tujuan

Membangun struktur data responden dan parameter pajanan.

## Model

```text
Worker
├── id
├── code
├── is_active
├── created_at
└── updated_at
```

```text
ExposureProfile
├── id
├── worker
├── body_weight
├── exposure_time
├── exposure_frequency
├── exposure_duration
├── inhalation_rate
├── created_at
└── updated_at
```

Baseline:

```text
1 Worker
   ↓
1 ExposureProfile aktif
```

Belum ada relasi langsung:

```text
H2SReading → Worker
```

karena asosiasi ini dilakukan oleh ARKL calculation request.

## Pekerjaan

```text
[x] Worker model
[x] ExposureProfile model
[x] OneToOne relationship
[x] basic constraints
[x] domain validation
[x] migrations
[x] migrate
[x] admin registration
[x] model tests
[x] validation tests
[x] dummy create/read
```

## Data Privacy

Gunakan:

```text
PML-001
PML-002
PML-003
```

sebagai respondent code.

Jangan menyimpan NIK/alamat/telepon jika tidak dibutuhkan penelitian.

Status:

```text
PHASE 2 = DONE
```

---

# 8. Phase 3 — Layer 2 REST API

## Tujuan

Menyediakan REST API untuk React dan penggunaan internal penelitian.

## Endpoint

```text
GET    /api/v1/devices/
GET    /api/v1/devices/{id}/

GET    /api/v1/readings/
GET    /api/v1/readings/{id}/
GET    /api/v1/readings/latest/

POST   /api/v1/workers/
GET    /api/v1/workers/
GET    /api/v1/workers/{id}/

POST   /api/v1/exposure-profiles/
GET    /api/v1/exposure-profiles/
GET    /api/v1/exposure-profiles/{id}/
PATCH  /api/v1/exposure-profiles/{id}/
```

## Rules

`H2SReading` bersifat read-only melalui REST.

Telemetry masuk melalui MQTT, bukan melalui React.

Reading list menggunakan pagination.

Filtering dasar dapat menggunakan query parameter seperti:

```text
device_code
status
```

## Definition of Done

```text
[x] serializers
[x] viewsets/views
[x] /api/v1 versioning
[x] request validation
[x] reading pagination
[x] filtering
[x] POST Worker
[x] POST ExposureProfile
[x] PATCH ExposureProfile
[x] latest reading
[x] invalid request → 4xx
[x] OpenAPI
[x] Swagger
[x] no ARKL formula in views
```

Status:

```text
PHASE 3 = DONE
```

---

# 9. Phase 4 — Layer 3 Smart ARKL

## Tujuan

Membangun deterministic scientific calculation engine untuk H₂S inhalation risk assessment.

Scientific source of truth:

```text
ARKL_CALCULATION_SPEC.md
Version: 1.0.0-MVP
Status: MVP SCIENTIFIC LOCK
```

## 9.1 Phase 4A — Scientific Specification

Locked MVP contract:

```text
Pollutant               = H₂S
Route                   = inhalation
Sensor unit             = ppm
ARKL concentration      = mg/m³
Conversion              = 1 ppm = 1.40 mg/m³
RfC                     = 0.002 mg/m³

Body weight             = kg
Inhalation rate         = m³/hour
Exposure time           = hour/day
Exposure frequency      = day/year
Exposure duration       = year

Averaging time:
tavg = Dt × 365 days
```

Intake:

```text
             C × R × tE × fE × Dt
Intake = ───────────────────────────
                  Wb × tavg
```

RQ:

```text
RQ = Intake / RfC
```

Interpretation:

```text
RQ <= 1
→ WITHIN_REFERENCE_LEVEL

RQ > 1
→ ABOVE_REFERENCE_LEVEL
```

Realtime source:

```text
latest valid reading
```

Historical source:

```text
arithmetic mean readings
between start_time and end_time
```

Backend MVP menggunakan istilah:

```text
HISTORICAL
```

bukan actual lifetime monitoring.

Status:

```text
Phase 4A = DONE
```

---

# 10. Phase 4B — Core Calculation Engine

## Struktur

```text
arkl/services/
├── constants.py
├── conversion.py
├── validation.py
├── aggregation.py
├── intake.py
├── rq.py
├── interpretation.py
└── calculator.py
```

## Responsibilities

### constants.py

```text
H2S_PPM_TO_MG_M3
H2S_RFC_MG_M3
DAYS_PER_YEAR
ARKL_CALCULATION_VERSION
interpretation constants
```

### conversion.py

```text
ppm_to_mg_m3()
```

### validation.py

Validasi:

```text
concentration_ppm >= 0
body_weight > 0
0 <= exposure_time <= 24
0 <= exposure_frequency <= 365
exposure_duration > 0
inhalation_rate >= 0
```

### aggregation.py

```text
calculate_mean_concentration()
```

### intake.py

```text
calculate_averaging_time()
calculate_intake()
```

### rq.py

```text
calculate_rq()
```

### interpretation.py

```text
interpret_rq()
```

### calculator.py

Application orchestration:

```text
calculate_realtime_risk()
calculate_historical_risk()
```

## Numeric Strategy

Scientific calculation menggunakan:

```text
Decimal
```

Gunakan:

```python
Decimal(str(value))
```

Jangan:

```python
Decimal(value)
```

untuk input float.

Rule:

```text
DO NOT ROUND INTERMEDIATE VALUES
```

Status:

```text
Phase 4B = DONE
```

---

# 11. Phase 4C — ARKLResult Persistence

## Tujuan

Menyimpan immutable calculation snapshot secara konseptual agar hasil dapat direproduksi.

## Model

```text
ARKLResult
├── id
├── worker
├── reading nullable
├── calculation_type
├── concentration_ppm
├── concentration_mg_m3
├── body_weight
├── exposure_time
├── exposure_frequency
├── exposure_duration
├── inhalation_rate
├── averaging_time
├── intake
├── rfc
├── rq
├── interpretation
├── calculation_version
├── source_simulated
├── period_start
├── period_end
├── reading_count
└── created_at
```

Calculation types:

```text
REALTIME
HISTORICAL
```

Realtime:

```text
reading != null
```

Historical:

```text
reading = null
period_start != null
period_end != null
reading_count != null
```

Exposure values disimpan sebagai snapshot.

Jika ExposureProfile berubah setelah calculation:

```text
ARKLResult lama tidak berubah.
```

Status:

```text
Phase 4C = DONE
```

---

# 12. Phase 4D — Calculator Orchestration

## Realtime

```text
Worker
 +
Device
 ↓
ExposureProfile
 +
Latest deterministic H2SReading
 ↓
validate
 ↓
ppm → mg/m³
 ↓
Intake
 ↓
RQ
 ↓
Interpretation
 ↓
ARKLResult
```

## Historical

```text
Worker
 +
Device
 +
start_time/end_time
 ↓
readings in period
 ↓
mean ppm
 ↓
ppm → mg/m³
 ↓
Intake
 ↓
RQ
 ↓
Interpretation
 ↓
ARKLResult
```

Errors harus eksplisit:

```text
worker without ExposureProfile
device without reading
inactive device
invalid time range
empty historical readings
invalid exposure parameters
```

Status:

```text
Phase 4D = DONE
```

---

# 13. Phase 4E — ARKL REST API + OpenAPI

## Endpoint MVP

```text
POST /api/v1/arkl/realtime/
POST /api/v1/arkl/historical/

GET  /api/v1/arkl/results/
GET  /api/v1/arkl/results/{id}/
```

Realtime request:

```json
{
  "worker": 1,
  "device": 1
}
```

Historical request:

```json
{
  "worker": 1,
  "device": 1,
  "start_time": "2026-08-20T00:00:00+07:00",
  "end_time": "2026-08-20T08:00:00+07:00"
}
```

React tidak mengirim:

```text
Intake
RfC
RQ
interpretation
```

Backend menghitung semuanya.

## API Rules

```text
View
 ↓
Serializer
 ↓
calculator.py
 ↓
services
 ↓
ARKLResult
```

Tidak boleh ada formula dalam View.

## Current Checklist

```text
[x] serializers
[x] views
[x] urls
[x] calculator integration
[x] OpenAPI annotations

[ ] API tests final
[ ] Swagger final verification
```

Status:

```text
Phase 4E = IN PROGRESS
```

---

# 14. Phase 4F — Regression + End-to-End Validation

## Unit Tests

```text
conversion
validation
aggregation
intake
RQ
interpretation
```

## Persistence Tests

```text
ARKLResult snapshot
calculation version
simulated provenance
historical metadata
```

## Integration Tests

```text
realtime calculator
historical calculator
latest reading selection
invalid profile
invalid device
invalid period
```

## API Tests

```text
POST realtime
POST historical
GET result list
GET result detail
invalid input
filters
```

## End-to-End

```text
Wokwi
 ↓
MQTT
 ↓
Django ingestion
 ↓
H2SReading
 ↓
ARKL realtime endpoint
 ↓
Intake
 ↓
RQ
 ↓
ARKLResult
 ↓
Swagger / React
```

Definition of Done Phase 4:

```text
[ ] Realtime API works
[ ] Historical API works
[ ] Result list/detail works
[ ] Invalid input → clear 4xx
[ ] OpenAPI schema valid
[ ] Swagger works
[ ] Ruff clean
[ ] Django check clean
[ ] ARKL test suite green
[ ] full regression green
[ ] E2E verified
```

Jika semuanya terpenuhi:

```text
PHASE 4 = DONE
```

---

# 15. Phase 5 — Layer 4 Alert & Risk Management

## Status

```text
PHASE 5 STATUS:
MVP OPERATIONAL LOCK — IMPLEMENTED & VERIFIED

ALERT_RULE_VERSION:
1.0.0-MVP

ARKL CALCULATION VERSION:
1.1.0-MVP
```

Phase 5 telah menyelesaikan Layer 4 yang menggabungkan kondisi lingkungan dan hasil Smart ARKL menjadi alert deterministic, rekomendasi pengendalian risiko, persistence, deduplication, escalation, lifecycle, REST API, dan integrasi E2E.

Core Phase 5 tidak menggunakan AI untuk menentukan keputusan risiko.

---

## 15.1 Tujuan

Layer 4 bertanggung jawab menggabungkan:

```text
Environmental Condition
        +
ARKLResult
        ↓
Deterministic Alert Engine
        ↓
Alert
        +
Risk Management Recommendation
```

Tujuan utama Phase 5 adalah menghasilkan:

- status alert yang deterministic;
- severity yang terdokumentasi;
- risk-management status yang deterministic;
- rekomendasi pengendalian risiko berbasis rule;
- lifecycle alert;
- mekanisme pencegahan duplicate/spam alert;
- mekanisme escalation;
- audit trail melalui snapshot data;
- REST API yang dapat digunakan langsung oleh React;
- provenance untuk simulated data;
- output yang dapat diuji secara unit, integration, API, dan E2E.

Layer ini **tidak melakukan perhitungan ulang ARKL**.

---

# 15.2 Scientific Separation

Layer 4 menerima dua dimensi berbeda.

## Environmental Dimension

Source:

```text
H2SReading
```

Informasi utama:

```text
ppm
level
status
simulated
received_at
device
```

Dimensi ini menjawab:

```text
"Bagaimana kondisi H₂S lingkungan saat ini?"
```

Layer 4 tidak mendefinisikan ulang threshold ppm Layer 1.

Environmental state berasal dari Layer 1 dan kemudian dinormalisasi ke vocabulary operasional Layer 4.

---

## Risk Dimension

Source:

```text
ARKLResult
```

Informasi utama:

```text
rq
interpretation
calculation_type
calculation_version
source_simulated
```

Dimensi ini menjawab:

```text
"Bagaimana skenario pajanan dibandingkan
dengan reference concentration?"
```

Interpretasi ARKL yang digunakan:

```text
WITHIN_REFERENCE_LEVEL

ABOVE_REFERENCE_LEVEL
```

Kedua dimensi tidak dianggap identik.

Contoh yang valid:

```text
Environmental:
NORMAL

ARKL:
ABOVE_REFERENCE_LEVEL
```

Hal tersebut dimungkinkan karena Layer 3 memperhitungkan:

```text
concentration
+
exposure time
+
exposure frequency
```

dan bukan hanya kondisi sesaat.

---

# 15.3 Input Contract

Conceptual input:

```text
H2SReading
      +
ARKLResult
      ↓
Alert Engine
```

Minimum environmental input:

```text
ppm
level
status
device
simulated
```

Minimum risk input:

```text
rq
interpretation
calculation_type
calculation_version
source_simulated
```

Untuk realtime alert:

```text
ARKLResult.calculation_type
=
REALTIME
```

dan:

```text
ARKLResult.reading
```

harus mengacu pada `H2SReading` yang valid.

Historical ARKL tidak eligible untuk realtime alert creation.

---

# 15.4 Source of Truth

Alert Engine tidak menerima client-calculated decision sebagai source of truth.

Client tidak menentukan:

```text
environmental severity
alert level
risk status
recommendation codes
RQ
ARKL interpretation
scientific threshold
```

Untuk evaluate endpoint, client hanya mengirim:

```json
{
  "arkl_result_id": 12
}
```

Backend kemudian mendapatkan:

```text
ARKLResult
    ↓
H2SReading
    ↓
Environmental Normalization
    ↓
Alert Engine
```

Dengan demikian backend tetap menjadi source of truth.

---

# 15.5 Architecture

Struktur aktual Phase 5:

```text
alerts/
├── migrations/
│   └── 0001_initial.py
│
├── services/
│   ├── alert_engine.py
│   ├── alert_service.py
│   ├── constants.py
│   ├── deduplication.py
│   ├── environmental_mapping.py
│   ├── evaluator.py
│   ├── exceptions.py
│   ├── lifecycle.py
│   ├── persistence.py
│   └── recommendation.py
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_alert_engine.py
│   ├── test_api.py
│   ├── test_e2e.py
│   ├── test_environmental_mapping.py
│   ├── test_evaluator.py
│   ├── test_lifecycle.py
│   ├── test_models.py
│   ├── test_persistence.py
│   └── test_recommendation.py
│
├── admin.py
├── models.py
├── serializers.py
├── urls.py
└── views.py
```

Arsitektur backend tetap:

```text
View
  ↓
Serializer
  ↓
Service
  ↓
Model / ORM
  ↓
SQLite
```

Business rule tidak ditempatkan di React atau View.

Tidak ditambahkan:

```text
Repository Pattern
DI Container
Celery
Redis
Channels
event bus
microservice
```

karena belum dibutuhkan.

Prinsip:

```text
SOLID
KISS
YAGNI
```

tetap digunakan.

---

# 15.6 Core Scientific Rules

Alert Engine mengikuti batas berikut:

```text
Alert Engine tidak menghitung ulang RQ.

Alert Engine tidak menghitung ulang
Exposure Concentration.

Alert Engine tidak mengubah RfC.

Alert Engine tidak mengubah
ARKL interpretation.

Alert Engine tidak menentukan
threshold ilmiah Layer 1.
```

Layer 1 environmental status tetap berasal dari Layer 1.

Layer 3 risk interpretation tetap berasal dari:

```text
ARKLResult
```

Tidak boleh ada:

```text
medical diagnosis
ISPA probability prediction
clinical decision
medical treatment recommendation
```

Recommendation harus:

```text
rule-based
deterministic
documented
testable
```

---

# 15.7 Environmental Normalization

Layer 4 menggunakan canonical environmental severity:

```text
NORMAL
CAUTION
WARNING
DANGER
CRITICAL
```

Normalisasi dilakukan oleh:

```text
alerts/services/environmental_mapping.py
```

Current implementation menerima canonical status dari Layer 1 dan melakukan normalization terhadap:

```text
case
whitespace
enum representation
```

Contoh:

```text
" normal "
→ NORMAL

"warning"
→ WARNING
```

Unknown status ditolak.

Layer 4 **tidak menghitung environmental severity dari ppm**.

Artinya:

```text
ppm threshold
→ tanggung jawab Layer 1

status normalization
→ tanggung jawab Layer 4
```

---

# 15.8 Alert Severity

Machine-readable alert levels telah dikunci sebagai:

```text
NONE
LOW
MEDIUM
HIGH
CRITICAL
```

Severity merupakan kombinasi:

```text
Environmental Dimension
        +
Risk Dimension
```

bukan hanya satu nilai.

---

# 15.9 Final Decision Matrix

Decision matrix Phase 5 telah diimplementasikan dan diuji.

Environmental

ARKL Interpretation

Alert Level

NORMAL

WITHIN_REFERENCE_LEVEL

NONE

CAUTION

WITHIN_REFERENCE_LEVEL

LOW

WARNING

WITHIN_REFERENCE_LEVEL

MEDIUM

DANGER

WITHIN_REFERENCE_LEVEL

HIGH

CRITICAL

WITHIN_REFERENCE_LEVEL

CRITICAL

NORMAL

ABOVE_REFERENCE_LEVEL

MEDIUM

CAUTION

ABOVE_REFERENCE_LEVEL

MEDIUM

WARNING

ABOVE_REFERENCE_LEVEL

HIGH

DANGER

ABOVE_REFERENCE_LEVEL

CRITICAL

CRITICAL

ABOVE_REFERENCE_LEVEL

CRITICAL

Status:

```text
IMPLEMENTED
DETERMINISTIC
TESTED
LOCKED FOR MVP
```

Rule tambahan:

```text
Risk Dimension tidak boleh
menurunkan severity environmental.
```

---

# 15.10 Risk Status

Risk-management states:

```text
NO_ACTION_REQUIRED

MONITORING_REQUIRED

RISK_MANAGEMENT_REQUIRED

IMMEDIATE_ACTION_REQUIRED
```

Final mapping:

```text
NONE
→ NO_ACTION_REQUIRED


LOW
→ MONITORING_REQUIRED


MEDIUM
→ MONITORING_REQUIRED


HIGH
→ RISK_MANAGEMENT_REQUIRED


CRITICAL
→ IMMEDIATE_ACTION_REQUIRED
```

Mapping bersifat:

```text
deterministic
rule-based
testable
```

---

# 15.11 Recommendation Rules

Recommendation merupakan output deterministic berdasarkan hasil Alert Engine.

Recommendation codes yang digunakan pada Phase 5:

```text
MONITOR_H2S_LEVEL

INCREASE_MONITORING_FREQUENCY

REDUCE_EXPOSURE_DURATION

LIMIT_ACCESS_TO_EXPOSURE_AREA

TEMPORARY_AREA_AVOIDANCE

USE_APPROPRIATE_PPE

NOTIFY_RESPONSIBLE_OPERATOR

PERFORM_FURTHER_RISK_EVALUATION
```

Recommendation menggunakan machine-readable codes, bukan long text yang tertanam di Alert Engine.

Arsitektur:

```text
Alert Level
     ↓
Recommendation Rule
     ↓
Recommendation Codes
     ↓
REST API
     ↓
React
```

Kemudian React atau optional AI explanation dapat mengubahnya menjadi bahasa human-readable.

Keuntungan:

```text
translation

UI presentation

research documentation

future AI explanation

consistent terminology
```

Recommendation tidak dianggap sebagai:

```text
medical treatment
clinical advice
medical diagnosis
```

---

# 15.12 Alert Lifecycle

Lifecycle Phase 5:

```text
OPEN
  ↓
ACKNOWLEDGED
  ↓
RESOLVED
```

Transition tambahan yang diperbolehkan:

```text
OPEN
↓
RESOLVED
```

---

## OPEN

```text
Alert aktif dan belum ditangani
atau dikonfirmasi operator.
```

---

## ACKNOWLEDGED

```text
Alert telah diketahui oleh
pengguna/operator.
```

`ACKNOWLEDGED` masih dianggap sebagai **active alert**.

Hal ini penting untuk mencegah telemetry berikutnya menghasilkan duplicate alert.

---

## RESOLVED

```text
Alert telah ditutup setelah
kondisi atau tindak lanjut dianggap selesai.
```

`RESOLVED` tidak lagi dianggap active.

Setelah alert resolved, alert baru dengan kondisi yang sesuai dapat dibuat kembali.

---

# 15.13 Lifecycle Rules

Implemented rules:

```text
OPEN
→ ACKNOWLEDGED
allowed


OPEN
→ RESOLVED
allowed


ACKNOWLEDGED
→ RESOLVED
allowed


ACKNOWLEDGED
→ ACKNOWLEDGED
idempotent


RESOLVED
→ RESOLVED
idempotent


RESOLVED
→ ACKNOWLEDGED
rejected
```

Lifecycle update dilakukan secara transactional.

---

# 15.14 Alert Deduplication

MQTT dapat mengirim telemetry dengan frekuensi tinggi.

Sistem tidak membuat alert baru untuk setiap telemetry.

Active alert status:

```text
OPEN
ACKNOWLEDGED
```

Deduplication scope:

```text
same worker
+
same device
+
active alert
```

Jika incoming decision mempunyai severity yang sama:

```text
existing HIGH
+
incoming HIGH
        ↓
duplicate
        ↓
no new Alert row
```

Hasil persistence:

```json
{
  "created": false,
  "duplicate": true,
  "escalated": false
}
```

---

# 15.15 Escalation

Jika severity meningkat:

```text
MEDIUM
↓
HIGH
```

atau:

```text
HIGH
↓
CRITICAL
```

maka kondisi dianggap:

```text
ESCALATION
```

dan alert baru dapat dibuat.

Hasil:

```json
{
  "created": true,
  "duplicate": false,
  "escalated": true
}
```

Severity comparison menggunakan explicit priority:

```text
NONE      = 0
LOW       = 1
MEDIUM    = 2
HIGH      = 3
CRITICAL  = 4
```

---

# 15.16 De-escalation Behaviour

Jika active alert memiliki severity lebih tinggi daripada incoming evaluation:

```text
HIGH
↓
MEDIUM
```

maka Phase 5 tidak membuat alert baru.

Hasil:

```text
created   = false
duplicate = false
escalated = false
```

Existing higher-severity alert tetap menjadi active alert.

Tidak dibuat state tambahan seperti:

```text
SUPERSEDED
```

karena belum ada kebutuhan domain yang cukup kuat.

Hal ini mengikuti prinsip YAGNI.

---

# 15.17 Realtime Alert Behaviour

Raw telemetry tidak otomatis menghasilkan ARKLResult setiap detik.

Alert evaluation dilakukan terhadap valid:

```text
REALTIME ARKLResult
```

Flow:

```text
H2SReading
      ↓
REALTIME ARKLResult
      ↓
Alert Evaluation
```

Deduplication kemudian mencegah repeated identical decision menghasilkan spam.

Tujuan:

```text
avoid alert spam

avoid unnecessary database writes

avoid repeated identical notifications
```

---

# 15.18 Realtime vs Historical ARKL

## REALTIME

Eligible untuk:

```text
realtime alert

risk-management recommendation

warning UI

future notification
```

---

## HISTORICAL

Eligible untuk:

```text
historical analysis

risk-management insight

research reporting

trend analysis
```

Historical ARKL tidak dapat digunakan untuk realtime alert persistence.

Jika `calculation_type` bukan:

```text
REALTIME
```

maka realtime Alert persistence ditolak.

Default:

```text
HISTORICAL
→ analytical result


REALTIME
→ realtime alert eligible
```

---

# 15.19 Simulated Data Provenance

Jika:

```text
H2SReading.simulated = true
```

atau:

```text
ARKLResult.source_simulated = true
```

maka:

```text
Alert.source_simulated = true
```

Logic:

```text
reading.simulated
OR
arkl_result.source_simulated
```

Simulated Alert dapat digunakan untuk:

```text
development

testing

demonstration

E2E verification
```

UI harus membedakan simulated data dari sensor fisik.

---

# 15.20 Alert Model

Model aktual:

```text
Alert
├── id
│
├── worker
├── device
├── reading
├── arkl_result
│
├── concentration_ppm
├── environmental_level
├── environmental_status
├── environmental_severity
│
├── rq
├── risk_interpretation
├── calculation_version
│
├── alert_level
├── risk_status
├── status
│
├── recommendation_codes
├── alert_rule_version
├── source_simulated
│
├── acknowledged_at
├── resolved_at
│
├── created_at
└── updated_at
```

---

# 15.21 Snapshot Strategy

Alert menyimpan snapshot dari environmental dan risk state.

Contoh:

```text
concentration_ppm
environmental_level
environmental_status
environmental_severity

rq
risk_interpretation
calculation_version

alert_level
risk_status
recommendation_codes
alert_rule_version
```

Tujuannya:

```text
auditability

reproducibility

research traceability

historical integrity
```

Alert lama tidak bergantung pada source object yang kemudian berubah.

---

# 15.22 Raw vs Canonical Environmental Status

Dua field dipertahankan:

```text
environmental_status
```

menyimpan raw Layer 1 status.

Sedangkan:

```text
environmental_severity
```

menyimpan canonical Layer 4 severity.

Contoh:

```text
Layer 1:
"warning"

Layer 4:
WARNING
```

Strategi ini menjaga:

```text
source traceability
+
normalized decision input
```

---

# 15.23 Alert Rule Version

Setiap alert menyimpan:

```text
alert_rule_version
```

Current version:

```text
1.0.0-MVP
```

Tujuannya untuk mengetahui rule set yang digunakan saat alert dibuat.

Ini penting apabila decision matrix berubah pada penelitian atau versi sistem berikutnya.

---

# 15.24 Persistence Contract

Persistence service mengembalikan:

```text
AlertPersistenceResult
```

dengan:

```text
alert

created

duplicate

escalated
```

Contoh alert baru:

```json
{
  "created": true,
  "duplicate": false,
  "escalated": false
}
```

Duplicate:

```json
{
  "created": false,
  "duplicate": true,
  "escalated": false
}
```

Escalation:

```json
{
  "created": true,
  "duplicate": false,
  "escalated": true
}
```

No-alert decision:

```json
{
  "alert": null,
  "created": false,
  "duplicate": false,
  "escalated": false
}
```

---

# 15.25 REST API

Final endpoints Phase 5:

```text
GET
/api/v1/alerts/


GET
/api/v1/alerts/{id}/


POST
/api/v1/alerts/evaluate/


PATCH
/api/v1/alerts/{id}/acknowledge/


PATCH
/api/v1/alerts/{id}/resolve/
```

---

# 15.26 Alert Evaluate API

Request:

```http
POST /api/v1/alerts/evaluate/
```

Payload:

```json
{
  "arkl_result_id": 12
}
```

Client tidak mengirim:

```text
worker_id

device_id

reading_id

RQ

environmental severity

alert level

risk status

recommendation codes
```

Semua diturunkan backend dari:

```text
ARKLResult
+
H2SReading
```

---

# 15.27 Alert API Response

Representative response:

```json
{
  "created": true,
  "duplicate": false,
  "escalated": false,
  "alert": {
    "id": 15,
    "worker_code": "PML-001",
    "device_code": "H2S-001",
    "reading_id": 42,
    "arkl_result_id": 21,

    "concentration_ppm": "25.400000",

    "environmental_level": 2,
    "environmental_status": "WARNING",
    "environmental_severity": "WARNING",

    "rq": "4059.360730593607",
    "risk_interpretation": "ABOVE_REFERENCE_LEVEL",
    "calculation_version": "1.1.0-MVP",

    "alert_level": "HIGH",
    "risk_status": "RISK_MANAGEMENT_REQUIRED",
    "status": "OPEN",

    "recommendation_codes": [
      "MONITOR_H2S_LEVEL",
      "REDUCE_EXPOSURE_DURATION"
    ],

    "alert_rule_version": "1.0.0-MVP",

    "source_simulated": true,

    "acknowledged_at": null,
    "resolved_at": null
  }
}
```

Exact recommendation list mengikuti deterministic recommendation rules.

---

# 15.28 Alert List Filtering

`GET /api/v1/alerts/` mendukung filtering:

```text
worker_code

device_code

alert_level

status
```

Contoh:

```http
GET /api/v1/alerts/?worker_code=PML-001
```

atau:

```http
GET /api/v1/alerts/?alert_level=CRITICAL
```

---

# 15.29 React Boundary

React hanya bertanggung jawab pada:

```text
presentation

interaction

filtering request

acknowledge action

resolve action
```

React tidak menentukan:

```text
environmental severity

alert level

risk status

recommendendation decision

RQ

ARKL interpretation
```

Flow:

```text
Backend
   ↓
deterministic result
   ↓
REST API
   ↓
React
```

---

# 15.30 AI Boundary

Allowed architecture:

```text
Deterministic Alert
        ↓
Optional AI
        ↓
human-readable explanation
risk communication
education
summary
report narrative
```

AI boleh:

```text
menjelaskan penyebab alert

meringkas rekomendasi

menghasilkan bahasa edukasi

membantu research narrative

membantu report drafting
```

AI tidak boleh:

```text
menghitung RQ

mengubah RfC

mengubah scientific threshold

memilih alert level

menentukan risk status

mengubah ARKL interpretation

membuat medical diagnosis
```

Deterministic core tetap dapat berfungsi tanpa AI.

---

# 15.31 Observability

Phase 5 menggunakan existing global observability.

HTTP request:

```text
Request ID middleware

Request logging

Error logging

Performance monitoring

Security audit

Redaction
```

Contoh log dari E2E:

```text
request_started
method=POST
path=/api/v1/alerts/evaluate/
```

dan:

```text
request_completed
status=201
duration_ms=...
```

Tidak dibuat observability stack baru.

Untuk background/service logging apabila diperlukan:

```text
smart_h2s.alerts
```

Existing observability tidak diimplementasikan ulang.

---

# 15.32 Testing Coverage

Phase 5 memiliki test untuk:

```text
Alert Engine

Environmental Mapping

Evaluator

Recommendation

Model

Persistence

Deduplication

Escalation

Lifecycle

REST API

E2E
```

---

## Alert Engine Tests

Decision matrix diuji untuk:

```text
NORMAL + WITHIN

CAUTION + WITHIN

WARNING + WITHIN

DANGER + WITHIN

CRITICAL + WITHIN

NORMAL + ABOVE

CAUTION + ABOVE

WARNING + ABOVE

DANGER + ABOVE

CRITICAL + ABOVE
```

Selain itu diuji:

```text
risk-status mapping

risk does not reduce environmental severity

invalid environmental severity

invalid ARKL interpretation
```

---

## Recommendation Tests

Diuji:

```text
NONE recommendation

LOW recommendation

MEDIUM recommendation

HIGH recommendation

CRITICAL recommendation

deterministic output

invalid alert level
```

---

## Persistence Tests

Diuji:

```text
alert snapshot persistence

same active alert deduplication

ACKNOWLEDGED remains active

RESOLVED allows new alert

severity escalation

de-escalation

NONE does not persist

HISTORICAL rejection

reading mismatch rejection

simulated reading provenance

simulated ARKL provenance
```

---

## Lifecycle Tests

Diuji:

```text
OPEN → ACKNOWLEDGED

ACKNOWLEDGED idempotency

ACKNOWLEDGED → RESOLVED

OPEN → RESOLVED

RESOLVED idempotency

RESOLVED → ACKNOWLEDGED rejection
```

---

## API Tests

Diuji:

```text
alert list

alert detail

404 detail

acknowledge

resolve

resolved cannot acknowledge

filter worker

filter device

filter alert level

evaluate

duplicate evaluate

invalid ARKLResult
```

Result:

```text
12 API tests passed
```

---

# 15.33 E2E Verification

E2E test membuktikan alur:

```text
H2SReading
      ↓
ARKLResult
      ↓
Alert Evaluate REST API
      ↓
Environmental Normalization
      ↓
Alert Engine
      ↓
Recommendation
      ↓
Persistence
      ↓
Duplicate Protection
      ↓
Alert Detail API
      ↓
ACKNOWLEDGED
      ↓
RESOLVED
```

E2E juga memverifikasi:

```text
worker provenance

device provenance

reading provenance

ARKLResult provenance

environmental status

environmental severity

risk interpretation

alert level

simulated provenance

recommendation output

duplicate prevention

lifecycle
```

Result:

```text
E2E TEST PASSED
```

---

# 15.34 Full Regression

Latest verified full regression:

```text
160 passed
```

Regression mencakup:

```text
alerts

ARKL v1.1

MQTT ingestion

Device

H2SReading

Worker

ExposureProfile

core observability
```

Tidak ditemukan regression terhadap layer sebelumnya.

---

# 15.35 Quality Gates

Latest verified results:

```text
pytest
→ 160 passed


ruff check .
→ All checks passed


python manage.py check
→ System check identified no issues


python manage.py spectacular --file schema.yml
→ schema generated successfully


pip-audit
→ No known vulnerabilities found
```

Pada verification terakhir masih terdapat satu formatting-only item:

```text
alerts/views.py
```

yang perlu diformat menggunakan:

```powershell
ruff format alerts/views.py
```

kemudian diverifikasi:

```powershell
ruff format --check .
```

Ini bukan failure business logic atau testing.

---

# 15.36 Security and Integrity Rules

Phase 5 mempertahankan aturan:

```text
Client cannot control alert severity.

Client cannot control risk status.

Client cannot control recommendation codes.

Client cannot alter ARKL result through Alert API.

Historical ARKL cannot create realtime alert.

Reading and ARKLResult relationship is validated.

Simulated provenance is preserved.
```

Selain itu existing middleware tetap menangani:

```text
400 security audit

401 security audit

403 security audit

request ID

error logging

redaction
```

---

# 15.37 Phase 5 Implementation History

Phase 5 dilaksanakan dengan urutan:

```text
Phase 5A
Scientific / Operational Specification
        ↓

Phase 5B
Environmental Mapping
        ↓
Alert Decision Matrix
        ↓
Risk Status
        ↓
Recommendation
        ↓
Evaluator
        ↓
Unit Tests
        ↓

Phase 5C
Alert Model
        ↓
Migration
        ↓
Persistence
        ↓
Deduplication
        ↓
Escalation
        ↓
Lifecycle
        ↓
Integration Tests
        ↓

Phase 5D
Alert Service Orchestration
        ↓
Serializer
        ↓
REST API
        ↓
OpenAPI
        ↓
API Tests
        ↓

Phase 5E
Full E2E
        ↓
Full Regression
        ↓
Phase 5 Lock
```

---

# 15.38 Definition of Done

```text
[x] environmental dimension documented

[x] risk dimension documented

[x] environmental/risk dimensions remain separated

[x] canonical environmental mapping implemented

[x] alert decision matrix locked

[x] alert level deterministic

[x] risk status deterministic

[x] recommendation rules documented

[x] recommendation codes implemented

[x] no medical diagnosis

[x] Alert model implemented

[x] migration implemented

[x] snapshot strategy implemented

[x] provenance preserved

[x] lifecycle implemented

[x] OPEN implemented

[x] ACKNOWLEDGED implemented

[x] RESOLVED implemented

[x] deduplication implemented

[x] ACKNOWLEDGED treated as active

[x] resolved alert allows new alert

[x] alert escalation handled

[x] de-escalation handled

[x] repeated identical evaluation does not create alert spam

[x] realtime ARKL integration works

[x] historical ARKL rejected for realtime alert creation

[x] REST API implemented

[x] list API implemented

[x] detail API implemented

[x] evaluate API implemented

[x] acknowledge API implemented

[x] resolve API implemented

[x] filtering implemented

[x] React-compatible output

[x] client cannot determine alert decision

[x] AI does not calculate risk or severity

[x] unit tests pass

[x] persistence tests pass

[x] lifecycle tests pass

[x] API tests pass

[x] E2E test passes

[x] full regression passes

[x] Ruff lint clean

[~] Ruff format clean
    functional code clean;
    final alerts/views.py formatting verification pending

[x] Django check clean

[x] OpenAPI generation clean

[x] pip-audit clean
```

---

# 15.39 Known MVP Boundary

Phase 5 intentionally tidak menangani:

```text
medical diagnosis

ISPA probability prediction

clinical decision support

automatic AI decision making

Celery jobs

Redis queue

WebSocket backend

notification gateway

SMS

WhatsApp notification

email notification

complex event streaming
```

Semua itu di luar kebutuhan Phase 5 MVP.

---

# 15.40 Deferred Considerations

Beberapa hal sengaja tidak ditambahkan karena belum diperlukan.

### Superseded Alert State

Saat escalation:

```text
MEDIUM
↓
HIGH
```

alert HIGH baru dibuat.

Existing MEDIUM tidak otomatis diberi status:

```text
SUPERSEDED
```

karena state tersebut belum dibutuhkan pada MVP.

---

### Automatic Telemetry-triggered ARKL

Raw MQTT telemetry tidak otomatis menjalankan ARKL pada setiap message.

Hal ini mencegah:

```text
unnecessary calculation

database write explosion

alert spam
```

---

### AI Agent

AI Agent belum menjadi bagian deterministic Phase 5.

Jika digunakan nanti, posisinya:

```text
ARKL + Alert deterministic output
        ↓
AI explanation
```

bukan:

```text
AI
↓
scientific decision
```

---

# 15.41 Final Phase 5 Architecture

```text
ESP32 / MQTT
      ↓
H2SReading
      ↓
Layer 2 Data
      ↓
Smart ARKL v1.1
      ↓
ARKLResult
      │
      ├──────────────────────┐
      │                      │
      ↓                      ↓
Risk Dimension       Environmental Dimension
ARKLResult               H2SReading
      │                      │
      └──────────┬───────────┘
                 ↓
      Environmental Normalizer
                 ↓
      Deterministic Alert Engine
                 ↓
        Alert Decision
          ├── Alert Level
          └── Risk Status
                 ↓
      Recommendation Engine
                 ↓
         Alert Evaluation
                 ↓
      Persistence / Dedup
                 ↓
             Alert
                 ↓
       Lifecycle Management
        OPEN
          ↓
     ACKNOWLEDGED
          ↓
       RESOLVED
                 ↓
             REST API
                 ↓
              React
```

---

# 15.42 Final Scientific Boundary

Phase 5 menghasilkan:

```text
environmental alert

risk-management classification

risk-management recommendation
```

Phase 5 tidak menghasilkan:

```text
diagnosis ISPA

probability seseorang mengalami ISPA

medical risk prediction

clinical recommendation
```

`RQ` tetap merupakan:

```text
risk characterization metric
```

bukan probabilitas penyakit.

---

# 15.43 Phase 5 Final Lock

Setelah final formatting verification:

```text
Phase 5
Layer 4 — Alert & Risk Management

ALERT_RULE_VERSION:
1.0.0-MVP

ARKL_CALCULATION_VERSION:
1.1.0-MVP

STATUS:
MVP OPERATIONAL LOCK
IMPLEMENTED
TESTED
E2E VERIFIED
REGRESSION VERIFIED
```

Setelah status ini dikunci:

```text
DO NOT
redefine alert matrix

DO NOT
change ARKL v1.1 formula

DO NOT
change RfC

DO NOT
move decision logic to React

DO NOT
let AI determine alert severity
```

kecuali terdapat:

```text
new scientific evidence

validated research requirement

domain requirement

versioned change
```

Perubahan selanjutnya harus menghasilkan versi rule baru, bukan diam-diam mengubah:

```text
1.0.0-MVP
```

---

# 15.44 Next Phase

Setelah Phase 5 dikunci, tahap berikutnya:

```text
Phase 6
Layer 5 — Research & Reporting
```

Target awal:

```text
research aggregation
        ↓
H₂S trend analysis
        ↓
ARKL statistics
        ↓
alert statistics
        ↓
chart-ready API
        ↓
research summary
        ↓
report/export
```

## 16.1 Data Sources

Primary sources:

```text
H2SReading
ExposureProfile
ARKLResult
Alert
```

Data flow:

```text
Layer 1
H2SReading
     │
     ├───────────────┐
     │               │
Layer 2              │
ExposureProfile      │
     │               │
     ▼               ▼
Layer 3           Layer 4
ARKLResult         Alert
     │               │
     └───────┬───────┘
             ▼
          Layer 5
     Research & Reporting
```

---

## 16.2 Backend Responsibilities

Backend bertanggung jawab terhadap:

```text
query
filtering
aggregation
statistics
summary
research dataset preparation
export
research API
```

Backend tidak bertanggung jawab terhadap final visual layout chart.

---

## 16.3 React Responsibilities

React bertanggung jawab terhadap:

```text
charts
tables
visualization
dashboard
filters UI
report preview
interactive exploration
```

Scientific aggregation tetap dilakukan di backend.

---

## 16.4 Candidate Endpoints

```text
GET /api/v1/research/h2s-summary/
GET /api/v1/research/h2s-trends/
GET /api/v1/research/risk-distribution/
GET /api/v1/research/arkl-results/
GET /api/v1/research/exposure-summary/
GET /api/v1/research/alert-summary/
```

Optional:

```text
GET /api/v1/research/export/
```

hanya jika export benar-benar dibutuhkan.

---

## 16.5 H₂S Summary

Candidate output:

```text
reading_count
minimum_ppm
maximum_ppm
mean_ppm
period_start
period_end
```

Additional statistics hanya ditambahkan jika diperlukan penelitian.

---

## 16.6 H₂S Trend

Output harus chart-ready.

Candidate:

```json
{
  "timestamp": "2026-08-20T08:00:00Z",
  "ppm": 4.21
}
```

Backend dapat melakukan aggregation/downsampling bila jumlah telemetry sudah terlalu besar.

Tidak perlu dilakukan sebelum ada performance need.

---

## 16.7 Risk Distribution

Candidate categories:

```text
WITHIN_REFERENCE_LEVEL
ABOVE_REFERENCE_LEVEL
```

Output dapat mencakup:

```text
count
percentage
```

Jangan mengubah kategori ARKL pada reporting layer.

---

## 16.8 Exposure Summary

Candidate analytical fields:

```text
worker_count
body_weight summary
exposure_time summary
exposure_frequency summary
exposure_duration summary
inhalation_rate summary
```

Data harus diperlakukan sebagai research data.

---

## 16.9 Alert Summary

Candidate:

```text
alert count
alert level distribution
open alerts
acknowledged alerts
resolved alerts
risk-management recommendation frequency
```

Simulated alert harus dapat dibedakan dari physical data.

---

## 16.10 Rules

Jangan duplikasi:

```text
ppm conversion
Exposure Concentration formula
RfC
RQ formula
alert decision matrix
```

Reporting hanya membaca hasil dari source layer.

Correct:

```text
ARKLResult.rq
        ↓
Research aggregation
```

Incorrect:

```text
Research API
        ↓
recalculate RQ
```

---

## 16.11 Filtering

Candidate filters:

```text
start_time
end_time
device
worker
calculation_type
risk_interpretation
alert_level
source_simulated
```

Filter hanya dibuat jika benar-benar dibutuhkan frontend/research.

---

## 16.12 Research Reproducibility

Output research harus mempertahankan informasi seperti:

```text
calculation_version
time range
source provenance
sample/readings count
```

Tujuannya supaya hasil dapat ditelusuri kembali.

---

## 16.13 Export

Candidate formats:

```text
CSV
XLSX
```

Implement export hanya jika diperlukan sebagai luaran penelitian.

Raw database dump tidak digunakan sebagai research export utama.

---

## 16.14 AI Boundary

Optional AI dapat digunakan untuk:

```text
research summary
narrative
trend explanation
report drafting
```

AI tidak boleh:

```text
mengubah raw data
mengubah RQ
mengubah calculation version
mengubah alert severity
menghasilkan statistik yang tidak berasal dari deterministic backend
```

---

## 16.15 Testing Requirements

Minimum:

```text
summary calculations
trend query
risk distribution
exposure summary
alert summary
filters
empty dataset behavior
simulated provenance
API serialization
```

Full regression tidak boleh merusak Layer 1–4.

---

## 16.16 Definition of Done

```text
[ ] historical H₂S summary
[ ] H₂S trend data
[ ] ARKL result recap
[ ] exposure summary
[ ] risk distribution
[ ] alert summary

[ ] time-range filtering
[ ] provenance preserved
[ ] calculation version available

[ ] export implemented bila diperlukan

[ ] React chart-ready API
[ ] no duplicated ARKL formula
[ ] no duplicated alert formula

[ ] unit tests
[ ] API tests
[ ] full regression

[ ] Ruff clean
[ ] format clean
[ ] Django check clean
[ ] OpenAPI clean
```

---

## 16.17 Phase 6 Implementation Order

```text
1. Define research output requirements
       ↓
2. Implement query/aggregation services
       ↓
3. Unit tests
       ↓
4. Research serializers
       ↓
5. REST API
       ↓
6. Filters
       ↓
7. React chart contract
       ↓
8. Export if required
       ↓
9. OpenAPI
       ↓
10. Full regression
       ↓
11. Research E2E
       ↓
12. Phase 6 lock
```

```

Perubahan terpenting untuk **Phase 5** adalah sekarang kita tidak sekadar punya `Alert Engine`, tetapi sudah jelas ada empat kontrak yang sebelumnya hilang:

```text
Decision Matrix
Lifecycle
Deduplication / Escalation
Recommendation Rules
```

Dan saya sengaja memberi status decision matrix:

```text
CANDIDATE — NOT SCIENTIFICALLY LOCKED YET
```

karena **langkah berikutnya bukan membuat `models.py`**, melainkan melakukan **audit ulang Layer 1 `ppm → level → status`** yang sekarang dikirim ESP32/MQTT. Setelah mapping Layer 1 itu terverifikasi, baru kita lock kombinasi:

```text
Environmental Status
        +
ARKL Interpretation
        ↓
Alert Level
```



---



# 16. Phase 6 — Layer 5 Research & Reporting

## Status

```text
PHASE 6 STATUS:
PLANNED — NOT IMPLEMENTED YET

DEPENDENCIES:
Layer 1 — IoT Environmental Monitoring       ✅
Layer 2 — Data & Exposure Management          ✅
Layer 3 — Smart ARKL v1.1                     ✅ LOCKED
Layer 4 — Alert & Risk Management             ✅ LOCKED
```

Phase 6 bertugas mengubah data operasional Layer 1–4 menjadi output yang siap digunakan untuk:

```text
research analysis
dashboard
charts
tables
statistical recap
export
reporting
publication support
```

Phase 6 bukan calculation engine baru.

---

# 16.1 Tujuan

Menyediakan analytical dan research-ready data dari:

```text
H2SReading
+
ExposureProfile
+
ARKLResult
+
Alert
        ↓
Research & Reporting Layer
        ↓
Aggregation
Statistics
Trend Data
Distribution
Summary
Export
        ↓
React / Research Output
```

Output harus dapat digunakan untuk:

- grafik penelitian;
- tabel hasil;
- statistik deskriptif;
- analisis tren H₂S;
- rekap ARKL;
- distribusi tingkat risiko;
- rekap alert;
- analisis exposure profile;
- dashboard penelitian;
- report preview;
- export data penelitian.

---

# 16.2 Scientific Boundary

Phase 6 hanya melakukan:

```text
query
filtering
aggregation
descriptive statistics
distribution
trend preparation
report formatting
export
```

Phase 6 **tidak boleh** menghitung ulang business logic dari layer sebelumnya.

Tidak boleh menduplikasi:

```text
ppm → environmental classification
```

dari Layer 1.

Tidak boleh menduplikasi:

```text
ppm → mg/m³
EC
RQ
RfC
ARKL interpretation
```

dari Layer 3.

Tidak boleh menduplikasi:

```text
alert decision matrix
risk status mapping
recommendation rules
```

dari Layer 4.

Source of truth tetap:

```text
H2SReading
ARKLResult
Alert
```

Phase 6 membaca hasil yang sudah tersedia.

---

# 16.3 Primary Data Sources

## Environmental Data

Source:

```text
H2SReading
```

Relevant fields:

```text
device
ppm
level
status
simulated
received_at
```

Digunakan untuk:

```text
historical H₂S summary
time-series trend
minimum/maximum/average
sample count
environmental status distribution
```

---

## Exposure Data

Source:

```text
ExposureProfile
```

Relevant fields:

```text
worker
body_weight
exposure_time
exposure_frequency
exposure_duration
inhalation_rate
```

Digunakan untuk:

```text
exposure profile recap
descriptive statistics
worker exposure overview
research table
```

ExposureProfile tidak dihitung ulang menjadi RQ pada Phase 6.

---

## ARKL Data

Source:

```text
ARKLResult
```

Relevant fields:

```text
worker
reading
calculation_type

concentration_ppm
concentration_mg_m3
exposure_concentration_mg_m3

rfc
rq
interpretation

calculation_version
source_simulated

period_start
period_end
reading_count

created_at
```

Digunakan untuk:

```text
RQ distribution
ARKL result recap
risk interpretation distribution
historical/realtime comparison
version traceability
research statistics
```

---

## Alert Data

Source:

```text
Alert
```

Relevant fields:

```text
worker
device
reading
arkl_result

environmental_severity
alert_level
risk_status
status

recommendation_codes

source_simulated
alert_rule_version

acknowledged_at
resolved_at
created_at
```

Digunakan untuk:

```text
alert distribution
severity distribution
lifecycle statistics
risk-management recap
recommendation frequency
```

Catatan model yang benar adalah:

```text
Alert
```

bukan:

```text
AlertResult
```

karena model Phase 5 yang diimplementasikan adalah `Alert`.

---

# 16.4 Architecture

Target:

```text
research/
├── services/
│   ├── h2s_summary.py
│   ├── h2s_trends.py
│   ├── arkl_summary.py
│   ├── exposure_summary.py
│   ├── alert_summary.py
│   └── export.py
│
├── tests/
│   ├── test_h2s_summary.py
│   ├── test_h2s_trends.py
│   ├── test_arkl_summary.py
│   ├── test_exposure_summary.py
│   ├── test_alert_summary.py
│   └── test_api.py
│
├── serializers.py
├── views.py
└── urls.py
```

Namun struktur final tidak perlu dibuat seluruhnya sejak awal.

Gunakan:

```text
View
  ↓
Serializer
  ↓
Research Service
  ↓
Django ORM aggregation
  ↓
Existing Models
```

Tidak perlu:

```text
Pandas di request path
NumPy
Celery
data warehouse
ETL framework
repository layer
analytics database
```

selama Django ORM masih cukup.

---

# 16.5 Time Range Contract

Sebagian besar endpoint Phase 6 harus mendukung periode.

Recommended query parameters:

```text
start
end
device_code
worker_code
source_simulated
```

Contoh:

```http
GET /api/v1/research/h2s-summary/
    ?start=2026-08-01T00:00:00Z
    &end=2026-08-20T23:59:59Z
    &device_code=H2S-001
```

Rule:

```text
start <= end
```

Invalid period:

```text
→ HTTP 400
```

Jika period tidak diberikan, endpoint boleh menggunakan seluruh dataset pada MVP atau default yang terdokumentasi.

Jangan menggunakan default period tersembunyi.

---

# 16.6 H₂S Historical Summary

Endpoint:

```text
GET /api/v1/research/h2s-summary/
```

Tujuan:

```text
descriptive environmental summary
```

Minimum output:

```text
sample_count
minimum_ppm
maximum_ppm
average_ppm
first_reading_at
last_reading_at
```

Recommended tambahan:

```text
simulated_count
physical_count
device_count
```

Contoh:

```json
{
  "period": {
    "start": "2026-08-01T00:00:00Z",
    "end": "2026-08-20T23:59:59Z"
  },
  "sample_count": 1240,
  "minimum_ppm": 0.12,
  "maximum_ppm": 58.61,
  "average_ppm": 6.42,
  "first_reading_at": "2026-08-01T08:01:02Z",
  "last_reading_at": "2026-08-20T16:32:54Z"
}
```

Statistik dihasilkan dari stored `H2SReading.ppm`.

---

# 16.7 H₂S Trend Data

Endpoint:

```text
GET /api/v1/research/h2s-trends/
```

Tujuan:

```text
chart-ready time-series
```

Recommended query:

```text
interval=raw
interval=hour
interval=day
```

MVP minimal:

```text
raw
hour
day
```

Contoh daily aggregation:

```json
{
  "interval": "day",
  "series": [
    {
      "timestamp": "2026-08-18",
      "average_ppm": 4.12,
      "minimum_ppm": 0.20,
      "maximum_ppm": 27.50,
      "sample_count": 520
    },
    {
      "timestamp": "2026-08-19",
      "average_ppm": 5.43,
      "minimum_ppm": 0.18,
      "maximum_ppm": 31.20,
      "sample_count": 604
    }
  ]
}
```

React hanya menggambar grafik.

React tidak menghitung ulang aggregation utama.

---

# 16.8 Environmental Status Distribution

Recommended analytical output:

```text
NORMAL
CAUTION
WARNING
DANGER
CRITICAL
```

Source harus berasal dari stored status/severity yang sesuai source contract.

Jika penelitian ingin menganalisis **raw Layer 1 status**, gunakan:

```text
H2SReading.status
```

Jika ingin menganalisis **Layer 4 canonical environmental severity**, gunakan:

```text
Alert.environmental_severity
```

Keduanya tidak boleh dicampur tanpa label.

---

# 16.9 ARKL Result Recap

Endpoint:

```text
GET /api/v1/research/arkl-results/
```

Tujuan:

```text
research-ready ARKL record recap
```

Recommended fields:

```text
id
worker_code
calculation_type

concentration_ppm
concentration_mg_m3
exposure_concentration_mg_m3

rfc
rq
interpretation

calculation_version
source_simulated

period_start
period_end
reading_count

created_at
```

Filter:

```text
worker_code
calculation_type
interpretation
calculation_version
start
end
source_simulated
```

Endpoint tidak melakukan recalculation.

---

# 16.10 ARKL Risk Distribution

Endpoint:

```text
GET /api/v1/research/risk-distribution/
```

Primary distribution:

```text
WITHIN_REFERENCE_LEVEL

ABOVE_REFERENCE_LEVEL
```

Minimum output:

```json
{
  "total": 100,
  "distribution": [
    {
      "interpretation": "WITHIN_REFERENCE_LEVEL",
      "count": 38,
      "percentage": 38.0
    },
    {
      "interpretation": "ABOVE_REFERENCE_LEVEL",
      "count": 62,
      "percentage": 62.0
    }
  ]
}
```

Percentage dihitung:

```text
category_count
────────────── × 100
total_count
```

Ini descriptive statistic.

Bukan probability of disease.

---

# 16.11 RQ Descriptive Statistics

Recommended output:

```text
count
minimum_rq
maximum_rq
average_rq
```

Median dapat ditambahkan nanti apabila diperlukan untuk penelitian.

Untuk MVP, jangan menambahkan statistical framework besar hanya untuk median.

Jika dibutuhkan nanti, implementasi dapat dipertimbangkan secara terpisah.

---

# 16.12 Exposure Summary

Endpoint:

```text
GET /api/v1/research/exposure-summary/
```

Tujuan:

```text
descriptive overview
of ExposureProfile records
```

Recommended output:

```json
{
  "worker_count": 35,
  "body_weight": {
    "average": 58.2,
    "minimum": 45.0,
    "maximum": 82.0
  },
  "exposure_time": {
    "average": 7.3,
    "minimum": 3.0,
    "maximum": 10.0
  },
  "exposure_frequency": {
    "average": 245.2,
    "minimum": 120.0,
    "maximum": 300.0
  },
  "exposure_duration": {
    "average": 8.7,
    "minimum": 1.0,
    "maximum": 25.0
  }
}
```

Inhalation rate dapat disertakan jika relevan terhadap kebutuhan penelitian.

---

# 16.13 Alert Summary

Saya sarankan Phase 6 menambahkan analytical endpoint:

```text
GET /api/v1/research/alert-summary/
```

karena Layer 4 sudah menjadi bagian penting sistem.

Minimum statistics:

```text
total alerts

alert level distribution

risk status distribution

lifecycle distribution

simulated vs physical

escalation-related analytical data
```

Contoh:

```json
{
  "total": 24,
  "alert_levels": {
    "LOW": 3,
    "MEDIUM": 7,
    "HIGH": 10,
    "CRITICAL": 4
  },
  "lifecycle": {
    "OPEN": 4,
    "ACKNOWLEDGED": 3,
    "RESOLVED": 17
  }
}
```

Catatan penting:

`Alert` saat ini tidak menyimpan boolean `escalated`.

Jadi jangan mengklaim jumlah escalation langsung dari model kecuali nanti ada rule analitik yang dapat direkonstruksi secara valid atau schema baru memang dibutuhkan.

Untuk MVP, escalation statistic dapat ditunda.

---

# 16.14 Recommendation Frequency

Optional but useful research output:

```text
recommendation code
→ usage count
```

Contoh:

```json
{
  "recommendations": [
    {
      "code": "MONITOR_H2S_LEVEL",
      "count": 18
    },
    {
      "code": "REDUCE_EXPOSURE_DURATION",
      "count": 12
    }
  ]
}
```

Karena `recommendation_codes` disimpan dalam JSONField, implementasi SQLite harus dibuat sederhana.

Untuk MVP, lebih aman melakukan aggregation Python terhadap queryset yang telah difilter daripada membuat query JSON SQL yang kompleks dan database-specific.

---

# 16.15 Simulated Data Handling

Semua research output yang membaca:

```text
H2SReading
ARKLResult
Alert
```

harus mempertimbangkan provenance.

Recommended filter:

```text
source=all
source=simulated
source=physical
```

atau equivalent:

```text
source_simulated=true/false
```

Research report tidak boleh mencampur simulated dan physical data tanpa dapat dibedakan.

Output sebaiknya menyertakan metadata:

```json
{
  "source_scope": "all"
}
```

atau:

```json
{
  "source_scope": "physical"
}
```

---

# 16.16 Version Traceability

ARKL research output harus mempertahankan:

```text
calculation_version
```

Alert research output harus mempertahankan:

```text
alert_rule_version
```

Tujuan:

```text
reproducibility
scientific audit
version comparison
```

Jangan menggabungkan hasil dari versi calculation/rule berbeda tanpa dapat ditelusuri.

---

# 16.17 Candidate REST API

Revised MVP endpoints:

```text
GET /api/v1/research/h2s-summary/

GET /api/v1/research/h2s-trends/

GET /api/v1/research/arkl-results/

GET /api/v1/research/risk-distribution/

GET /api/v1/research/exposure-summary/

GET /api/v1/research/alert-summary/
```

Candidate later:

```text
GET /api/v1/research/export/
```

Saya sarankan **export tidak dibuat pada langkah pertama**.

Bangun aggregation API dahulu, lock, baru tambahkan export.

---

# 16.18 Export Strategy

Jika diperlukan, MVP export sebaiknya:

```text
CSV
```

bukan langsung:

```text
PDF
Excel
complex report generator
```

Alasannya:

```text
portable
research-friendly
easy to validate
minimal dependency
works with SPSS/R/Python/Excel
```

Possible export datasets:

```text
H2S readings

ARKL results

Alerts

Exposure profiles
```

Jangan membuat satu “mega CSV” yang mencampur data berbeda tanpa struktur ilmiah yang jelas.

---

# 16.19 React Responsibilities

React bertanggung jawab untuk:

```text
charts

tables

filter UI

date-range selector

dashboard

report preview

download trigger

presentation
```

React dapat menerima chart-ready data seperti:

```text
labels
timestamps
counts
averages
distribution
```

React tidak melakukan:

```text
RQ calculation

scientific aggregation rule

risk interpretation

alert decision

source classification
```

---

# 16.20 Chart Candidates

Phase 6 API sebaiknya memungkinkan React membuat:

```text
Line Chart
H₂S concentration over time


Bar Chart
average/min/max H₂S by day


Pie / Donut Chart
ARKL interpretation distribution


Bar Chart
alert-level distribution


Bar Chart
risk-status distribution


Table
ARKL result recap


Table
Exposure profile recap
```

Visualization library merupakan frontend concern.

Backend tidak perlu menghasilkan image chart.

---

# 16.21 Research Metadata

Recommended response metadata:

```text
generated_at

period_start

period_end

filters

sample_count

source_scope

calculation_version
```

Contoh:

```json
{
  "meta": {
    "generated_at": "2026-08-20T12:00:00Z",
    "start": "2026-08-01T00:00:00Z",
    "end": "2026-08-20T23:59:59Z",
    "source_scope": "physical"
  },
  "data": {}
}
```

Hal ini meningkatkan reproducibility.

---

# 16.22 Empty Dataset Behaviour

Empty research data bukan server error.

Contoh:

```text
valid period
+
no readings
```

sebaiknya menghasilkan:

```http
HTTP 200
```

dengan:

```json
{
  "sample_count": 0,
  "minimum_ppm": null,
  "maximum_ppm": null,
  "average_ppm": null
}
```

Berbeda dengan:

```text
invalid period
```

yang menghasilkan:

```http
HTTP 400
```

---

# 16.23 Precision Rules

Untuk statistik research, jangan menggunakan:

```text
float equality
```

sebagai basis scientific validation.

Source H₂S masih berasal dari FloatField, tetapi output statistik harus memiliki rounding policy yang terdokumentasi.

Recommended presentation:

```text
ppm:
2–6 decimal places depending endpoint

RQ:
preserve stored Decimal precision
```

Rounding untuk UI tidak boleh mengubah nilai yang disimpan di database.

---

# 16.24 Performance Rules

Phase 6 dapat memiliki dataset lebih besar dari Layer 3/4.

Gunakan:

```text
Django ORM aggregation

Avg
Min
Max
Count

TruncHour
TruncDay

select_related

database filtering
```

Hindari:

```text
load all rows
↓
iterate Python
```

kecuali operasi tersebut memang tidak praktis dilakukan secara portable melalui SQLite, seperti MVP JSON recommendation aggregation.

Indexes existing time fields harus dimanfaatkan.

---

# 16.25 Observability

Gunakan existing observability.

HTTP:

```text
global middleware
```

Jika service logging diperlukan:

```text
smart_h2s.research
```

Jangan implement ulang:

```text
Request ID
request logging
error logging
performance monitoring
security audit
redaction
rotating logs
```

Research API tidak boleh log seluruh dataset response.

---

# 16.26 AI Boundary

Phase 6 deterministic reporting harus berfungsi tanpa AI.

Optional later:

```text
Research Statistics
        ↓
AI
        ↓
Narrative Summary
```

AI boleh:

```text
meringkas tren

menjelaskan statistik

membantu draft report

membantu research narrative
```

AI tidak boleh:

```text
mengubah nilai statistik

menghitung ulang ARKL menggunakan formula lain

mengubah classification

mengubah alert severity

menghasilkan data penelitian palsu
```

AI-generated narrative harus berasal dari deterministic results.

---

# 16.27 Testing Requirements

Minimum test scope:

```text
H2S Summary
├── count
├── minimum
├── maximum
├── average
├── period filter
├── device filter
└── empty dataset


H2S Trends
├── raw
├── hourly aggregation
├── daily aggregation
├── chronological ordering
└── period filter


ARKL Research
├── result recap
├── REALTIME filter
├── HISTORICAL filter
├── interpretation filter
├── version preservation
└── simulated provenance


Risk Distribution
├── WITHIN count
├── ABOVE count
├── total
├── percentage
└── empty dataset


Exposure Summary
├── worker count
├── average
├── min
├── max
└── empty dataset


Alert Summary
├── total
├── alert level distribution
├── risk status distribution
├── lifecycle distribution
└── simulated provenance


API
├── valid request
├── invalid period
├── filtering
├── empty result
└── response contract
```

---

# 16.28 Regression Requirements

Full regression wajib memastikan Phase 6 tidak mengubah:

```text
MQTT ingestion

H2SReading persistence

Device API

Worker API

ExposureProfile API

ARKL v1.1

Alert Engine v1.0.0-MVP

Alert lifecycle

core observability
```

Phase 6 harus read-oriented.

Tidak boleh ada side effect terhadap source records melalui research endpoints.

---

# 16.29 Definition of Done

```text
[ ] research app/module architecture locked

[ ] time-range contract implemented

[ ] H₂S historical summary implemented

[ ] H₂S trend API implemented

[ ] raw trend supported

[ ] hourly trend aggregation supported

[ ] daily trend aggregation supported

[ ] ARKL result recap implemented

[ ] ARKL risk distribution implemented

[ ] exposure summary implemented

[ ] Alert summary implemented

[ ] simulated provenance supported

[ ] calculation_version preserved

[ ] alert_rule_version preserved

[ ] chart-ready output implemented

[ ] empty dataset contract implemented

[ ] invalid period rejected

[ ] React does not perform scientific calculation

[ ] reporting does not duplicate ARKL formula

[ ] reporting does not duplicate Alert Engine rules

[ ] unit tests pass

[ ] API tests pass

[ ] full regression passes

[ ] Ruff clean

[ ] format clean

[ ] Django check clean

[ ] OpenAPI clean

[ ] pip-audit clean

[ ] optional CSV export evaluated after core reporting lock
```

---

# 16.30 Recommended Phase 6 Implementation Order

Saya sarankan Phase 6 jangan langsung membuat semua endpoint sekaligus.

```text
Phase 6A
Research Contract
        ↓
time-range rules
filter rules
source provenance
empty-result behaviour
response metadata
        ↓

Phase 6B
Environmental Analytics
        ↓
H₂S Summary
        ↓
H₂S Trends
        ↓
tests
        ↓

Phase 6C
Risk & Exposure Analytics
        ↓
ARKL Recap
        ↓
Risk Distribution
        ↓
Exposure Summary
        ↓
tests
        ↓

Phase 6D
Alert Analytics
        ↓
Alert Summary
        ↓
recommendation frequency if needed
        ↓
tests
        ↓

Phase 6E
REST API
        ↓
OpenAPI
        ↓
React-ready verification
        ↓

Phase 6F
Full Regression
        ↓
E2E
        ↓
Phase 6 Core Lock
        ↓

Phase 6G — Optional
CSV Export
```

---

# 16.31 Recommended MVP Scope

Agar proyek tidak melebar, saya sarankan **core Phase 6 hanya mengunci 6 endpoint**:

```text
GET /api/v1/research/h2s-summary/

GET /api/v1/research/h2s-trends/

GET /api/v1/research/arkl-results/

GET /api/v1/research/risk-distribution/

GET /api/v1/research/exposure-summary/

GET /api/v1/research/alert-summary/
```

Jangan dulu menambahkan:

```text
PDF generator

Excel generator

AI report agent

statistical hypothesis testing

machine learning analytics

complex BI dashboard

scheduled reporting
```

Semua itu bisa menjadi tahap setelah deterministic research API stabil.

---

## Kesimpulan

Catatan awal Anda sudah benar secara arah. Perubahan paling penting yang saya sarankan adalah:

```text
AlertResult
→ Alert
```

lalu menambahkan `alert-summary`, time-range contract, simulated provenance, empty dataset behavior, version traceability, serta memisahkan core analytics dari optional export.

Dengan scope ini, **Phase 6 tetap kecil tetapi secara penelitian jauh lebih kuat** karena hasilnya sudah mendukung descriptive statistics, tren waktu, ARKL recap, risk distribution, exposure overview, dan Layer 4 alert analysis tanpa mengulang formula ilmiah yang sudah dikunci.

# 17. AI Boundary

AI Agent bukan bagian deterministic calculation engine.

Allowed:

```text
ARKLResult
    ↓
AI
    ↓
natural-language explanation
summary
research narrative
risk communication
```

Forbidden:

```text
Telemetry
 ↓
LLM
 ↓
Intake / RQ
```

AI tidak boleh menentukan:

```text
Intake
RfC
RQ
alert threshold
```

kecuali di masa depan hanya digunakan sebagai assistant di atas deterministic result.

---

# 18. Data Provenance

Semua reading memiliki:

```text
simulated = true/false
```

Wokwi:

```text
simulated = true
```

ARKL result menyimpan:

```text
source_simulated
```

Sistem tidak boleh menampilkan data simulasi sebagai sensor fisik tanpa penandaan.

Jika nanti historical period menggabungkan sumber berbeda, provenance strategy dapat diperluas melalui versioned migration.

---

# 19. Scientific Change Control

Perubahan material pada:

- formula Intake;
- conversion factor;
- RfC;
- unit;
- averaging time;
- aggregation strategy;
- RQ interpretation;

wajib memperbarui:

```text
ARKL_CALCULATION_SPEC.md
calculation version
constants
unit tests
API documentation bila terpengaruh
research documentation
```

Jangan mengubah formula hanya di code.

---

# 20. Testing Strategy

Testing adalah bagian setiap phase.

Pembagian:

```text
Unit
├── pure function
└── validation

Persistence
└── model/database behavior

Integration
└── service orchestration

API
└── HTTP contract

Feature / E2E
└── complete data flow
```

Jangan mengejar 100% coverage framework.

Prioritaskan:

```text
devices/services/
exposure/services/
arkl/services/
alerts/services/
research/services/
```

---

# 21. Test Structure

Untuk app yang sudah besar, gunakan folder test terpisah.

Contoh ARKL:

```text
arkl/tests/
├── __init__.py
├── test_conversion.py
├── test_validation.py
├── test_intake.py
├── test_rq.py
├── test_interpretation.py
├── test_aggregation.py
├── test_models.py
├── test_calculator.py
└── test_api.py
```

Gunakan nama berdasarkan responsibility, bukan urutan eksekusi.

---

# 22. Checklist Sebelum Commit

Wajib:

```bash
ruff check .
ruff format --check .
pytest
python manage.py check
pip-audit
```

Checklist:

```text
[ ] no secrets in source
[ ] .env not committed
[ ] migration committed when model changes
[ ] tests added/updated
[ ] no leftover print()
[ ] no sensitive log payload
[ ] views thin
[ ] business logic in services
[ ] scientific formula only in ARKL services
[ ] API docs updated
[ ] calculation specification updated when required
```

---

# 23. Git Workflow Solo Developer

Gunakan workflow sederhana:

```text
main
 ↑
feature/*
fix/*
refactor/*
```

Contoh:

```text
feature/mqtt-ingestion
feature/exposure-profile
feature/arkl-engine
feature/arkl-api
feature/alert-engine
fix/latest-reading-order
fix/mqtt-reconnect
refactor/arkl-tests
```

Flow:

```text
create branch
   ↓
small implementation
   ↓
tests
   ↓
lint
   ↓
commit
   ↓
merge when stable
```

Hindari Git flow kompleks untuk solo developer.

---

# 24. Definition of Done Keseluruhan Backend

Backend MVP baseline dianggap lengkap jika:

```text
[x] MQTT telemetry masuk otomatis
[x] H2S reading tersimpan
[x] Worker/ExposureProfile tersedia
[x] Layer 2 REST API tersedia

[ ] Smart ARKL REST API final
[ ] ARKL E2E final
[ ] Alert Engine
[ ] Research API

[x] Observability infrastructure
[x] Security logging baseline
[x] API documentation infrastructure
[x] scientific calculation versioning
[x] simulated-data provenance
```

Final baseline:

```text
[ ] React dapat mengonsumsi seluruh API
[ ] tidak ada scientific formula di frontend
[ ] tidak ada sensitive data di log
[ ] no unnecessary dependency
[ ] full regression green
```

---

# 25. Current Project Status

```text
Phase 0 — Backend Foundation
✅ DONE

Phase 1 — Devices + MQTT Ingestion
✅ DONE

Phase 2 — Layer 2 Data Models
✅ DONE

Phase 3 — Layer 2 REST API
✅ DONE

Phase 4 — Smart ARKL
🟡 IN PROGRESS

├── 4A Scientific Specification
│   ✅ DONE
│
├── 4B Core Calculation Engine
│   ✅ DONE
│
├── 4C ARKLResult Persistence
│   ✅ DONE
│
├── 4D Calculator Orchestration
│   ✅ DONE
│
├── 4E REST API + OpenAPI
│   🟡 IN PROGRESS
│
└── 4F Regression + E2E
    ⬜ NEXT

Phase 5 — Alert & Risk Management
⬜ NOT STARTED

Phase 6 — Research & Reporting
⬜ NOT STARTED
```

---

# 26. Urutan Kerja Saat Ini

Current work:

```text
1. Finalize ARKL API tests
        ↓
2. Ruff
        ↓
3. Django check
        ↓
4. OpenAPI schema generation
        ↓
5. Swagger verification
        ↓
6. Full regression
        ↓
7. E2E:
   Wokwi
      ↓
   MQTT
      ↓
   H2SReading
      ↓
   ARKL API
      ↓
   ARKLResult
        ↓
8. Lock Phase 4 DONE
        ↓
9. Start Phase 5 Alert Engine
```

---

# 27. Daily Development Rule

Jika bingung harus mengerjakan apa:

```text
1. Baca phase aktif.
2. Pilih satu acceptance item.
3. Implementasikan perubahan minimum.
4. Jalankan focused test.
5. Jalankan lint.
6. Jalankan regression relevan.
7. Periksa log/error.
8. Commit.
9. Update SOP/checklist.
10. Baru lanjut item berikutnya.
```

Jangan:

```text
Phase 4 belum selesai
 ↓
langsung Phase 6 reporting
 ↓
kembali Phase 5
 ↓
ubah MQTT
```

Yang benar:

```text
Foundation
 ↓
MQTT
 ↓
Data
 ↓
REST API
 ↓
ARKL
 ↓
Alert
 ↓
Reporting
```

---

# 28. Roadmap Ringkas

Phase

Nama

Hasil Utama

Status

0

Backend Foundation

Django + observability siap

✅

1

Devices + MQTT

Telemetry masuk backend

✅

2

Layer 2 Models

Worker + Exposure data

✅

3

Layer 2 REST API

React dapat membaca/mengelola data

✅

4

Smart ARKL

Deterministic risk calculation

🟡

5

Alert & Risk Management

Early warning + risk action

⬜

6

Research & Reporting

Research-ready data & API

⬜

---

# 29. System Flow

Alur utama sistem:

```text
Wokwi / Physical Sensor
        ↓
MQTT
        ↓
Django MQTT Ingestion
        ↓
Device + H2SReading
        ↓
Layer 2 Exposure Data
        ↓
Worker + ExposureProfile
        ↓
Smart ARKL Engine
        ├── Validate
        ├── Convert
        ├── Aggregate
        ├── Intake
        ├── RQ
        └── Interpret
        ↓
ARKLResult
        ↓
Alert & Risk Management
        ↓
Research & Reporting
        ↓
React
```

Observability melintang pada seluruh backend:

```text
HTTP ───────┐
MQTT ───────┼──→ OBSERVABILITY
Services ───┘
```

---

# 30. Prinsip Akhir

> Jangan mengejar jumlah fitur. Kejar alur data yang benar, formula yang reproducible, kontrak API yang jelas, test yang relevan, dan sistem yang mudah dirawat.

Mnemonic utama:

```text
Ukur
 ↓
Terima
 ↓
Validasi
 ↓
Simpan
 ↓
Hitung
 ↓
Uji
 ↓
Peringatkan
 ↓
Laporkan
```

Engineering principle:

```text
THE MVP MAY EVOLVE,
BUT IT MUST NEVER HIDE ITS ASSUMPTIONS.

FORMULAS ARE VERSIONED.
CONSTANTS ARE SOURCED.
UNITS ARE EXPLICIT.
RESULTS ARE REPRODUCIBLE.
OBSERVABILITY IS SHARED.
AI DOES NOT DEFINE THE RISK.
```

```

Versi ini sudah lebih cocok dijadikan **dokumen hidup utama proyek**. Perubahan paling besar dibanding SOP v1 adalah Phase test tidak lagi berdiri sendiri, Phase ARKL dipecah menjadi 4A–4F, `lifetime` diganti menjadi `historical` untuk MVP, scientific lock dan versioning sudah formal, serta observability diperlakukan sebagai infrastructure global yang tidak boleh dibuat ulang.
```
