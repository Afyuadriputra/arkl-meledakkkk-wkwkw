# SMART H2S ARKL — FRONTEND API CONTRACT

> Contract source: active Django URL configuration, views, serializers, permission classes, services, models, and tests. `schema.yml` is supplementary only. Updated 2026-08-20.

## 1. Contract Status

This is the frontend contract freeze for the current backend. All paths use a trailing slash except CSV export: `/api/v1/research/export/arkl.csv`.

**Important schema drift:** Auth/Accounts/`/me/` endpoints are registered in source but absent from committed `schema.yml`. Use this document/source until the schema is refreshed.

## 2. Base URL

Recommended development configuration:

```text
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

All API paths below are relative to that base URL. Datetimes are DRF ISO-8601 strings. Decimal fields serialize as **strings**; float fields serialize as JSON numbers.

## 3. Authentication

Configured DRF authentication methods:

- Token authentication: send `Authorization: Token <token>`.
- Session authentication: useful for Django admin/browser sessions; unsafe for a token-based SPA unless CSRF is handled.

### Login flow

```text
POST /auth/login/ { username, password }
  → { token, user }
  → persist token in the frontend's chosen secure session strategy
  → GET /auth/me/
  → select role-specific routes and navigation
```

The backend does not provide refresh tokens. Logout deletes the current user's token.

## 4. Role Matrix

| Endpoint / feature | ADMIN | OPERATOR | RESEARCHER | WORKER |
| --- | --- | --- | --- | --- |
| Login | 🌐 Public | 🌐 Public | 🌐 Public | 🌐 Public |
| Logout / current user | ✅ | ✅ | ✅ | ✅ with profile |
| Create account | ✅ | ❌ | ❌ | ❌ |
| Devices / readings | 👁 | 👁 | 👁 | ❌ |
| Generic Worker / Exposure | ✅ | ✅ | ❌ | ❌ |
| ARKL realtime / historical | ✅ | ✅ | ❌ | ❌ |
| Generic ARKL results | 👁 | 👁 | 👁 | ❌ |
| Generic Alert list/detail | 👁 | 👁 | 👁 | ❌ |
| Alert evaluate / ACK / resolve | ✅ | ✅ | ❌ | ❌ |
| Research endpoints / CSV | 👁 | 👁 | 👁 | ❌ |
| `/me/profile`, `/me/exposure`, `/me/arkl-results`, `/me/alerts` | ❌ | ❌ | ❌ | ✅ linked active Worker only |

## 5. Auth Endpoints

### `POST /auth/login/`

- **Auth:** public.
- **Request:** `{ "username": string, "password": string }`.
- **Success 200:**

```json
{
  "token": "string",
  "user": {
    "id": 1,
    "username": "string",
    "email": "string",
    "role": "ADMIN | OPERATOR | RESEARCHER | WORKER",
    "worker_id": 1,
    "worker_code": "string",
    "worker_name": "string"
  }
}
```

`worker_id`, `worker_code`, and `worker_name` are nullable for non-WORKER roles. A valid Django user without AccountProfile receives `403 {"detail": "User does not have an application role."}`. Invalid credentials use DRF validation error response (400).

### `POST /auth/logout/`

- **Auth:** any authenticated user.
- **Request:** none.
- **Success:** `204 No Content`; deletes token(s) for the caller.
- **Errors:** 401 if unauthenticated.

### `GET /auth/me/`

- **Auth:** authenticated AccountProfile role required.
- **Success 200:** the `user` object shape from login.
- **Errors:** 401 unauthenticated; 403 if authenticated user lacks an application role.

### `POST /accounts/`

- **Auth:** ADMIN only.
- **Request:**

```json
{
  "username": "string (max 150, unique)",
  "email": "string email, optional",
  "password": "string (min 8; Django password validators)",
  "role": "ADMIN | OPERATOR | RESEARCHER | WORKER",
  "worker_id": "integer | null, required only for WORKER"
}
```

- **Success 201:** `{ id: number, username: string, email: string, role: string, worker: number|null, worker_code: string|null, worker_name: string|null, created_at: datetime, updated_at: datetime }`.
- **Errors:** 400 duplicate/blank username, invalid password, invalid role/Worker combination, inactive or unavailable Worker; 401/403 by role.

## 6. Worker Personal Endpoints

All require authenticated `WORKER` role linked to an active Worker. A missing link or inactive link is denied (403). Results are not paginated.

| Endpoint | Method | Request / editable fields | Success response | Notes |
| --- | --- | --- | --- | --- |
| `/me/profile/` | GET | none | Worker object | Own Worker only |
| `/me/profile/` | PATCH | `name?: string (nonblank, max 150)`, `age?: integer (1..120)` | Worker object | `id`, `code`, `is_active`, timestamps read-only |
| `/me/exposure/` | GET | none | personal ExposureProfile | 404 `{detail}` if absent |
| `/me/exposure/` | PATCH | `body_weight?`, `exposure_time?`, `exposure_frequency?`, `exposure_duration?` | personal ExposureProfile | `inhalation_rate` read-only |
| `/me/arkl-results/` | GET | none | array of own ARKLResult | newest-first by `created_at`, then id |
| `/me/alerts/` | GET | none | array of own Alert | newest-first by `created_at`, then id |

### Worker response shapes

```ts
Worker = {
  id: number; code: string; name: string | null; age: number | null;
  is_active: boolean; created_at: string; updated_at: string;
}

