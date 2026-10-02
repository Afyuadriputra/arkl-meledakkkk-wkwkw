import type { ARKLResult } from "@/api/arkl"
import { useEffect, useState } from "react"
import { ARKLCalculationDetails } from "@/components/data-display/ARKLCalculationDetails"
import { RiskExplanation } from "@/components/status/RiskExplanation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const formatNumber = (value: number | string | null | undefined, digits = 4) =>
  value == null || !Number.isFinite(Number(value)) ? "—" : new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(Number(value))

export function ReferenceARKLCard({ result }: { result: ARKLResult | null }) {
  const measurement = result?.reference_measurement
  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">ARKL Pengukuran Sensor Referensi</CardTitle>
          <Badge variant="outline">Sumber terpisah dari IoT</Badge>
        </div>
        <CardDescription>Hasil berdasarkan pengukuran referensi dan profil pajanan pekerja, bukan pembacaan realtime.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {result && measurement ? (
          <>
            <div className="grid gap-3 rounded-lg bg-primary/5 p-4 sm:grid-cols-2">
              <div><p className="text-sm text-muted-foreground">Konsentrasi H₂S (C)</p><p className="numeric-data text-2xl font-semibold">{formatNumber(result.concentration_ppm)} ppm</p><p className="text-xs text-muted-foreground">{formatNumber(result.concentration_mg_m3)} mg/m³</p></div>
              <div><p className="text-sm text-muted-foreground">Kuosien Risiko (RQ)</p><p className="numeric-data text-2xl font-semibold">{formatNumber(result.rq, 6)}</p></div>
            </div>
            <dl className="space-y-1 text-sm">
              <div><dt className="inline text-muted-foreground">Lokasi: </dt><dd className="inline">{measurement.location || "Belum dicatat"}</dd></div>
              <div><dt className="inline text-muted-foreground">Waktu pengukuran: </dt><dd className="inline">{new Date(measurement.measured_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} (UTC+7)</dd></div>
              <div><dt className="inline text-muted-foreground">Sumber: </dt><dd className="inline">{measurement.source}</dd></div>
              <div><dt className="inline text-muted-foreground">Waktu perhitungan: </dt><dd className="inline">{new Date(result.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} (UTC+7)</dd></div>
            </dl>
            <RiskExplanation interpretation={result.interpretation === "WITHIN_REFERENCE_LEVEL" ? "WITHIN_REFERENCE_LEVEL" : "ABOVE_REFERENCE_LEVEL"} />
            <details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-medium">Lihat parameter dan rumus ARKL referensi</summary><ARKLCalculationDetails result={result} formatNumber={formatNumber} /></details>
            <p className="text-xs leading-relaxed text-muted-foreground">Bandingkan dengan IoT hanya setelah memastikan lokasi dan waktu pengukuran sesuai. Nilai yang mendekati saja bukan bukti kalibrasi. Pengukuran sensor referensi (C) bukan konstanta RfC.</p>
          </>
        ) : <p className="text-sm text-muted-foreground">Belum ada hasil referensi untuk Anda/pekerja ini. Petugas perlu menetapkan pengukuran yang sesuai dan profil pajanan harus lengkap.</p>}
      </CardContent>
    </Card>
  )
}

export function IoTReadingAge({ receivedAt }: { receivedAt?: string | null }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(timer)
  }, [])
  if (!receivedAt) return <p className="text-xs text-muted-foreground">Waktu pembacaan IoT tidak tercatat.</p>
  const stale = now - Date.parse(receivedAt) > 120_000
  return <p className={stale ? "text-sm text-status-warning" : "text-xs text-muted-foreground"}>
    {stale ? "Data belum diperbarui lebih dari 2 menit. " : "Pembacaan terakhir: "}
    {new Date(receivedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} (UTC+7). Ini waktu sensor, bukan waktu perhitungan. Pastikan sensor berada di area kerja yang sesuai.
  </p>
}
