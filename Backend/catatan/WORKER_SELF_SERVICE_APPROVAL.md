# Pengisian mandiri dan ACC profil pajanan

Implemented/updated: 2026-10-02. Kode produksi dan tes tetap menjadi sumber kebenaran.

## Alur pengguna

1. Pekerja melengkapi nama dan usia di onboarding.
2. Pekerja mengisi berat badan, waktu pajanan, frekuensi pajanan, dan durasi
   pajanan, lalu memilih **Simpan dan Ajukan ACC**. Laju inhalasi ditentukan
   backend berdasarkan usia; bukan input bebas pekerja.
3. Profil baru berstatus `PENDING`. Jika data lengkap, pekerja dapat masuk
   dashboard dan melihat monitoring tanpa menunggu ACC.
4. Admin/operator membuka detail pekerja di `/app/workers/:id`, memeriksa data,
   lalu memilih **ACC Data Pajanan** atau **Minta Perbaikan** dengan catatan.
   Pengaturan yang sama tersedia di Django Admin → Exposure profiles.
5. Profil `PENDING` maupun `APPROVED` dapat dihitung. Menyimpan profil, perubahan
   usia, penetapan perangkat, atau ACC memicu refresh REALTIME menggunakan reading
   terakhir pada perangkat Worker. Data sensor tidak dibuat atau diisi manual.
   MQTT/backend tetap pemicu berkala berikutnya; frontend tidak menghitung rumus
   atau memanggil API manual REALTIME sebagai alur produksi.
6. Setiap hasil baru menyimpan `exposure_profile_verified`: false sebelum ACC,
   true setelah ACC, null untuk riwayat lama yang tidak memiliki metadata.
   ACC tidak mengubah label hasil lama; refresh membuat snapshot baru bila perlu.
   Profil `REJECTED` tetap menghentikan kalkulasi baru sampai diperbaiki.

## Perubahan dan batasan

- `POST /api/v1/me/exposure/` membuat profil pekerja yang sedang login, bukan
  Worker yang dikirim di payload. Profil hanya boleh dibuat sekali.
- `PATCH /api/v1/me/exposure/` mengubah data sendiri. Perubahan parameter oleh
  pekerja mengembalikan status ke `PENDING` dan menghapus metadata ACC sebelumnya.
- Perubahan usia melalui API personal, API petugas, atau Django Admin menyinkronkan
  laju inhalasi dan mengembalikan profil yang sudah ada ke `PENDING`.
- Pekerja tidak dapat menetapkan status ACC, reviewer, atau laju inhalasi sendiri.
- Admin/operator tetap dapat membuat dan mengatur profil melalui jalur petugas.
  Jalur pembuatan petugas/ORM terpercaya tetap memiliki default `APPROVED`.
- Migrasi mempertahankan kelayakan profil lama dengan status `APPROVED` tanpa
  mengarang reviewer atau tanggal pemeriksaan. Ini kebijakan kompatibilitas data
  lama, bukan bukti bahwa pemeriksaan individual sebelumnya pernah dilakukan.
- Aturan pending/rejected berlaku untuk REALTIME manual, REALTIME dari reading/MQTT,
  dan HISTORICAL. Rumus, satuan, serta konstanta ilmiah tidak diubah.
- Refresh setelah penyimpanan melewati interval MQTT 60 detik agar perubahan profil
  langsung terlihat. Penyimpanan identik untuk reading, parameter, dan status
  verifikasi yang sama tidak membuat hasil duplikat.
- Tanpa perangkat, reading, profil, atau perangkat aktif, data tetap tersimpan dan
  API memberikan `calculation_status` yang menjelaskan hambatan. Jangan otomatis
  menetapkan perangkat tanpa konfirmasi; ARKL harus mengikuti penugasan Worker.
- Reading terakhir bisa lama; waktu penerimaan sensor ditampilkan di hasil.
  Refresh profil tidak mengubah timestamp sensor menjadi waktu sekarang.
