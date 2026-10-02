
# 1. Executive Summary

Backend Django ini memantau H₂S dari IoT/MQTT, menyimpan telemetri, mengelola profil pajanan pekerja/pemulung, menghitung hasil ARKL, membuat alert deterministik, dan menyiapkan API riset.

Kondisinya: Layer 1–4 cukup terstruktur, terutama Alert Engine. Research baru sebagian diimplementasikan dan belum diekspos dari root URL. Tidak ada perubahan kode atau database yang saya lakukan.

# 2. Actual Architecture

```text
IoT / Wokwi
  ↓ MQTT subscriber command
devices.services.mqtt_ingestion
  ↓
Device + H2SReading (SQLite)
  ↓
Worker + ExposureProfile
  ↓ POST ARKL endpoint
ARKLResult
  ↓ POST Alert evaluate endpoint
Alert + recommendation codes
  ↓
Research services (H2S summary/trends only)
  ↓
React/frontend API consumer
```

Tidak ada otomasi langsung `MQTT → ARKL → Alert`; frontend atau caller harus memanggil endpoint ARKL lalu endpoint evaluasi alert.

# 3. Application / Module Map

| App          | Tanggung jawab aktual                                               | Model / API                                      | Dependensi                        |
| ------------ | ------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------- |
| `config`   | Settings, URL root, logging, MQTT config                            | `/api/schema/`, `/api/docs/`                 | Semua app                         |
| `core`     | Request ID, request/performance/security logging, redaction utility | Middleware                                       | Django request lifecycle          |
| `devices`  | Device, ingestion MQTT, pembacaan H₂S read-only                    | `Device`, `H2SReading`; devices/readings API | Dipakai ARKL, alerts, research    |
| `exposure` | Subjek pajanan dan parameter pajanan                                | `Worker`, `ExposureProfile`; CRUD terbatas   | Dipakai ARKL, alerts              |
| `arkl`     | Kalkulasi realtime/historis dan snapshot hasil                      | `ARKLResult`; calculate/list/detail API        | devices + exposure                |
| `alerts`   | Matrix alert, rekomendasi, dedupe, lifecycle                        | `Alert`; list/evaluate/acknowledge/resolve     | devices + exposure + ARKL         |
| `research` | H₂S summary/trends dan filter read-only                            | Tidak ada model; view/service tersedia           | devices; belum terhubung URL root |

# 4. End-to-End Data Flow

1. `run_mqtt` subscribe ke satu topik MQTT yang dikonfigurasi.
2. Payload JSON divalidasi: `device_id`, `ppm`, `adc`, `filtered_adc`, `level`, `status`, `uptime_ms`, `simulated`.
3. Device dibuat otomatis bila belum ada; satu `H2SReading` disimpan per pesan valid.
4. Operator/client membuat `Worker` dan satu `ExposureProfile`.
5. Client memanggil ARKL realtime untuk latest reading suatu device, atau historical untuk rata-rata pembacaan pada periode.
6. ARKL menyimpan immutable-like snapshot pada `ARKLResult`.
7. Client mengirim `arkl_result_id` ke `POST /api/v1/alerts/evaluate/`.
8. Alert Engine membaca reading dan hasil ARKL, lalu menyimpan alert jika keputusan bukan `NONE` dan bukan duplikat/penurunan severity.
9. Research service dapat membaca H2SReading untuk statistik/tren, tetapi endpoint-nya belum aktif di URL root.

# 5. Database Model Relationship

```text
Device 1 ───< H2SReading
Worker 1 ─── 1 ExposureProfile
Worker 1 ───< ARKLResult >── 0..1 H2SReading
Worker 1 ───< Alert >──────── 1 Device
                         └──── 1 H2SReading
                         └──── 1 ARKLResult
```

Foreign key utama menggunakan `PROTECT`, sehingga data historis ARKL/alert tidak dapat terhapus secara tidak sengaja. `ExposureProfile` menggunakan `CASCADE` dari Worker.

# 6. Smart ARKL Audit

**Formula aktual repository (`1.1.0-MVP`):**

```text
C_mg/m³ = ppm × 1.40

EC = C_mg/m³ × (exposure_time / 24) × (exposure_frequency / 365)

RQ = EC / RfC
```

`RfC = 0.002 mg/m³` adalah konstanta saat ini. Interpretasi: `RQ <= 1` = `WITHIN_REFERENCE_LEVEL`; `RQ > 1` = `ABOVE_REFERENCE_LEVEL`.

**Input yang benar-benar dipakai:**

