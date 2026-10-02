# SOP Pengembangan Backend Smart H₂S

> **Tujuan dokumen:** menjadi panduan kerja utama agar pengembangan backend tetap terarah, sederhana, dan tidak melompat-lompat antar-layer.
>
> **Stack awal:** Django + Django REST Framework + SQLite + Paho MQTT + React Frontend
> **Prinsip:** SOLID, KISS, YAGNI
> **Status:** Perencanaan / sebelum coding

---

## 1. Prinsip Kerja Utama

Selama pengembangan backend, gunakan aturan berikut:

1. **Kerjakan satu tahap sampai selesai sebelum masuk tahap berikutnya.**
2. **Jangan membuat fitur yang belum dibutuhkan.** Terapkan YAGNI.
3. **Jangan membuat abstraksi berlebihan.** Terapkan KISS.
4. **Pisahkan tanggung jawab kode.** Terapkan SOLID.
5. **Views harus tipis.**
6. **Serializer menangani validasi input/output API.**
7. **Service menangani business logic dan scientific calculation.**
8. **Model menangani struktur dan persistence data.**
9. **Middleware/observability mengawasi request, error, performance, dan security.**
10. **Rumus Smart ARKL wajib deterministic dan memiliki unit test.**
11. **Wokwi/IoT tidak dikontrol oleh backend. Backend hanya menerima aliran telemetry MQTT.**
12. **Jangan mengubah Layer 1 yang sudah bekerja tanpa kebutuhan teknis yang jelas.**

---

# 2. Alur Pengembangan Utama

```text
BACKEND FOUNDATION
      ↓
Devices + MQTT Ingestion
      ↓
Layer 2 Data Models
      ↓
Layer 2 REST API
      ↓
Layer 3 ARKL Services
      ↓
Layer 3 Tests
      ↓
Layer 4 Alert Engine
      ↓
Layer 5 Reporting
```

**Aturan:** jangan masuk ke tahap berikutnya sebelum acceptance checklist tahap aktif terpenuhi.

---

# 3. Phase 0 — Backend Foundation

## Tujuan

Membangun fondasi Django yang bersih sebelum fitur domain dibuat.

## Pekerjaan

- [ ] Membuat virtual environment Python.
- [ ] Membuat project Django.
- [ ] Mengaktifkan Django REST Framework.
- [ ] Menggunakan SQLite sebagai database awal.
- [ ] Menambahkan CORS untuk React.
- [ ] Menambahkan `.env` dan `.env.example`.
- [ ] Mengatur `.gitignore`.
- [ ] Menambahkan API documentation/OpenAPI.
- [ ] Menambahkan pytest dan pytest-django.
- [ ] Menambahkan Ruff.
- [ ] Menambahkan pip-audit.
- [ ] Menyiapkan logging dasar.
- [ ] Menyiapkan request ID / trace ID.
- [ ] Menyiapkan request logging middleware.
- [ ] Menyiapkan performance middleware.
- [ ] Menyiapkan redaction untuk data sensitif.

## Struktur Minimum

```text
backend/
├── config/
├── core/
│   ├── middleware/
│   └── observability/
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

Phase ini dianggap selesai jika:

- [ ] Django dapat dijalankan tanpa error.
- [ ] Migration awal berhasil.
- [ ] Endpoint health check dapat diakses.
- [ ] React diizinkan mengakses API selama development.
- [ ] Logging request bekerja.
- [ ] Error dapat tercatat.
- [ ] Ruff berjalan tanpa error kritis.
- [ ] pytest dapat dijalankan.
- [ ] `pip-audit` dapat dijalankan.

---

# 4. Phase 1 — Devices + MQTT Ingestion

## Tujuan

Membuat backend mampu **mengikuti arus data dari Wokwi/ESP32** melalui MQTT tanpa mengontrol perangkat.

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
Store Reading
```

## Pekerjaan

