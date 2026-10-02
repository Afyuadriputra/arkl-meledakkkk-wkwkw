import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { calculateReferenceARKL, createReferenceMeasurement, getLatestReferenceARKL, getReferenceMeasurements } from "@/api/arkl"
import { isApiError } from "@/api/client"
import { ReferenceARKLCard } from "./ReferenceARKLCard"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function ReferenceMeasurementManager({ workerId, workerCode }: { workerId: number; workerCode: string }) {
  const client = useQueryClient()
  const measurementsQuery = useQuery({ queryKey: ["reference-measurements"], queryFn: getReferenceMeasurements, staleTime: 30_000 })
  const resultQuery = useQuery({ queryKey: ["arkl", "latest-reference", workerCode], queryFn: () => getLatestReferenceARKL(workerCode), refetchInterval: 15_000 })
  const measurements = (measurementsQuery.data ?? []).filter((measurement) => measurement.workers?.includes(workerId))
  const [measurementId, setMeasurementId] = useState("")
  const selected = measurements.find((measurement) => String(measurement.id) === measurementId) ?? measurements[0]
  const [ppm, setPpm] = useState("")
  const [measuredAt, setMeasuredAt] = useState("")
  const [location, setLocation] = useState("")
  const [source, setSource] = useState("Sensor referensi")
  const [copyScope, setCopyScope] = useState(false)

  async function invalidateResults() {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["reference-measurements"] }),
      client.invalidateQueries({ queryKey: ["arkl"] }),
      client.invalidateQueries({ queryKey: ["worker", "arkl-results"] }),
    ])
  }
  const createMutation = useMutation({
    mutationFn: createReferenceMeasurement,
    onSuccess: async (measurement) => {
      setMeasurementId(String(measurement.id)); setPpm(""); setMeasuredAt("")
      await invalidateResults()
      toast.success("Pengukuran disimpan. ARKL dihitung untuk profil lengkap; riwayat lama tetap tersimpan.")
    },
    onError: (error) => toast.error(isApiError(error) ? error.message : "Pengukuran belum berhasil disimpan."),
  })
  const calculateMutation = useMutation({
    mutationFn: calculateReferenceARKL,
    onSuccess: async () => { await invalidateResults(); toast.success("Hasil ARKL referensi tersedia.") },
    onError: (error) => toast.error(isApiError(error) ? error.message : "Profil pajanan belum siap dihitung."),
  })
  const busy = createMutation.isPending || calculateMutation.isPending
  const valid = ppm.trim() !== "" && Number.isFinite(Number(ppm)) && Number(ppm) >= 0 && measuredAt !== "" && location.trim() !== "" && source.trim() !== ""

  return <section className="space-y-4" aria-label="Pengukuran dan ARKL sensor referensi">
    {resultQuery.isPending ? <p role="status">Memuat hasil referensi…</p> : resultQuery.isError ? <p role="alert" className="text-sm text-destructive">Hasil referensi belum dapat dimuat. <Button variant="outline" onClick={() => void resultQuery.refetch()}>Coba lagi</Button></p> : <ReferenceARKLCard result={resultQuery.data ?? null} />}
    <Card>
      <CardHeader><CardTitle className="text-base">Kelola Pengukuran Referensi</CardTitle><CardDescription>Tambahkan pengukuran baru untuk pembaruan. Pengukuran yang sudah dipakai tidak ditimpa. Ini bukan input sensor IoT atau perubahan RfC.</CardDescription></CardHeader>
      <CardContent className="space-y-5">
        {measurementsQuery.isError ? <p role="alert" className="text-sm text-destructive">Daftar pengukuran belum dapat dimuat. <Button variant="outline" onClick={() => void measurementsQuery.refetch()}>Coba lagi</Button></p> : null}
        {measurements.length > 0 ? <div className="space-y-2">
          <Label htmlFor="reference-choice">Pengukuran untuk pekerja ini</Label>
          <select id="reference-choice" className="min-h-11 w-full rounded-md border bg-background px-3 text-sm" value={selected?.id ?? ""} disabled={busy} onChange={(event) => setMeasurementId(event.target.value)}>
            {measurements.map((measurement) => <option key={measurement.id} value={measurement.id}>{measurement.concentration_ppm} ppm · {measurement.location || "Lokasi belum dicatat"} · {new Date(measurement.measured_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} (UTC+7)</option>)}
          </select>
          <Button variant="outline" disabled={busy || !selected?.location} onClick={() => selected && calculateMutation.mutate({ worker: workerId, measurement: selected.id })}>{calculateMutation.isPending ? "Menghitung…" : "Hitung Referensi untuk Pekerja Ini"}</Button>
        </div> : null}
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-medium">Tambah Pengukuran Referensi Baru</summary>
          <form className="mt-4 space-y-4" onSubmit={(event) => {
            event.preventDefault()
            if (!valid || busy) return
            createMutation.mutate({ concentration_ppm: ppm, measured_at: new Date(measuredAt).toISOString(), location: location.trim(), source: source.trim(), workers: copyScope && selected ? selected.workers : [workerId] })
          }}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="reference-ppm">Konsentrasi H₂S (C), ppm</Label><Input id="reference-ppm" type="number" min="0" step="0.000001" required value={ppm} disabled={busy} onChange={(event) => setPpm(event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="reference-date">Waktu pengukuran (waktu lokal perangkat)</Label><Input id="reference-date" type="datetime-local" required value={measuredAt} disabled={busy} onChange={(event) => setMeasuredAt(event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="reference-location">Lokasi pengukuran</Label><Input id="reference-location" required maxLength={255} value={location} disabled={busy} onChange={(event) => setLocation(event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="reference-source">Alat / sumber pengukuran</Label><Input id="reference-source" required maxLength={255} value={source} disabled={busy} onChange={(event) => setSource(event.target.value)} /></div>
            </div>
            {selected ? <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={copyScope} disabled={busy} onChange={(event) => setCopyScope(event.target.checked)} />Gunakan cakupan pengukuran yang dipilih ({selected.workers?.length ?? 0} pekerja). Centang hanya jika berlaku untuk seluruh pekerja tersebut.</label> : null}
            <p className="text-xs text-muted-foreground">{copyScope && selected ? `${selected.workers?.length ?? 0} pekerja` : `Hanya ${workerCode}`} akan ditetapkan pada pengukuran baru. RQ masing-masing dihitung dari profil pajanan, bukan disalin antarpekerja.</p>
            <Button type="submit" disabled={!valid || busy}>{createMutation.isPending ? "Menyimpan…" : "Simpan Pengukuran Baru"}</Button>
          </form>
        </details>
      </CardContent>
    </Card>
  </section>
}
