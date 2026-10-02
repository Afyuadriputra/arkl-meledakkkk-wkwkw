# SMART H2S ARKL — PROJECT STATUS

> Source of truth: current source, models, migrations, tests, settings, URL registration, committed `schema.yml`, and explicitly labelled runtime evidence. Updated 2026-08-20.

## 1. Project Identity

- **Purpose:** Django backend for MQTT H2S monitoring, exposure management, Smart ARKL, deterministic risk alerts, research reporting, and authenticated role-based access.
- **Stack:** Python/Django 5.2, Django REST Framework, DRF Token Authentication, Session Authentication, drf-spectacular, paho-mqtt, SQLite.
- **Architecture:** modular Django monolith: View → Serializer → Service → Model/ORM → SQLite.
- **Automation boundary:** MQTT ingestion does not automatically calculate ARKL or create alerts; callers explicitly invoke ARKL and Alert APIs.

## 2. Current Overall Status

| Layer | Name | Status | Notes |
| --- | --- | --- | --- |
| 1 | IoT Environmental Monitoring | DONE | MQTT validation, Device/H2SReading persistence, provenance, latest-reading and read APIs exist. |
| 2 | Data & Exposure Management | DONE | Worker and one-to-one ExposureProfile are implemented with validated operational APIs. |
| 3 | Smart ARKL | DONE | Runtime is `2.0.0-MVP`; engineering implementation exists, while scientific methodology review remains pending. |
| 4 | Alert & Risk Management | LOCKED | Core decision rules are unchanged; authenticated lifecycle actor audit is an extension. |
| 5 | Research & Reporting | DONE | Seven read-only Research endpoints exist and are role-protected. |
| 6 | Authentication & Authorization | DONE | Role enforcement, Token/Session auth, Worker ownership APIs, and Alert actor audit are implemented. Schema documentation hardening remains. |

## 3. Current Development Position

Project saat ini berada setelah penyelesaian engineering Layers 1–6; pekerjaan berikutnya adalah hardening, scientific-methodology approval, dan persiapan aplikasi Worker/operasional.

```text
Completed: IoT + Exposure + ARKL v2 + Alert + Research + Auth/RBAC
    ↓
Current: quality/documentation hardening and scientific review
    ↓
Next: Worker-facing application integration and physical IoT hardening
    ↓
Later: production deployment/concurrency scaling
```

## 4. Layer 1 — IoT Environmental Monitoring

### Implemented

- `Device` and `H2SReading` persist `ppm`, ADC values, `level`, `status`, `uptime_ms`, `simulated`, and receipt timestamp.
- MQTT requires `device_id`, `ppm`, `adc`, `filtered_adc`, `level`, `status`, `uptime_ms`, and boolean `simulated`; valid messages atomically create/reuse Device then persist a reading.
- Device/reading APIs require authenticated ADMIN, OPERATOR, or RESEARCHER; WORKER is denied generic device access.
- `simulated` provenance is retained in ARKL and Alert snapshots.

### Remaining / physical IoT work

- Calibration and sensor quality-control protocol.
- Provisioning and allowed device/topic policy.
- Sensor/source timestamp, message identity, idempotency, and operational MQTT supervision.

## 5. Layer 2 — Data & Exposure Management

### Actual models

- `Worker`: unique `code`, nullable `name`, nullable `age`, `is_active`, timestamps.
- `ExposureProfile`: one-to-one Worker relation; `body_weight`, `exposure_time`, `exposure_frequency`, `exposure_duration`, `inhalation_rate`.

### Constraint distinction

- **Database:** `Worker.name` and `Worker.age` are nullable for backward compatibility; profile parameter range constraints are in model validators.
- **Operational serializer/API:** new Worker creation requires name and age; ADMIN/OPERATOR may use generic Worker/Profile APIs.
- **Authorization:** WORKER cannot access generic Worker/Profile APIs and instead uses personal `/me/` APIs.

Worker remains a domain exposure entity, not the auth model.

## 6. Layer 3 — Smart ARKL

### Current runtime formula

```text
C_mg/m³ = ppm × 1.40
tavg = Dt × 365
I = (C × R × tE × fE × Dt) / (Wb × tavg)
RQ = I / H2S_RFC
H2S_RFC = 0.002
RQ <= 1 → WITHIN_REFERENCE_LEVEL
RQ > 1  → ABOVE_REFERENCE_LEVEL
```

### Version and behavior