- `ppm`
- `exposure_time`
- `exposure_frequency`
- RfC
- faktor konversi ppm→mg/m³

**Disimpan sebagai snapshot, tetapi tidak dipakai formula RQ v1.1:**

- `body_weight`
- `exposure_duration`
- `inhalation_rate`
- `averaging_time` = `NULL`
- `intake` = `NULL`

**Output:** konsentrasi ppm, konsentrasi mg/m³, exposure concentration, RQ, interpretasi, versi kalkulasi, provenance simulated, serta metadata realtime/historical.

**Perbedaan dengan formula yang sedang dipertimbangkan:**

```text
I = (C × R × fE × Dt) / (Wb × tavg)
RQ = I / RfC
```

Formula tersebut belum menjadi pipeline produksi. Fungsi legacy `calculate_intake()` masih ada dan diuji, tetapi tidak dipanggil oleh `calculator.py`.

**NEEDS SCIENTIFIC DECISION:** memilih formula intake di atas berarti mengganti kontrak ARKL saat ini, unit RfC yang dibandingkan, makna RQ, serta hasil historis. Nilai `tavg` tidak boleh diasumsikan.

**File terdampak jika formula diganti:**

- `arkl/services/calculator.py`, `intake.py`, `rq.py`, `validation.py`, `constants.py`
- `arkl/models.py`, serializer, migration baru
- seluruh test ARKL yang memverifikasi formula/API
- regression test alerts dan kontrak frontend/research
- dokumentasi kalkulasi

# 7. Alert Engine Audit

- Environmental status dinormalisasi secara case-insensitive ke `NORMAL`, `CAUTION`, `WARNING`, `DANGER`, atau `CRITICAL`.
- Matrix menggabungkan environmental severity dan interpretasi RQ, lalu menghasilkan `NONE` hingga `CRITICAL`.
- Risk status: `NONE → NO_ACTION_REQUIRED`; LOW/MEDIUM → monitoring; HIGH → risk management; CRITICAL → immediate action.
- Recommendation code deterministik berdasarkan alert level.
- Alert menyimpan snapshot reading, RQ, interpretasi, calculation version, rule version, dan simulated provenance.
- Deduplikasi memperlakukan `OPEN` dan `ACKNOWLEDGED` sebagai aktif. Alert dengan level sama tidak dibuat ulang.
- Escalation terjadi bila level baru lebih tinggi; alert baru dibuat. Alert lama tidak otomatis di-resolve.
- Level yang lebih rendah dari active alert tidak membuat alert baru.
- `RESOLVED` memungkinkan alert baru.
- Lifecycle: `OPEN → ACKNOWLEDGED → RESOLVED`; acknowledge/resolve bersifat idempotent.
- Hanya `ARKLResult` realtime yang memiliki reading terkait yang boleh menghasilkan alert.
- Rule version aktual: `1.0.0-MVP`.

Alert Engine tidak menghitung ulang RQ, ARKL, atau RfC; ini sesuai batas layer yang diinginkan.

# 8. Research Layer Audit

**Implemented**

- H₂S summary: count, min/max/average ppm, periode, physical-vs-simulated count, device count.
- H₂S trends: raw, per jam, atau per hari.
- Filter: waktu, device code, provenance simulated.
- Unit dan API tests tersedia untuk summary dan trends.

**Partial**

- View dan URL lokal tersedia untuk `/research/h2s-summary/` dan `/research/h2s-trends/`.
- Namun `config/urls.py` tidak meng-include `research.urls`; URL tersebut saat ini menghasilkan 404.
- `statistics.py` dan `reporting.py` masih kosong.
- Tidak ada pagination/batas dataset untuk trend raw.

**Missing**

- ARKL recap.
- Risk/RQ distribution.
- Exposure summary.
- Alert summary.
- Export/reporting.
- Akses Research terhadap `ExposureProfile`, `ARKLResult`, dan `Alert`.

# 9. REST API Map

**Devices**

- `GET /api/v1/devices/`
- `GET /api/v1/devices/{id}/`
- `GET /api/v1/readings/` — filter `device_code`, `status`
- `GET /api/v1/readings/{id}/`
- `GET /api/v1/readings/latest/`

**Exposure**

- `GET, POST /api/v1/workers/`
- `GET /api/v1/workers/{id}/`
- `GET, POST /api/v1/exposure-profiles/`
- `GET, PATCH /api/v1/exposure-profiles/{id}/`

**ARKL**

