import {
  useMemo,
} from "react"
import {
  useQuery,
} from "@tanstack/react-query"
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react"
import {
  useNavigate,
  useParams,
} from "react-router-dom"

import {
  getMyAlerts,
} from "@/api/worker"

import {
  AlertLevelBadge,
} from "@/components/status/AlertLevelBadge"
import {
  AlertStatusBadge,
} from "@/components/status/AlertStatusBadge"
import {
  RiskBadge,
} from "@/components/status/RiskBadge"
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


type AlertLevel =
  | "NONE"
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL"


const SEVERITIES: Severity[] = [
  "NORMAL",
  "CAUTION",
  "WARNING",
  "DANGER",
  "CRITICAL",
]


function asSeverity(
  value:
    | string
    | null
    | undefined,
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

  if (
    !Number.isFinite(
      number,
    )
  ) {
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
  value:
    | string
    | null
    | undefined,
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
      timeStyle: "short",
    },
  ).format(date)
}


function getWorkerMessage(
  level: AlertLevel,
) {
  switch (level) {
    case "LOW":
      return (
        "Kadar H₂S mulai meningkat. " +
        "Batasi waktu berada di area ini."
      )

    case "MEDIUM":
      return (
        "Kadar H₂S tinggi. Sebaiknya " +
        "menjauh dari area ini dan gunakan " +
        "perlindungan yang dianjurkan."
      )

    case "HIGH":
      return (
        "Kondisi berbahaya. Segera " +
        "tinggalkan area dan menuju " +
        "tempat yang lebih aman."
      )

    case "CRITICAL":
      return (
        "BAHAYA SERIUS. Segera keluar " +
        "dari area dan ikuti arahan " +
        "petugas keselamatan."
      )

    case "NONE":
    default:
      return (
        "Kondisi terkendali. Tetap bekerja " +
        "sesuai prosedur keselamatan."
      )
  }
}


function DetailSkeleton() {
  return (
    <div className="space-y-5 p-4">
      <Skeleton className="h-12 w-32" />
      <Skeleton className="h-64 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-52 rounded-2xl" />
    </div>
  )
}