- Active calculation version: `2.0.0-MVP`.
- Realtime uses deterministic latest reading; historical uses arithmetic mean concentration for a period and persists `reading = NULL`.
- v2 persists intake and averaging time; `exposure_concentration_mg_m3` is legacy/nullable and not part of primary v2 runtime.
- Existing v1.1 records remain versioned historical data and must not be overwritten or relabelled.

### Scientific status

**NEEDS SCIENTIFIC DECISION / REVIEW:** code and tests establish engineering behavior only. They do not approve the source, unit compatibility, tavg methodology, ppm conversion source, or reference value as final science. RQ is environmental-health risk characterization, not diagnosis or disease probability.

## 7. Layer 4 — Alert & Risk Management

**Status: LOCKED. Rule version: `1.0.0-MVP`.**

- Environmental strings normalize to `NORMAL`, `CAUTION`, `WARNING`, `DANGER`, and `CRITICAL`.
- The fixed matrix consumes environmental severity and persisted ARKL interpretation to yield `NONE`, `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`, plus deterministic risk status and recommendation codes.
- Deduplication treats `OPEN`/`ACKNOWLEDGED` as active; equal level is duplicate, higher level escalates, lower level does not create a new alert.
- Lifecycle is `OPEN → ACKNOWLEDGED → RESOLVED`; ACK/resolve are idempotent; a resolved alert cannot be acknowledged; historical ARKL is ineligible for realtime alert persistence.
- Alert does not calculate Intake, RQ, reference value, or ARKL interpretation.
- Layer 6 added actor audit only: `acknowledged_by` and `resolved_by`; it did not alter decision rules.

## 8. Layer 5 — Research & Reporting

### Implemented

- H2S summary and raw/hour/day trends with period, device, and simulated/physical filters.
- Version-aware ARKL recap and risk distribution, preventing silent v1.1/v2 mixing.
- Exposure summary, Alert summary, and ARKL CSV export.
- Services read persisted data; they do not recalculate ARKL/RQ or Alert rules.

### Access

All generic Research endpoints require authenticated ADMIN, OPERATOR, or RESEARCHER. WORKER is denied.

### Documentation gap

Research routes are registered and present in `schema.yml`; Account endpoints are registered but absent from the committed schema (see Section 12/20).

## 9. Layer 6 — Authentication & Authorization

### Implemented

- Django built-in User remains identity; `AccountProfile` is one-to-one with User and carries `ADMIN`, `OPERATOR`, `RESEARCHER`, or `WORKER`.
- Token and Session authentication are configured. Login creates/reuses a DRF token; logout deletes the caller token.
- `AccountProfile.worker` is an optional one-to-one Worker link. Model/service/serializer policy requires a linked Worker for `WORKER` role and forbids a Worker link for other roles.
- Explicit endpoint permissions protect inspected Devices, Exposure, ARKL, Alerts, Research, Accounts, and `/me/` endpoints. A global `DEFAULT_PERMISSION_CLASSES` is not set; this is intentional only so long as all new sensitive endpoints explicitly declare permissions.
- Account creation is authenticated ADMIN-only.

### Alert actor audit

- Alert has nullable `acknowledged_by` and `resolved_by` foreign keys to `AUTH_USER_MODEL`, with `SET_NULL` and separate reverse names.
- HTTP acknowledge/resolve passes `request.user`; clients cannot supply the actor in request data.
- Lifecycle service accepts optional `actor` for internal/background compatibility.
- On idempotent second ACK/resolve, the service returns before assigning actor again; existing actor is preserved. ACKNOWLEDGED→RESOLVED keeps acknowledged actor, while OPEN→RESOLVED leaves it null.

## 10. Worker Personal API

| Endpoint | Methods | Permission / ownership | Behavior |
| --- | --- | --- | --- |
| `/api/v1/me/profile/` | GET, PATCH | authenticated WORKER linked to active Worker | Reads/updates only linked Worker; `code` and `is_active` are read-only; `name`/`age` may be patched. |
| `/api/v1/me/exposure/` | GET, PATCH | same | Reads/updates only linked ExposureProfile; `inhalation_rate` is read-only. Missing profile returns 404. |
| `/api/v1/me/arkl-results/` | GET | same | Filters ARKLResult by linked Worker. |
| `/api/v1/me/alerts/` | GET | same | Filters Alert by linked Worker. |

For all personal endpoints, no Worker link or inactive linked Worker produces permission denial. Generic operational APIs remain denied to WORKER.

## 11. End-to-End Current Flow