MyExposureProfile = {
  id: number; worker_code: string; worker_name: string | null;
  body_weight: number; exposure_time: number; exposure_frequency: number;
  exposure_duration: number; inhalation_rate: number;
  created_at: string; updated_at: string;
}
```

Personal exposure validation: `body_weight > 0`, `0 < exposure_time <= 24`, `0 < exposure_frequency <= 365`, `exposure_duration > 0`, and the fixed stored `inhalation_rate > 0`. Worker cannot change code, active state, or inhalation rate from `/me/`.

## 7. Device & H2S Endpoints

All require ADMIN, OPERATOR, or RESEARCHER and are read-only. WORKER is denied.

| Method / path | Query | Success | Pagination / notes |
| --- | --- | --- | --- |
| `GET /devices/` | `page?` | paginated Device list | 50/page, default router list |
| `GET /devices/{id}/` | path integer | Device | 404 if absent |
| `GET /readings/` | `device_code?`, `status?`, `page?` | paginated H2SReading list | model default newest-first |
| `GET /readings/{id}/` | path integer | H2SReading | 404 if absent |
| `GET /readings/latest/` | `device_code?`, `status?` | H2SReading | latest global after optional filters; 404 if no match |

```ts
Device = {
  id: number; device_code: string; name: string; location: string;
  is_active: boolean; created_at: string; updated_at: string;
}
H2SReading = {
  id: number; device: number; device_code: string; ppm: number; adc: number;
  filtered_adc: number; level: number; status: string; uptime_ms: number;
  simulated: boolean; received_at: string;
}
```

Sensor `status` is stored as free text at ingestion; Alert evaluation accepts only canonical `NORMAL`, `CAUTION`, `WARNING`, `DANGER`, or `CRITICAL` after normalization. Do not assume every raw reading status is a frontend enum without validating data.

## 8. Worker & Exposure Endpoints

Generic endpoints are operational ADMIN/OPERATOR APIs; list responses use standard DRF pagination.

| Method / path | Request | Success | Notes |
| --- | --- | --- | --- |
| `GET /workers/` | `page?` | paginated Worker | read |
| `POST /workers/` | `code: string`, `name: string nonblank`, `age: integer 1..120`, `is_active?: boolean` | 201 Worker | name/age mandatory at API even though DB is nullable |
| `GET /workers/{id}/` | — | Worker | read |
| `GET /exposure-profiles/` | `page?` | paginated ExposureProfile | read |
| `POST /exposure-profiles/` | `worker: integer`, plus five numeric exposure values | 201 ExposureProfile | one profile per Worker |
| `GET /exposure-profiles/{id}/` | — | ExposureProfile | read |
| `PATCH /exposure-profiles/{id}/` | any editable profile fields | 200 ExposureProfile | no DELETE/PUT |

```ts
ExposureProfile = {
  id: number; worker: number; worker_code: string; worker_name: string | null;
  body_weight: number; exposure_time: number; exposure_frequency: number;
  exposure_duration: number; inhalation_rate: number;
  created_at: string; updated_at: string;
}
```

## 9. ARKL Endpoints

### `POST /arkl/realtime/` and `POST /arkl/historical/`

- **Role:** ADMIN/OPERATOR only.
- **Realtime request:** `{ "worker": integer active Worker id, "device": integer active Device id }`.
- **Historical request:** realtime fields plus `start_time: ISO datetime`, `end_time: ISO datetime`; end must be later than start.
- **Success:** 201 ARKLResult. Realtime `reading` is integer; historical `reading` is `null`, with `period_start`, `period_end`, and `reading_count` populated.
- **Errors:** 400 validation/inactive source/no exposure profile/no reading/no period data; 401/403 auth.

### Generic results

`GET /arkl/results/?worker_code=&calculation_type=&page=` and `GET /arkl/results/{id}/` are read-only for ADMIN/OPERATOR/RESEARCHER. Generic lists are paginated and newest-first.

```ts
ARKLResult = {
  id: number; worker: number; worker_code: string; reading: number | null;
  device_code: string | null; calculation_type: "REALTIME" | "HISTORICAL";
  concentration_ppm: string; concentration_mg_m3: string;
  exposure_concentration_mg_m3: string | null;
  body_weight: string; exposure_time: string; exposure_frequency: string;
  exposure_duration: string; inhalation_rate: string;
  averaging_time: string | null; intake: string | null; rfc: string; rq: string;
  interpretation: "WITHIN_REFERENCE_LEVEL" | "ABOVE_REFERENCE_LEVEL";
  calculation_version: string; source_simulated: boolean;
  period_start: string | null; period_end: string | null;
  reading_count: number | null; created_at: string;
}
```

## 10. Alert Endpoints

### Read endpoints

`GET /alerts/?worker_code=&device_code=&alert_level=&status=&page=` and `GET /alerts/{id}/` are paginated/read-only for ADMIN/OPERATOR/RESEARCHER. Ordering is newest-first by `created_at`, then id.

### Operational endpoints

| Method / path | Role | Request | Success |
| --- | --- | --- | --- |
| `POST /alerts/evaluate/` | ADMIN/OPERATOR | `{ "arkl_result_id": integer }` | 201 newly persisted alert, or 200 duplicate/de-escalated/no-alert result |
| `PATCH /alerts/{id}/acknowledge/` | ADMIN/OPERATOR | none | 200 Alert; actor comes from token/session user |
| `PATCH /alerts/{id}/resolve/` | ADMIN/OPERATOR | none | 200 Alert; actor comes from token/session user |

Evaluate response is exactly:

```ts
{ created: boolean; duplicate: boolean; escalated: boolean; alert: Alert | null }
```

`alert` is `null` when matrix result is `NONE`. Duplicate returns existing active Alert with `created: false`, `duplicate: true`; escalation creates a new higher-level Alert with `escalated: true`.

```ts
Alert = {
  id: number; worker_code: string; device_code: string; reading_id: number;
  arkl_result_id: number; concentration_ppm: string; environmental_level: number;
  environmental_status: string;
  environmental_severity: "NORMAL" | "CAUTION" | "WARNING" | "DANGER" | "CRITICAL";
  rq: string; risk_interpretation: "WITHIN_REFERENCE_LEVEL" | "ABOVE_REFERENCE_LEVEL";
  calculation_version: string;
  alert_level: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  risk_status: "NO_ACTION_REQUIRED" | "MONITORING_REQUIRED" |
    "RISK_MANAGEMENT_REQUIRED" | "IMMEDIATE_ACTION_REQUIRED";
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
  recommendation_codes: string[]; alert_rule_version: string;
  source_simulated: boolean; acknowledged_at: string | null;
  acknowledged_by: number | null; acknowledged_by_username: string | null;
  resolved_at: string | null; resolved_by: number | null;
  resolved_by_username: string | null; created_at: string; updated_at: string;
}
```

Known recommendation codes: `MONITOR_H2S_LEVEL`, `INCREASE_MONITORING_FREQUENCY`, `REDUCE_EXPOSURE_DURATION`, `LIMIT_ACCESS_TO_EXPOSURE_AREA`, `TEMPORARY_AREA_AVOIDANCE`, `USE_APPROPRIATE_PPE`, `NOTIFY_RESPONSIBLE_OPERATOR`, `PERFORM_FURTHER_RISK_EVALUATION`.

## 11. Research Endpoints

All require ADMIN/OPERATOR/RESEARCHER and are read-only; WORKER is denied. They are **not paginated**.

| Path | Query / response |
| --- | --- |
| `GET /research/h2s-summary/` | `start?`, `end?`, `device_code?`, `source_simulated?`; `{sample_count, minimum_ppm, maximum_ppm, average_ppm, first_reading_at, last_reading_at, simulated_count, physical_count, device_count}`. Numeric ppm values/nulls. |
| `GET /research/h2s-trends/` | summary filters + `interval=raw|hour|day` (default day); `{interval, series}`. Raw item `{timestamp, ppm, device_code, simulated}`; aggregate item `{timestamp, average_ppm, minimum_ppm, maximum_ppm, sample_count}`. |
| `GET /research/arkl-results/` | `calculation_version?` defaults active version, `worker_code?`, `calculation_type?`, `source_simulated?`, `start?`, `end?`; `{calculation_version, count, results: ARKLResult research fields}`. |
| `GET /research/risk-distribution/` | `calculation_version?`, `worker_code?`, `source_simulated?`; `{calculation_version, total_count, distribution:[{interpretation,count,percentage}]}`. |
| `GET /research/exposure-summary/` | none; `{worker_count, average_body_weight, average_exposure_time, average_exposure_frequency, average_exposure_duration, average_inhalation_rate}`; averages may be null. |
| `GET /research/alert-summary/` | none; `{total_count, simulated_count, physical_count, by_level, by_status, by_risk_status, by_rule_version}`; each `by_*` item is `{value:string,count:number}`. |
| `GET /research/export/arkl.csv` | same query as ARKL recap; returns CSV. |

`source_simulated` is tri-state: omitted includes all; `true` simulated only; `false` physical only. Invalid dates/ranges/booleans return 400.

### CSV export

- Content-Type: `text/csv; charset=utf-8`.
- Content-Disposition: `attachment; filename="arkl_results_{calculation_version}.csv"`, with dots/hyphens normalized to underscores.
- Export reads persisted ARKL research results and does not recalculate risk.

## 12. Enums and frontend presentation

Backend does **not** expose `worker_message`, `display_message`, `user_message`, `risk_message`, or `presentation_label`.

**STATUS: NOT IMPLEMENTED IN BACKEND.** Frontend may map `alert_level` for presentation only:

| Backend level | UI label | Suggested safe message |
| --- | --- | --- |
| NONE | Normal | Kondisi terkendali. Tetap bekerja sesuai prosedur keselamatan. |
| LOW | Waspada | Kadar H₂S mulai meningkat. Batasi waktu berada di area ini. |
| MEDIUM | Peringatan | Kadar H₂S tinggi. Sebaiknya menjauh dari area ini dan gunakan perlindungan yang dianjurkan. |
| HIGH | Bahaya | Kondisi berbahaya. Segera tinggalkan area dan menuju tempat yang lebih aman. |
| CRITICAL | Kritis | BAHAYA SERIUS. Segera keluar dari area dan ikuti arahan petugas keselamatan. |

This is presentation mapping, not a change to Alert Engine, ARKL, or a medical diagnosis.

## 13. Error Responses

No custom global API exception envelope is registered. Frontend must handle DRF's endpoint-specific shapes:

| Case | Typical shape |
| --- | --- |
| Serializer validation 400 | `{ "field": ["message"] }` or `{ "detail": "message" }` |
| Invalid login 400 | `{ "non_field_errors": ["Invalid username or password."] }` |
| Unauthenticated | DRF authentication detail, normally 401 |
| Authenticated but forbidden | DRF permission detail, normally 403 |
| Missing object/profile | `{ "detail": "..." }`, normally 404 |
| ARKL/Alert domain error | `{ "detail": "..." }`, normally 400 |

**API CONTRACT RISK:** errors are not normalized into one global field shape. The frontend client should extract `detail`, then field arrays, then `non_field_errors`.

## 14. Pagination & Ordering

Global `PageNumberPagination` is enabled with page size 50. Generic DRF ViewSet/ListAPIView lists return:

```ts
Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] }
```

- Paginated: Devices, Readings, Workers, ExposureProfiles, generic ARKL results, generic Alerts.
- Not paginated: Auth, `/me/` arrays, Research endpoints, CSV.
- Readings default newest-first; ARKL and Alerts newest-first; raw trend oldest-first; hourly/day trend ascending timestamp.

## 15. Suggested TypeScript Interfaces

```ts
export interface AuthUser {
  id: number; username: string; email: string;
  role: "ADMIN" | "OPERATOR" | "RESEARCHER" | "WORKER";
  worker_id: number | null; worker_code: string | null; worker_name: string | null;
}
export interface LoginRequest { username: string; password: string }
export interface LoginResponse { token: string; user: AuthUser }
export interface Paginated<T> { count: number; next: string | null; previous: string | null; results: T[] }
export interface RawTrendPoint { timestamp: string; ppm: number; device_code: string; simulated: boolean }
export interface AggregatedTrendPoint { timestamp: string; average_ppm: number; minimum_ppm: number; maximum_ppm: number; sample_count: number }
export interface H2SSummary { sample_count: number; minimum_ppm: number | null; maximum_ppm: number | null; average_ppm: number | null; first_reading_at: string | null; last_reading_at: string | null; simulated_count: number; physical_count: number; device_count: number }
export interface CountItem { value: string; count: number }
export interface AlertSummary { total_count: number; simulated_count: number; physical_count: number; by_level: CountItem[]; by_status: CountItem[]; by_risk_status: CountItem[]; by_rule_version: CountItem[] }
```

Use `Worker`, `ExposureProfile`, `Device`, `H2SReading`, `ARKLResult`, and `Alert` definitions from Sections 6–10. Keep ARKL Decimal values as `string`; parse only for local display/chart calculations.

## 16. Suggested Frontend API Modules

```text
src/api/
  client.ts      # base URL, Token header, error extraction
  auth.ts        # login, logout, me, createAccount
  worker.ts      # get/update my profile/exposure; my ARKL/alerts
  monitoring.ts  # devices, readings, latest
  exposure.ts    # operational workers and exposure profiles
  arkl.ts        # calculate realtime/historical, list/detail results
  alerts.ts      # list/detail/evaluate/acknowledge/resolve
  research.ts    # seven read/export endpoints
