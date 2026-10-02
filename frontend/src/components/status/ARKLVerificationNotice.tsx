export function ARKLVerificationNotice({ verified }: { verified: boolean | null | undefined }) {
  return (
    <p role="note" className="rounded-xl border bg-muted/30 p-3 text-sm leading-relaxed">
      {verified === true
        ? "Profil pajanan sudah diverifikasi saat hasil ini dihitung."
        : verified === false
          ? "Hasil sementara — data pajanan belum diverifikasi petugas saat dihitung. ACC berikutnya tidak mengubah status riwayat ini."
          : "Riwayat lama — status verifikasi saat perhitungan tidak tercatat."}
    </p>
  )
}

export function WorkerCalculationStatus({ status }: { status: string | undefined }) {
  const messages: Record<string, string> = {
    DEVICE_UNASSIGNED: "Perangkat IoT belum terhubung. Petugas perlu menetapkan perangkat monitoring untuk Worker Anda; konsentrasi tidak perlu diisi manual.",
    DEVICE_INACTIVE: "Perangkat yang ditetapkan tidak aktif. Hubungi petugas untuk memeriksa perangkat.",
    NO_IOT_READING: "Perangkat sudah terhubung, tetapi belum ada pembacaan IoT. Hasil muncul setelah data diterima backend.",
    EXPOSURE_MISSING: "Lengkapi dan simpan data pajanan untuk memulai perhitungan otomatis.",
    PROFILE_REJECTED: "Petugas meminta perbaikan data. Perbaiki lalu simpan kembali untuk melanjutkan perhitungan otomatis.",
    WORKER_INACTIVE: "Worker tidak aktif. Hubungi petugas untuk memeriksa status akun pekerja.",
    CALCULATION_FAILED: "Data pajanan tersimpan, tetapi kalkulasi belum berhasil. Hubungi petugas untuk memeriksa data dan layanan backend.",
    CALCULATED: "ARKL sudah dihitung dari pembacaan IoT terakhir. Lihat hasil dan waktu pembacaan di dashboard atau halaman Risiko.",
    READY: "Data pajanan dan pembacaan IoT tersedia. Kalkulasi berjalan di backend, tanpa menghitung rumus secara manual.",
  }
  return status && messages[status] ? (
    <p role="status" className="rounded-xl border bg-muted/25 p-3 text-sm leading-relaxed">{messages[status]}</p>
  ) : null
}
