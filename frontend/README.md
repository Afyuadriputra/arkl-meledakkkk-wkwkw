
# PRODUCT REQUIREMENTS DOCUMENT (PRD)
# SMART H2S — UI/UX FLOW & API CONTRACT INTEGRATION

**Document Type:** Product Requirements Document  
**Format:** TXT with Markdown content  
**Product:** Smart H2S — IoT Monitoring & Smart Environmental Health Risk Analysis (ARKL)  
**Frontend:** React + TypeScript + Vite  
**Backend:** Django REST Framework  
**API Base URL Development:** `http://127.0.0.1:8000/api/v1`  
**Status:** UI/UX Planning — Pre-Implementation  
**Headless FE ↔ BE Integration:** PASS  
**Live IoT Integration:** PASS  


# 1. PRODUCT OVERVIEW

Smart H2S adalah aplikasi monitoring paparan gas Hidrogen Sulfida (H₂S) berbasis IoT yang terintegrasi dengan:

- monitoring H₂S secara realtime;
- data pekerja/pemulung;
- profil pajanan;
- perhitungan ARKL;
- Risk Quotient (RQ);
- alert/peringatan;
- rekomendasi pengendalian risiko;
- lifecycle alert;
- dashboard penelitian;
- laporan/export data;
- akses berbasis role.

Arsitektur utama:

```text
Wokwi / ESP32
      ↓
MQTT Broker
      ↓
Django MQTT Ingestion
      ↓
H2SReading
      ↓
Django REST API
      ↓
Frontend React
      ↓
ARKL
      ↓
Alert Engine
      ↓
Admin / Operator / Researcher / Worker
````

---

# 2. PRODUCT GOALS

Tujuan produk adalah menyediakan satu aplikasi yang dapat digunakan oleh beberapa tipe pengguna dengan kebutuhan yang berbeda.

## 2.1 Operator

Operator harus dapat:

* melihat kondisi H₂S;
* melihat status perangkat;
* mengelola Worker;
* melengkapi profil pajanan Worker;
* menjalankan ARKL realtime;
* mengevaluasi alert;
* acknowledge alert;
* resolve alert;
* melihat history data;
* melihat laporan.

## 2.2 Worker / Pemulung

Worker harus dapat:

* login dengan account miliknya;
* melengkapi profil dasar;
* mengisi data pajanan sederhana;
* melihat kondisi risiko pribadi;
* melihat hasil ARKL pribadi;
* melihat alert pribadi;
* melihat rekomendasi keselamatan;
* mengubah data pajanan yang diperbolehkan.

## 2.3 Researcher

Researcher harus dapat:

* membaca data H₂S;
* melihat trend;
* melihat hasil ARKL;
* melihat distribusi risiko;
* melihat exposure summary;
* melihat alert summary;
* export data penelitian.

Researcher bersifat dominan read-only.

## 2.4 Admin

Admin memiliki akses tertinggi untuk:

* operasi sistem;
* account;
* Worker;
* monitoring;
* ARKL;
* alerts;
* research;
* reports.

---

# 3. SCIENTIFIC GUARDRAIL

ARKL pada aplikasi merupakan:

> Environmental Health Risk Characterization

dan bukan:

* diagnosis ISPA;
* prediksi seseorang terkena ISPA;
* probabilitas penyakit;
* diagnosis medis.

Frontend TIDAK BOLEH menggunakan kalimat seperti:

```text
Anda terkena ISPA.
Anda terdiagnosis ISPA.
Peluang Anda terkena ISPA adalah 80%.
```

Gunakan terminologi:

```text
WITHIN_REFERENCE_LEVEL
ABOVE_REFERENCE_LEVEL
RISK_MANAGEMENT_REQUIRED
Environmental Exposure
Risk Characterization
```

Versi yang lebih ramah pengguna dapat berupa:

```text
Tingkat pajanan masih dalam batas referensi.

Tingkat pajanan berada di atas batas referensi.

Diperlukan tindakan pengelolaan risiko.
```

---

# 4. ROLE MODEL

Role backend:

```text
ADMIN
OPERATOR
RESEARCHER
WORKER
```

Landing page yang direkomendasikan:

```text
ADMIN
→ /app/dashboard

OPERATOR
→ /app/dashboard

RESEARCHER
→ /research/dashboard

WORKER
→ cek profile/exposure
     ↓
     incomplete → /worker/onboarding
     complete   → /worker/home
```

---

# 5. AUTHENTICATION FLOW

Flow:

```text
/login
  ↓
POST /auth/login/
  ↓
Token diterima
  ↓
Token disimpan
  ↓
GET /auth/me/
  ↓
Role Detection
  ↓
Redirect berdasarkan role
```

API:

```http
POST /api/v1/auth/login/
POST /api/v1/auth/logout/
GET  /api/v1/auth/me/
```

Authorization header:

```http
Authorization: Token <token>
```

Logout menghapus token backend.

Frontend harus menghapus token lokal ketika:

* logout berhasil;
* menerima HTTP 401;
* token invalid.

---

# 6. GLOBAL ROUTE PROTECTION

Frontend Route Guard wajib diterapkan.

Contoh:

```text
WORKER
→ mencoba membuka /app/dashboard
→ redirect /worker/home
```

Tetapi frontend guard bukan security utama.

Backend tetap menjadi sumber kebenaran authorization.

Contoh:

```text
WORKER
GET /api/v1/devices/