- `POST /api/v1/arkl/realtime/`
- `POST /api/v1/arkl/historical/`
- `GET /api/v1/arkl/results/`
- `GET /api/v1/arkl/results/{id}/`

**Alerts**

- `GET /api/v1/alerts/`
- `POST /api/v1/alerts/evaluate/`
- `GET /api/v1/alerts/{id}/`
- `PATCH /api/v1/alerts/{id}/acknowledge/`
- `PATCH /api/v1/alerts/{id}/resolve/`

**Research — source exists but not published**

- `GET /api/v1/research/h2s-summary/`
- `GET /api/v1/research/h2s-trends/`

**Documentation**

- `GET /api/schema/`
- `GET /api/docs/`

`schema.yml` juga belum memuat research endpoints, konsisten dengan URL root yang belum meng-include Research.

# 10. Testing & Quality Status

**Verified by source inspection**

- 164 test functions teridentifikasi:
  - devices: 15
  - exposure: 13
  - ARKL: 50
  - alerts: 50
  - research: 23
  - core: 13
- Ruff dikonfigurasi dengan `E, F, I, B, RUF`.
- OpenAPI menggunakan drf-spectacular.
- Test mencakup ingestion, validasi, ARKL, alert matrix/lifecycle/dedupe, observability, summary, dan trend.

**Not checked / tidak dapat dijalankan**

- `pytest`, Django check, migration check, Ruff, dan pip-audit tidak dapat dieksekusi: environment shell Linux tidak memiliki Python package runtime yang sesuai; `.venv` yang tersedia adalah virtualenv Windows (`Scripts/*.exe`), tidak executable dari environment ini.
- Karena itu tidak ada klaim test PASS.
- Test research API kemungkinan gagal sampai `research.urls` di-include di `config/urls.py`.

# 11. Locked / Stable Components

Jangan diubah tanpa kebutuhan domain/scientific yang tervalidasi:

- MQTT payload contract dan validasi telemetry.
- `simulated` provenance dari H2SReading hingga ARKLResult dan Alert.
- Struktur snapshot ARKLResult dan Alert.
- Alert matrix, lifecycle state, dedupe/escalation behavior.
- Larangan Alert Engine menghitung ulang RQ/RfC.
- Foreign key `PROTECT` pada data historis.
- Request ID dan middleware observability existing.
- API version prefix `/api/v1/`.

# 12. In-Progress Components

- Research Phase: baru H₂S summary/trends, belum dipublikasikan.
- `research/services/statistics.py` dan `reporting.py` kosong.
- Formula ARKL intake masih legacy/tersisa, bukan active path.
- Authentication/authorization belum ada.
- Physical IoT transition belum tampak; default payload berorientasi simulasi/Wokwi.

# 13. Risks & Technical Debt

**Critical**

- Tidak ada authentication/authorization; endpoint mutasi Worker, profile, kalkulasi, acknowledge, dan resolve dapat diakses publik bila service dipublikasikan.

**High**

- Research endpoint sudah diuji tetapi belum diregistrasikan pada root URL.
- Formula ARKL yang diajukan user berbeda dengan formula runtime; keputusan ilmiah harus dikunci sebelum perubahan.
- MQTT tidak memiliki message ID/idempotency key maupun sensor timestamp. Pesan ulang akibat reconnect/QoS dapat menciptakan reading duplikat.
- Dedupe alert berbasis query tanpa database unique constraint/locking pada active-alert lookup; concurrent requests berpotensi menciptakan duplicate alert.

**Medium**

- `reading.level` disimpan, namun Alert Engine memutuskan berdasarkan string `status`; relasi numeric level ↔ severity tidak divalidasi.
- Redaction utility ada tetapi tidak dipanggil oleh logging path yang diperiksa.
- Logger MQTT memakai `smart_h2s.mqtt`, sedangkan konfigurasi spesifik hanya mendefinisikan `smart_h2s`, `smart_h2s.security`, dan `smart_h2s.performance`; perlu verifikasi output logging MQTT pada runtime.
- SQLite layak MVP, tetapi tidak cocok untuk ingestion/concurrency produksi yang lebih tinggi.
- Semua trend raw dimaterialisasi ke list tanpa pagination/batas.
- Worktree sudah memiliki banyak perubahan dan file baru sebelum audit; saya tidak mengubahnya.

**Low**

- `H2SReading.ppm` dan parameter profile memakai `FloatField`, sedangkan calculation snapshot memakai `DecimalField`; ada potensi perbedaan presisi.
- Dokumentasi lama `sopv2.md` masih memuat formula v1.0, sementara spesifikasi terbaru dan runtime memakai v1.1.

