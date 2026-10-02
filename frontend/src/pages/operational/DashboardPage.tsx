import {
  useQuery,
} from "@tanstack/react-query"

import {
  Activity,
  BellRing,
  Calculator,
  Clock3,
  RadioTower,
  RefreshCw,
  TriangleAlert,
} from "lucide-react"

import {
  getAlerts,
} from "@/api/alerts"

import {
  getARKLResults,
} from "@/api/arkl"

import {
  getLatestReading,
} from "@/api/monitoring"

import {
  MetricCard,
} from "@/components/data-display/MetricCard"

import {
  PageContainer,
} from "@/components/layout/PageContainer"

import {
  PageHeader,
} from "@/components/layout/PageHeader"

import {
  AlertLevelBadge,
} from "@/components/status/AlertLevelBadge"

import {
  AlertStatusBadge,
} from "@/components/status/AlertStatusBadge"

import {
  RiskBadge,
  type RiskInterpretation,
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

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"


// Display-only conversion; mirrors Backend/arkl/services/constants.py.
// This does not recalculate ARKL or change the backend's scientific constants.
const H2S_PPM_TO_MG_M3 = 1.40

function convertH2SPpmToMgM3(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null

  const ppm = Number(value)
  return Number.isFinite(ppm) && ppm >= 0 ? ppm * H2S_PPM_TO_MG_M3 : null
}

const MONITORING_REFETCH_INTERVAL_MS =
  5_000

const ARKL_REFETCH_INTERVAL_MS =
  10_000

const ALERT_REFETCH_INTERVAL_MS =
  10_000


const SEVERITIES: Severity[] = [
  "NORMAL",
  "CAUTION",
  "WARNING",
  "DANGER",
  "CRITICAL",
]


const RISK_INTERPRETATIONS:
  RiskInterpretation[] = [
    "WITHIN_REFERENCE_LEVEL",
    "ABOVE_REFERENCE_LEVEL",
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


function asRiskInterpretation(
  value:
    | string
    | null
    | undefined,
): RiskInterpretation | null {
  if (!value) {
    return null
  }

  const normalized =
    value
      .trim()
      .toUpperCase() as RiskInterpretation

  return RISK_INTERPRETATIONS.includes(
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
  maximumFractionDigits = 2,
): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—"
  }

  const numericValue =
    typeof value === "number"
      ? value
      : Number(value)

  if (
    !Number.isFinite(
      numericValue,
    )
  ) {
    return "—"
  }

  return new Intl.NumberFormat(
    "id-ID",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits,
    },
  ).format(
    numericValue,
  )
}


function formatDateTime(
  value:
    | string
    | null
    | undefined,
): string {
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
  ).format(
    date,
  )
}


function getTimestamp(
  value:
    | string
    | null
    | undefined,
): number {
  if (!value) {
    return 0
  }

  const timestamp =
    Date.parse(value)

  return Number.isFinite(timestamp)
    ? timestamp
    : 0
}


function getNewestResult<
  T extends {
    id: number | string
    created_at:
      | string
      | null
      | undefined
  },
>(
  results: T[],
): T | null {
  if (results.length === 0) {
    return null
  }

  return results.reduce(
    (
      newest,
      current,
    ) => {
      const newestTime =
        getTimestamp(
          newest.created_at,
        )

      const currentTime =
        getTimestamp(
          current.created_at,
        )

      if (
        currentTime >
        newestTime
      ) {
        return current
      }

      if (
        currentTime ===
          newestTime &&
        Number(current.id) >
          Number(newest.id)
      ) {
        return current
      }

      return newest
    },
  )
}


function StatusFallback({
  value,
}: {
  value:
    | string
    | null
    | undefined
}) {
  return (
    <Badge
      variant="outline"
      className="rounded-full"
    >
      {value?.trim() ||
        "Tidak diketahui"}
    </Badge>
  )
}


function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({
          length: 3,
        }).map(
          (
            _,
            index,
          ) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-4 w-28" />
              </CardHeader>

              <CardContent className="space-y-3">
                <Skeleton className="h-10 w-36" />
                <Skeleton className="h-6 w-28" />
              </CardContent>
            </Card>
          ),
        )}
      </div>

      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  )
}