export function WorkerAlertDetailPage() {
  const navigate =
    useNavigate()

  const {
    id,
  } =
    useParams()


  const alertId =
    Number(id)


  const validAlertId =
    Number.isInteger(
      alertId,
    ) &&
    alertId > 0


  const alertsQuery =
    useQuery({
      queryKey: [
        "worker",
        "alerts",
      ],

      queryFn:
        getMyAlerts,

      refetchInterval:
        15_000,
    })


  const alert =
    useMemo(() => {
      if (
        !validAlertId ||
        !alertsQuery.data
      ) {
        return null
      }

      return (
        alertsQuery.data.find(
          (item) =>
            item.id ===
            alertId,
        ) ?? null
      )
    }, [
      alertId,
      alertsQuery.data,
      validAlertId,
    ])


  const hasUsableData =
    Boolean(
      alertsQuery.data,
    )


  if (
    alertsQuery.isPending &&
    !hasUsableData
  ) {
    return (
      <DetailSkeleton />
    )
  }


  if (!validAlertId) {
    return (
      <div className="space-y-4 p-4">
        <Alert variant="destructive">
          <TriangleAlert className="size-4" />

          <AlertDescription>
            ID peringatan tidak valid.
          </AlertDescription>
        </Alert>

        <Button
          type="button"
          variant="outline"
          className="min-h-11 gap-2"
          onClick={() =>
            navigate(
              "/worker/alerts",
            )
          }
        >
          <ArrowLeft className="size-4" />

          Kembali
        </Button>
      </div>
    )
  }


  if (
    alertsQuery.isError &&
    !hasUsableData
  ) {
    return (
      <div className="space-y-4 p-4">
        <Card>
          <CardContent className="py-10 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <TriangleAlert className="size-7" />
            </div>

            <h1 className="mt-4 font-bold">
              Detail Peringatan Tidak Dapat Dimuat
            </h1>

            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Sistem belum dapat mengambil
              data peringatan ini. Silakan
              coba kembali.
            </p>

            <Button
              type="button"
              variant="outline"
              className="mt-4 min-h-11 gap-2"
              disabled={
                alertsQuery.isFetching
              }
              onClick={() =>
                void alertsQuery.refetch()
              }
            >
              <RefreshCw
                className={
                  alertsQuery.isFetching
                    ? "size-4 animate-spin"
                    : "size-4"
                }
              />

              Coba Lagi
            </Button>
          </CardContent>
        </Card>

        <Button
          type="button"
          variant="ghost"
          className="min-h-11 gap-2"
          onClick={() =>
            navigate(
              "/worker/alerts",
            )
          }
        >
          <ArrowLeft className="size-4" />

          Kembali ke Peringatan
        </Button>
      </div>
    )
  }


  if (
    !alertsQuery.isPending &&
    !alertsQuery.isError &&
    !alert
  ) {
    return (
      <div className="space-y-4 p-4">
        <Alert>
          <ShieldAlert className="size-4" />

          <AlertDescription>
            Peringatan tidak ditemukan atau
            bukan bagian dari data Anda.
          </AlertDescription>
        </Alert>

        <Button
          type="button"
          variant="outline"
          className="min-h-11 gap-2"
          onClick={() =>
            navigate(
              "/worker/alerts",
            )
          }
        >
          <ArrowLeft className="size-4" />

          Kembali
        </Button>
      </div>
    )
  }


  if (!alert) {
    return null
  }


  const severity =
    asSeverity(
      alert.environmental_severity,
    )


  const isResolved =
    alert.status ===
    "RESOLVED"


  return (
    <div className="space-y-5 p-4 pb-6">
      {/* HEADER */}
      <section className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 gap-2 px-2"
          onClick={() =>
            navigate(
              "/worker/alerts",
            )
          }
        >
          <ArrowLeft className="size-4" />

          Kembali
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11"
          disabled={
            alertsQuery.isFetching
          }
          onClick={() =>
            void alertsQuery.refetch()
          }
          aria-label="Perbarui peringatan"
          title="Perbarui"
        >
          <RefreshCw
            className={
              alertsQuery.isFetching
                ? "size-5 animate-spin"
                : "size-5"
            }
          />
        </Button>
      </section>


      {/* PARTIAL REFRESH ERROR */}
      {alertsQuery.isError &&
      hasUsableData ? (
        <Alert variant="destructive">
          <TriangleAlert className="size-4" />

          <AlertDescription>
            Pembaruan data gagal.
            Informasi terakhir yang
            berhasil dimuat tetap
            ditampilkan.
          </AlertDescription>
        </Alert>
      ) : null}


      {/* SNAPSHOT ALERT */}
      <Card
        className={
          isResolved
            ? "border-status-normal/20 shadow-sm"
            : "border-status-warning/20 shadow-sm"
        }
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardDescription>
                Detail Peringatan
              </CardDescription>

              <CardTitle className="mt-1">
                Kondisi Saat Peringatan Dibuat
              </CardTitle>
            </div>

            <AlertStatusBadge
              status={
                alert.status
              }
            />
          </div>
        </CardHeader>


        <CardContent className="space-y-6">
          <Alert>
            <Clock3 className="size-4" />

            <AlertDescription>
              Data berikut merupakan
              snapshot kondisi yang
              tercatat ketika peringatan
              dibuat. Nilai ini bukan
              kondisi lingkungan realtime
              saat ini.
            </AlertDescription>
          </Alert>


          <div className="rounded-2xl bg-muted/30 p-5 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              H₂S Saat Peringatan
            </p>

            <div className="mt-2 flex items-end justify-center gap-2">
              <span className="numeric-data text-5xl font-black tracking-tight">
                {formatNumber(
                  alert.concentration_ppm,
                  3,
                )}
              </span>

              <span className="mb-1 font-medium text-muted-foreground">
                ppm
              </span>
            </div>


            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <AlertLevelBadge
                level={
                  alert.alert_level
                }
              />

              {severity ? (
                <SeverityBadge
                  severity={
                    severity
                  }
                />
              ) : null}
            </div>
          </div>


          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Risk Quotient
              </p>

              <p className="numeric-data mt-2 text-2xl font-bold">
                {formatNumber(
                  alert.rq,
                  3,
                )}
              </p>
            </div>


            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Risiko
              </p>

              <div className="mt-2">
                {alert.risk_interpretation ===
                "WITHIN_REFERENCE_LEVEL" ? (
                  <RiskBadge interpretation="WITHIN_REFERENCE_LEVEL" />
                ) : alert.risk_interpretation ===
                  "ABOVE_REFERENCE_LEVEL" ? (
                  <RiskBadge interpretation="ABOVE_REFERENCE_LEVEL" />
                ) : (
                  <Badge variant="outline">
                    {alert.risk_interpretation}
                  </Badge>
                )}
              </div>
            </div>
          </div>


          <div className="rounded-xl border bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">
              Waktu peringatan dibuat
            </p>

            <div className="mt-2 flex items-center gap-2">
              <Clock3 className="size-4 text-muted-foreground" />

              <p className="text-sm font-medium">
                {formatDateTime(
                  alert.created_at,
                )}
              </p>
            </div>
          </div>


          <p className="text-xs leading-relaxed text-muted-foreground">
            Nilai Risk Quotient pada
            peringatan ini merupakan hasil
            karakterisasi risiko pajanan,
            bukan diagnosis penyakit.
          </p>
        </CardContent>
      </Card>


      {/* GUIDANCE */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Apa yang Perlu Dilakukan?
          </CardTitle>

          <CardDescription>
            Arahan keselamatan yang
            berkaitan dengan peringatan
            ini.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div
            className={
              isResolved
                ? "flex gap-4 rounded-xl bg-status-normal/10 p-4"
                : "flex gap-4 rounded-xl bg-status-warning/10 p-4"
            }
          >
            <div
              className={
                isResolved
                  ? "flex size-11 shrink-0 items-center justify-center rounded-xl bg-status-normal/15 text-status-normal"
                  : "flex size-11 shrink-0 items-center justify-center rounded-xl bg-status-warning/15 text-status-warning"
              }
            >
              {isResolved ? (
                <CheckCircle2 className="size-5" />
              ) : (
                <ShieldAlert className="size-5" />
              )}
            </div>

            <div>
              <p className="font-semibold">
                {isResolved
                  ? "Peringatan sudah selesai"
                  : "Perhatikan peringatan ini"}
              </p>

              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {isResolved
                  ? (
                    "Peringatan ini sudah " +
                    "diselesaikan oleh petugas. " +
                    "Tetap ikuti prosedur " +
                    "keselamatan yang berlaku."
                  )
                  : getWorkerMessage(
                      alert.alert_level,
                    )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* HANDLING */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Status Penanganan
          </CardTitle>

          <CardDescription>
            Riwayat tindakan yang dicatat
            oleh petugas untuk peringatan
            ini.
          </CardDescription>
        </CardHeader>


        <CardContent className="space-y-4">
          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">
              Peringatan Dibuat
            </p>

            <div className="mt-2 flex items-center gap-2">
              <Clock3 className="size-4 text-muted-foreground" />

              <p className="font-medium">
                {formatDateTime(
                  alert.created_at,
                )}
              </p>
            </div>
          </div>


          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">
              Ditanggapi Petugas
            </p>

            <p className="mt-2 font-medium">
              {alert.acknowledged_at
                ? formatDateTime(
                    alert.acknowledged_at,
                  )
                : "Belum ditanggapi"}
            </p>

            {alert.acknowledged_by_username ? (
              <p className="mt-1 text-sm text-muted-foreground">
                oleh{" "}
                {
                  alert.acknowledged_by_username
                }
              </p>
            ) : null}
          </div>


          <div className="rounded-xl border p-4">
            <p className="text-sm text-muted-foreground">
              Diselesaikan
            </p>

            <p className="mt-2 font-medium">
              {alert.resolved_at
                ? formatDateTime(
                    alert.resolved_at,
                  )
                : "Belum selesai"}
            </p>

            {alert.resolved_by_username ? (
              <p className="mt-1 text-sm text-muted-foreground">
                oleh{" "}
                {
                  alert.resolved_by_username
                }
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}