→ 403 Forbidden
```

---

# 7. PROPOSED FRONTEND INFORMATION ARCHITECTURE

## 7.1 Public

```text
/login
```

## 7.2 Operational Workspace

Digunakan ADMIN dan OPERATOR.

```text
/app/dashboard
/app/monitoring
/app/devices
/app/devices/:id

/app/workers
/app/workers/:id
/app/workers/:id/exposure

/app/arkl
/app/arkl/:id

/app/alerts
/app/alerts/:id

/app/research
/app/reports

/app/accounts
```

`/app/accounts` hanya ditampilkan jika role memiliki permission yang sesuai.

---

## 7.3 Research Workspace

```text
/research/dashboard
/research/h2s
/research/arkl
/research/risk
/research/exposure
/research/alerts
/research/reports
```

---

## 7.4 Worker Workspace

```text
/worker/onboarding
/worker/home
/worker/risk
/worker/alerts
/worker/alerts/:id
/worker/profile
/worker/profile/exposure
```

---

# 8. GLOBAL DESKTOP NAVIGATION

Operational workspace:

```text
SMART H2S

Dashboard

MONITORING
- Live H₂S
- Devices

RISK MANAGEMENT
- Workers
- ARKL
- Alerts

RESEARCH
- Analytics
- Reports

SYSTEM
- Account
- Logout
```

Menu yang tidak memiliki permission tidak ditampilkan.

---

# 9. GLOBAL WORKER NAVIGATION

Mobile-first bottom navigation:

```text
Home
Risk
Alerts
Profile
```

Worker interface harus:

* sederhana;
* mudah dibaca;
* minim istilah teknis;
* tidak menampilkan data developer;
* tidak menampilkan MQTT topic;
* tidak menampilkan ADC kecuali diperlukan;
* tidak menampilkan formula secara default.

---

# 10. PAGE 01 — LOGIN

## Route

```text
/login
```

## Role

```text
PUBLIC
```

## Objective

Mengautentikasi pengguna dan mengarahkan ke workspace sesuai role.

## UI

```text
SMART H2S

Username
[________________]

Password
[________________]

[ Login ]
```

## API

```http
POST /api/v1/auth/login/
```

Setelah login:

```http
GET /api/v1/auth/me/
```

## States

```text
idle
loading
invalid_credentials
network_error
success
```

## Error

Contoh:

```text
Username atau password salah.
Tidak dapat terhubung ke server.
```

## Success Redirect

```text
ADMIN      → /app/dashboard
OPERATOR   → /app/dashboard
RESEARCHER → /research/dashboard
WORKER     → profile check
```

---

# 11. PAGE 02 — OPERATOR / ADMIN DASHBOARD

## Route

```text
/app/dashboard
```

## Roles

```text
ADMIN
OPERATOR
```

## Objective

Memberikan overview cepat kondisi sistem dan risiko saat ini.

## Main Content

```text
Current H₂S
Environmental Status
Latest RQ
Active Alert
Sensor Freshness
H₂S Trend
Latest Alerts
```

## Suggested Wireframe

```text
Dashboard

[ H₂S      ] [ RQ       ] [ Alert ]
[ 52.75ppm ] [ 3.42     ] [ HIGH  ]
[ WARNING  ] [ ABOVE    ] [ OPEN  ]

● Live
Last update: 2 sec ago

H₂S Trend
[ CHART ]

Active Alerts
Worker | Device | Level | Status
```

## API Sources

Monitoring:

```http
GET /api/v1/devices/
GET H2S readings endpoint sesuai generated OpenAPI
```

ARKL:

```text
Generic ARKL result endpoint sesuai OpenAPI contract
```

Alerts:

```http
GET /api/v1/alerts/
```

Research summary dapat digunakan untuk agregasi:

```http
GET /api/v1/research/h2s-summary/
GET /api/v1/research/alert-summary/
```

## Requirements

Dashboard tidak melakukan calculation secara otomatis.

Dashboard hanya membaca data yang sudah tersedia.

---

# 12. PAGE 03 — LIVE H₂S MONITORING

## Route

```text
/app/monitoring
```

## Roles

```text
ADMIN
OPERATOR
RESEARCHER → read-only equivalent
```

## Objective

Melihat kondisi H₂S terbaru dan trend realtime.

## UI

```text
Device
[ H2S-TPA-001 ▼ ]

● LIVE
Last received: 2 sec ago

52.75 ppm
WARNING

[ H₂S TREND CHART ]

Recent Readings
52.75 | WARNING | 02:07:03
48.20 | WARNING | 02:07:01
31.40 | WARNING | 02:06:59
```

## API

```http
GET /api/v1/devices/
GET H2S reading endpoint
```

H2SReading fields:

```text
id
device
device_code
ppm
adc
filtered_adc
level
status
uptime_ms
simulated
received_at
```

## Important UI Rule

Gunakan:

```text
received_at
```

untuk freshness.

Jangan menggunakan:

```text
created_at
```

karena H2SReading API saat ini menggunakan `received_at`.

## Device Live Baseline

```text
H2S-TPA-001
```

## Freshness State

Contoh:

```text
< 10 detik
→ Live

10–30 detik
→ Delayed

> 30 detik
→ No recent data
```

Nilai threshold final dapat dikunci pada fase UI implementation.

---

# 13. PAGE 04 — DEVICE LIST

## Route

```text
/app/devices
```

## Roles

```text
ADMIN
OPERATOR
RESEARCHER read-only
```

## Objective

Menampilkan semua perangkat monitoring.

## UI

```text
Devices