export function DashboardPage() {
  const latestReadingQuery =
    useQuery({
      queryKey: [
        "operational-dashboard",
        "latest-reading",
      ],

      queryFn: () =>
        getLatestReading(),

      refetchInterval:
        MONITORING_REFETCH_INTERVAL_MS,

      refetchIntervalInBackground:
        true,

      refetchOnWindowFocus:
        true,

      refetchOnReconnect:
        true,

      staleTime:
        2_000,
    })


  const latestARKLQuery =
    useQuery({
      queryKey: [
        "operational-dashboard",
        "latest-arkl",
        "REALTIME",
      ],

      queryFn: () =>
        getARKLResults({
          page: 1,
          calculation_type:
            "REALTIME",
        }),

      refetchInterval:
        ARKL_REFETCH_INTERVAL_MS,

      refetchIntervalInBackground:
        true,

      refetchOnWindowFocus:
        true,

      refetchOnReconnect:
        true,

      staleTime:
        2_000,
    })


  const openAlertsQuery =
    useQuery({
      queryKey: [
        "operational-dashboard",
        "alerts",
        "OPEN",
      ],

      queryFn: () =>
        getAlerts({
          page: 1,
          status: "OPEN",
        }),

      refetchInterval:
        ALERT_REFETCH_INTERVAL_MS,

      refetchIntervalInBackground:
        true,

      refetchOnWindowFocus:
        true,

      refetchOnReconnect:
        true,

      staleTime:
        5_000,
    })


  const acknowledgedAlertsQuery =
    useQuery({
      queryKey: [
        "operational-dashboard",
        "alerts",
        "ACKNOWLEDGED",
      ],

      queryFn: () =>
        getAlerts({
          page: 1,
          status:
            "ACKNOWLEDGED",
        }),

      refetchInterval:
        ALERT_REFETCH_INTERVAL_MS,

      refetchIntervalInBackground:
        true,

      refetchOnWindowFocus:
        true,

      refetchOnReconnect:
        true,

      staleTime:
        5_000,
    })


  const latestReading =
    latestReadingQuery.data ??
    null

  const latestConcentrationMgM3 = convertH2SPpmToMgM3(latestReading?.ppm)


  const latestARKLResults =
    latestARKLQuery.data
      ?.results ?? []


  const latestARKL =
    getNewestResult(
      latestARKLResults,
    )


  const openAlerts =
    openAlertsQuery.data
      ?.results ?? []


  const acknowledgedAlerts =
    acknowledgedAlertsQuery.data
      ?.results ?? []


  const activeAlerts =
    Array.from(
      new Map(
        [
          ...openAlerts,
          ...acknowledgedAlerts,
        ].map(
          (alert) => [
            alert.id,
            alert,
          ],
        ),
      ).values(),
    ).sort(
      (
        left,
        right,
      ) => {
        const leftTime =
          getTimestamp(
            left.created_at,
          )

        const rightTime =
          getTimestamp(
            right.created_at,
          )

        if (
          rightTime !==
          leftTime
        ) {
          return (
            rightTime -
            leftTime
          )
        }

        return (
          Number(right.id) -
          Number(left.id)
        )
      },
    )


  const activeAlertCount =
    (
      openAlertsQuery.data
        ?.count ?? 0
    ) +
    (
      acknowledgedAlertsQuery.data
        ?.count ?? 0
    )


  const readingSeverity =
    asSeverity(
      latestReading?.status,
    )


  const riskInterpretation =
    asRiskInterpretation(
      latestARKL?.interpretation,
    )


  const alertsPending =
    openAlertsQuery.isPending ||
    acknowledgedAlertsQuery
      .isPending


  const alertsFetching =
    openAlertsQuery.isFetching ||
    acknowledgedAlertsQuery
      .isFetching


  const alertsError =
    openAlertsQuery.isError ||
    acknowledgedAlertsQuery
      .isError


  const isInitialLoading =
    latestReadingQuery.isPending &&
    latestARKLQuery.isPending &&
    alertsPending


  const hasAnyError =
    latestReadingQuery.isError ||
    latestARKLQuery.isError ||
    alertsError


  const isRefreshing =
    latestReadingQuery.isFetching ||
    latestARKLQuery.isFetching ||
    alertsFetching


  function refetchDashboard() {
    void Promise.all([
      latestReadingQuery.refetch(),
      latestARKLQuery.refetch(),
      openAlertsQuery.refetch(),
      acknowledgedAlertsQuery
        .refetch(),
    ])
  }


  return (
    <PageContainer>
      <PageHeader
        title="Tinjauan Operasional"
        description="Pantau kondisi H₂S, hasil ARKL realtime terbaru, dan peringatan aktif yang diproses otomatis oleh sistem."
        action={
          <Button
            type="button"
            variant="outline"
            onClick={
              refetchDashboard
            }
            disabled={
              isRefreshing
            }
          >
            <RefreshCw
              className={
                isRefreshing
                  ? (
                    "size-4 " +
                    "animate-spin"
                  )
                  : "size-4"
              }
            />

            Perbarui
          </Button>
        }
      />


      <div className="mt-8">
        {isInitialLoading ? (
          <DashboardSkeleton />
        ) : (
          <div className="space-y-6">
            {hasAnyError ? (
              <Alert variant="destructive">
                <TriangleAlert className="size-4" />

                <AlertDescription>
                  Sebagian data dasbor
                  tidak dapat dimuat.
                  Data lain yang tersedia
                  tetap ditampilkan.
                </AlertDescription>
              </Alert>
            ) : null}


            <section
              aria-label="Ringkasan operasional"
              className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
            >
              <MetricCard
                label="H₂S Terbaru"
                value={
                  latestReading
                    ? formatNumber(
                        latestReading.ppm,
                        3,
                      )
                    : "—"
                }
                unit="ppm"
                icon={
                  <Activity className="size-5" />
                }
                status={
                  latestReading ? (
                    readingSeverity ? (
                      <SeverityBadge
                        severity={
                          readingSeverity
                        }
                      />
                    ) : (
                      <StatusFallback
                        value={
                          latestReading
                            .status
                        }
                      />
                    )
                  ) : undefined
                }
                description={
                  latestReading ? (
                    <div className="space-y-2">
                      <p className="numeric-data font-medium text-foreground">
                        ≈ {formatNumber(latestConcentrationMgM3, 4)} mg/m³
                      </p>
                      <p className="text-xs">Konversi ppm → mg/m³</p>
                      <p>
                        Perangkat{" "}
                        <strong className="font-medium text-foreground">
                          {latestReading.device_code}
                        </strong>
                      </p>
                    </div>
                  ) : (
                    "Belum ada pembacaan H₂S."
                  )
                }
              />


              <MetricCard
                label="RQ Realtime Terbaru"
                value={
                  latestARKL
                    ? formatNumber(
                        latestARKL.rq,
                        4,
                      )
                    : "—"
                }
                icon={
                  <Calculator className="size-5" />
                }
                status={
                  latestARKL &&
                  riskInterpretation ? (
                    <RiskBadge
                      interpretation={
                        riskInterpretation
                      }
                    />
                  ) : undefined
                }
                description={
                  latestARKL ? (
                    <span>
                      Pemulung{" "}
                      <strong className="font-medium text-foreground">
                        {
                          latestARKL
                            .worker_code
                        }
                      </strong>
                      {" • "}
                      {formatDateTime(
                        latestARKL
                          .created_at,
                      )}
                    </span>
                  ) : (
                    "Belum ada hasil ARKL realtime."
                  )
                }
              />


              <MetricCard
                label="Peringatan Aktif"
                value={
                  activeAlertCount
                }
                icon={
                  <BellRing className="size-5" />
                }
                description={
                  activeAlertCount > 0
                    ? (
                      "Peringatan OPEN " +
                      "atau ACKNOWLEDGED."
                    )
                    : (
                      "Tidak ada peringatan " +
                      "aktif saat ini."
                    )
                }
              />
            </section>


            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>
                      Kondisi H₂S Terbaru
                    </CardTitle>

                    <CardDescription className="mt-1">
                      Pembacaan lingkungan
                      terakhir yang diterima
                      backend dari perangkat
                      monitoring.
                    </CardDescription>
                  </div>


                  {latestReading ? (
                    <Badge
                      variant="outline"
                      className="w-fit gap-1.5 rounded-full"
                    >
                      <Clock3 className="size-3.5" />

                      {formatDateTime(
                        latestReading
                          .received_at,
                      )}
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>


              <CardContent>
                {latestReading ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border bg-muted/25 p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Activity className="size-4" />

                        Konsentrasi H₂S
                      </div>

                      <p className="numeric-data mt-3 text-2xl font-semibold">
                        {formatNumber(
                          latestReading.ppm,
                          3,
                        )}{" "}
                        <span className="text-sm font-normal text-muted-foreground">
                          ppm
                        </span>
                      </p>
                      <p className="numeric-data mt-2 text-lg font-medium">
                        ≈ {formatNumber(latestConcentrationMgM3, 4)}{" "}
                        <span className="text-sm font-normal text-muted-foreground">
                          mg/m³
                        </span>
                      </p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Konversi ppm → mg/m³: ppm × 1,40 (faktor H₂S backend).
                      </p>
                    </div>


                    <div className="rounded-xl border bg-muted/25 p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <RadioTower className="size-4" />

                        Perangkat
                      </div>

                      <p className="mt-3 break-words font-semibold">
                        {
                          latestReading
                            .device_code
                        }
                      </p>
                    </div>


                    <div className="rounded-xl border bg-muted/25 p-4">
                      <p className="text-sm text-muted-foreground">
                        Status Lingkungan
                      </p>

                      <div className="mt-3">
                        {readingSeverity ? (
                          <SeverityBadge
                            severity={
                              readingSeverity
                            }
                          />
                        ) : (
                          <StatusFallback
                            value={
                              latestReading
                                .status
                            }
                          />
                        )}
                      </div>
                    </div>


                    <div className="rounded-xl border bg-muted/25 p-4">
                      <p className="text-sm text-muted-foreground">
                        Sumber Data
                      </p>

                      <div className="mt-3">
                        <Badge
                          variant="outline"
                          className="rounded-full"
                        >
                          {
                            latestReading
                              .simulated
                              ? "Simulasi"
                              : "Sensor fisik"
                          }
                        </Badge>
                      </div>
                    </div>
                  </div>
                ) : latestReadingQuery
                    .isError ? (
                  <div className="py-8 text-center">
                    <p className="text-sm font-medium">
                      Pembacaan terbaru
                      tidak dapat dimuat.
                    </p>

                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4"
                      onClick={() =>
                        void latestReadingQuery
                          .refetch()
                      }
                    >
                      <RefreshCw className="size-4" />

                      Coba Lagi
                    </Button>
                  </div>
                ) : (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Belum ada pembacaan
                    H₂S yang tersedia.
                  </div>
                )}
              </CardContent>
            </Card>


            <Card>
              <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>
                      Peringatan Aktif Terbaru
                    </CardTitle>

                    <CardDescription className="mt-1">
                      Peringatan dengan lifecycle
                      OPEN atau ACKNOWLEDGED.
                      Peringatan RESOLVED tidak
                      dianggap aktif.
                    </CardDescription>
                  </div>

                  <Badge
                    variant="outline"
                    className="w-fit rounded-full"
                  >
                    {activeAlertCount} aktif
                  </Badge>
                </div>
              </CardHeader>


              <CardContent>
                {alertsPending ? (
                  <div className="space-y-3">
                    {Array.from({
                      length: 4,
                    }).map(
                      (
                        _,
                        index,
                      ) => (
                        <Skeleton
                          key={index}
                          className="h-12 w-full"
                        />
                      ),
                    )}
                  </div>
                ) : alertsError ? (
                  <div className="py-8 text-center">
                    <p className="text-sm font-medium">
                      Peringatan aktif
                      tidak dapat dimuat.
                    </p>

                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4"
                      onClick={() =>
                        void Promise.all([
                          openAlertsQuery
                            .refetch(),
                          acknowledgedAlertsQuery
                            .refetch(),
                        ])
                      }
                    >
                      <RefreshCw className="size-4" />

                      Coba Lagi
                    </Button>
                  </div>
                ) : (
                  activeAlerts.length === 0
                ) ? (
                  <div className="py-10 text-center">
                    <BellRing className="mx-auto size-9 text-muted-foreground/50" />

                    <p className="mt-3 font-medium">
                      Tidak ada peringatan aktif
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Sistem tidak mencatat
                      peringatan aktif saat ini.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            Pemulung
                          </TableHead>

                          <TableHead>
                            Perangkat
                          </TableHead>

                          <TableHead>
                            H₂S
                          </TableHead>

                          <TableHead>
                            RQ
                          </TableHead>

                          <TableHead>
                            Level
                          </TableHead>

                          <TableHead>
                            Status
                          </TableHead>

                          <TableHead>
                            Waktu
                          </TableHead>
                        </TableRow>
                      </TableHeader>


                      <TableBody>
                        {activeAlerts.map(
                          (
                            alert,
                          ) => (
                            <TableRow
                              key={
                                alert.id
                              }
                            >
                              <TableCell className="font-medium">
                                {
                                  alert
                                    .worker_code
                                }
                              </TableCell>

                              <TableCell>
                                {
                                  alert
                                    .device_code
                                }
                              </TableCell>

                              <TableCell className="numeric-data whitespace-nowrap">
                                {formatNumber(
                                  alert
                                    .concentration_ppm,
                                  3,
                                )}{" "}
                                ppm
                              </TableCell>

                              <TableCell className="numeric-data">
                                {formatNumber(
                                  alert.rq,
                                  4,
                                )}
                              </TableCell>

                              <TableCell>
                                <AlertLevelBadge
                                  level={
                                    alert
                                      .alert_level
                                  }
                                />
                              </TableCell>

                              <TableCell>
                                <AlertStatusBadge
                                  status={
                                    alert
                                      .status
                                  }
                                />
                              </TableCell>

                              <TableCell className="whitespace-nowrap text-muted-foreground">
                                {formatDateTime(
                                  alert
                                    .created_at,
                                )}
                              </TableCell>
                            </TableRow>
                          ),
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