```text
MQTT telemetry → validated Device/H2SReading
  ↓ explicit ADMIN/OPERATOR call
Realtime/Historical ARKL → versioned ARKLResult
  ↓ explicit ADMIN/OPERATOR call
Alert evaluation → Alert + recommendations + lifecycle actor audit
  ↓ authenticated read access
Research APIs or Worker-owned /me/ ARKL/Alert APIs
```

## 12. REST API Inventory

### Active

- Devices/readings: `/api/v1/devices/`, `/api/v1/readings/`, `/api/v1/readings/latest/`.
- Exposure: `/api/v1/workers/`, `/api/v1/exposure-profiles/`.
- ARKL: `/api/v1/arkl/realtime/`, `/api/v1/arkl/historical/`, `/api/v1/arkl/results/`.
- Alerts: `/api/v1/alerts/`, `/api/v1/alerts/evaluate/`, acknowledge/resolve detail actions.
- Research: `/api/v1/research/h2s-summary/`, `h2s-trends/`, `arkl-results/`, `risk-distribution/`, `exposure-summary/`, `alert-summary/`, `export/arkl.csv`.
- Accounts: `POST /api/v1/auth/login/`, `POST /api/v1/auth/logout/`, `GET /api/v1/auth/me/`, `POST /api/v1/accounts/`, and the four `/api/v1/me/` endpoints in Section 10.
- Docs: `/api/schema/`, `/api/docs/`.

### Schema status

`schema.yml` contains all seven Research paths but does not contain Account/Auth/`/me/` paths. Runtime schema regeneration is required before it is an accurate API contract.

## 13. Authentication & Authorization Matrix

| Area | ADMIN | OPERATOR | RESEARCHER | WORKER |
| --- | --- | --- | --- | --- |
| Devices/readings | read | read | read | denied |
| Worker/Profile generic API | read/write | read/write | denied | denied |
| ARKL calculate | allowed | allowed | denied | denied |
| Generic ARKL results | read | read | read | denied |
| Generic Alerts read | read | read | read | denied |
| Alert evaluate/ack/resolve | allowed | allowed | denied | denied |
| Research | read | read | read | denied |
| Account creation | allowed | denied | denied | denied |
| Personal `/me/` API | denied | denied | denied | linked active Worker only |

## 14. Database Relationships

```text
User 1 ─── 1 AccountProfile ─── 0..1 Worker
Worker 1 ─── 1 ExposureProfile
Device 1 ───< H2SReading
Worker 1 ───< ARKLResult >── 0..1 H2SReading
Worker 1 ───< Alert >──────── Device / H2SReading / ARKLResult
Alert ─── 0..1 acknowledged_by User
Alert ─── 0..1 resolved_by User
```

Historical source relations use `PROTECT`; AccountProfile User uses `CASCADE`, Worker link uses `SET_NULL`, and Alert actor links use `SET_NULL`.

## 15. Migrations

- `exposure/0002_worker_age_worker_name_and_more.py`: nullable Worker name/age and exposure validator/help-text updates.
- `accounts/0001_initial.py`: AccountProfile, User dependency, Worker optional link, and role field.
- `alerts/0002_alert_acknowledged_by_alert_resolved_by.py`: nullable actor foreign keys with `SET_NULL`.

Migration consistency was not independently checked in the current Linux runtime.

## 16. Testing and Quality Status

| Check | Status | Evidence |
| --- | --- | --- |
| `python manage.py check` | USER-REPORTED PASS | User supplied: “System check identified no issues (0 silenced).” |
| `pytest --collect-only -q` | NOT VERIFIED HERE | Compatible project runtime unavailable in this environment. |
| `pytest -v` | USER-REPORTED BASELINE | User reported 267 passed in 38.89s; not rerun here. |
| component pytest | USER-REPORTED BASELINE | ARKL 59, Research 48, Alerts 75 passed; not rerun here. |
| Ruff / format / pip-audit | NOT VERIFIED HERE | Python tooling unavailable in current Linux shell. |
| schema route inspection | VERIFIED | Accounts routes are registered in `config/urls.py`; they are absent from committed `schema.yml`. |

Static inventory contains 259 `def test_` functions: Accounts 21, Devices 17, Exposure 45, ARKL 59, Alerts 56, Research 48, Core 13. Pytest collected count can be higher because of parametrization; it must be obtained with `pytest --collect-only -q`.

## 17. Engineering Verdict