- [X] Membuat model `Device`.
- [X] Membuat model `H2SReading`.
- [X] Membuat `mqtt_ingestion.py`.
- [X] Subscribe ke topic telemetry yang digunakan Layer 1.
- [X] Parse payload JSON.
- [X] Validasi field wajib.
- [X] Tolak payload tidak valid.
- [X] Simpan payload valid ke database.
- [X] Catat `received_at`.
- [X] Catat apakah data `simulated=true/false`.
- [X] Tambahkan MQTT event logging.
- [X] Tangani reconnect MQTT.
- [X] Pastikan error MQTT tidak mematikan Django/API.

## Payload Minimum

```json
{
  "device_id": "H2S-TPA-001",
  "ppm": 12.45,
  "adc": 850,
  "filtered_adc": 848.3,
  "level": 3,
  "status": "WARNING",
  "uptime_ms": 120000,
  "simulated": true
}
```

## Yang Tidak Boleh Dilakukan

- Backend tidak mengontrol Wokwi.
- Backend tidak mengubah pembacaan ADC.
- Backend tidak mengubah firmware Layer 1.
- Backend tidak menghitung ARKL pada tahap ini.
- Backend tidak menyimpan data pribadi pemulung melalui public MQTT.

## Definition of Done

- [X] Wokwi publish telemetry.
- [X] React tetap menerima telemetry seperti sebelumnya.
- [X] Backend menerima telemetry yang sama.
- [X] Reading valid masuk SQLite.
- [X] Payload invalid ditolak dengan aman.
- [X] Disconnect/reconnect broker dapat ditangani.
- [X] Event MQTT tercatat di log.
- [X] Tidak ada dependency Layer 3 pada modul MQTT.

---

# 5. Phase 2 — Layer 2 Data Models

## Tujuan

Membangun struktur data untuk telemetry dan profil pajanan pemulung.

## Model Minimum

### Device

```text
Device
├── id
├── device_code
├── name
├── location
├── active
└── created_at
```

### H2SReading

```text
H2SReading
├── id
├── device
├── ppm
├── adc
├── filtered_adc
├── level
├── status
├── simulated
├── sensor_timestamp
└── received_at
```

### Worker / Respondent

```text
Worker
├── id
├── code
└── metadata penelitian yang diperlukan
```

### ExposureProfile

```text
ExposureProfile
├── worker
├── body_weight
├── exposure_time
├── exposure_frequency
├── exposure_duration
├── inhalation_rate
└── updated_at
```

## Catatan

Nama field dan parameter ARKL final **belum boleh dianggap final** sebelum rumus, satuan, dan sumber ilmiahnya dikunci.

## Pekerjaan

- [X] Definisikan model.
- [X] Definisikan relasi antar-model.
- [X] Tambahkan constraint sederhana.
- [X] Buat migrations.
- [X] Jalankan migration.
- [X] Daftarkan model penting di Django Admin.
- [X] Buat validasi domain dasar.
- [X] Jangan masukkan business logic berat ke `models.py`.

## Definition of Done

- [X] Semua model dapat dimigrasikan.
- [X] Relasi data jelas.
- [X] Data telemetry dapat dikaitkan dengan device.
- [X] Exposure profile dapat dikaitkan dengan worker.
- [X] Data dummy dapat dibuat dan dibaca ulang.
- [X] Tidak ada rumus ARKL di model.

---

# 6. Phase 3 — Layer 2 REST API

## Tujuan

Menyediakan API bersih untuk React dan kebutuhan internal penelitian.

## Endpoint Awal

```text
GET    /api/v1/devices/
GET    /api/v1/devices/{id}/
GET    /api/v1/readings/
GET    /api/v1/readings/latest/
POST   /api/v1/workers/
GET    /api/v1/workers/
GET    /api/v1/workers/{id}/
POST   /api/v1/exposure-profiles/
PATCH  /api/v1/exposure-profiles/{id}/
```

## Prinsip

```text
React
  ↓
View
  ↓
Serializer
  ↓
Service bila diperlukan
  ↓
Model / ORM
```

## Pekerjaan

- [X] Membuat serializer.
- [X] Membuat API views/viewsets.
- [X] Membuat URL versioning `/api/v1/`.
- [X] Validasi request.
- [X] Pagination untuk daftar reading.
- [X] Filtering dasar jika dibutuhkan.
- [X] Dokumentasikan endpoint melalui OpenAPI.
- [X] Pastikan response konsisten.

