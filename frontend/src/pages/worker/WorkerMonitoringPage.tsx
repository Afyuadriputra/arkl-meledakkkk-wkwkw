import {
  useMemo,
} from "react"
import {
  useQuery,
} from "@tanstack/react-query"
import {
  CheckCircle2,
  Clock3,
  Info,
  MapPin,
  RadioTower,
  RefreshCw,
  ShieldAlert,
  TriangleAlert,
  WifiOff,
} from "lucide-react"

import {
  isApiError,
} from "@/api/client"
import {
  getMyMonitoring,
} from "@/api/worker"

import {
  SeverityBadge,
  type Severity,
} from "@/components/status/SeverityBadge"

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


const SEVERITIES: Severity[] = [
  "NORMAL",
  "CAUTION",
  "WARNING",
  "DANGER",
  "CRITICAL",
]

const FRESH_READING_MAX_AGE_MS =
  120_000


function asSeverity(
  value: string | null | undefined,
): Severity | null {
  if (!value) {
    return null
  }

  const normalized =
    value
      .trim()
      .toUpperCase() as Severity

  return SEVERITIES.includes(
    normalized,
  )
    ? normalized
    : null
}


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

  return new Intl.NumberFormat(
    "id-ID",
    {
      maximumFractionDigits,
    },
  ).format(number)
}


function formatDateTime(
  value: string | null | undefined,
) {
  if (!value) {
    return "—"
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—"
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      dateStyle: "medium",
      timeStyle: "medium",
    },
  ).format(date)
}


function getReadingAge(
  receivedAt:
    | string
    | null
    | undefined,
) {
  if (!receivedAt) {
    return null
  }

  const timestamp =
    new Date(
      receivedAt,
    ).getTime()

  if (
    !Number.isFinite(
      timestamp,
    )
  ) {
    return null
  }

  return Math.max(
    0,
    Date.now() -
      timestamp,
  )
}


function formatReadingAge(
  ageMs: number | null,
) {
  if (ageMs === null) {
    return "Waktu tidak diketahui"
  }

  const seconds =
    Math.floor(
      ageMs / 1000,
    )

  if (seconds < 10) {
    return "Baru saja"
  }

  if (seconds < 60) {
    return `${seconds} detik lalu`
  }

  const minutes =
    Math.floor(
      seconds / 60,
    )

  if (minutes < 60) {
    return `${minutes} menit lalu`
  }

  const hours =
    Math.floor(
      minutes / 60,
    )

  if (hours < 24) {
    return `${hours} jam lalu`
  }

  const days =
    Math.floor(
      hours / 24,
    )

  return `${days} hari lalu`
}


/**
 * Freshness adalah indikator UI,
 * bukan ambang ilmiah H₂S.
 *
 * Data lebih dari dua menit ditandai
 * sebagai data lama agar Worker tidak
 * menganggap pembacaan tersebut realtime.
 */
function getFreshness(
  ageMs: number | null,
) {
  if (ageMs === null) {
    return {
      label:
        "Waktu tidak diketahui",
      stale:
        true,
    }
  }

  if (
    ageMs <=
    FRESH_READING_MAX_AGE_MS
  ) {
    return {
      label:
        "Data terbaru",
      stale:
        false,
    }
  }

  return {
    label:
      "Data lama",
    stale:
      true,
  }
}


function getEnvironmentalGuidance(
  severity: Severity | null,
) {
  switch (severity) {
    case "CAUTION":
      return {
        title:
          "Waspada",
        message:
          "Kadar H₂S mulai meningkat. Batasi waktu berada di area ini.",
      }

    case "WARNING":
      return {
        title:
          "Peringatan",
        message:
          "Kadar H₂S tinggi. Sebaiknya menjauh dari area ini dan gunakan perlindungan yang dianjurkan.",
      }

    case "DANGER":
      return {
        title:
          "Bahaya",
        message:
          "Kondisi berbahaya. Segera tinggalkan area dan menuju tempat yang lebih aman.",
      }

    case "CRITICAL":
      return {
        title:
          "Bahaya Serius",
        message:
          "BAHAYA SERIUS. Segera keluar dari area dan ikuti arahan petugas keselamatan.",
      }

    case "NORMAL":
      return {
        title:
          "Kondisi Terkendali",
        message:
          "Kondisi terkendali. Tetap bekerja sesuai prosedur keselamatan.",
      }

    default:
      return {
        title:
          "Status Belum Diketahui",
        message:
          "Status lingkungan belum dapat dikenali. Perhatikan arahan petugas keselamatan.",
      }
  }
}


function isNotFoundError(
  error: unknown,
) {
  return (
    isApiError(error) &&
    error.status === 404
  )
}