[ Search ]

H2S-TPA-001
Status: Active
Latest: 52.75 ppm
Last received: 2 sec ago

[ View ]
```

## API

```http
GET /api/v1/devices/
```

Generic list menggunakan pagination:

```json
{
  "count": 0,
  "next": null,
  "previous": null,
  "results": []
}
```

## States

```text
loading
empty
success
API error
```

---

# 14. PAGE 05 — DEVICE DETAIL

## Route

```text
/app/devices/:id
```

## Objective

Melihat satu Device dan reading terkait.

## UI Content

```text
Device Code
Status
Location
Active Status

Latest H₂S
Latest Status
Last Received

Trend
Recent Readings
```

## API

```http
GET device detail endpoint sesuai OpenAPI
GET reading endpoint berdasarkan device
```

---

# 15. PAGE 06 — WORKER LIST

## Route

```text
/app/workers
```

## Roles

```text
ADMIN
OPERATOR
```

## Objective

Melihat dan memilih Worker/pemulung.

## UI

```text
Workers

[ Search Worker ]

PML-001
Ahmad
Age: 42
Exposure: Complete
Latest Risk: ABOVE REFERENCE
[ View ]
```

## API

Generic Worker endpoint sesuai backend contract.

Expected paginated response:

```json
{
  "count": 0,
  "next": null,
  "previous": null,
  "results": []
}
```

## Actions

```text
View Worker
Create Worker jika permission tersedia
Edit Worker
Manage Exposure
Run ARKL
```

---

# 16. PAGE 07 — WORKER DETAIL

## Route

```text
/app/workers/:id
```

## Roles

```text
ADMIN
OPERATOR
```

## Tabs

```text
Overview
Exposure
ARKL
Alerts
```

## Overview Content

```text
Worker Code
Name
Age
Status

Exposure Summary

Latest ARKL

Latest Alert
```

## API

Worker detail endpoint sesuai OpenAPI.

ARKL generic API.

Alerts:

```http
GET /api/v1/alerts/
```

dengan filter Worker jika tersedia pada API client.

---

# 17. PAGE 08 — EXPOSURE PROFILE OPERATOR

## Route

```text
/app/workers/:id/exposure
```

## Roles

```text
ADMIN
OPERATOR
```

## Objective

Operator dapat mengisi atau memperbaiki seluruh profil pajanan.

## Fields

```text
Berat badan
Lama bekerja per hari
Frekuensi bekerja per tahun
Lama bekerja di lokasi
Inhalation rate
```

Backend mapping:

```text
body_weight
exposure_time
exposure_frequency
exposure_duration
inhalation_rate
```

## Constraints

```text
body_weight > 0

0 < exposure_time <= 24

0 < exposure_frequency <= 365

exposure_duration > 0

inhalation_rate > 0
```

## API

ExposureProfile generic endpoint sesuai OpenAPI contract.

Update:

```text
PATCH ExposureProfile
```

mengikuti endpoint generated schema.

## UX

Inline validation harus digunakan.

Contoh:

```text
Lama bekerja per hari tidak boleh lebih dari 24 jam.
```

---

# 18. DUAL INPUT EXPOSURE FLOW

Exposure data memiliki dua jalur input.

## Jalur A — Worker Isi Sendiri

```text
Worker Login
→ Onboarding
→ Personal Data
→ Exposure Data sederhana
→ Save
→ ExposureProfile
```

## Jalur B — Operator Isi / Koreksi

```text
Operator
→ Worker List
→ Worker Detail
→ Exposure
→ Edit
→ Save
```

Keduanya menggunakan resource/backend data yang sama.

Tidak dibuat dua profile yang berbeda.

---

# 19. PAGE 09 — ARKL CALCULATION

## Route

```text
/app/arkl
```

## Roles

```text
ADMIN
OPERATOR
```

## Objective

Menjalankan realtime environmental health risk calculation.

## Flow

```text
Select Worker
↓
Select Device
↓
Review Exposure Profile
↓
Review Current H₂S
↓
Calculate ARKL
```

## UI

```text
Worker
[ Ahmad / PML-001 ▼ ]

Device
[ H2S-TPA-001 ▼ ]

Exposure Profile
Weight: 58kg
Time: 8 hour/day
Frequency: 250 day/year
Duration: 10 year

Current H₂S
52.75 ppm

[ Calculate ARKL ]
```

## API

```http
POST /api/v1/arkl/realtime/
```

Payload berdasarkan OpenAPI:

```text
RealtimeARKLRequest
```

Frontend type:

```ts
components["schemas"]["RealtimeARKLRequest"]
```

## Requirements

Calculation button disabled jika:

```text
Worker belum dipilih
Device belum dipilih
ExposureProfile tidak valid
```

---

# 20. ARKL REALTIME BEHAVIOR

ARKL realtime mengambil reading terbaru pada saat backend memproses request.

Contoh:

```text
UI membaca reading #121

Wokwi publish #122

User Calculate ARKL

Backend memakai #122
```

Ini VALID.

Frontend tidak boleh memaksa hasil ARKL harus terkait reading yang sebelumnya dirender.

Frontend harus memperbarui tampilan berdasarkan response ARKL.

---

# 21. ARKL SCIENTIFIC BASELINE

Version:

```text
2.0.0-MVP
```

Conversion:

```text
C mg/m³ = ppm × 1.40
```

Averaging:

```text
tavg = Dt × 365
```

Intake:

```text
I =
(C × R × tE × fE × Dt)
/
(Wb × tavg)
```

RQ:

```text
RQ = I / H2S_RFC
```

Constant:

```text
H2S_RFC = 0.002
```

Interpretation:

```text
RQ <= 1
→ WITHIN_REFERENCE_LEVEL

