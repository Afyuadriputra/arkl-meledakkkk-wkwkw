
Anda bertindak sebagai Senior Backend Engineer sekaligus API Integration Engineer.

Saya akan mulai membangun frontend untuk project Django REST Framework ini.

PROJECT ROOT:
D:\Kuliah\joki\dosen\buk reni\projek\Backend

TUJUAN UTAMA:
Audit seluruh backend dan hasilkan API CONTRACT yang benar-benar dapat dijadikan
sumber kebenaran oleh frontend React/Vite.

JANGAN menebak API.
JANGAN hanya percaya schema.yml.
JANGAN mengubah business logic.
JANGAN mengubah formula ARKL.
JANGAN mengubah alert decision matrix.
JANGAN menampilkan nilai .env, secret key, token, password, credential MQTT,
atau secret lainnya.

============================================================
PRINSIP SOURCE OF TRUTH
=======================

Gunakan prioritas berikut:

1. URL configuration aktual
2. View / ViewSet aktual
3. Serializer aktual
4. Permission classes aktual
5. Service/domain logic aktual
6. Model dan enum aktual
7. Automated tests aktual
8. schema.yml

Jika schema.yml berbeda dengan source code, laporkan sebagai API schema drift.

Jangan menganggap dokumentasi lama lebih benar daripada source code.

============================================================
MODULE YANG WAJIB DIAUDIT
=========================

Audit seluruh modul berikut:

- config/
- core/
- accounts/
- devices/
- exposure/
- arkl/
- alerts/
- research/
- feature_tests/
- schema.yml

Periksa juga:

- config/urls.py
- urls.py setiap Django app
- serializers.py
- views.py / viewsets
- permissions.py
- services/
- models.py
- tests/
- settings DRF
- authentication configuration
- CORS configuration
- pagination configuration
- exception/error response behavior bila ada

============================================================

1. INVENTARIS SELURUH ENDPOINT
   ============================================================

Temukan SELURUH endpoint /api/v1/... yang benar-benar terdaftar.

Untuk SETIAP endpoint tuliskan:

- method
- path
- nama/tujuan endpoint
- authentication required atau tidak
- role yang boleh mengakses:
  ADMIN
  OPERATOR
  RESEARCHER
  WORKER
- request body
- query parameters
- path parameters
- response body
- HTTP success status
- kemungkinan HTTP error status
- serializer yang digunakan
- pagination:
  yes/no
- apakah read-only atau write
- catatan khusus frontend

Jangan hanya tulis nama field.
Tuliskan tipe datanya.

Contoh format:

POST /api/v1/auth/login/

Authentication:
Public

Request:
{
  "username": string,
  "password": string
}

Success 200:
{
  "token": string,
  ...
}

Errors:
400 ...
401 ...

Frontend notes:

- simpan token ...
- gunakan Authorization header ...

Tetapi isi sebenarnya HARUS berasal dari source code.

============================================================
2. AUDIT AUTHENTICATION CONTRACT
================================

Audit secara khusus:

POST /api/v1/auth/login/
POST /api/v1/auth/logout/
GET  /api/v1/auth/me/
POST /api/v1/accounts/

Pastikan frontend tahu secara pasti:

- credential login yang diminta
- format response login
- nama field token
- header autentikasi yang digunakan

Contoh yang harus diverifikasi, bukan diasumsikan:

Authorization: Token <token></token>

- logout membutuhkan token atau tidak
- response logout
- struktur /auth/me/
- bagaimana mendapatkan role user
- bagaimana WORKER dikaitkan ke Worker
- status jika worker tidak aktif
- apa yang terjadi jika AccountProfile tidak ada
- role ADMIN superuser bila memiliki perilaku khusus

Buat contoh alur:

Login
→ token
→ GET /auth/me/
→ role
→ frontend route selection

============================================================
3. AUDIT WORKER API CONTRACT
============================

Audit khusus endpoint personal worker:

GET/PATCH /api/v1/me/profile/
GET/PATCH /api/v1/me/exposure/
GET       /api/v1/me/arkl-results/
GET       /api/v1/me/alerts/

Untuk setiap endpoint:

- field yang dikembalikan
- tipe data
- nullable
- editable
- read-only
- validation
- pagination
- ordering bila ada
- empty-state response
- response jika ExposureProfile belum ada
- response jika Worker link tidak ada
- response jika worker inactive

Konfirmasikan khusus bahwa worker:

