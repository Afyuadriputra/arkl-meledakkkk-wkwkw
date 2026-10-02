import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import type { ARKLResult } from "@/api/arkl"
import { latestARKLByType } from "@/lib/arklResults"
import { ReferenceARKLCard, IoTReadingAge } from "./ReferenceARKLCard"

const reference: ARKLResult = {
  id: 3, worker: 1, worker_code: "UJI-WORKER-001", reading: null, reading_received_at: null, device_code: null,
  calculation_type: "REFERENCE", concentration_ppm: "0.060000", concentration_mg_m3: "0.084000",
  exposure_concentration_mg_m3: null, body_weight: "65", exposure_time: "8", exposure_frequency: "250",
  exposure_duration: "10", inhalation_rate: "0.83", averaging_time: "3650", intake: "0.0005",
  rfc: "0.002", rq: "0.25", interpretation: "WITHIN_REFERENCE_LEVEL", calculation_version: "v1",
  exposure_profile_verified: false, source_simulated: false, period_start: null, period_end: null, reading_count: null,
  created_at: "2026-10-02T06:00:00Z",
  reference_measurement: { id: 1, concentration_ppm: "0.06", measured_at: "2026-10-02T04:45:00Z", location: "TPA Muara Fajar", source: "Sensor referensi" },
}

describe("Hasil ARKL berdasarkan sumber pengukuran", () => {
  it("menampilkan sumber referensi, waktu pengukuran UTC+7, dan hasil sementara", () => {
    const html = renderToStaticMarkup(<ReferenceARKLCard result={reference} />)
    expect(html).toContain("ARKL Pengukuran Sensor Referensi")
    expect(html).toContain("0,06")
    expect(html).toContain("TPA Muara Fajar")
    expect(html).toContain("11.45")
    expect(html).toContain("Hasil sementara")
    expect(html).toContain("bukan konstanta RfC")
  })

  it("tidak memilih referensi atau historical sebagai hasil realtime terbaru", () => {
    const realtime: ARKLResult = { ...reference, id: 1, calculation_type: "REALTIME", reference_measurement: null, created_at: "2026-10-02T05:00:00Z" }
    const historical: ARKLResult = { ...reference, id: 4, calculation_type: "HISTORICAL", reference_measurement: null, created_at: "2026-10-02T07:00:00Z" }
    const records = [reference, historical, realtime]
    expect(latestARKLByType(records, "REALTIME")?.id).toBe(1)
    expect(latestARKLByType(records, "REFERENCE")?.id).toBe(3)
    expect(records[0]).toBe(reference)
  })

  it("memilih referensi terbaru berdasarkan waktu ukur, bukan waktu penghitungan ulang", () => {
    const olderRecalculated: ARKLResult = { ...reference, id: 8, created_at: "2026-10-02T08:00:00Z", reference_measurement: { ...reference.reference_measurement!, measured_at: "2026-10-01T04:45:00Z" } }
    expect(latestARKLByType([olderRecalculated, reference], "REFERENCE")?.id).toBe(reference.id)
  })

  it("menjelaskan belum ada hasil, tanpa mengarang nilai nol", () => {
    const html = renderToStaticMarkup(<ReferenceARKLCard result={null} />)
    expect(html).toContain("Belum ada hasil referensi")
    expect(html).not.toContain("0 ppm")
  })

  it("menandai pembacaan IoT lama tanpa mengubah waktu sensor", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-02T08:00:00Z"))
    try {
      const html = renderToStaticMarkup(<IoTReadingAge receivedAt="2026-10-02T04:45:00Z" />)
      expect(html).toContain("Data belum diperbarui lebih dari 2 menit")
      expect(html).toContain("11.45")
      expect(html).toContain("Ini waktu sensor, bukan waktu perhitungan")
    } finally { vi.restoreAllMocks() }
  })
})