RQ > 1
→ ABOVE_REFERENCE_LEVEL
```

Frontend tidak menghitung formula sendiri.

Frontend hanya menampilkan hasil backend.

---

# 22. PAGE 10 — ARKL RESULT

## Route

```text
/app/arkl/:id
```

## Roles

```text
ADMIN
OPERATOR
RESEARCHER read-only
```

## Main UI

```text
ARKL RESULT

RQ
3.42

ABOVE REFERENCE LEVEL

Risk management is required.

[ Evaluate Alert ]

Technical Details
-----------------
Concentration
Intake
RfC
Formula Version
Reading
Device
```

## API

Result berasal dari:

```http
POST /api/v1/arkl/realtime/
```

atau generic ARKL detail/list endpoint sesuai OpenAPI.

## Important UX

RQ dan interpretation harus menjadi informasi utama.

Formula teknis berada di:

```text
Technical Details
```

yang bisa dibuat collapsible.

---

# 23. PAGE 11 — ALERT LIST

## Route

```text
/app/alerts
```

## Roles

```text
ADMIN
OPERATOR
RESEARCHER read-only
```

## API

```http
GET /api/v1/alerts/
```

## Filters

Frontend API saat ini mendukung:

```text
page
worker_code
device_code
alert_level
status
```

Alert level:

```text
NONE
LOW
MEDIUM
HIGH
CRITICAL
```

Status:

```text
OPEN
ACKNOWLEDGED
RESOLVED
```

## UI

```text
[ All ] [ Open ] [ Acknowledged ] [ Resolved ]

HIGH
Ahmad
H2S-TPA-001
OPEN
[ View ]

MEDIUM
Budi
RESOLVED
[ View ]
```

---

# 24. PAGE 12 — ALERT DETAIL

## Route

```text
/app/alerts/:id
```

## API

```http
GET /api/v1/alerts/{id}/
```

## Content

```text
Alert Level
Worker
Device
H₂S Reading
RQ
Risk Interpretation
Recommendations
Lifecycle
Audit
```

## Lifecycle UI

```text
● OPEN
│
● ACKNOWLEDGED
│
● RESOLVED
```

## OPEN Action

```text
[ Acknowledge ]
```

API:

```http
PATCH /api/v1/alerts/{id}/acknowledge/
```

## ACKNOWLEDGED Action

```text
[ Resolve Alert ]
```

API:

```http
PATCH /api/v1/alerts/{id}/resolve/
```

## Backend Lifecycle

```text
OPEN → ACKNOWLEDGED
ACKNOWLEDGED → RESOLVED
OPEN → RESOLVED
```

---

# 25. ALERT AUDIT

Frontend dapat menampilkan:

```text
acknowledged_by
acknowledged_at

resolved_by
resolved_at
```

Example:

```text
OPEN
02:10

ACKNOWLEDGED
02:14
Operator A

RESOLVED
02:21
Operator A
```

---

# 26. ALERT EVALUATION

## Trigger

Dari ARKL Result:

```text
[ Evaluate Alert ]
```

## API

```http
POST /api/v1/alerts/evaluate/
```

Frontend request type:

```text
AlertEvaluateRequest
```

Response:

```text
AlertEvaluationResponse
```

Properties penting:

```text
created
duplicate
escalated
alert
```

---

# 27. ALERT DEDUP UX

Jika:

```text
duplicate = true
```

frontend tidak boleh menganggap error.

UI dapat menampilkan:

```text
Alert aktif dengan kondisi yang sama sudah tersedia.
```

Kemudian direct ke Alert yang existing.

Frontend tidak boleh memaksa:

```text
alert.arkl_result_id === currentARKL.id
```

untuk duplicate alert.

---

# 28. RECOMMENDATIONS

Known codes:

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

Frontend harus mengubah code menjadi bahasa manusia.

Contoh:

```text
REDUCE_EXPOSURE_DURATION

→ Kurangi durasi berada di area paparan.
```

```text
USE_APPROPRIATE_PPE

→ Gunakan alat pelindung diri yang sesuai.
```

Backend tetap menyimpan code canonical.

---

# 29. PAGE 13 — RESEARCH DASHBOARD

## Route

```text
/research/dashboard
```

## Roles

```text
RESEARCHER
ADMIN
OPERATOR jika diizinkan
```

## Objective

Menyediakan dashboard analitik untuk kebutuhan penelitian.

## UI

```text
H₂S Summary

Average
Minimum
Maximum

H₂S Trend
[ Chart ]

Risk Distribution
[ Chart ]

Exposure Summary
[ Table ]

Alert Summary
[ Chart ]

[ Export CSV ]
```

## API

```http
GET /api/v1/research/h2s-summary/

GET /api/v1/research/h2s-trends/

GET /api/v1/research/arkl-results/

GET /api/v1/research/risk-distribution/

GET /api/v1/research/exposure-summary/

GET /api/v1/research/alert-summary/
```

---

# 30. PAGE 14 — REPORT / EXPORT

## Route

```text
/research/reports
```

atau operational equivalent:

```text
/app/reports
```

## API

```http
GET /api/v1/research/export/arkl.csv
```

IMPORTANT:

Endpoint CSV TIDAK menggunakan trailing slash.

Benar:

```text
/research/export/arkl.csv
```

Bukan:

```text
/research/export/arkl.csv/
```

## UI

```text
Research Reports