**PASS WITH HARDENING PENDING.** Layer 6 is implemented in source with explicit permissions, ownership endpoints, and actor audit. The user-reported Django check and test baseline are positive, but this audit cannot independently execute them. The project is not thereby production-ready: scientific ARKL review, API schema refresh, physical IoT hardening, and production operational hardening remain.

## 18. Locked Components

- ARKL historical records/versioning and current `2.0.0-MVP` runtime contract.
- Alert matrix, recommendations, dedupe/escalation/de-escalation, lifecycle semantics, and `1.0.0-MVP` rule version.
- Alert rule boundary: consume persisted ARKL interpretation; never recalculate ARKL/RQ/RfC.
- MQTT required payload/provenance contract.
- Core request ID/logging/performance/security middleware and API `/api/v1/` prefix.

## 19. Current Blockers and Gaps

### Schema documentation

- **Blocker:** committed `schema.yml` omits Layer 6 Account/Auth/`/me/` endpoints.
- **Required action:** regenerate into an audit/temporary schema, validate it, then update the committed contract intentionally.
- **Blocks:** complete frontend/client API-contract documentation.

### Scientific ARKL review

- **Blocker:** approved sources/unit compatibility for intake/tavg/reference value/conversion are not evidenced by runtime code.
- **Required action:** approved scientific methodology record.
- **Blocks:** scientific-final claims, not the existing engineering implementation.

## 20. Technical Debt

### HIGH

- MQTT has no source timestamp/idempotency key; duplicate delivery can create duplicate readings.
- Alert dedupe has no database uniqueness guarantee across concurrent evaluations.

### MEDIUM

- No global DRF default permission exists. Current sensitive views use explicit permissions, but future endpoints can accidentally be public if authors omit them.
- AccountProfile role/Worker-link invariants rely on `clean()`/service/serializer paths; direct ORM save does not automatically call `full_clean()`.
- Raw H2S trends have no pagination/limit strategy.
- `level` is stored while Alert uses `status`; their consistency is not enforced.
- `redact_mapping` is not referenced in inspected logging paths; MQTT-specific logger routing should be verified at runtime.

### LOW

- `schema.yml` is stale for Layer 6.
- SQLite needs reassessment before high-concurrency production ingestion.

## 21. Recommended Next Tasks

1. Run `pytest --collect-only -q`, full pytest, Ruff, format check, migration check, spectacular to `schema.audit.yml`, and pip-audit in the Windows project environment; store exact results.
2. Regenerate and review the committed OpenAPI schema so it includes all Layer 6 routes.
3. Record/approve ARKL v2 scientific sources, units, tavg, and reference-value compatibility without rewriting historical results.
4. Integrate the Worker-facing frontend/application against `/auth/` and `/me/` APIs, respecting ownership boundaries.
5. Add MQTT source timestamp/idempotency and calibration/provisioning requirements.
6. Add concurrency-safe Alert dedupe strategy when deployment concurrency requires it.
7. Define production database, token management, audit retention, and deployment operations.

## 22. Do Not Do Yet

- Do not overwrite/relabel v1.1 ARKL records as v2.
- Do not change ARKL formula/constants or claim scientific finality without approved methodology.
- Do not rewrite Alert decision rules because actor audit was added.
- Do not use RQ as diagnosis or probability of disease.
- Do not turn Worker into an auth model.
- Do not expose generic operational/research APIs to WORKER accounts.

## 23. Handoff Summary

```text
Layers 1–6 are engineering-implemented; Layer 6 adds AccountProfile RBAC, Token/Session auth, personal Worker APIs, and Alert actor audit.
Roles: ADMIN, OPERATOR, RESEARCHER, WORKER; Worker remains a domain entity linked one-to-one only for WORKER accounts.
All inspected sensitive APIs have explicit permission classes; global default permission is intentionally absent and is a future-endpoint hardening risk.
Worker personal routes restrict data by the linked active Worker; profile code/is_active and exposure inhalation_rate are read-only there.
Alert lifecycle actors use nullable User FKs with SET_NULL; HTTP takes request.user; optional service actor preserves internal compatibility and idempotent calls preserve original actor.
ARKL v2.0.0-MVP remains intake-based; engineering is implemented, scientific reference/unit verification is pending.
Alert core remains locked at rule version 1.0.0-MVP.
Research has seven protected read endpoints; it is version-aware and read-only.
User-reported baseline: Django check clean; full pytest 267 passed. Not independently rerun in this Linux audit environment.
Static test inventory: 259 test functions; use pytest collect-only for actual item count.
Immediate next task: run quality gate in Windows, then refresh schema.yml for Layer 6 routes.
```