## Definition of Done

- [X] React dapat mengambil latest H₂S reading melalui REST API.
- [X] Worker dapat dibuat.
- [X] Exposure profile dapat dibuat dan diperbarui.
- [X] Invalid input menghasilkan response 4xx yang jelas.
- [X] API docs dapat dibuka.
- [X] Views tidak berisi rumus ARKL.

---

# 7. Phase 4 — Layer 3 Smart ARKL Services

## Tujuan

Membangun mesin perhitungan Smart ARKL yang **deterministic, terisolasi, dan dapat diuji ulang**.

## Alur

```text
H₂S Data
   +
Exposure Profile
   ↓
Input Validation
   ↓
Intake Calculation
   ↓
RfC
   ↓
RQ Calculation
   ↓
Risk Interpretation
```

## Struktur

```text
arkl/
├── models.py
├── serializers.py
├── views.py
└── services/
    ├── intake.py
    ├── rq.py
    ├── validation.py
    └── interpretation.py
```

## Aturan Keras

- Rumus ARKL tidak boleh berada di React.
- Rumus ARKL tidak boleh berada di `views.py`.
- Rumus ARKL tidak boleh dihitung oleh AI/LLM.
- Semua konstanta harus memiliki sumber.
- Semua satuan harus eksplisit.
- Input yang sama harus menghasilkan output yang sama.
- Nilai RfC final harus dikunci berdasarkan referensi yang disetujui.
- Jangan menebak parameter yang belum ditentukan.

## Sebelum Coding Rumus

Harus dikunci terlebih dahulu:

- [ ] Rumus Intake realtime.
- [ ] Rumus Intake lifetime.
- [ ] Nilai RfC.
- [ ] Unit konsentrasi.
- [ ] Unit inhalation rate.
- [ ] Exposure time.
- [ ] Exposure frequency.
- [ ] Exposure duration.
- [ ] Body weight.
- [ ] Averaging time.
- [ ] Aturan interpretasi RQ.
- [ ] Referensi ilmiah tiap konstanta.

## Definition of Done

- [ ] `calculate_intake()` tersedia.
- [ ] `calculate_rq()` tersedia.
- [ ] `interpret_rq()` tersedia.
- [ ] Hasil dapat disimpan ke `ARKLResult`.
- [ ] Tidak ada formula tersembunyi di view/model.
- [ ] Semua parameter memiliki satuan yang jelas.

---

# 8. Phase 5 — Layer 3 Tests

## Tujuan

Membuktikan bahwa perhitungan Smart ARKL konsisten dan aman terhadap input salah.

## Prioritas Test

### Wajib

- [ ] Intake menghasilkan nilai yang benar untuk fixture yang tervalidasi.
- [ ] RQ menghasilkan nilai yang benar.
- [ ] Input sama menghasilkan hasil sama.
- [ ] RfC nol ditolak.
- [ ] Berat badan tidak valid ditolak.
- [ ] Exposure time tidak valid ditolak.
- [ ] Missing parameter ditolak.
- [ ] Unit yang tidak sesuai ditolak.
- [ ] Boundary `RQ = 1` diuji.

### Integrasi

- [ ] Reading + ExposureProfile dapat menghasilkan ARKLResult.
- [ ] Result tersimpan ke database.
- [ ] API dapat mengembalikan hasil ARKL.

## Fokus Coverage

Prioritaskan coverage pada:

```text
arkl/services/
devices/services/mqtt_ingestion.py
exposure/services/
alerts/services/
```

Jangan mengejar 100% coverage seluruh framework.

## Definition of Done

- [ ] Semua test kritis lulus.
- [ ] Tidak ada perbedaan hasil antar-run.
- [ ] Formula memiliki test fixture terdokumentasi.
- [ ] Regression test tersedia untuk rumus penting.

---

# 9. Phase 6 — Layer 4 Alert Engine

## Tujuan

Mengubah kondisi lingkungan dan hasil ARKL menjadi status peringatan dan rekomendasi yang terstruktur.