- Refresh memakai pipeline REALTIME yang sama, termasuk evaluasi alert dan
  deduplikasi. Alert dapat bersumber dari hasil sementara; hasil terkait menyimpan
  metadata verifikasi saat dihitung. ACC tidak menutup alert lama secara otomatis.
- Hasil ARKL dan alert lama tidak dihapus. Banner pekerja menjelaskan bahwa hasil
  lama merupakan riwayat saat profil terbaru belum disetujui. Tidak adanya alert
  aktif bukan bukti kondisi aman.
- Guard worker memuat ulang profil dan pajanan tiap 15 detik, juga saat window
  kembali fokus/reconnect, kecuali di `/worker/onboarding`: pembaruan otomatis
  dimatikan agar pengisian form tidak terganggu. **Periksa Status** memperbarui
  keduanya. Respons 404 pajanan disimpan sebagai `null` (state setup yang sukses),
  bukan error yang mengulang loading dan melepas form ketika diperiksa lagi.
- Belum ada riwayat versi pengajuan/review terpisah: metadata di profil mewakili
  status terkini. Tidak ada notifikasi ACC atau penghitungan ulang riwayat HISTORICAL.

## Penerapan

Migrasi: `python manage.py migrate`. Cadangkan SQLite sebelum migrasi.
Database workspace sudah dimigrasikan, dengan backup:
`Backend/db.before-exposure-approval-20261002-e6f18852.sqlite3`.
Backup mengandung data akun; jangan diunggah atau dibagikan sebagai fixture publik.

Migrasi snapshot verifikasi: `arkl.0003_arkl_profile_verification`. Backup sebelum
migrasi tambahan: `Backend/db.before-provisional-arkl-20261002-a0a92460.sqlite3`.
Kolom baru nullable agar metadata verifikasi riwayat tidak ditebak.

Restart backend dan proses `python manage.py run_mqtt` setelah penerapan agar
worker MQTT memuat aturan kalkulasi pending dan metadata verifikasi yang baru.
Refresh penuh frontend setelah pembaruan.

Migrasi `0004_exposure_approval` hanya menambahkan kolom ACC dan dapat dibalik
dengan migrasi ke `0003_worker_monitoring_device`; pembalikan menghilangkan metadata
ACC. Pemulihan database penuh memakai backup juga akan membatalkan perubahan data
yang terjadi setelah snapshot, sehingga bukan langkah rutin.

## Verifikasi terakhir (2026-10-02)

- Baseline sebelumnya: backend 362 passed dan frontend 6 passed.
- Frontend terarah: 18 passed (guard/layout, onboarding/refetch, pengisian pajanan,
  daftar pekerja lengkap, dan label verifikasi).
- Backend: `python -m pytest -q --tb=short` → 368 passed, 169.71 detik.
- TypeScript, lint file yang berubah, dan build Vite lulus.
- Build masih memberi peringatan konfigurasi Vite `__dirname` dan ukuran bundle;
  ini tidak menghalangi build dan tidak direstrukturisasi pada pekerjaan ini.
- `makemigrations --check --dry-run` mendeteksi drift `help_text` lama pada
  `Worker.age` dan `ExposureProfile.inhalation_rate` terhadap migrasi `0002`.
  Drift tersebut sudah ada sebelum penambahan ACC; tidak diubah di sini.
- Pengujian UI memakai rendering React dan pengujian API, bukan walkthrough
  browser pada sesi pengguna. Tes integrasi frontend terhadap backend publik
  tidak dijalankan pada pekerjaan ini.
- Akun `uji01` telah ditetapkan ke `H2S-TPA-001` atas konfirmasi pengguna;
  profil tetap `PENDING`, bukan di-ACC otomatis. Refresh menghasilkan snapshot
  sementara. Pemeriksaan API internal mengonfirmasi perangkat dan hasil tersedia.
- Proses MQTT lama yang masih berjalan ditemukan menulis snapshot dengan metadata
  verifikasi null. Restart proses tersebut diperlukan; data riwayat tidak ditebak
  atau diubah massal untuk mengisi metadata yang tidak tercatat.
