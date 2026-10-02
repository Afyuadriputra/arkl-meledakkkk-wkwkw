import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { ARKLVerificationNotice, WorkerCalculationStatus } from "./ARKLVerificationNotice"

describe("Verifikasi snapshot ARKL", () => {
  it("menandai hasil pending sebagai sementara, bukan otomatis terverifikasi", () => {
    const html = renderToStaticMarkup(<ARKLVerificationNotice verified={false} />)
    expect(html).toContain("Hasil sementara")
    expect(html).toContain("ACC berikutnya tidak mengubah status riwayat")
  })
  it("membedakan data disetujui dan riwayat tanpa metadata", () => {
    expect(renderToStaticMarkup(<ARKLVerificationNotice verified />)).toContain("sudah diverifikasi saat hasil")
    expect(renderToStaticMarkup(<ARKLVerificationNotice verified={null} />)).toContain("status verifikasi saat perhitungan tidak tercatat")
  })
  it("menjelaskan hambatan perangkat tanpa menyuruh pekerja mengisi konsentrasi", () => {
    expect(renderToStaticMarkup(<WorkerCalculationStatus status="DEVICE_UNASSIGNED" />)).toContain("konsentrasi tidak perlu diisi manual")
    expect(renderToStaticMarkup(<WorkerCalculationStatus status="NO_IOT_READING" />)).toContain("belum ada pembacaan IoT")
  })
})