## Input

```text
Environmental Status
      +
ARKL Result / RQ
      ↓
Alert Engine
```

## Output

Contoh:

```json
{
  "environment_status": "WARNING",
  "rq": 1.42,
  "risk_status": "RISK_MANAGEMENT_REQUIRED",
  "alert_level": "HIGH"
}
```

## Struktur

```text
alerts/
├── models.py
├── serializers.py
├── views.py
└── services/
    └── alert_engine.py
```

## Aturan

- Threshold H₂S harus berasal dari referensi yang dikunci.
- RQ tidak boleh dihitung ulang di Alert Engine.
- Alert Engine hanya menggunakan hasil Layer 1 dan Layer 3.
- Rekomendasi final harus berdasarkan pedoman/SOP yang disetujui.
- Jangan menghasilkan diagnosis penyakit.

## Definition of Done

- [ ] Alert muncul berdasarkan aturan yang terdokumentasi.
- [ ] Environmental alert dan ARKL risk dapat dibedakan.
- [ ] Semua aturan penting memiliki test.
- [ ] Output alert dapat dikonsumsi React.

---

# 10. Phase 7 — Layer 5 Reporting

## Tujuan

Menyediakan data penelitian untuk grafik, tabel, laporan, dan publikasi.

## Backend Bertanggung Jawab Atas

- Query data.
- Aggregation.
- Statistik.
- Summary.
- Export data.
- API untuk dashboard penelitian.

## React Bertanggung Jawab Atas

- Grafik.
- Tabel.
- Dashboard.
- Visualisasi.
- Preview laporan.

## Endpoint Kandidat

```text
GET /api/v1/research/h2s-summary/
GET /api/v1/research/h2s-trends/
GET /api/v1/research/risk-distribution/
GET /api/v1/research/arkl-results/
GET /api/v1/research/exposure-summary/
```

## Definition of Done

- [ ] Historical H₂S dapat ditampilkan.
- [ ] Statistik dasar tersedia.
- [ ] Hasil ARKL dapat direkap.
- [ ] Data dapat diekspor bila diperlukan.
- [ ] React dapat membuat grafik berdasarkan API backend.

---

# 11. Observability / "CCTV Backend"

Observability berjalan **di seluruh phase**, bukan dikerjakan sebagai Layer 6.

```text
                    BACKEND
                       │
     ┌─────────────────┼─────────────────┐
     │                 │                 │
Request/API         Services          MQTT
     │                 │                 │
     └─────────────────┼─────────────────┘
                       ↓
                OBSERVABILITY
```

## Yang Dicatat

- Request ID / Trace ID.
- HTTP method.
- Endpoint.
- Response status.
- Request duration.
- Exception.
- MQTT connect/disconnect.
- MQTT message accepted/rejected.
- Processing duration.
- Slow operation.
- Security-related events.

## Jangan Dicatat

- Password.
- Token.
- Authorization header.
- Cookie sensitif.
- Full request body berisi data pribadi.
- Data kesehatan mentah yang tidak diperlukan di log.

## Log Contoh

```text
INFO
request_id=12ab
method=GET
path=/api/v1/readings/latest/
status=200
duration_ms=31
```

```text
INFO
event=mqtt_received
device=H2S-TPA-001
valid=true
stored=true
duration_ms=6
```

---

# 12. Aturan Arsitektur Backend

Gunakan pembagian sederhana:

```text
Presentation / API
views.py + serializers.py
        ↓
Business / Service
services/
        ↓
Data / Persistence
models.py + Django ORM
        ↓
SQLite
```

## Model

**Tugas:** menyimpan data dan mendefinisikan relasi.

## Serializer

**Tugas:** validasi input/output API dan konversi Django object ↔ JSON.

## View

**Tugas:** menerima request, memanggil service, mengembalikan response.

## Service

**Tugas:** business logic, MQTT processing, perhitungan ARKL, alert rules, statistik.

---

# 13. Checklist Sebelum Commit

Sebelum commit:

```bash
ruff check .
ruff format --check .
pytest
python manage.py check
pip-audit
```