- tidak dapat mengganti worker code
- tidak dapat mengganti is_active
- tidak dapat mengganti inhalation_rate jika memang source code melarangnya
- hanya dapat melihat ARKL miliknya
- hanya dapat melihat alert miliknya
- tidak dapat memakai generic operational API

============================================================
4. AUDIT DEVICE DAN SENSOR CONTRACT
===================================

Cari seluruh API terkait:

- devices
- H2S readings
- latest reading
- history/readings bila ada

Dokumentasikan:

Device:

- id
- device_code
- name
- location
- is_active
- timestamps
- seluruh field aktual lainnya

H2SReading:

- id
- device
- ppm
- adc
- filtered_adc
- level
- status
- uptime_ms
- simulated
- timestamp/received_at
- seluruh field aktual lainnya

Pastikan frontend tahu enum/status aktual sensor.

Contoh:
NORMAL
CAUTION
WARNING
DANGER
CRITICAL

Tetapi verifikasi enum aktual dari source.

Audit juga endpoint latest sensor reading secara tepat:

- apakah latest global
- latest per device
- request parameter
- response format
- kondisi jika belum ada reading

============================================================
5. AUDIT EXPOSURE CONTRACT
==========================

Dokumentasikan Worker dan ExposureProfile.

Pastikan tipe dan validation aktual untuk:

Worker:

- code
- name
- age
- is_active

Exposure:

- body_weight
- exposure_time
- exposure_frequency
- exposure_duration
- inhalation_rate

Tuliskan unit setiap field jika dapat diverifikasi dari source/tests:

body_weight = kg
exposure_time = jam/hari
exposure_frequency = hari/tahun
exposure_duration = tahun
inhalation_rate = m3/jam

Dokumentasikan constraints yang benar-benar diterapkan.

Misalnya:
body_weight > 0
0 < exposure_time <= 24
0 < exposure_frequency <= 365
exposure_duration > 0
inhalation_rate > 0

Tetapi verifikasi terlebih dahulu dari code.

============================================================
6. AUDIT ARKL API CONTRACT
==========================

Cari endpoint:

- realtime calculation
- historical calculation
- ARKL result list/detail
- endpoint ARKL lain jika ada

Untuk realtime dokumentasikan:

Request:

- worker identifier seperti apa
- device identifier seperti apa

Response:

- id
- worker
- reading
- calculation_type
- concentration_ppm
- concentration_mg_m3
- exposure_concentration_mg_m3
- body_weight
- exposure_time
- exposure_frequency
- exposure_duration
- inhalation_rate
- averaging_time
- intake
- rfc
- rq
- interpretation
- calculation_version
- source_simulated
- timestamps
- field aktual lainnya

Jangan menghitung ulang formula.
Hanya dokumentasikan contract output.

Dokumentasikan enum interpretation aktual:

WITHIN_REFERENCE_LEVEL
ABOVE_REFERENCE_LEVEL

bila memang itu yang digunakan.

Dokumentasikan historical request:

- start_time
- end_time
- worker/device
- format datetime
- timezone
- response reading_count
- response reading null/non-null
- error jika tidak ada reading

============================================================
7. AUDIT ALERT CONTRACT
=======================

Ini sangat penting untuk frontend.

Cari seluruh endpoint:

- list alert
- detail alert
- evaluate
- acknowledge
- resolve
- personal worker alerts

Dokumentasikan seluruh field Alert aktual.

Verifikasi enum aktual:

alert_level:
NONE
LOW
MEDIUM
HIGH
CRITICAL

environmental status/severity:
NORMAL
CAUTION
WARNING
DANGER
CRITICAL

lifecycle:
OPEN
ACKNOWLEDGED
RESOLVED

risk status aktual
recommendation_codes aktual
created
duplicate
escalated

Jangan menebak nama JSON key.

Baca serializer dan tests untuk memastikan response sebenarnya.

Dokumentasikan response `/alerts/evaluate/` dengan tepat.

Contoh struktur yang harus diverifikasi:

{
  "created": boolean,
  "duplicate": boolean,
  "escalated": boolean,
  "alert": {...}
}

Dokumentasikan:

- kondisi alert == null bila level NONE, bila memang benar
- duplicate behavior
- escalation behavior
- acknowledge
- resolved
- acknowledged_by
- acknowledged_by_username
- resolved_by
- resolved_by_username
- timestamps

============================================================
8. WORKER-FRIENDLY MESSAGE
==========================

Periksa apakah backend SUDAH memiliki field seperti:

worker_message
display_message
user_message
risk_message
presentation_label

Jika BELUM ADA:
JANGAN membuatnya diam-diam.

