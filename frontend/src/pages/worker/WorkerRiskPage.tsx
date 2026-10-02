import {
  useMemo,
} from "react"
import {
  useQuery,
} from "@tanstack/react-query"
import {
  Activity,
  Clock3,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react"

import {
  getMyARKLResults,
} from "@/api/worker"
import { ARKLVerificationNotice } from "@/components/status/ARKLVerificationNotice"
import { ReferenceARKLCard, IoTReadingAge } from "@/components/status/ReferenceARKLCard"
import { latestARKLByType } from "@/lib/arklResults"

import {
  RiskBadge,
} from "@/components/status/RiskBadge"

import {
  RiskExplanation,
} from "@/components/status/RiskExplanation"

import {
  ARKLCalculationDetails,
} from "@/components/data-display/ARKLCalculationDetails"

import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert"
import {
  Badge,
} from "@/components/ui/badge"
import {
  Button,
} from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Skeleton,
} from "@/components/ui/skeleton"

function formatNumber(
  value:
    | number
    | string
    | null
    | undefined,
  maximumFractionDigits = 3,
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—"
  }

  const number =
    typeof value === "number"
      ? value
      : Number(value)

  if (!Number.isFinite(number)) {
    return "—"
  }

  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits,
  }).format(number)
}

function formatDateTime(
  value: string | null | undefined,
) {
  if (!value) {
    return "—"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "—"
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function WorkerRiskSkeleton() {
  return (
    <div className="space-y-5 p-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>

      <Skeleton className="h-64 w-full rounded-2xl" />
      <Skeleton className="h-44 w-full rounded-2xl" />
      <Skeleton className="h-80 w-full rounded-2xl" />
    </div>
  )
}

export function WorkerRiskPage() {
  const arklQuery = useQuery({
    queryKey: [
      "worker",
      "arkl-results",
    ],
    queryFn: getMyARKLResults,
    refetchInterval: 15_000,
  })

  const results = useMemo(
    () =>
      [...(arklQuery.data ?? [])].sort(
        (a, b) =>
          Date.parse(b.created_at) -
          Date.parse(a.created_at),
      ),
    [arklQuery.data],
  )

  const latest =
    latestARKLByType(results, "REALTIME")

  const referenceResult = latestARKLByType(results, "REFERENCE")

  if (
    arklQuery.isPending &&
    !arklQuery.data
  ) {
    return <WorkerRiskSkeleton />
  }

  return (
    <div className="space-y-5 p-4 pb-6">
      {/* Header */}
      <section className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">
            Risiko Pajanan
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Kondisi Risiko Anda
          </h1>

          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Ringkasan hasil karakterisasi risiko
            berdasarkan analisis ARKL terbaru.
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 shrink-0"
          disabled={arklQuery.isFetching}
          onClick={() =>
            void arklQuery.refetch()
          }
          aria-label="Perbarui hasil risiko"
          title="Perbarui"
        >
          <RefreshCw
            className={
              arklQuery.isFetching
                ? "size-5 animate-spin"
                : "size-5"
            }
          />
        </Button>
      </section>

      {arklQuery.isError ? (
        <Alert variant="destructive">
          <TriangleAlert className="size-4" />

          <AlertDescription>
            Hasil risiko tidak dapat dimuat.
            Silakan coba kembali.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Primary result */}
      <Card className="overflow-hidden border-primary/15 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardDescription>
                ARKL IoT — Pembacaan Terakhir
              </CardDescription>

              <CardTitle className="mt-1 text-lg">
                Karakterisasi Risiko
              </CardTitle>
            </div>

            {latest?.interpretation ===
            "WITHIN_REFERENCE_LEVEL" ? (
              <RiskBadge interpretation="WITHIN_REFERENCE_LEVEL" />
            ) : latest?.interpretation ===
              "ABOVE_REFERENCE_LEVEL" ? (
              <RiskBadge interpretation="ABOVE_REFERENCE_LEVEL" />
            ) : null}
          </div>
        </CardHeader>

        <CardContent>
          {latest ? (
            <div className="space-y-6">
              <div className="rounded-2xl bg-primary/5 p-5 text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Risk Quotient
                </p>

                <p className="numeric-data mt-2 text-5xl font-black tracking-tight">
                  {formatNumber(
                    latest.rq,
                    3,
                  )}
                </p>

                <div className="mt-4 flex justify-center">
                  {latest.interpretation ===
                  "WITHIN_REFERENCE_LEVEL" ? (
                    <RiskBadge interpretation="WITHIN_REFERENCE_LEVEL" />
                  ) : latest.interpretation ===
                    "ABOVE_REFERENCE_LEVEL" ? (
                    <RiskBadge interpretation="ABOVE_REFERENCE_LEVEL" />
                  ) : (
                    <Badge variant="outline">
                      {latest.interpretation}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    H₂S
                  </p>

                  <p className="numeric-data mt-2 text-xl font-bold">
                    {formatNumber(
                      latest.concentration_ppm,
                      3,
                    )}{" "}
                    ppm
                  </p>
                </div>

                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Analisis
                  </p>

                  <div className="mt-2 flex gap-1.5">
                    <Clock3 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

                    <p className="text-sm font-medium">
                      {formatDateTime(
                        latest.created_at,
                      )}
                    </p>
                  </div>
                </div>
              </div>


              <ARKLCalculationDetails
                result={latest}
                formatNumber={formatNumber}
              />
            </div>
          ) : (
            <div className="py-10 text-center">
              <ShieldCheck className="mx-auto size-10 text-muted-foreground/40" />

              <p className="mt-3 font-semibold">
                Belum ada hasil ARKL
              </p>

              <p className="mx-auto mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Hasil dihitung otomatis dari data pajanan dan perangkat IoT yang terhubung.
                Pastikan perangkat sudah ditetapkan dan backend menerima pembacaan.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interpretation */}
      {latest ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Apa Artinya?
            </CardTitle>
          </CardHeader>

          <CardContent>
            {latest.interpretation ===
            "WITHIN_REFERENCE_LEVEL" ? (
              <RiskExplanation interpretation="WITHIN_REFERENCE_LEVEL" />
            ) : (
              <RiskExplanation interpretation="ABOVE_REFERENCE_LEVEL" />
            )}
          </CardContent>
        </Card>
      ) : null}

      {latest ? <IoTReadingAge receivedAt={latest.reading_received_at} /> : null}
      <ReferenceARKLCard result={referenceResult} />

      {/* History */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="size-4 text-primary" />
                Riwayat Risiko
              </CardTitle>

              <CardDescription className="mt-1">
                Hasil analisis ARKL sebelumnya.
              </CardDescription>
            </div>

            <Badge
              variant="outline"
              className="rounded-full"
            >
              {results.length} hasil
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {results.length === 0 ? (
            <div className="py-12 text-center">
              <Activity className="mx-auto size-9 text-muted-foreground/40" />

              <p className="mt-3 font-medium">
                Belum ada riwayat
              </p>
            </div>
          ) : (
            <div
              className="
                max-h-[420px]
                overflow-y-auto
                overscroll-contain
                [scrollbar-gutter:stable]
              "
            >
              <div className="divide-y">
                {results.map(
                  (result) => (
                    <div
                      key={result.id}
                      className="space-y-3 p-4"
                    >
                      <ARKLVerificationNotice verified={result.exposure_profile_verified} />
                      <Badge variant="outline">{result.calculation_type === "REFERENCE" ? "Sensor referensi" : result.calculation_type === "HISTORICAL" ? "Historis IoT" : "Realtime IoT"}</Badge>
                      {result.reference_measurement ? <p className="text-xs text-muted-foreground">{result.reference_measurement.location} · {new Date(result.reference_measurement.measured_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} (UTC+7) · {result.reference_measurement.source}</p> : null}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Risk Quotient
                          </p>

                          <p className="numeric-data mt-1 text-xl font-bold">
                            {formatNumber(
                              result.rq,
                              3,
                            )}
                          </p>
                        </div>

                        {result.interpretation ===
                        "WITHIN_REFERENCE_LEVEL" ? (
                          <RiskBadge interpretation="WITHIN_REFERENCE_LEVEL" />
                        ) : result.interpretation ===
                          "ABOVE_REFERENCE_LEVEL" ? (
                          <RiskBadge interpretation="ABOVE_REFERENCE_LEVEL" />
                        ) : (
                          <Badge variant="outline">
                            {result.interpretation}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">
                          H₂S
                        </span>

                        <span className="numeric-data font-semibold">
                          {formatNumber(
                            result.concentration_ppm,
                            3,
                          )}{" "}
                          ppm
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock3 className="size-3.5" />

                        {formatDateTime(
                          result.created_at,
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          {results.length > 0 ? (
            <div className="border-t bg-muted/20 px-4 py-3 text-center text-xs text-muted-foreground">
              Scroll untuk melihat hasil sebelumnya
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
