import { renderToStaticMarkup } from "react-dom/server"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { apiRequest } from "@/api/client"
import { getMyExposureForSetup } from "@/api/worker"
import { WorkerSetupGuard } from "@/app/guards/WorkerSetupGuard"
import { WorkerOnboardingPage } from "./WorkerOnboardingPage"

vi.mock("@/api/client", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/api/client")>(),
  apiRequest: vi.fn(),
}))

const exposureKey = ["worker", "exposure"]
const missingExposure = { status: 404, message: "Exposure profile not found" }

function makeClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(["worker", "profile"], { id: 1, name: "", age: 0 })
  return client
}

function renderOnboarding(client: QueryClient) {
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/worker/onboarding"]}>
        <Routes>
          <Route element={<WorkerSetupGuard />}>
            <Route path="/worker/onboarding" element={<WorkerOnboardingPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe("Onboarding tidak menghilangkan form saat pemeriksaan status", () => {
  beforeEach(() => vi.mocked(apiRequest).mockReset())

  it("menyimpan 404 pajanan sebagai status sukses dengan data null", async () => {
    const client = makeClient()
    vi.mocked(apiRequest).mockRejectedValueOnce(missingExposure)
    await expect(client.fetchQuery({ queryKey: exposureKey, queryFn: getMyExposureForSetup })).resolves.toBeNull()
    expect(client.getQueryState(exposureKey)?.status).toBe("success")
    expect(renderOnboarding(client)).toContain('id="onboarding-name"')
    client.clear()
  })

  it("mempertahankan form data diri ketika pajanan yang belum ada diperiksa ulang", async () => {
    const client = makeClient()
    client.setQueryData(exposureKey, null)
    let rejectRequest!: (error: unknown) => void
    vi.mocked(apiRequest).mockImplementationOnce(() => new Promise((_, reject) => {
      rejectRequest = reject
    }))
    const refetch = client.fetchQuery({ queryKey: exposureKey, queryFn: getMyExposureForSetup, staleTime: 0 })

    expect(client.getQueryState(exposureKey)?.fetchStatus).toBe("fetching")
    expect(client.getQueryState(exposureKey)?.status).toBe("success")
    const html = renderOnboarding(client)
    expect(html).toContain('id="onboarding-name"')
    expect(html).toContain('id="onboarding-age"')
    expect(html).not.toContain("Data tidak dapat dimuat")

    rejectRequest(missingExposure)
    await expect(refetch).resolves.toBeNull()
    expect(renderOnboarding(client)).toContain('id="onboarding-name"')
    client.clear()
  })

  it("mematikan polling, refresh fokus, dan reconnect khusus ketika mengisi onboarding", () => {
    const client = makeClient()
    client.setQueryData(exposureKey, null)
    renderOnboarding(client)
    for (const queryKey of [["worker", "profile"], exposureKey]) {
      expect(client.getQueryCache().find({ queryKey })?.options).toMatchObject({
        refetchInterval: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      })
    }
    client.clear()
  })

  it("tidak mencopot form jika pemeriksaan lanjutan gagal setelah data awal termuat", async () => {
    const client = makeClient()
    client.setQueryData(exposureKey, null)
    const error = { status: 503, message: "Service unavailable" }
    vi.mocked(apiRequest).mockRejectedValueOnce(error)
    await expect(client.fetchQuery({ queryKey: exposureKey, queryFn: getMyExposureForSetup, staleTime: 0 })).rejects.toEqual(error)
    expect(client.getQueryState(exposureKey)?.status).toBe("error")
    expect(renderOnboarding(client)).toContain('id="onboarding-name"')
    client.clear()
  })

  it("tetap melaporkan error selain 404 pada pemuatan pertama", async () => {
    const client = makeClient()
    const error = { status: 403, message: "Forbidden" }
    vi.mocked(apiRequest).mockRejectedValueOnce(error)
    await expect(client.fetchQuery({ queryKey: exposureKey, queryFn: getMyExposureForSetup })).rejects.toEqual(error)
    expect(renderOnboarding(client)).toContain("Data tidak dapat dimuat")
    client.clear()
  })
})