Tuliskan:

STATUS: NOT IMPLEMENTED IN BACKEND

dan rekomendasikan frontend mapping dari alert_level:

NONE     -> Normal
LOW      -> Waspada
MEDIUM   -> Peringatan
HIGH     -> Bahaya
CRITICAL -> Kritis

Pesan yang direncanakan frontend:

NONE:
"Kondisi terkendali. Tetap bekerja sesuai prosedur keselamatan."

LOW:
"Kadar H₂S mulai meningkat. Batasi waktu berada di area ini."

MEDIUM:
"Kadar H₂S tinggi. Sebaiknya menjauh dari area ini dan gunakan perlindungan yang dianjurkan."

HIGH:
"Kondisi berbahaya. Segera tinggalkan area dan menuju tempat yang lebih aman."

CRITICAL:
"BAHAYA SERIUS. Segera keluar dari area dan ikuti arahan petugas keselamatan."

Tegaskan bahwa presentation mapping tersebut BUKAN perubahan Alert Engine.

Jangan menggunakan bahasa diagnosis seperti:

- Anda terkena ISPA
- Anda terdiagnosis ISPA
- persentase kemungkinan ISPA

============================================================
9. AUDIT RESEARCH API CONTRACT
==============================

Audit endpoint research aktual seperti:

/api/v1/research/h2s-summary/
/api/v1/research/h2s-trends/
/api/v1/research/arkl-results/
/api/v1/research/risk-distribution/
/api/v1/research/exposure-summary/
/api/v1/research/alert-summary/
/api/v1/research/export/arkl.csv

Tetapi jangan hanya memakai daftar ini.
Verifikasi registration aktual.

Untuk setiap response dokumentasikan struktur JSON sampai level
yang cukup agar React dapat langsung membuat chart/table.

Untuk CSV:

- method
- Content-Type
- Content-Disposition
- nama file bila ditentukan
- query parameter bila ada
- authorization

============================================================
10. ROLE MATRIX
===============

Buat satu tabel FINAL:

Endpoint/Feature | ADMIN | OPERATOR | RESEARCHER | WORKER

Minimal untuk:

Authentication
Accounts
Devices
Readings
Workers
Exposure
ARKL realtime
ARKL historical
ARKL results
Alerts read
Alert evaluate
Alert ACK
Alert resolve
Research
/me/profile
/me/exposure
/me/arkl-results
/me/alerts

Gunakan:
✅ Allowed
👁 Read only
❌ Denied
🌐 Public

Tabel harus berdasarkan permission class aktual.

============================================================
11. FRONTEND DATA TYPES
=======================

Setelah audit selesai, buat draft TypeScript interface berdasarkan API aktual.

Contoh file konseptual:

src/types/api.ts

Buat interface seperti:

AuthUser
LoginRequest
LoginResponse
Worker
ExposureProfile
Device
H2SReading
ARKLResult
Alert
ResearchH2SSummary
ResearchTrendPoint
dst.

Jangan membuat field yang tidak ada di backend.

Tentukan optional / nullable secara benar.

Contoh:

interface ARKLResult {
  id: number;
  rq: string | number;
  ...
}

Periksa bagaimana DecimalField DRF benar-benar diserialisasi.
Jika menjadi string, gunakan string dan jangan menganggap number.

============================================================
12. FRONTEND API MODULE MAP
===========================

Setelah contract ditemukan, rekomendasikan API client sederhana untuk solo developer.

Gunakan struktur minimal:

src/
  api/
    client.ts
    auth.ts
    worker.ts
    monitoring.ts
    arkl.ts
    alerts.ts
    research.ts

Jangan gunakan Redux.
Jangan gunakan repository pattern.
Jangan gunakan clean architecture frontend.
Jangan membuat abstraction yang tidak diperlukan.

Untuk setiap file tulis endpoint mana yang digunakan.

Contoh:

auth.ts

- login()
- logout()
- me()

worker.ts

- getMyProfile()
- updateMyProfile()
- getMyExposure()
- updateMyExposure()

Dan seterusnya berdasarkan API aktual.

============================================================
13. AUDIT CORS + FRONTEND CONNECTIVITY
======================================

Periksa settings Django.

Laporkan:

- CORS package/config
- allowed origins
- CSRF configuration bila relevan
- SessionAuthentication implications
- TokenAuthentication implications
- apakah React localhost dapat mengakses backend
- expected backend base URL development
- trailing slash behavior

JANGAN menampilkan secret configuration.