```

No Redux, repository pattern, or extra abstraction is required for this API shape.

## 17. CORS / Local Development

- `django-cors-headers` is installed and CORS allows `http://localhost:5173` and `http://127.0.0.1:5173`.
- Token-based React requests do not require CSRF tokens; include `Authorization: Token <token>`.
- If the frontend chooses SessionAuthentication, Django CSRF requirements apply for unsafe methods; prefer token auth for this SPA contract.
- Do not infer production origins from this development-only configuration.

## 18. Schema Drift

| Endpoint group | Source registration | `schema.yml` | Status |
| --- | --- | --- | --- |
| Devices, Exposure, ARKL, Alerts, Research | yes | yes | documented, but schema role/auth metadata must not replace source permissions |
| `/auth/login/`, `/auth/logout/`, `/auth/me/` | yes | no | **SCHEMA STALE** |
| `/accounts/` | yes | no | **SCHEMA STALE** |
| `/me/profile/`, `/me/exposure/`, `/me/arkl-results/`, `/me/alerts/` | yes | no | **SCHEMA STALE** |

## 19. Known Integration Risks

1. Refresh OpenAPI before generating frontend clients; current schema omits all Layer 6 routes.
2. Generic list endpoints are paginated but `/me/` lists are arrays; do not reuse one list parser blindly.
3. Keep ARKL decimal values as strings.
4. Use canonical Alert environmental/level enums only in UI mapping; raw sensor `status` is not model-enforced as an enum.
5. Login invalid credentials are 400 validation errors, not a guaranteed 401.
6. No refresh-token endpoint exists; re-authentication is required when token is unavailable/revoked.
7. Quality tests were not executable in this Linux audit environment; see Section 20.

## 20. Frontend Readiness Verdict

**FRONTEND READY WITH MINOR CONTRACT FIXES.**

The source backend exposes the required role-aware APIs, Worker ownership paths, operational flows, and research data. Before client generation or relying on Swagger, regenerate `schema.yml` to include Layer 6. Run the full test suite in the Windows project environment to independently confirm the user-reported baseline.
