# ARKL IoT dan pengukuran sensor referensi

Implemented: 2026-10-02. Kode produksi dan tes menjadi sumber kebenaran.

## Sumber dan riwayat

- `REALTIME` tetap dari pembacaan IoT pada perangkat yang ditetapkan. MQTT/backend
  tetap pemicu otomatis; frontend hanya membaca hasil, bukan menghitung rumus.
- `REFERENCE` memakai `ReferenceMeasurement`: ppm, waktu pengukuran, lokasi,
  alat/sumber, catatan, pencatat (jika diketahui), dan cakupan pekerja eksplisit.
  Ini bukan `RfC`, bukan record MQTT, dan bukan hasil `HISTORICAL`.
- `HISTORICAL` tetap rata-rata reading IoT pada periode yang dipilih.
- Perhitungan referensi menggunakan pipeline nilai ARKL yang sama tanpa perubahan
  rumus/konstanta. Kolom legacy `exposure_concentration_mg_m3` tetap null;
  pengamatan implementasi ini memerlukan tinjauan ilmiah sebelum diubah.
- Hasil menyimpan snapshot profil/ACC saat dihitung. PENDING menghasilkan hasil
  sementara; REJECTED tidak menghasilkan kalkulasi baru. Pengukuran yang sudah
  digunakan tidak dapat diedit lewat API, admin, atau model save biasa. Tambahkan
  pengukuran baru untuk koreksi/pembaruan; jangan menimpa riwayat.
- Scope pekerja tidak ditebak berdasarkan perangkat. Satu pengukuran dapat dipakai
  beberapa pekerja hanya jika cakupannya ditetapkan eksplisit. Worker melihat
  hasil miliknya; serializer snapshot tidak mengekspos daftar pekerja lain.
- Hasil referensi tidak memicu/menutup alert realtime. Tidak adanya alert bukan
  bukti aman. Nilai yang mendekati sensor IoT bukan bukti kalibrasi.

## Pemicu dan tampilan

- Admin/operator menambahkan pengukuran di `/app/arkl` atau detail pekerja
  `/app/workers/:id`. Default cakupan: hanya pekerja yang dipilih. Checkbox
  menyalin cakupan pengukuran sebelumnya hanya atas pilihan eksplisit petugas.
- Penyimpanan pengukuran baru menghitung semua profil siap dalam cakupan. Cakupan
  tanpa profil tetap tersimpan; pengisian/perubahan profil dan ACC kemudian
  menghitung ulang referensi terakhir yang ditetapkan, termasuk ketika IoT mati.
- Permintaan ulang dengan pengukuran dan profil/ACC identik memakai hasil yang
  sama. Profil/ACC berubah menghasilkan snapshot baru, tidak mengubah hasil lama.
- UI admin dan worker memisahkan kartu REALTIME dan REFERENCE. Riwayat tetap
  memuat semua tipe dengan label. Referensi terbaru dipilih dari waktu pengukuran,
  bukan waktu kalkulasi ulang pengukuran lama.
- Waktu IoT adalah `reading.received_at`; >2 menit tanpa data diberi penjelasan
  belum diperbarui. Ini batas UI operasional, bukan ambang kesehatan. Lokasi dan
  waktu pengukuran harus diperiksa sebelum membandingkan nilai; penugasan perangkat
  saja tidak membuktikan lokasi fisik perangkat saat mengambil data.
- Polling hasil referensi operator 15 detik; hasil worker memakai polling ARKL
  15 detik yang sudah ada. Daftar pengukuran memakai cache 30 detik dan invalidasi
  setelah perubahan. Form pengukuran tidak direset oleh polling hasil.

## API

- GET/POST `/api/v1/arkl/reference-measurements/`: list/create, paginated.
- GET/PATCH `/api/v1/arkl/reference-measurements/:id/`: draft belum digunakan;
  pengukuran terpakai menolak perubahan. Tidak ada DELETE.
- POST `/api/v1/arkl/reference/`: worker dan measurement yang sudah termasuk scope.
- GET `/api/v1/arkl/results/?calculation_type=REFERENCE&worker_code=...`:
  urutan waktu ukur turun, lalu waktu kalkulasi/id.
- GET `/api/v1/me/arkl-results/`: seluruh hasil pekerja sendiri, termasuk referensi.
- ADMIN/OPERATOR dapat menulis; RESEARCHER read-only; WORKER memakai endpoint me.

## Data awal dan penerapan

Pengukuran awal atas konfirmasi pengguna: 0,06 ppm, 2026-10-02 11:45 UTC+7,
TPA Muara Fajar, cakupan UJI-WORKER-001 sampai UJI-WORKER-050. Sumber tercatat
sebagai sensor referensi; tidak mengarang identitas tenaga ahli atau sertifikat.

Migrasi `arkl.0004_reference_measurement` sudah diterapkan pada database workspace.
Backup sebelum migrasi: `db.before-reference-arkl-20261002-d56a84e6.sqlite3`.
Backup berisi data privat; jangan unggah sebagai fixture. Snapshot awal menghasilkan
6 hasil referensi; 44 pekerja belum mempunyai profil saat pencatatan. Ini bukan
jumlah tetap: hasil berikutnya mengikuti pengisian profil.

Restart backend dan proses `python manage.py run_mqtt` untuk memuat kode terbaru;
refresh frontend. Pada instalasi lain jalankan `python manage.py migrate`.
Rollback skema ke arkl.0003 menghilangkan sumber/riwayat referensi, jadi bukan
langkah rutin. Pemulihan backup penuh juga membatalkan data setelah snapshot;
cadangkan data terkini dan minta persetujuan sebelum rollback destruktif.

## Verifikasi

- Backend: `python -m pytest -q --tb=short` → 380 passed, 151.48 detik.
- Tes referensi terarah setelah assertion final: 12 passed, 1.71 detik.
- Frontend: 6 file tes terkait → 23 passed, termasuk 5 tes pemisahan sumber,
  waktu pengukuran, dan data IoT lama.
- TypeScript, lint file frontend terkait, dan build Vite lulus.
- `python manage.py makemigrations arkl --check --dry-run`: tidak ada drift ARKL.
- API internal uji01: HTTP 200, hasil REALTIME dan REFERENCE tersedia, metadata
  referensi benar dan tidak mengekspos cakupan/ID pekerja lain.

Belum ada walkthrough
browser autentikasi pada sesi pengguna; tes memakai API dan rendering React.
Drift help_text Worker.age/ExposureProfile.inhalation_rate pada migrasi lama
serta peringatan Vite __dirname/bundle tidak diperbaiki dalam fitur ini.