ARKL Dataset

[ Export ARKL CSV ]
```

---

# 31. PAGE 15 — WORKER ONBOARDING

## Route

```text
/worker/onboarding
```

## Role

```text
WORKER
```

## Trigger

Setelah login jika profile/exposure belum lengkap.

## Objective

Mengumpulkan data yang dapat dipahami pemulung.

## UI

```text
Lengkapi Profil Anda

Nama
[ Ahmad ]

Umur
[ 42 ] tahun

Berat badan
[ 58 ] kg

Berapa lama Anda bekerja per hari?
[ 8 ] jam

Berapa hari Anda bekerja dalam setahun?
[ 250 ] hari

Sudah berapa lama Anda bekerja di lokasi ini?
[ 10 ] tahun

[ Simpan ]
```

## Mapping

```text
Nama
→ Worker.name

Umur
→ Worker.age

Berat badan
→ body_weight

Jam kerja per hari
→ exposure_time

Hari kerja per tahun
→ exposure_frequency

Lama bekerja
→ exposure_duration
```

## API

Profile:

```http
GET /api/v1/me/profile/
PATCH /api/v1/me/profile/
```

Exposure:

```http
GET /api/v1/me/exposure/
PATCH /api/v1/me/exposure/
```

## Worker Restriction

Worker TIDAK boleh mengubah:

```text
inhalation_rate
```

Jangan render input `inhalation_rate` pada Worker UI.

---

# 32. PAGE 16 — WORKER HOME

## Route

```text
/worker/home
```

## Role

```text
WORKER
```

## Objective

Memberikan informasi keselamatan personal secara cepat.

## UI

```text
Halo, Ahmad

KONDISI PAJANAN TERKINI

HIGH

ABOVE REFERENCE LEVEL

Ikuti tindakan keselamatan
yang direkomendasikan.

Latest RQ
3.42

Active Alert
HIGH
ACKNOWLEDGED

