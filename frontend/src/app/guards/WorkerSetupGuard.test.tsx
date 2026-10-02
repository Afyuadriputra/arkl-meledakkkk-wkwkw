import { renderToStaticMarkup } from "react-dom/server"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes, useOutletContext } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { WorkerSetupGuard, type WorkerSetupContext } from "./WorkerSetupGuard"
import { WorkerLayout } from "@/app/layouts/WorkerLayout"

function DashboardProbe() {
  const { exposure } = useOutletContext<WorkerSetupContext>()
  return <p>Dashboard pekerja · status {exposure?.approval_status}</p>
}

function renderWorker(approval_status: string, exposureExists = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(["worker", "profile"], { name: "Uji 01", age: 44 })
  if (exposureExists) {
    client.setQueryData(["worker", "exposure"], {
      body_weight: 65, exposure_time: 8, exposure_frequency: 250,
      exposure_duration: 10, approval_status, review_note: "Periksa berat badan",
    })
  }
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/worker/home"]}>
        <Routes>
          <Route element={<WorkerSetupGuard />}>
            <Route path="/worker" element={<WorkerLayout />}>
              <Route path="home" element={<DashboardProbe />} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe("Akses pekerja selama pemeriksaan", () => {
  it("mengizinkan dashboard ketika data lengkap tetapi ACC masih ditunggu", () => {
    const html = renderWorker("PENDING")
    expect(html).toContain("Dashboard pekerja")
    expect(html).toContain("status PENDING")
    expect(html).toContain("Profil pajanan belum diverifikasi")
    expect(html).toContain("label hasil sementara")
  })

  it("menampilkan catatan perbaikan tanpa memblokir monitoring", () => {
    const html = renderWorker("REJECTED")
    expect(html).toContain("Dashboard pekerja")
    expect(html).toContain("Data pajanan perlu diperbaiki")
    expect(html).toContain("Periksa berat badan")
    expect(html).toContain("/worker/profile/exposure")
  })

  it("tidak menampilkan peringatan menunggu ACC pada profil yang disetujui", () => {
    const html = renderWorker("APPROVED")
    expect(html).toContain("Dashboard pekerja")
    expect(html).not.toContain("Profil pajanan belum diverifikasi")
  })

  it("tidak melewatkan kelengkapan profil pajanan", () => {
    expect(renderWorker("PENDING", false)).not.toContain("Dashboard pekerja")
  })
})