Checklist:

- [ ] Tidak ada secret di source code.
- [ ] `.env` tidak di-commit.
- [ ] Migration ikut di-commit jika model berubah.
- [ ] Test terkait perubahan sudah dibuat/diperbarui.
- [ ] Tidak ada `print()` debugging tertinggal.
- [ ] Tidak ada log data sensitif.
- [ ] Views tetap tipis.
- [ ] Business logic tetap di service.
- [ ] Dokumentasi diperbarui bila kontrak API berubah.

---

# 14. Git Workflow Solo Developer

Gunakan workflow sederhana.

```text
main
  ↑
feature/*
fix/*
refactor/*
```

Contoh branch:

```text
feature/mqtt-ingestion
feature/exposure-profile
feature/arkl-engine
feature/alert-engine
fix/mqtt-reconnect
refactor/arkl-validation
```

Urutan:

```text
buat branch
    ↓
implementasi kecil
    ↓
test
    ↓
lint
    ↓
commit
    ↓
merge ke main setelah stabil
```

Hindari branch architecture yang terlalu kompleks karena proyek dikerjakan solo.

---

# 15. Definition of Done Keseluruhan Backend

Backend prototype dianggap mencapai baseline lengkap jika:

- [ ] MQTT telemetry dari Wokwi masuk otomatis.
- [ ] Data H₂S tersimpan di database.
- [ ] Exposure profile dapat dikelola.
- [ ] REST API tersedia.
- [ ] Smart ARKL berjalan deterministic.
- [ ] Rumus ARKL memiliki unit test.
- [ ] Alert Engine bekerja.
- [ ] Research API tersedia.
- [ ] React dapat mengonsumsi seluruh API.
- [ ] Observability bekerja.
- [ ] Security baseline diterapkan.
- [ ] API terdokumentasi.
- [ ] Tidak ada data sensitif di log.
- [ ] Tidak ada dependency yang tidak diperlukan.

---

# 16. Urutan Kerja Harian

Jika bingung harus mengerjakan apa, gunakan aturan ini:

```text
1. Baca phase aktif.
2. Pilih hanya SATU acceptance item.
3. Implementasikan perubahan terkecil.
4. Jalankan test.
5. Jalankan lint.
6. Cek log/error.
7. Commit.
8. Update checklist.
9. Baru lanjut item berikutnya.
```

Jangan:

```text
MQTT belum selesai
↓
langsung membuat ARKL
↓
lalu membuat reporting
↓
lalu kembali memperbaiki database
```

Yang benar:

```text
MQTT selesai
↓
Data selesai
↓
API selesai
↓
ARKL selesai
↓
Test selesai
↓
Alert selesai
↓
Reporting selesai
```

---

# 17. Roadmap Ringkas

| Urutan | Phase              | Hasil Utama                |
| ------ | ------------------ | -------------------------- |
| 0      | Backend Foundation | Django siap dikembangkan   |
| 1      | Devices + MQTT     | Telemetry masuk backend    |
| 2      | Layer 2 Models     | Database domain tersedia   |
| 3      | Layer 2 REST API   | React dapat mengakses data |
| 4      | Layer 3 ARKL       | Mesin perhitungan ARKL     |
| 5      | Layer 3 Tests      | Perhitungan tervalidasi    |
| 6      | Layer 4 Alert      | Early warning engine       |
| 7      | Layer 5 Reporting  | Data penelitian & laporan  |

---

# 18. Prinsip Terakhir

> **Jangan mengejar banyak fitur. Kejar alur data yang benar, formula yang dapat dipertanggungjawabkan, kode yang mudah diuji, dan sistem yang mudah dirawat.**

Alur utama yang harus selalu dipertahankan:

```text
Wokwi / Sensor
      ↓
MQTT
      ↓
Django Ingestion
      ↓
Layer 2 — Data
      ↓
Layer 3 — Smart ARKL
      ↓
Layer 4 — Alert
      ↓
Layer 5 — Research Output
      ↓
React
```

**Ukur → Terima → Validasi → Simpan → Hitung → Uji → Peringatkan → Laporkan.**