[ Lihat Panduan ]
```

## API

Profile:

```http
GET /api/v1/me/profile/
```

Exposure:

```http
GET /api/v1/me/exposure/
```

ARKL:

```http
GET /api/v1/me/arkl-results/
```

Alerts:

```http
GET /api/v1/me/alerts/
```

---

# 33. WORKER HOME RULE

Worker hanya melihat resource miliknya.

Worker tidak menggunakan generic endpoint:

```text
/devices/
/workers/
/arkl generic
/alerts generic
/research/*
```

Worker menggunakan:

```text
/me/profile/
/me/exposure/
/me/arkl-results/
/me/alerts/
```

---

# 34. PAGE 17 — WORKER MY RISK

## Route

```text
/worker/risk
```

## API

```http
GET /api/v1/me/arkl-results/
```

## Response

Array.

Bukan paginated generic response.

## UI

```text
RISIKO SAYA

RQ
3.42

ABOVE REFERENCE LEVEL

Latest Calculation
22 Aug 2026 — 02:10

Recommended Action
- Kurangi waktu paparan
- Ikuti arahan petugas
- Gunakan perlindungan sesuai rekomendasi

[ Riwayat ]
```

---

# 35. PAGE 18 — WORKER ALERTS

## Route

```text
/worker/alerts
```

## API

```http
GET /api/v1/me/alerts/
```

Response berupa array.

## UI

```text
Peringatan Saya

HIGH
ACKNOWLEDGED
22 Aug 2026
[ Detail ]

MEDIUM
RESOLVED
20 Aug 2026
[ Detail ]
```

---

# 36. PAGE 19 — WORKER ALERT DETAIL

## Route

```text
/worker/alerts/:id
```

## Objective

Worker dapat melihat detail alert miliknya.

Worker TIDAK boleh:

```text
Acknowledge
Resolve
Evaluate
```

## UI

```text
HIGH

Status
ACKNOWLEDGED

H₂S
52.75 ppm

Risk
ABOVE REFERENCE LEVEL

Yang perlu dilakukan:
- Kurangi waktu berada di area
- Gunakan APD
- Ikuti arahan petugas
```

Data berasal dari:

```http
GET /api/v1/me/alerts/
```

Frontend memilih alert berdasarkan ID dari collection personal apabila backend belum menyediakan dedicated `/me/alerts/{id}/`.

---

# 37. PAGE 20 — WORKER PROFILE

## Route

```text
/worker/profile
```

## API

```http
GET /api/v1/me/profile/
GET /api/v1/me/exposure/
```

## UI

```text
Profil Saya

Ahmad
PML-001

Umur
42 tahun

Berat badan
58 kg

Bekerja per hari
8 jam

Hari kerja
250 hari/tahun

Lama bekerja
10 tahun

[ Edit Data ]

[ Logout ]
```

---

# 38. PAGE 21 — WORKER EDIT EXPOSURE

## Route

```text
/worker/profile/exposure
```

## API

```http
PATCH /api/v1/me/exposure/
```

## Editable

```text
body_weight
exposure_time
exposure_frequency
exposure_duration
```

## Not Editable

```text
inhalation_rate
```

## Confirmation

Jika exposure berubah:

```text
Perbarui data pajanan?

Data baru akan digunakan untuk
perhitungan ARKL berikutnya.

[ Batal ]
[ Simpan ]
```

---

# 39. PROFILE COMPLETENESS FLOW

Setelah WORKER login:

```text
GET /me/profile/
GET /me/exposure/
```

Kemudian:

```text
data lengkap
→ /worker/home

data belum lengkap
→ /worker/onboarding
```

Catatan:

Jika backend tidak menyediakan flag khusus `profile_complete`, frontend dapat menentukan completeness berdasarkan response profile/exposure yang tersedia.

Final rule harus mengikuti schema response aktual ketika implementasi dilakukan.

---

# 40. ADMIN ACCOUNT MANAGEMENT

## Proposed Route

```text
/app/accounts
```

## Role

```text
ADMIN
```

## API

```http
POST /api/v1/accounts/
```

Create account dapat digunakan untuk:

```text
OPERATOR
RESEARCHER
WORKER
```

sesuai backend permission.

Frontend tidak perlu membuat registration publik.

---

# 41. GLOBAL LOADING UX

Semua API page harus memiliki:

```text
loading
success
empty
error
```

Example:

```text
Loading monitoring data...
```

Jangan menampilkan layout kosong selama request.

---

# 42. GLOBAL EMPTY STATES

Contoh:

Workers:

```text
Belum ada data Worker.
```

ARKL:

```text
Belum ada hasil perhitungan ARKL.
```

Alert:

```text
Tidak ada alert aktif.
```

Research:

```text
Belum cukup data untuk menampilkan analisis.
```

---

# 43. GLOBAL ERROR UX

Backend tidak memiliki satu global error envelope.

Frontend harus menangani:

```text
detail
field arrays
non_field_errors
```

API client sudah menormalisasi:

```text
status
message
fieldErrors
raw
```

UI harus menggunakan normalized error.

---

# 44. STATUS VISUAL SYSTEM

Environmental severity:

```text
NORMAL
CAUTION
WARNING
DANGER
CRITICAL
```

Recommended visual mapping:

```text
NORMAL
→ green

CAUTION
→ amber

WARNING
→ orange

DANGER
→ red

CRITICAL
→ deep red
```

Alert Level:

```text
NONE
LOW
MEDIUM
HIGH
CRITICAL
```

Warna digunakan untuk status, bukan seluruh background aplikasi.

---

# 45. DESIGN PRINCIPLES

Visual harus:

```text
clean
professional
safety-oriented
data-centric
operational
accessible
responsive
```

Hindari:

```text
neon dashboard
glassmorphism berlebihan
gradient berlebihan
card terlalu banyak
dashboard generic AI
```

Base UI:

```text
neutral white / gray
dark readable text
teal/cyan operational accent
severity colors hanya untuk status
```

---

# 46. DESKTOP APP SHELL

Recommended:

```text
┌──────────────┬─────────────────────────────┐
│ Sidebar      │ Header                      │
│              ├─────────────────────────────┤
│ Navigation   │                             │
│              │ Main Content                │
│              │                             │
│              │                             │
└──────────────┴─────────────────────────────┘
```

Header:

```text
Page title
Live status optional
Theme
Account
```

---

# 47. WORKER APP SHELL

Worker diprioritaskan mobile-first.

```text
┌──────────────────────────────┐
│ Header                       │
├──────────────────────────────┤
│                              │
│ Main Content                 │
│                              │
├──────────────────────────────┤
│ Home | Risk | Alerts | User  │
└──────────────────────────────┘
```

---

# 48. RESPONSIVE BEHAVIOR

## Desktop

Operator/Admin/Researcher:

```text
sidebar
dashboard grid
large charts
tables
```

## Mobile

```text
sidebar → drawer
cards → vertical stack
tables → compact list/card
chart → responsive
```

Worker:

```text
mobile-first
bottom navigation
large buttons
simple content hierarchy
```

---

# 49. LIVE DATA UX

Live monitoring harus selalu menunjukkan:

```text
Device
PPM
Status
Last Received
Freshness
```

Contoh:

```text
● LIVE
Updated 2 seconds ago
```

Jika data berhenti:

```text
● NO RECENT DATA
Last received 3 minutes ago
```

Jangan menampilkan data lama seolah realtime.

---

# 50. WOKWI / SIMULATION PRESENTATION

Backend mengirim:

```text
simulated=true
```

UI Operator/Researcher dapat menampilkan badge:

```text
SIMULATED
```

Worker tidak harus melihat istilah Wokwi.

Jika perlu:

```text
Data Sensor Simulasi
```

---

# 51. RESEARCHER PERMISSIONS UX

Researcher harus dapat membaca:

```text
Devices
H2S readings
ARKL results
Alerts
Research analytics
Reports
```

Researcher UI tidak boleh menampilkan CTA:

```text
Calculate ARKL
Evaluate Alert
Acknowledge
Resolve
Edit Worker
```

jika API tidak mengizinkan.

---

# 52. OPERATOR PERMISSIONS UX

Operator memiliki CTA:

```text
Edit Exposure
Calculate ARKL
Evaluate Alert
Acknowledge
Resolve
```

Operator bukan account administrator utama.

---

# 53. ADMIN PERMISSIONS UX

Admin memiliki operational workspace sama dengan Operator tetapi dapat memiliki tambahan:

```text
Accounts
User management
full Worker management
```

Tidak perlu design system terpisah.

---

# 54. API TYPE SOURCE OF TRUTH

Frontend tidak membuat interface API manual jika schema sudah tersedia.

Gunakan:

```text
src/types/schema.d.ts
```

yang dihasilkan dari OpenAPI.

Example:

```ts
components["schemas"]["Alert"]
components["schemas"]["RealtimeARKLRequest"]
components["schemas"]["AlertEvaluateRequest"]
```

---

# 55. OPENAPI CONTRACT

Backend schema command:

```powershell
python manage.py spectacular --file schema.yml
python manage.py spectacular --file schema.yml --validate
```

Frontend generated type:

```text
src/types/schema.d.ts
```

Setiap perubahan backend API yang memengaruhi UI harus:

```text
update backend
→ regenerate schema.yml
→ validate OpenAPI
→ regenerate schema.d.ts
→ npm build
→ integration test
```

---

# 56. HEADLESS INTEGRATION BASELINE

Headless FE ↔ BE telah membuktikan:

```text
Frontend API layer
→ HTTP
→ Django
→ Auth
→ RBAC
→ Monitoring
→ Worker
→ Exposure
→ ARKL
→ Alert
→ Research
```

Baseline:

```text
6 files
9 tests
PASS
```

Kemudian diperluas.

---

# 57. CROSS-STACK CORE FLOW

Telah diuji:

```text
Operator
→ H2SReading
→ Worker
→ ARKL
→ Alert
→ Worker login
→ Worker melihat ARKL
→ Worker melihat Alert
```

Status:

```text
PASS
```

---

# 58. ALERT LIFECYCLE TEST

Telah diuji:

```text
OPEN
→ ACKNOWLEDGED
→ Worker melihat ACKNOWLEDGED
→ RESOLVED
→ Worker melihat RESOLVED
```

Audit actor/time juga terverifikasi.

Status:

```text
PASS
```

---

# 59. LIVE IOT INTEGRATION

Telah diuji:

```text
Wokwi
→ MQTT
→ Django MQTT ingestion
→ fresh H2SReading
→ ARKL realtime
→ Alert Engine
→ Worker API
```

Device:

```text
H2S-TPA-001
```

Status:

```text
PASS
```

---

# 60. LIVE CONCURRENCY REQUIREMENT

Sensor dapat publish saat UI melakukan ARKL.

Karena itu:

```text
captured reading ID
```

tidak dijadikan hard reference di UI.

ARKL response adalah sumber kebenaran final untuk reading yang digunakan.

---

# 61. API SECURITY REQUIREMENT

Frontend tidak boleh mengandalkan hidden menu sebagai security.

Contoh:

```text
Worker menu Devices disembunyikan
```

tetapi jika Worker mencoba API:

```text
GET /devices/
```

backend harus tetap menolak.

Headless RBAC test sudah PASS.

---

# 62. UI IMPLEMENTATION PHASES

## Phase UI-01 — Foundation

```text
Design tokens
Typography
Colors
Status system
Buttons
Inputs
Cards
Tables
Charts
App Shell
Navigation
```

---

## Phase UI-02 — Authentication

```text
Login
Role redirect
Route guard
Logout
401 handling
```

---

## Phase UI-03 — Operational Dashboard

```text
Dashboard
Live H₂S Monitoring
Devices
```

---

## Phase UI-04 — Worker Management

```text
Worker List
Worker Detail
Exposure Profile
```

---

## Phase UI-05 — ARKL

```text
ARKL Calculation
ARKL Result
Technical Detail
```

---

## Phase UI-06 — Alert Management

```text
Alert List
Alert Detail
Evaluate
Acknowledge
Resolve
Lifecycle
```

---

## Phase UI-07 — Worker App

```text
Onboarding
Home
Risk
Alerts
Profile
Exposure
```

---

## Phase UI-08 — Research

```text
Research Dashboard
H2S Trend
Risk Distribution
Exposure Summary
Alert Summary
CSV Export
```

---

## Phase UI-09 — Browser E2E

```text
Login UI
Role redirect
Monitoring
Worker flow
ARKL
Alert lifecycle
Worker visibility
CORS
Responsive layout
```

---

# 63. MVP CORE SCREENS

Prioritas desain pertama:

```text
01 Login

02 Operator Dashboard

03 Live Monitoring

04 Worker List

05 Worker Detail

06 Exposure Profile

07 ARKL Calculation

08 ARKL Result

09 Alert Detail

10 Worker Home

11 Worker Onboarding
```

Setelah design system stabil, halaman lain mengikuti pattern yang sama.

---

# 64. PRIMARY OPERATOR USER JOURNEY

```text
Login
↓
Dashboard
↓
Live Monitoring
↓
Worker
↓
Exposure Profile
↓
ARKL Calculation
↓
ARKL Result
↓
Evaluate Alert
↓
Alert Detail
↓
Acknowledge
↓
Resolve
```

---

# 65. PRIMARY WORKER USER JOURNEY

Worker baru:

```text
Login
↓
Onboarding
↓
Personal Data
↓
Exposure Data
↓
Save
↓
Worker Home
↓
My Risk
↓
My Alerts
```

Worker existing:

```text
Login
↓
Worker Home
↓
My Risk
↓
My Alerts
↓
Profile
```

---

# 66. PRIMARY RESEARCHER USER JOURNEY

```text
Login
↓
Research Dashboard
↓
H₂S Trend
↓
ARKL Result
↓
Risk Distribution
↓
Exposure Summary
↓
Alert Summary
↓
Export CSV
```

---

# 67. PRIMARY ADMIN USER JOURNEY

```text
Login
↓
Operational Dashboard
↓
Monitoring / Workers / ARKL / Alerts
↓
Research
↓
Accounts
```

---

# 68. SUCCESS CRITERIA — UI

UI dianggap berhasil jika:

* user diarahkan berdasarkan role;
* route yang tidak sesuai role tidak dapat digunakan;
* loading/error/empty state tersedia;
* live H₂S menampilkan freshness;
* Worker dapat mengisi profile sederhana;
* Operator dapat melengkapi ExposureProfile;
* Worker tidak dapat mengubah inhalation_rate;
* Operator dapat menjalankan ARKL;
* ARKL result menampilkan RQ dan interpretation;
* Operator dapat evaluate alert;
* dedup alert ditangani dengan benar;
* lifecycle OPEN → ACKNOWLEDGED → RESOLVED berjalan;
* Worker hanya melihat ARKL/Alert miliknya;
* Researcher dapat melihat analytics;
* CSV export tersedia;
* UI tidak memberikan diagnosis medis.

---

# 69. SUCCESS CRITERIA — API INTEGRATION

Sebelum page dianggap DONE:

```text
1. TypeScript compile PASS
2. API request menggunakan generated contract
3. Loading state tersedia
4. Error state tersedia
5. Permission sesuai role
6. Response berhasil dirender
7. Tidak ada `any` tanpa alasan
8. npm run build PASS
```

Untuk flow kritis:

```text
Integration test PASS
```

---

# 70. SUCCESS CRITERIA — BROWSER E2E

Browser E2E nanti harus membuktikan:

```text
Login UI
→ Role Redirect
→ Browser CORS
→ Dashboard render
→ Monitoring render
→ Worker flow
→ Exposure edit
→ ARKL Calculation
→ Alert Evaluation
→ Acknowledge
→ Resolve
→ Worker sees updated state
```

---

# 71. NON-GOALS

Versi UI awal tidak perlu:

```text
AI chatbot
predictive medical diagnosis
complex map
social features
push notification infrastructure
real-time websocket dashboard
Redux
complex microfrontend
```

Gunakan prinsip:

```text
KISS
YAGNI
SOLID
```

---

# 72. CURRENT PROJECT STATUS

Backend Core:

```text
DONE
```

Headless FE ↔ BE Integration:

```text
DONE ✅
```

Authentication & RBAC Integration:

```text
VERIFIED ✅
```

ARKL Integration:

```text
VERIFIED ✅
```

Alert Integration:

```text
VERIFIED ✅
```

Alert Lifecycle:

```text
VERIFIED ✅
```

Wokwi → MQTT → Backend:

```text
VERIFIED ✅
```

Live IoT → ARKL → Alert → Worker:

```text
VERIFIED ✅
```

UI Implementation:

```text
NOT STARTED
```

Browser E2E:

```text
NOT STARTED
```

Scientific Review:

```text
PENDING
```

---

# 73. FINAL PRODUCT FLOW

```text
                           LOGIN
                             │
                    Auth + /auth/me/
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
   ADMIN / OPERATOR      RESEARCHER          WORKER
          │                  │                  │
          ▼                  ▼                  ▼
   /app/dashboard      /research/dashboard  Check Profile
          │                                     │
          │                              ┌──────┴──────┐
          │                              │             │
          │                         Incomplete       Complete
          │                              │             │
          │                              ▼             ▼
          │                      /worker/onboarding /worker/home
          │                                            │
          ▼                                            │
   Live Monitoring                                    │
          │                                            │
          ▼                                            │
       Workers                                         │
          │                                            │
          ▼                                            │
   Exposure Profile                                    │
          │                                            │
          ▼                                            │
        ARKL                                            │
          │                                            │
          ▼                                            │
    ARKL Result                                        │
          │                                            │
          ▼                                            │
    Evaluate Alert                                     │
          │                                            │
          ▼                                            │
      Alert OPEN                                       │
          │                                            │
          ▼                                            │
    ACKNOWLEDGED ───────────────────────────────► Worker Alerts
          │                                            │
          ▼                                            │
       RESOLVED ────────────────────────────────► Worker Alerts
```

---

# 74. FINAL ROLE WORKSPACE SUMMARY

```text
ADMIN / OPERATOR
→ Operational Workspace
→ Monitoring
→ Devices
→ Workers
→ Exposure
→ ARKL
→ Alerts
→ Research
→ Reports

RESEARCHER
→ Analytical Workspace
→ H₂S
→ ARKL
→ Risk Distribution
→ Exposure
→ Alerts
→ Reports

WORKER
→ Personal Safety Workspace
→ Home
→ My Risk
→ My Alerts
→ Profile
→ Exposure
```

---

# 75. FINAL IMPLEMENTATION PRINCIPLE

UI TIDAK membuat business logic baru.

Sumber kebenaran:

```text
Sensor data
→ Backend

ARKL calculation
→ Backend

Alert evaluation
→ Backend

Alert lifecycle
→ Backend

RBAC
→ Backend

UI presentation
→ Frontend
```

Frontend bertanggung jawab pada:

```text
visual hierarchy
navigation
interaction
loading
error handling
role-aware presentation
responsive design
accessibility
```

Backend tetap menjadi sumber kebenaran untuk:

```text
authentication
authorization
sensor data
ARKL
alert
dedup
lifecycle
audit
research data
```

---

# END OF PRD

**Current Next Step:**

```text
PRD UI/UX
→ LOCK
→ Design System
→ Low Fidelity Wireframe
→ High Fidelity UI
→ React Implementation
→ Browser E2E
```

```

```
