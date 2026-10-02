import { renderToStaticMarkup } from "react-dom/server"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"
import { WorkerExposureForm } from "./WorkerExposurePage"
import { createMyExposure } from "@/api/worker"
import { apiRequest } from "@/api/client"

vi.mock("@/api/client", () => ({
  apiRequest: vi.fn(), isApiError: () => false,
}))

describe("Pengisian mandiri data pajanan", () => {
  it("menampilkan empat input kosong tanpa menunggu pembuatan profil oleh petugas", () => {
    const html = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <WorkerExposureForm exposure={null} />
      </QueryClientProvider>,
    )
    expect(html.match(/<input /g)).toHaveLength(4)
    expect(html.match(/value=""/g)).toHaveLength(4)
    expect(html).toContain("Berat Badan")
    expect(html).toContain("Waktu Pajanan per Hari")
    expect(html).toContain("Frekuensi Pajanan per Tahun")
    expect(html).toContain("Durasi Pajanan")
    expect(html).toContain("belum diverifikasi petugas")
    expect(html).toContain("disabled")
    expect(html).not.toContain("Menunggu petugas")
  })

  it("mengirim data pribadi ke endpoint pekerja, bukan endpoint administrasi", async () => {
    const payload = { body_weight: 65, exposure_time: 8, exposure_frequency: 250, exposure_duration: 10 }
    await createMyExposure(payload)
    expect(apiRequest).toHaveBeenCalledWith({
      method: "POST", url: "/me/exposure/", data: payload,
    })
  })
})
