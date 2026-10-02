
Anda bekerja pada project:

D:\Kuliah\joki\dosen\buk reni\projek\Backend

Tugas Anda adalah melakukan AUDIT AKTUAL terhadap backend SMART H2S ARKL dan memperbarui dokumentasi status proyek berdasarkan kondisi repository yang benar-benar ada.

SOURCE OF TRUTH:

- kode repository aktual
- migrations
- models
- serializers
- services
- views
- urls
- tests
- config/settings.py
- config/urls.py
- schema.yml jika ada
- hasil command verification yang Anda jalankan

JANGAN mengandalkan asumsi atau status dokumentasi lama jika bertentangan dengan kode/test aktual.

==================================================
TUJUAN AUDIT
============

Jawab pertanyaan utama:

"Apakah sistem SMART H2S ARKL saat ini berjalan dengan benar secara engineering?"

Audit seluruh alur berikut:

Layer 1 — IoT Environmental Monitoring
Layer 2 — Data & Exposure Management
Layer 3 — Smart ARKL
Layer 4 — Alert & Risk Management
Layer 5 — Research & Reporting

Lalu tentukan apakah repository siap lanjut ke:

Layer 6 — Authentication & Authorization

==================================================
PRINSIP
=======

- Jangan refactor aplikasi kecuali ada bug nyata yang diperlukan agar audit bisa diselesaikan.
- Jangan mengubah rumus ARKL.
- Jangan mengubah Alert Decision Matrix.
- Jangan mengubah lifecycle/dedupe/escalation Alert.
- Jangan mengubah historical ARKLResult.
- Jangan relabel data v1.1 menjadi v2.
- Jangan membuat migration kecuali memang ditemukan kebutuhan yang tidak dapat dihindari.
- Jangan menampilkan isi rahasia .env.
- Jangan mengubah Core observability yang sudah ada.
- Jangan menambah Celery, Redis, repository pattern, DI framework, atau dependency baru tanpa kebutuhan nyata.
- Ikuti arsitektur:
  View → Serializer → Service → Model/ORM → SQLite
- Gunakan prinsip SOLID, KISS, YAGNI.
- Research hanya boleh membaca persisted data dan tidak boleh menghitung ulang Intake, RQ, ARKL interpretation, atau Alert decision rules.

==================================================
LANGKAH 1 — INSPEKSI REPOSITORY
================================

Pelajari minimal:

config/
core/
devices/
exposure/
arkl/
alerts/
research/
catatan/

Periksa:

- models
- migrations
- serializers
- services
- views
- urls
- tests
- settings
- root URL registration
- middleware
- logging
- schema/OpenAPI

Identifikasi:

1. fakta terverifikasi
2. asumsi
3. bug nyata
4. technical debt
5. pekerjaan yang belum selesai

==================================================
LANGKAH 2 — VERIFIKASI LAYER
=============================

A. Layer 1 — IoT Environmental Monitoring

Verifikasi:

- Device
- H2SReading
- MQTT validation
- MQTT persistence
- simulated provenance
- latest reading
- reading API
- hubungan Device → H2SReading

Pastikan tidak ada klaim bahwa physical sensor sudah production-ready jika belum ada calibration/provisioning/idempotency/source timestamp.

B. Layer 2 — Data & Exposure Management

Verifikasi:

- Worker
- ExposureProfile
- one-to-one relation
- CRUD API
- validation
- Worker tetap domain entity, bukan auth model

C. Layer 3 — Smart ARKL

Verifikasi runtime aktual.

Expected current engineering version:
calculation_version = 2.0.0-MVP

Audit apakah runtime benar-benar melakukan:

C_mg/m3 = ppm × 1.40

tavg = Dt × 365

I = (C × R × tE × fE × Dt) / (Wb × tavg)

RQ = I / configured reference value

Kemudian:
RQ → interpretation

Pastikan:

- realtime memakai latest reading deterministik
- historical memakai mean concentration periode
- realtime menyimpan reading
- historical reading = NULL
- calculation_version tersimpan
- v1.1 historical compatibility tetap ada
- exposure_concentration legacy tidak dipakai sebagai primary runtime v2

CATATAN:
Jangan menyatakan formula ini "scientifically final" hanya karena test lolos.
Bedakan:

- engineering correctness
- scientific methodology verification

D. Layer 4 — Alert & Risk Management

Audit bahwa Layer 4 hanya mengonsumsi:

- environmental status
- ARKLResult.interpretation

dan tidak menghitung ulang:

- Intake
- RQ
- reference value
- ARKL interpretation

Verifikasi:

- environmental normalization
- decision matrix
- NONE/LOW/MEDIUM/HIGH/CRITICAL
- risk status
- recommendation code
- deduplication
- escalation
- OPEN → ACKNOWLEDGED → RESOLVED
- historical ARKL ditolak untuk realtime alert
- E2E ARKL → Alert

Status yang diharapkan jika regression benar:
DONE — CORE LOGIC LOCKED

"Locked" berarti business rules stabil, bukan berarti module tidak boleh disentuh lagi.

Future auth/actor audit masih boleh masuk tanpa mengubah decision rules.

E. Layer 5 — Research & Reporting

Verifikasi endpoint aktual:

GET /api/v1/research/h2s-summary/
GET /api/v1/research/h2s-trends/
GET /api/v1/research/arkl-results/
GET /api/v1/research/risk-distribution/
GET /api/v1/research/exposure-summary/
GET /api/v1/research/alert-summary/
GET /api/v1/research/export/arkl.csv

Verifikasi:

- H2S summary
- raw/hour/day trend
- source_simulated tri-state
- ARKL reporting version-aware
- default ARKL research version menggunakan runtime version aktif
- v1.1 dan v2 tidak tercampur diam-diam
- risk distribution
- exposure summary
- alert summary
- ARKL CSV export
- export tidak menghitung ulang ARKL

Jika semua benar, Layer 5:
DONE — ENGINEERING

==================================================
LANGKAH 3 — TEST & QUALITY GATE
================================

Aktifkan environment project yang benar.

Jalankan:

pytest -v

Catat exact result.

Baseline terakhir yang diketahui sebelum audit ini:
206 passed

Tetapi JANGAN menganggap baseline itu benar.
Gunakan hasil command Anda sendiri sebagai source of truth.

Lalu jalankan:

ruff check .
ruff format --check .
python manage.py check
python manage.py spectacular --file schema.yml
pip-audit

Jika salah satu command tidak tersedia atau gagal karena environment/tooling:

- jangan klaim PASS
- tulis exact reason
- jangan install dependency baru kecuali memang sudah ada di requirements dan environment hanya belum sync

Periksa juga:

- schema.yml berisi seluruh Research endpoints terbaru
- tidak ada URL yang defined tetapi tidak registered
- tidak ada test collection conflict
- tidak ada pending migration

Boleh jalankan:

python manage.py makemigrations --check --dry-run

untuk memastikan tidak ada migration yang tertinggal.

==================================================
LANGKAH 4 — AUDIT KEAMANAN ENGINEERING
=======================================

Verifikasi tanpa mengubah arsitektur:

- authentication/authorization saat ini sudah atau belum
- endpoint mutating masih public atau tidak
- Worker ownership sudah atau belum
- lifecycle actor audit sudah atau belum
- .env tidak bocor
- core observability tetap aktif
- Request ID
- request/error logging
- performance monitoring
- security audit
- redaction
- rotating logs

Jika auth belum ada, catat sebagai gap utama dan kandidat Layer 6.

==================================================
LANGKAH 5 — TENTUKAN STATUS SISTEM
===================================

Berikan verdict dengan format:

ENGINEERING VERDICT:

- PASS
  atau
- PASS WITH KNOWN GAPS
  atau
- FAIL

Kemudian jelaskan singkat:

1. apa yang sudah benar
2. apa yang belum
3. apa yang menjadi blocker
4. apakah aman lanjut ke Layer 6

Jangan menyebut "production ready" hanya karena pytest hijau.

==================================================
LANGKAH 6 — UPDATE PROJECT_STATUS.md
=====================================

Setelah audit selesai, UPDATE file berikut:

D:\Kuliah\joki\dosen\buk reni\projek\Backend\catatan\PROJECT_STATUS.md

PENTING:

- edit hanya bagian yang memang stale/tidak sesuai
- jangan tulis ulang seluruh dokumen kalau tidak perlu
- pertahankan struktur yang sudah bagus
- hapus duplicate heading/duplicate code fence jika ada
- gunakan fakta hasil audit aktual
- tulis exact test counts hasil terbaru
- jangan mempertahankan angka lama jika sudah berubah

Status layer yang harus ditentukan berdasarkan audit, bukan asumsi.

Expected jika semua sesuai current implementation:

Layer 1:
DONE

Layer 2:
DONE

Layer 3:
DONE — ENGINEERING / SCIENTIFIC REVIEW PENDING

Layer 4:
DONE — CORE LOGIC LOCKED

Layer 5:
DONE — ENGINEERING

Layer 6:
NEXT / NOT STARTED

Update bagian minimal:

- Current Overall Status
- Current Development Position
- Layer 5 status jika stale
- REST API Inventory
- Missing REST Capabilities
- Current Test Status
- Backlog
- Recommended Next Tasks
- Folder Status
- Handoff Summary

Jika hasil audit menemukan fakta berbeda, gunakan fakta aktual.

==================================================
SCIENTIFIC GUARDRAIL
====================

Jangan mengubah atau menyatakan final secara ilmiah:

- tavg
- reference value/RfC
- unit compatibility
- ppm → mg/m3 source

jika repository tidak memiliki keputusan ilmiah final yang terdokumentasi.

Gunakan wording:

"engineering implemented/tested; scientific reference/unit verification pending"

jika itu masih kondisi aktual.

RQ adalah risk characterization, bukan diagnosis penyakit.

Jangan menulis:

- "pemulung terkena ISPA"
- "probability ISPA"
- "diagnosis ISPA"

Gunakan:

- "pajanan di atas nilai rujukan"
- "perlu pengendalian pajanan"
- "risk characterization"

==================================================
OUTPUT AKHIR
============

Setelah selesai tampilkan:

1. AUDIT RESULT
2. exact commands yang dijalankan
3. exact test/quality results
4. layer status table
5. bugs/gaps found
6. files changed
7. confirmation bahwa PROJECT_STATUS.md sudah diperbarui
8. recommended next milestone

Jangan mengklaim file sudah diubah sebelum Anda benar-benar mengubah:

D:\Kuliah\joki\dosen\buk reni\projek\Backend\catatan\PROJECT_STATUS.md

Jika seluruh Layer 1–5 valid dan quality gate acceptable, rekomendasi milestone berikutnya:

Layer 6 — Authentication & Authorization

dengan:

- Django built-in User
- roles: ADMIN, OPERATOR, RESEARCHER, WORKER
- optional User ↔ Worker relation
- endpoint permissions
- object ownership
- alert lifecycle actor audit

Worker tetap domain entity dan tidak boleh diubah menjadi auth model.