# 14. ARKL Formula Migration Impact

| Layer        | Dampak                                                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| IoT          | Umumnya tidak berubah bila concentration tetap ppm; unit/metadata perlu dikunci                                              |
| Exposure     | `body_weight`, `inhalation_rate`, `duration`, dan definisi unit harus menjadi wajib secara scientific                  |
| ARKL         | Perubahan utama: intake, tavg, RQ, versioning, persistence, migration, regression fixture                                    |
| Alerts       | Tidak menghitung ulang formula, tetapi interpretasi baru dapat mengubah distribusi RQ/alert; lakukan regression matrix       |
| Research     | Hasil lama dan baru wajib dibedakan dengan`calculation_version`; jangan dicampur dalam agregasi                            |
| Tests        | Rebaseline semua expected value ARKL dan E2E alert                                                                           |
| API/frontend | Field existing dapat dipertahankan, tetapi label/unit/makna RQ dan tampilan historical result perlu version-aware            |
| Database     | Tambah migration bila intake/averaging time menjadi wajib atau butuh source/scientific metadata; jangan overwrite hasil lama |

# 15. Future Role Architecture

```text
Django Auth User
  ↓ optional OneToOne link
Worker
```

- **ADMIN:** kelola user/role, device, worker/profile, konfigurasi operasional, audit.
- **OPERATOR:** lihat telemetry, menjalankan kalkulasi operasional, evaluate/acknowledge/resolve alert; tidak mengubah konstanta ilmiah.
- **RESEARCHER:** read-only pada data de-identified/research API dan export yang diizinkan.
- **WORKER:** akses hanya profile miliknya dan informasi risiko/alert yang relevan; bukan akses data semua worker.

Tambahkan role melalui group/permission Django atau model role yang tipis. Worker tetap domain entity, bukan pengganti auth model. Terapkan ownership filtering, audit actor pada lifecycle Alert, dan migration yang nullable untuk link User–Worker agar data eksisting aman.

# 16. Recommended Development Roadmap

1. Pulihkan environment Linux-compatible dan jalankan full test, Django check, migration check, Ruff, schema validation, dan audit dependency.
2. Perbaiki publication Research URL + schema, lalu pastikan research tests lulus.
3. Lock keputusan scientific ARKL: formula, unit, `tavg`, RfC source, version, dan expected fixtures.
4. Bila disetujui, lakukan migrasi ARKL berversi dan regression seluruh Alert Engine.
5. Lengkapi Research read model: ARKL recap, risk distribution, exposure summary, alert summary.
6. Tambahkan authentication, groups/permissions, ownership Worker, serta actor audit.
7. Perkuat ingestion: idempotency, timestamp source, topic/device validation, MQTT runtime resilience.
8. Siapkan database/operasional produksi sebelum physical IoT skala nyata.

# 17. Files That Would Change

**MODIFY — formula ARKL**

- `arkl/services/{calculator,intake,rq,validation,constants}.py`
- `arkl/models.py`, `serializers.py`, `views.py`
- `arkl/tests/*`
- `alerts/tests/*` untuk regression
- `catatan/ARKL_CALCULATION_SPEC.md`
- schema/OpenAPI setelah endpoint contract berubah

**NEW — formula ARKL**

- Migration baru ARKL, bila field/current nullability/version metadata berubah.
- Fixture scientific versioned bila hasil referensi sudah disetujui.

**MODIFY — roles**

- `config/settings.py`
- app auth/authorization baru atau app domain yang minimal
- exposure model/serializer/view untuk optional User–Worker link
- seluruh view yang membutuhkan permission
- Alert untuk menyimpan actor acknowledge/resolve
- test permission/ownership

**NEW — roles**

- Migration auth/Worker link dan audit actor.
- Permission/group seed atau documented setup.
- Test matrix per role.

**VERIFY**

- Semua migrations existing.
- `config/urls.py`, `schema.yml`, seluruh test ARKL/alerts/research.
- MQTT contract dan physical-vs-simulated provenance.
- Middleware/logging behavior.

**DO NOT TOUCH tanpa approval ilmiah/domain kuat**

- `alerts/services/alert_engine.py`
- `alerts/services/{deduplication,lifecycle,persistence}.py`
- RfC dan conversion factor.
- MQTT required payload fields.
- Hasil historis ARKL/Alert yang sudah tersimpan.

Saya berhenti pada tahap audit dan menunggu approval sebelum perubahan apa pun.