function MonitoringSkeleton() {
  return (
    <div className="space-y-5 p-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-64" />
      </div>

      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  )
}


export function WorkerMonitoringPage() {
  const monitoringQuery =
    useQuery({
      queryKey: [
        "worker",
        "monitoring",
      ],

      queryFn:
        getMyMonitoring,

      refetchInterval:
        5_000,

      staleTime:
        4_000,

      retry: false,
    })


  const noAssignment =
    monitoringQuery.isError &&
    isNotFoundError(
      monitoringQuery.error,
    )


  const realError =
    monitoringQuery.isError &&
    !noAssignment


  /*
   * Jangan menggunakan cached monitoring
   * ketika backend sekarang menyatakan
   * assignment sudah tidak ada atau request
   * mengalami error.
   */
  const monitoring =
    !noAssignment &&
    !realError
      ? monitoringQuery.data ??
        null
      : null


  const device =
    monitoring?.device ??
    null

  const reading =
    monitoring?.reading ??
    null


  const readingAge =
    useMemo(
      () =>
        getReadingAge(
          reading?.received_at,
        ),
      [
        reading?.received_at,
        monitoringQuery.dataUpdatedAt,
      ],
    )


  const freshness =
    getFreshness(
      readingAge,
    )


  const severity =
    asSeverity(
      reading?.status,
    )


  const guidance =
    getEnvironmentalGuidance(
      severity,
    )


  const deviceInactive =
    device
      ? !device.is_active
      : false


  const readingIsHistorical =
    deviceInactive ||
    freshness.stale


  const readingLabel =
    readingIsHistorical
      ? "Pembacaan Terakhir"
      : "H₂S Saat Ini"


  if (
    monitoringQuery.isPending &&
    !monitoringQuery.data
  ) {
    return (
      <MonitoringSkeleton />
    )
  }


  return (
    <div className="space-y-5 p-4 pb-6">
      {/* HEADER */}
      <section className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">
            Monitoring H₂S
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Kondisi Lingkungan
          </h1>

          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Pembacaan H₂S dari perangkat
            yang ditetapkan untuk area Anda.
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 shrink-0"
          disabled={
            monitoringQuery.isFetching
          }
          onClick={() =>
            void monitoringQuery.refetch()
          }
          aria-label="Perbarui monitoring"
          title="Perbarui"
        >
          <RefreshCw
            className={
              monitoringQuery.isFetching
                ? "size-5 animate-spin"
                : "size-5"
            }
          />
        </Button>
      </section>


      {/* NO ASSIGNMENT */}
      {noAssignment ? (
        <Card>
          <CardContent className="py-10 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
              <RadioTower className="size-7 text-muted-foreground" />
            </div>

            <h2 className="mt-4 font-bold">
              Perangkat Belum Ditetapkan
            </h2>

            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Petugas belum menetapkan
              perangkat monitoring H₂S untuk
              area Anda.
            </p>

            <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Hubungi petugas apabila perangkat
              seharusnya sudah tersedia.
            </p>
          </CardContent>
        </Card>
      ) : null}


      {/* REAL ERROR */}
      {realError ? (
        <Card>
          <CardContent className="py-10 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <TriangleAlert className="size-7" />
            </div>

            <h2 className="mt-4 font-bold">
              Monitoring Tidak Dapat Dimuat
            </h2>

            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Terjadi gangguan saat mengambil
              data monitoring. Silakan coba
              kembali.
            </p>

            <Button
              type="button"
              variant="outline"
              className="mt-4 min-h-11 gap-2"
              disabled={
                monitoringQuery.isFetching
              }
              onClick={() =>
                void monitoringQuery.refetch()
              }
            >
              <RefreshCw
                className={
                  monitoringQuery.isFetching
                    ? "size-4 animate-spin"
                    : "size-4"
                }
              />

              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      ) : null}


      {/* ASSIGNED DEVICE */}
      {device ? (
        <>
          {/* DEVICE INACTIVE */}
          {deviceInactive ? (
            <Alert>
              <WifiOff className="size-4" />

              <AlertDescription>
                Perangkat monitoring sedang
                tidak aktif. Data terakhir tetap
                dapat ditampilkan jika tersedia,
                tetapi tidak boleh dianggap
                sebagai kondisi realtime.
              </AlertDescription>
            </Alert>
          ) : null}


          {/* NO READING */}
          {!reading ? (
            <Card>
              <CardContent className="py-10 text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
                  <Clock3 className="size-7 text-muted-foreground" />
                </div>

                <h2 className="mt-4 font-bold">
                  Menunggu Pembacaan
                </h2>

                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  Perangkat sudah ditetapkan,
                  tetapi belum ada data H₂S
                  yang diterima dari sensor.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* MAIN READING */}
              <Card
                className={
                  !readingIsHistorical &&
                  (
                    severity ===
                      "DANGER" ||
                    severity ===
                      "CRITICAL"
                  )
                    ? "overflow-hidden border-destructive/30 shadow-sm"
                    : !readingIsHistorical &&
                        (
                          severity ===
                            "WARNING" ||
                          severity ===
                            "CAUTION"
                        )
                      ? "overflow-hidden border-status-warning/30 shadow-sm"
                      : !readingIsHistorical &&
                          severity ===
                            "NORMAL"
                        ? "overflow-hidden border-status-normal/20 shadow-sm"
                        : "overflow-hidden shadow-sm"
                }
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardDescription>
                        {readingLabel}
                      </CardDescription>

                      <CardTitle className="mt-1">
                        Pembacaan Lingkungan
                      </CardTitle>
                    </div>

                    {severity ? (
                      <SeverityBadge
                        severity={
                          severity
                        }
                      />
                    ) : (
                      <Badge variant="outline">
                        {reading.status ||
                          "Tidak diketahui"}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="flex items-end gap-2">
                    <span className="numeric-data text-5xl font-black tracking-tight">
                      {formatNumber(
                        reading.ppm,
                        3,
                      )}
                    </span>

                    <span className="mb-1 text-base font-medium text-muted-foreground">
                      ppm
                    </span>
                  </div>


                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        freshness.stale
                          ? "rounded-full border-status-warning/30 bg-status-warning/5 text-status-warning"
                          : "rounded-full"
                      }
                    >
                      <Clock3 className="mr-1 size-3.5" />

                      {freshness.label}
                    </Badge>

                    <Badge
                      variant="outline"
                      className="rounded-full"
                    >
                      {reading.simulated
                        ? "Simulasi"
                        : "Sensor fisik"}
                    </Badge>

                    {deviceInactive ? (
                      <Badge
                        variant="outline"
                        className="rounded-full"
                      >
                        Perangkat tidak aktif
                      </Badge>
                    ) : null}
                  </div>


                  <p className="mt-3 text-xs text-muted-foreground">
                    {formatReadingAge(
                      readingAge,
                    )}
                    {" · "}
                    {formatDateTime(
                      reading.received_at,
                    )}
                  </p>
                </CardContent>
              </Card>


              {/* STALE */}
              {freshness.stale ? (
                <Alert>
                  <Clock3 className="size-4" />

                  <AlertDescription>
                    Pembacaan ini sudah lama.
                    Nilai ditampilkan sebagai
                    data terakhir yang tersedia
                    dan bukan kondisi lingkungan
                    realtime saat ini.
                  </AlertDescription>
                </Alert>
              ) : null}


              {/* GUIDANCE */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {severity ===
                      "NORMAL" &&
                    !readingIsHistorical ? (
                      <CheckCircle2 className="size-5 text-status-normal" />
                    ) : (
                      <ShieldAlert className="size-5 text-status-warning" />
                    )}

                    {guidance.title}
                  </CardTitle>

                  <CardDescription>
                    {readingIsHistorical
                      ? "Arahan berdasarkan data terakhir yang tersedia."
                      : "Arahan berdasarkan kondisi lingkungan H₂S terbaru yang diterima sistem."}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <p className="text-sm leading-relaxed">
                    {guidance.message}
                  </p>

                  {readingIsHistorical ? (
                    <div className="rounded-xl bg-muted/40 p-3">
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Karena data ini tidak
                        realtime, perhatikan kondisi
                        aktual di lapangan dan ikuti
                        arahan petugas keselamatan.
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </>
          )}


          {/* DEVICE INFO */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Area Monitoring
              </CardTitle>

              <CardDescription>
                Perangkat ditetapkan oleh
                petugas dan tidak dapat diganti
                dari akun Worker.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <RadioTower className="size-5" />
                </div>

                <div className="min-w-0">
                  <p className="font-semibold">
                    {device.name?.trim() ||
                      device.device_code}
                  </p>

                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {device.device_code}
                  </p>
                </div>
              </div>


              <div className="flex items-start gap-3 rounded-xl border bg-muted/20 p-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    Lokasi
                  </p>

                  <p className="mt-0.5 text-sm font-medium">
                    {device.location?.trim() ||
                      "Lokasi belum ditentukan"}
                  </p>
                </div>
              </div>


              <div className="flex items-start gap-2 rounded-xl bg-muted/30 p-3">
                <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

                <p className="text-xs leading-relaxed text-muted-foreground">
                  Halaman ini menunjukkan
                  kondisi lingkungan berdasarkan
                  sensor H₂S. Informasi ini bukan
                  diagnosis kesehatan dan bukan
                  hasil Risk Quotient ARKL.
                </p>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}