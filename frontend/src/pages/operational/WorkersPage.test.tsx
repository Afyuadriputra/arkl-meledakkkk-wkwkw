import { renderToStaticMarkup } from "react-dom/server"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { apiRequest } from "@/api/client"
import { getAllWorkers, type Worker } from "@/api/exposure"
import { WorkersPage } from "./WorkersPage"

vi.mock("@/api/client", () => ({ apiRequest: vi.fn() }))

const workers: Worker[] = Array.from({ length: 73 }, (_, index) => ({
  id: index + 1,
  code: `UJI-${index + 1}`,
  name: `Pemulung ${index + 1}`,
  age: 30,
  is_active: index % 2 === 0,
  monitoring_device_code: "",
  monitoring_device_name: "",
  monitoring_device_location: "",
  created_at: "2026-10-02T00:00:00Z",
  updated_at: "2026-10-02T00:00:00Z",
}))

describe("Daftar pemulung lengkap dan dapat digulir", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset())

  it("mengambil halaman berikutnya sampai semua data API termuat", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({ count: 73, next: "/workers/?page=2", previous: null, results: workers.slice(0, 50) })
      .mockResolvedValueOnce({ count: 73, next: null, previous: "/workers/?page=1", results: workers.slice(50) })

    expect(await getAllWorkers()).toEqual(workers)
    expect(apiRequest).toHaveBeenNthCalledWith(1, { method: "GET", url: "/workers/", params: { page: 1 } })
    expect(apiRequest).toHaveBeenNthCalledWith(2, { method: "GET", url: "/workers/", params: { page: 2 } })
    expect(apiRequest).toHaveBeenCalledTimes(2)
  })

  it("tidak menyajikan daftar parsial sebagai seluruh data jika halaman lanjutan gagal", async () => {
    vi.mocked(apiRequest)
      .mockResolvedValueOnce({ count: 73, next: "/workers/?page=2", previous: null, results: workers.slice(0, 50) })
      .mockRejectedValueOnce(new Error("Network unavailable"))
    await expect(getAllWorkers()).rejects.toThrow("Network unavailable")
  })

  it("menampilkan semua baris termasuk setelah baris ke-50 dalam area scroll dengan header tetap", () => {
    const client = new QueryClient()
    client.setQueryData(["workers", "list", "all"], workers)
    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <MemoryRouter><WorkersPage /></MemoryRouter>
      </QueryClientProvider>,
    )
    expect(html.match(/data-slot="table-row"/g)).toHaveLength(74)
    expect(html).toContain("Pemulung 73")
    expect(html).toContain("UJI-73")
    expect(html).toContain("workers-list-scroll")
    expect(html).toContain("overflow-auto")
    expect(html).toContain("sticky top-0")
    expect(html).toContain('aria-label="Daftar seluruh pemulung" tabindex="0"')
    client.clear()
  })

  it("menerima database kosong tanpa mencoba halaman berikutnya", async () => {
    vi.mocked(apiRequest).mockResolvedValueOnce({ count: 0, next: null, previous: null, results: [] })
    expect(await getAllWorkers()).toEqual([])
    expect(apiRequest).toHaveBeenCalledTimes(1)
  })
})