Buat contoh konfigurasi frontend yang aman:

VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1

Tetapi beri label sebagai recommended development configuration,
bukan secret backend.

============================================================
14. ERROR CONTRACT
==================

Frontend perlu tahu bentuk error.

Periksa response aktual untuk:

- 400 validation
- 401 unauthenticated
- 403 permission denied
- 404
- invalid login
- missing exposure profile
- missing reading
- invalid ARKL calculation
- invalid alert lifecycle transition

Berikan contoh shape berdasarkan tests/source.

Jika error shape belum konsisten, tandai sebagai:

API CONTRACT RISK

Jangan membuat global error handler backend kecuali diminta.

============================================================
15. PAGINATION DAN ORDERING
===========================

Cari apakah DRF global pagination digunakan.

Untuk endpoint list, dokumentasikan apakah response:

[
  ...
]

atau:

{
  "count": ...,
  "next": ...,
  "previous": ...,
  "results": [...]
}

Periksa aktual, jangan menebak.

Audit ordering untuk:

- readings
- ARKL results
- alerts
- research trend

Frontend perlu tahu apakah newest-first atau oldest-first.

============================================================
16. OPENAPI / schema.yml DRIFT
==============================

Bandingkan semua endpoint aktual dengan:

schema.yml

Buat tabel:

Endpoint | Source Code | schema.yml | Status

Contoh:

/api/v1/auth/login/ | YES | NO | SCHEMA STALE

Cari:

- endpoint missing
- field missing
- response mismatch
- auth mismatch
- role/permission yang tidak terwakili
- obsolete endpoint

JANGAN langsung regenerate sebelum audit selesai.

============================================================
17. TEST VALIDATION
===================

Jalankan hanya safe/read-only validation:

python manage.py check
pytest feature_tests -v
pytest -v

Jangan menghapus DB.
Jangan flush.
Jangan reset migration.
Jangan mengubah .env.

Laporkan hasil aktual.

Jika test lama gagal akibat environment, jangan mengubah business logic
hanya supaya test hijau. Analisis penyebab dahulu.

============================================================
18. OUTPUT DOCUMENT
===================

Buat file baru:

catatan/FRONTEND_API_CONTRACT.md

Dokumen harus berisi:

# SMART H2S ARKL — FRONTEND API CONTRACT

## 1. Contract Status

## 2. Base URL

## 3. Authentication

## 4. Role Matrix

## 5. Auth Endpoints

## 6. Worker Personal Endpoints

## 7. Device & H2S Endpoints

## 8. Worker & Exposure Endpoints

## 9. ARKL Endpoints

## 10. Alert Endpoints

## 11. Research Endpoints

## 12. Enums

## 13. Error Responses

## 14. Pagination & Ordering

## 15. Suggested TypeScript Interfaces

## 16. Suggested Frontend API Modules

## 17. CORS / Local Development

## 18. Schema Drift

## 19. Known Integration Risks

## 20. Frontend Readiness Verdict

Pada bagian paling akhir tulis salah satu:

FRONTEND READY
atau
FRONTEND READY WITH MINOR CONTRACT FIXES
atau
NOT FRONTEND READY

beserta alasan berdasarkan audit aktual.

============================================================
19. OUTPUT TERMINAL
===================

Setelah selesai, jangan dump seluruh file ke terminal.

Tampilkan ringkasan:

1. jumlah endpoint aktual
2. jumlah endpoint per role
3. auth mechanism
4. endpoint Worker yang siap
5. endpoint Operator yang siap
6. endpoint Researcher yang siap
7. schema drift ditemukan/tidak
8. blocker frontend bila ada
9. test result
10. file dokumentasi yang dibuat

============================================================
20. BATASAN
===========

PENTING:

- Jangan mengubah formula ARKL.
- Jangan mengubah RfC.
- Jangan mengubah conversion factor.
- Jangan mengubah Alert decision matrix.
- Jangan mengubah recommendation rules.
- Jangan mengubah permission hanya untuk membuat frontend lebih mudah.
- Jangan menambahkan endpoint baru tanpa bukti frontend benar-benar membutuhkannya.
- Jangan install dependency baru.
- Jangan membuat Redux.
- Jangan membuat WebSocket.
- Jangan membuat frontend.
- Jangan menyentuh nilai .env.
- Jangan menampilkan secret.
- Jangan overengineering.

Ini adalah AUDIT DAN CONTRACT FREEZE sebelum frontend dibuat.

Mulai dengan membaca source code aktual terlebih dahulu.
