
Anda bertindak sebagai Senior Software Architect + Project Manager + Technical Documentation Engineer.

Repository:

D:\Kuliah\joki\dosen\buk reni\projek\Backend

TUGAS ANDA:

Audit repository aktual lalu buat / perbarui SATU dokumen status proyek terbaru agar saya mudah mengetahui:

- proyek ini sebenarnya sedang berada di tahap mana;
- layer mana yang selesai;
- layer mana yang reopened;
- layer mana yang paused;
- task yang sudah selesai;
- task yang belum selesai;
- blocker;
- technical debt;
- keputusan scientific yang belum dikunci;
- test / quality status;
- endpoint yang sudah aktif;
- endpoint yang belum aktif;
- file yang sedang relevan;
- urutan pekerjaan selanjutnya.

Dokumen ini akan menjadi "project handoff / source of truth" untuk melanjutkan development di chat atau agent lain.

==================================================
IMPORTANT SOURCE OF TRUTH
=========================

Prioritas kebenaran teknis:

1. Repository aktual
2. Migrations
3. Tests
4. Runtime configuration
5. schema.yml
6. Dokumentasi/catatan

Jangan mempercayai status lama apabila bertentangan dengan repository aktual.

Untuk keputusan ilmiah ARKL yang belum final:
JANGAN menyimpulkan sendiri.
Tandai sebagai:

NEEDS SCIENTIFIC DECISION

==================================================
PROJECT CONTEXT
===============

Project adalah backend Django untuk:

IoT H₂S Environmental Monitoring
+
Data & Exposure Management
+
Smart ARKL
+
Alert & Risk Management
+
Research & Reporting

Target pengguna ke depan:

ADMIN
OPERATOR
RESEARCHER
WORKER / PEMULUNG

Namun authentication/authorization belum menjadi core existing dan harus diaudit berdasarkan repository.

Konsep layer:

Layer 1 — IoT Environmental Monitoring
Layer 2 — Data & Exposure Management
Layer 3 — Smart ARKL
Layer 4 — Alert & Risk Management
Layer 5 — Research & Reporting

==================================================
CURRENT IMPORTANT PROJECT DECISION
==================================

Perhatian khusus pada Layer 3.

Repository saat ini diketahui memiliki ARKL:

calculation_version = 1.1.0-MVP

Formula runtime harus Anda audit langsung.

Sebelumnya ditemukan formula kira-kira:

C_mg/m3 = ppm × conversion factor

EC = C × (ET / 24) × (EF / 365)

RQ = EC / RfC

Namun penelitian akan mempertimbangkan revisi ke formula intake inhalasi ARKL:

I = (C × R × tE × fE × Dt) / (Wb × tavg)

RQ = I / reference value

Parameter:

C    = concentration
R    = inhalation rate
tE   = exposure time
fE   = exposure frequency
Dt   = exposure duration
Wb   = body weight
tavg = averaging time

JANGAN implementasikan rumus baru.

JANGAN mengarang tavg.

JANGAN mengubah RfC/reference value.

JANGAN menghapus hasil ARKL lama.

Yang harus Anda lakukan hanya mencatat:

- formula runtime aktual;
- calculation version aktual;
- mismatch dengan formula penelitian baru;
- scientific decision yang masih dibutuhkan;
- file yang nantinya terdampak.

Karena formula belum final, status Layer 3 kemungkinan:

REOPENED — SCIENTIFIC REVISION REQUIRED

Tetapi verifikasi berdasarkan repository.

==================================================
LAYER 4 IMPORTANT STATUS
========================

Alert Engine sebelumnya sudah memiliki:

Alert levels:
NONE
LOW
MEDIUM
HIGH
CRITICAL

Risk status:
NO_ACTION_REQUIRED
MONITORING_REQUIRED
RISK_MANAGEMENT_REQUIRED
IMMEDIATE_ACTION_REQUIRED

Lifecycle:
OPEN
ACKNOWLEDGED
RESOLVED

Features:

- deterministic decision matrix;
- recommendation codes;
- persistence;
- deduplication;
- escalation;
- lifecycle;
- REST API;
- E2E tests.

Alert Engine TIDAK BOLEH menghitung ulang ARKL/RQ/RfC.

Jika ARKL formula berubah nanti, Layer 4 seharusnya menjalani regression, bukan otomatis diubah.

Audit status aktualnya.

==================================================
LAYER 5 IMPORTANT STATUS
========================

Research app sudah ada.

Audit apakah sudah ada:

- H2S summary;
- H2S trends;
- time filter;
- device filter;
- simulated/physical filter;
- ARKL recap;
- risk distribution;
- exposure summary;
- alert summary;
- export.

Periksa juga apakah:

research.urls

sudah benar-benar di-include dari:

config/urls.py

dan apakah research endpoints sudah masuk:

schema.yml

Jangan hanya melihat file lokal research/urls.py.

==================================================
OBSERVABILITY
=============

Core observability existing harus dianggap reusable.

Audit:

- Request ID
- request logging
- error logging
- performance monitoring
- security audit
- redaction
- rotating logs
- MQTT/background logger

Jangan implement ulang.

==================================================
DO NOT MODIFY PROJECT LOGIC
===========================

Pada task ini:

JANGAN:

- refactor business code;
- mengubah formula;
- membuat migration;
- mengubah database;
- mengubah .env;
- install dependency;
- memperbaiki bug;
- menambah endpoint;
- menambah role;
- menjalankan destructive command.

Anda hanya boleh:

- inspect;
- run safe/read-only verification;
- membuat/update file dokumentasi status proyek.

==================================================
SAFE VERIFICATION
=================

Jika runtime tersedia, boleh menjalankan:

pytest -v
ruff check .
ruff format --check .
python manage.py check
python manage.py spectacular --file schema.yml
pip-audit

Tetapi:

- jangan mengklaim PASS bila command tidak berhasil dijalankan;
- bedakan VERIFIED vs INFERRED;
- jangan menjalankan migration;
- jangan memodifikasi database produksi.

Jika environment agent tidak kompatibel dengan Windows .venv:
catat sebagai NOT VERIFIED FROM CURRENT ENVIRONMENT.

==================================================
TARGET FILE
===========

Buat atau update file:

catatan/PROJECT_STATUS.md

Jika file tersebut sudah ada:
REFRESH berdasarkan repository aktual.

Jangan membuat banyak file status yang isinya tumpang tindih.

==================================================
FORMAT PROJECT_STATUS.md
========================

Gunakan struktur berikut secara lengkap:

# SMART H2S ARKL — PROJECT STATUS

## 1. Project Identity

Tuliskan:

- tujuan project;
- backend stack;
- database;
- protocol IoT;
- current architecture style.

## 2. Current Overall Status

Buat tabel:

| Layer | Name | Status | Notes |
| ----- | ---- | ------ | ----- |

Status hanya gunakan:

LOCKED
DONE
IN PROGRESS
REOPENED
PAUSED
NOT STARTED

Contoh jangan diikuti tanpa audit:

Layer 1 | IoT Monitoring | DONE
Layer 2 | Data & Exposure | DONE
Layer 3 | Smart ARKL | REOPENED
Layer 4 | Alert | LOCKED
Layer 5 | Research | PAUSED/IN PROGRESS

Tentukan berdasarkan repository aktual.

## 3. Current Development Position

Tulis satu kalimat sangat jelas:

"Project saat ini berada pada ..."

Lalu diagram:

Completed
↓
Current
↓
Next
↓
Later

## 4. Layer 1 — IoT Environmental Monitoring

Catat:

Implemented:

- ...

Verified:

- ...

Remaining:

- ...

Future physical IoT work:

- ...

Technical debt:

- message id/idempotency
- source timestamp
- calibration
- physical sensor transition
  hanya jika repository mendukung temuan tersebut.

## 5. Layer 2 — Data & Exposure Management

Catat:

Models:

- Device
- H2SReading
- Worker
- ExposureProfile

Actual fields penting.

Implemented API.

Remaining work.

Role-related future impact.

## 6. Layer 3 — Smart ARKL

WAJIB DETAIL.

### Current Runtime Formula

Tulis formula aktual persis berdasarkan code.

### Current Version

calculation_version = ...

### Inputs Actually Used

...

### Inputs Stored But Not Used

...

### Current Output

...

### Scientific Revision Under Consideration

Tuliskan formula intake yang direncanakan:

I = ...

RQ = ...

Tetapi tandai:

NOT IMPLEMENTED
NEEDS SCIENTIFIC DECISION

### Missing Scientific Decisions

Contoh:

- exact tavg for non-carcinogenic exposure;
- exact reference value/RfC compatibility and units;
- formula transcription verification;
- scientific source/version.

Jangan mengarang jawabannya.

### Expected Impact

List file/layer yang nanti terdampak.

## 7. Layer 4 — Alert & Risk Management

Catat:

- rule version;
- environmental mapping;
- final matrix;
- risk status;
- recommendation;
- persistence;
- deduplication;
- escalation;
- lifecycle;
- API;
- E2E.

Status apakah LOCKED atau tidak berdasarkan test/source.

Tuliskan juga:

"Jika ARKL v2 dibuat, Layer 4 membutuhkan regression but not automatic rule rewrite."

## 8. Layer 5 — Research & Reporting

Pisahkan:

IMPLEMENTED
PARTIAL
MISSING

Audit:

H2S summary
H2S trends
ARKL recap
risk distribution
exposure summary
alert summary
export

Catat apakah URL root sudah aktif.

## 9. End-to-End Current Flow

Buat diagram sesuai implementasi AKTUAL.

Contoh:

MQTT
↓
H2SReading
↓
manual/caller ARKL API
↓
ARKLResult
↓
manual/caller Alert evaluate API
↓
Alert
↓
Research

Jika tidak ada automation langsung:
tulis eksplisit.

## 10. REST API Inventory

Kelompokkan actual endpoint:

Devices
Exposure
ARKL
Alerts
Research
Docs

Bedakan:

ACTIVE
LOCAL ONLY / NOT PUBLISHED
MISSING

## 11. Database Relationship

Buat diagram:

Device
H2SReading
Worker
ExposureProfile
ARKLResult
Alert

Catat on_delete policy yang penting.

## 12. Testing Status

Berikan:

- jumlah test bila dapat diverifikasi;
- per-app count jika dapat dihitung;
- latest runtime result jika dapat dijalankan.

Gunakan tabel:

| Check | Status | Evidence |
| ----- | ------ | -------- |

Status:

VERIFIED PASS
VERIFIED FAIL
NOT RUN
INFERRED

Checks:

pytest
ruff
format
Django check
OpenAPI
pip-audit

## 13. Locked Components

List yang jangan diubah sembarangan.

Contoh:

- MQTT payload contract
- observability
- Alert Engine rule version
- historical ARKL records
- API v1 prefix

Hanya masukkan bila benar berdasarkan code.

## 14. Reopened Components

Terutama ARKL scientific calculation jika memang sesuai audit.

Tuliskan alasan REOPENED.

## 15. Paused Work

Jika Phase 6 perlu dipause karena ARKL formula belum final:
catat.

Jangan menganggap paused jika repository menunjukkan development sedang lanjut tanpa dependency.

## 16. Backlog / Remaining Tasks

Gunakan prioritas:

P0 — BLOCKER
P1 — HIGH
P2 — MEDIUM
P3 — OPTIONAL

Format:

### P0

- [ ] ...

### P1

- [ ] ...

### P2

- [ ] ...

### P3

- [ ] ...

Task harus konkret, bukan kalimat abstrak.

Contoh:

- [ ] Lock tavg non-carcinogenic from approved scientific source.
- [ ] Decide ARKL v2 reference value/unit compatibility.
- [ ] Create versioned ARKL migration only after formula approval.
- [ ] Run full alert regression after ARKL v2.
- [ ] Finish research ARKL recap.
- [ ] Add authentication/authorization.
- [ ] Add Worker ownership.
- [ ] Prepare physical IoT calibration.

Tetapi sesuaikan dengan repository aktual.

## 17. Current Blockers

Tulis setiap blocker dengan:

Blocker:
Why:
Required decision:
Blocks which task:

## 18. Technical Debt

Gunakan severity:

CRITICAL
HIGH
MEDIUM
LOW

Jangan membuat debt palsu.

## 19. Authentication & Role Future Plan

Current auth status:
...

Future roles:

ADMIN
OPERATOR
RESEARCHER
WORKER

Recommended relation:

Django User
↓ optional link
Worker

Catat permission/ownership requirement.

JANGAN implementasikan.

## 20. Physical IoT Transition

List:

Already reusable:
...

Must change:
...

Must verify scientifically:
...

Contoh:

firmware
sensor calibration
simulated=false
device identity
MQTT resilience
timestamp/idempotency

## 21. Recommended Next Tasks

Tuliskan maksimal 10 task berurutan.

Harus sangat konkret.

Contoh format:

1. ...
2. ...
3. ...

## 22. Do Not Do Yet

List hal yang harus ditunda.

Misalnya:

- do not finish risk reporting before ARKL formula lock;
- do not overwrite calculation version 1.1;
- do not add AI diagnosis;
- do not migrate Worker directly into auth model.

Sesuaikan audit.

## 23. Handoff Summary

Buat ringkasan maksimal 20 baris yang dapat saya copy ke agent/chat baru.

Harus mencakup:

- current stage;
- locked layer;
- reopened layer;
- paused layer;
- main blocker;
- immediate next task;
- important versions;
- do-not-touch components.

==================================================
TASK COMPLETION REQUIREMENT
===========================

Setelah file selesai:

1. Tampilkan path file:
   catatan/PROJECT_STATUS.md
2. Ringkas apa yang berubah dari status lama.
3. Tampilkan:

   - CURRENT PHASE
   - NEXT TASK
   - MAIN BLOCKER
   - LOCKED COMPONENTS
4. JANGAN mulai coding task berikutnya.
5. Berhenti dan tunggu approval.
