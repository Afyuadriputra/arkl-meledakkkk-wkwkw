import {
  useMemo,
} from "react"
import {
  useQuery,
} from "@tanstack/react-query"
import {
  BellRing,
  CheckCircle2,
  Clock3,
  RefreshCw,
  TriangleAlert,
} from "lucide-react"
import {
  useNavigate,
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


const ALERT_PRIORITY: Record<
  AlertLevel,
  number
> = {
  NONE: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
}


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


function WorkerAlertsSkeleton() {
  return (
    <div className="space-y-5 p-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-4 w-60" />
      </div>

      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  )
}


export function WorkerAlertsPage() {
  const navigate =
    useNavigate()


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


  const alerts =
    useMemo(
      () =>
        [
          ...(
            alertsQuery.data ??
            []
          ),
        ].sort(
          (a, b) =>
            Date.parse(
              b.created_at,
            ) -
            Date.parse(
              a.created_at,
            ),
        ),
      [
        alertsQuery.data,
      ],
    )


  const activeAlerts =
    useMemo(
      () =>
        alerts.filter(
          (alert) =>
            alert.status !==
            "RESOLVED",
        ),
      [
        alerts,
      ],
    )


  const highestActiveAlert =
    useMemo(
      () =>
        [
          ...activeAlerts,
        ].sort(
          (a, b) => {
            const priorityDifference =
              ALERT_PRIORITY[
                b.alert_level
              ] -
              ALERT_PRIORITY[
                a.alert_level
              ]

            if (
              priorityDifference !==
              0
            ) {
              return priorityDifference
            }

            return (
              Date.parse(
                b.created_at,
              ) -
              Date.parse(
                a.created_at,
              )
            )
          },
        )[0] ?? null,
      [
        activeAlerts,
      ],
    )


  const highestSeverity =
    asSeverity(
      highestActiveAlert
        ?.environmental_severity,
    )


  const hasUsableData =
    Boolean(
      alertsQuery.data,
    )


  if (
    alertsQuery.isPending &&
    !hasUsableData
  ) {
    return (
      <WorkerAlertsSkeleton />
    )
  }


  /*
   * Jika request gagal dan belum ada
   * cached data, jangan tampilkan state
   * "tidak ada peringatan".
   */
  if (
    alertsQuery.isError &&
    !hasUsableData
  ) {
    return (
      <div className="space-y-5 p-4 pb-6">
        <section>
          <p className="text-sm font-medium text-primary">
            Peringatan
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Peringatan Anda
          </h1>

          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Informasi peringatan yang
            berkaitan dengan kondisi
            pajanan Anda.
          </p>
        </section>

        <Card>
          <CardContent className="py-10 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <TriangleAlert className="size-7" />
            </div>

            <h2 className="mt-4 font-bold">
              Peringatan Tidak Dapat Dimuat
            </h2>

            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Sistem belum dapat mengambil
              data peringatan Anda. Kondisi
              peringatan saat ini belum dapat
              dipastikan.
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
      </div>
    )
  }


  return (
    <div className="space-y-5 p-4 pb-6">
      {/* HEADER */}
      <section className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">
            Peringatan
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Peringatan Anda
          </h1>

          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Peringatan keselamatan yang
            tercatat untuk Anda beserta
            riwayat sebelumnya.
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 shrink-0"
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
            Pembaruan data peringatan gagal.
            Data terakhir yang berhasil dimuat
            tetap ditampilkan.
          </AlertDescription>
        </Alert>
      ) : null}


      {/* ACTIVE STATUS */}
      <Card
        className={
          highestActiveAlert
            ? "border-status-warning/20 shadow-sm"
            : "shadow-sm"
        }
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardDescription>
                Status Peringatan
              </CardDescription>

              <CardTitle className="mt-1 text-lg">
                {highestActiveAlert
                  ? "Ada Peringatan Aktif"
                  : "Tidak Ada Peringatan Aktif"}
              </CardTitle>
            </div>

            {activeAlerts.length >
            0 ? (
              <Badge className="shrink-0 rounded-full">
                {activeAlerts.length} aktif
              </Badge>
            ) : null}
          </div>
        </CardHeader>

        <CardContent>
          {highestActiveAlert ? (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-status-warning/10 text-status-warning">
                  <BellRing className="size-6" />
                </div>

                <div className="min-w-0">
                  <p className="font-semibold">
                    Perhatikan kondisi ini
                  </p>

                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {getWorkerMessage(
                      highestActiveAlert
                        .alert_level,
                    )}
                  </p>
                </div>
              </div>


              <div className="flex flex-wrap gap-2">
                <AlertLevelBadge
                  level={
                    highestActiveAlert
                      .alert_level
                  }
                />

                <AlertStatusBadge
                  status={
                    highestActiveAlert
                      .status
                  }
                />

                {highestSeverity ? (
                  <SeverityBadge
                    severity={
                      highestSeverity
                    }
                  />
                ) : null}
              </div>


              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">
                    H₂S saat peringatan
                  </p>

                  <p className="numeric-data mt-1 font-bold">
                    {formatNumber(
                      highestActiveAlert
                        .concentration_ppm,
                      3,
                    )}{" "}
                    ppm
                  </p>
                </div>

                <div className="rounded-xl border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">
                    Dibuat
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {formatDateTime(
                      highestActiveAlert
                        .created_at,
                    )}
                  </p>
                </div>
              </div>


              <Button
                type="button"
                className="min-h-11 w-full justify-between"
                onClick={() =>
                  navigate(
                    `/worker/alerts/${highestActiveAlert.id}`,
                  )
                }
              >
                Lihat Detail Peringatan

                <BellRing className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                <CheckCircle2 className="size-6" />
              </div>

              <div>
                <p className="font-semibold">
                  Tidak ada peringatan aktif
                </p>

                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Sistem tidak mencatat
                  peringatan aktif untuk Anda
                  saat ini.
                </p>

                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  Status ini hanya menjelaskan
                  keberadaan peringatan aktif
                  dan tidak menyatakan bahwa
                  kondisi lingkungan atau risiko
                  pajanan pasti normal.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>


      {/* HISTORY */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">
                Riwayat Peringatan
              </CardTitle>

              <CardDescription className="mt-1">
                Peringatan yang pernah
                tercatat untuk Anda.
              </CardDescription>
            </div>

            <Badge
              variant="outline"
              className="shrink-0 rounded-full"
            >
              {alerts.length} data
            </Badge>
          </div>
        </CardHeader>


        <CardContent className="p-0">
          {alerts.length === 0 ? (
            <div className="py-14 text-center">
              <BellRing className="mx-auto size-10 text-muted-foreground/40" />

              <p className="mt-3 font-semibold">
                Belum Ada Riwayat Peringatan
              </p>

              <p className="mx-auto mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Jika sistem mencatat
                peringatan untuk Anda,
                riwayatnya akan ditampilkan
                di sini.
              </p>
            </div>
          ) : (
            <div
              className="
                max-h-[470px]
                overflow-y-auto
                overscroll-contain
                [scrollbar-gutter:stable]
              "
            >
              <div className="divide-y">
                {alerts.map(
                  (alert) => {
                    const severity =
                      asSeverity(
                        alert
                          .environmental_severity,
                      )

                    return (
                      <button
                        key={alert.id}
                        type="button"
                        className="
                          block
                          min-h-28
                          w-full
                          p-4
                          text-left
                          transition-colors
                          hover:bg-muted/40
                          focus-visible:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-inset
                          focus-visible:ring-ring
                        "
                        onClick={() =>
                          navigate(
                            `/worker/alerts/${alert.id}`,
                          )
                        }
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex flex-wrap gap-2">
                              <AlertLevelBadge
                                level={
                                  alert
                                    .alert_level
                                }
                              />

                              <AlertStatusBadge
                                status={
                                  alert
                                    .status
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

                            <span className="numeric-data shrink-0 text-sm font-bold">
                              {formatNumber(
                                alert
                                  .concentration_ppm,
                                3,
                              )}{" "}
                              ppm
                            </span>
                          </div>


                          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                            {getWorkerMessage(
                              alert
                                .alert_level,
                            )}
                          </p>


                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock3 className="size-3.5" />

                            {formatDateTime(
                              alert
                                .created_at,
                            )}
                          </div>
                        </div>
                      </button>
                    )
                  },
                )}
              </div>
            </div>
          )}


          {alerts.length > 0 ? (
            <div className="border-t bg-muted/20 px-4 py-3 text-center text-xs text-muted-foreground">
              Scroll untuk melihat
              peringatan lainnya
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}