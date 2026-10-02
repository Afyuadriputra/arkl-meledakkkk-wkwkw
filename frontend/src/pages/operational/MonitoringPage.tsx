import {
  useMemo,
  useState,
} from "react"
import {
  useQuery,
} from "@tanstack/react-query"
import {
  Activity,
  Clock3,
  Database,
  RadioTower,
  RefreshCw,
  Satellite,
  TriangleAlert,
  Waves,
} from "lucide-react"

import {
  getDevices,
  getLatestReading,
  getReadings,
} from "@/api/monitoring"

import { H2SHistoryChart } from "@/components/data-display/H2SHistoryChart"
import { PageContainer } from "@/components/layout/PageContainer"
import { PageHeader } from "@/components/layout/PageHeader"

import {
  SeverityBadge,
  type Severity,
} from "@/components/status/SeverityBadge"

import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const ALL_DEVICES_VALUE = "__all__"

const SEVERITIES: Severity[] = [
  "NORMAL",
  "CAUTION",
  "WARNING",
  "DANGER",
  "CRITICAL",
]

function asSeverity(
  value: string | null | undefined,
): Severity | null {
  if (!value) {
    return null
  }

  const normalized =
    value.trim().toUpperCase() as Severity

  return SEVERITIES.includes(normalized)
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
    return String(value)
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
    timeStyle: "medium",
  }).format(date)
}

function ReadingStatus({
  status,
}: {
  status: string
}) {
  const severity =
    asSeverity(status)

  if (severity) {
    return (
      <SeverityBadge
        severity={severity}
      />
    )
  }

  return (
    <Badge
      variant="outline"
      className="rounded-full"
    >
      {status || "Tidak diketahui"}
    </Badge>
  )
}

function SourceBadge({
  simulated,
}: {
  simulated: boolean
}) {
  return (
    <Badge
      variant="outline"
      className="gap-1.5 rounded-full"
    >
      <Satellite className="size-3.5" />

      {simulated
        ? "Wokwi / Simulasi"
        : "Perangkat Fisik"}
    </Badge>
  )
}

function MonitoringSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full rounded-xl" />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>

      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
}

export function MonitoringPage() {
  const [
    selectedDeviceCode,
    setSelectedDeviceCode,
  ] = useState<string | null>(null)

  const devicesQuery = useQuery({
    queryKey: [
      "monitoring",
      "devices",
    ],
    queryFn: () =>
      getDevices({
        page: 1,
      }),
    staleTime: 60_000,
  })

  const selectedDeviceParams =
    useMemo(
      () =>
        selectedDeviceCode
          ? {
              device_code:
                selectedDeviceCode,
            }
          : {},
      [selectedDeviceCode],
    )

  const latestReadingQuery =
    useQuery({
      queryKey: [
        "monitoring",
        "latest",
        selectedDeviceCode,
      ],

      queryFn: () =>
        getLatestReading(
          selectedDeviceParams,
        ),

      refetchInterval: 5_000,
      refetchIntervalInBackground:
        true,
    })

  const readingsQuery = useQuery({
    queryKey: [
      "monitoring",
      "history",
      selectedDeviceCode,
    ],

    queryFn: () =>
      getReadings({
        page: 1,
        ...selectedDeviceParams,
      }),

    refetchInterval: 5_000,
    refetchIntervalInBackground: true,
  })

  const devices =
    devicesQuery.data?.results ?? []

  const latestReading =
    latestReadingQuery.data ?? null

  const readings =
    readingsQuery.data?.results ?? []

  const selectedDevice =
    selectedDeviceCode
      ? devices.find(
          (device) =>
            device.device_code ===
            selectedDeviceCode,
        ) ?? null
      : null

  const isInitialLoading =
    devicesQuery.isPending &&
    latestReadingQuery.isPending &&
    readingsQuery.isPending

  const hasAnyError =
    devicesQuery.isError ||
    latestReadingQuery.isError ||
    readingsQuery.isError

  const isRefreshing =
    latestReadingQuery.isFetching ||
    readingsQuery.isFetching

  function handleDeviceChange(
    value: string | null,
  ) {
    setSelectedDeviceCode(
      !value ||
        value === ALL_DEVICES_VALUE
        ? null
        : value,
    )
  }

  function refetchAll() {
    void devicesQuery.refetch()
    void latestReadingQuery.refetch()
    void readingsQuery.refetch()
  }

  return (
    <PageContainer>
      <PageHeader
        title="Pemantauan H₂S"
        description="Pantau telemetri H₂S yang diterima sistem dari Wokwi maupun perangkat sensor fisik."
        action={
          <Tooltip>
            <TooltipTrigger>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={refetchAll}
                disabled={
                  devicesQuery.isFetching ||
                  latestReadingQuery.isFetching ||
                  readingsQuery.isFetching
                }
                aria-label="Perbarui data"
              >
                <RefreshCw
                  className={
                    devicesQuery.isFetching ||
                    latestReadingQuery.isFetching ||
                    readingsQuery.isFetching
                      ? "size-4 animate-spin"
                      : "size-4"
                  }
                />
              </Button>
            </TooltipTrigger>

            <TooltipContent>
              Perbarui data
            </TooltipContent>
          </Tooltip>
        }
      />

      <div className="mt-8">
        {isInitialLoading ? (
          <MonitoringSkeleton />
        ) : (
          <div className="space-y-6">
            {hasAnyError ? (
              <Alert variant="destructive">
                <TriangleAlert className="size-4" />

                <AlertDescription>
                  Sebagian data pemantauan
                  tidak dapat dimuat.
                  Data yang tersedia tetap
                  ditampilkan.
                </AlertDescription>
              </Alert>
            ) : null}

            {/* Control bar */}
            <Card>
              <CardContent className="flex flex-col gap-5 p-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="w-full max-w-md space-y-2">
                  <label
                    htmlFor="device-filter"
                    className="text-sm font-medium"
                  >
                    Perangkat
                  </label>

                  <Select
                    value={
                      selectedDeviceCode ??
                      ALL_DEVICES_VALUE
                    }
                    onValueChange={
                      handleDeviceChange
                    }
                  >
                    <SelectTrigger
                      id="device-filter"
                      className="min-h-11 w-full"
                    >
                      <SelectValue placeholder="Semua perangkat" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem
                        value={
                          ALL_DEVICES_VALUE
                        }
                      >
                        Semua perangkat
                      </SelectItem>

                      {devices.map(
                        (device) => (
                          <SelectItem
                            key={device.id}
                            value={
                              device.device_code
                            }
                          >
                            {device.name
                              ? `${device.name} — ${device.device_code}`
                              : device.device_code}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className="gap-1.5 rounded-full"
                  >
                    <span
                      className={
                        isRefreshing
                          ? "size-2 animate-pulse rounded-full bg-primary"
                          : "size-2 rounded-full bg-primary"
                      }
                    />

                    Auto-refresh 5 detik
                  </Badge>

                  {selectedDevice ? (
                    <Badge
                      variant="outline"
                      className="rounded-full"
                    >
                      {selectedDevice.is_active
                        ? "Perangkat aktif"
                        : "Perangkat tidak aktif"}
                    </Badge>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {/* Primary monitoring */}
            <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
              {/* Main H2S */}
              <Card className="overflow-hidden">
                <CardHeader className="border-b">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Waves className="size-5 text-primary" />
                        H₂S Terkini
                      </CardTitle>

                      <CardDescription className="mt-1">
                        Pembacaan terbaru yang
                        sudah diterima backend.
                      </CardDescription>
                    </div>

                    {latestReading ? (
                      <ReadingStatus
                        status={
                          latestReading.status
                        }
                      />
                    ) : null}
                  </div>
                </CardHeader>

                <CardContent className="p-6">
                  {latestReadingQuery.isPending ? (
                    <Skeleton className="h-52 w-full" />
                  ) : latestReadingQuery.isError ? (
                    <div className="flex min-h-52 flex-col items-center justify-center text-center">
                      <TriangleAlert className="size-9 text-destructive" />

                      <p className="mt-3 font-medium">
                        Data terbaru tidak
                        dapat dimuat
                      </p>

                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() =>
                          void latestReadingQuery.refetch()
                        }
                      >
                        <RefreshCw className="size-4" />
                        Coba Lagi
                      </Button>
                    </div>
                  ) : latestReading ? (
                    <div className="space-y-8">
                      <div>
                        <div className="flex items-end gap-3">
                          <span className="numeric-data text-6xl font-black tracking-tight sm:text-7xl">
                            {formatNumber(
                              latestReading.ppm,
                              3,
                            )}
                          </span>

                          <span className="mb-2 text-lg font-semibold text-muted-foreground">
                            ppm
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <Clock3 className="size-4" />

                          <span>
                            Diterima{" "}
                            {formatDateTime(
                              latestReading.received_at,
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border bg-muted/20 p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Perangkat
                          </p>

                          <p className="mt-2 truncate font-semibold">
                            {
                              latestReading.device_code
                            }
                          </p>
                        </div>

                        <div className="rounded-xl border bg-muted/20 p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Level
                          </p>

                          <p className="numeric-data mt-2 text-xl font-bold">
                            {
                              latestReading.level
                            }
                          </p>
                        </div>

                        <div className="rounded-xl border bg-muted/20 p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Sumber
                          </p>

                          <div className="mt-2">
                            <SourceBadge
                              simulated={
                                latestReading.simulated
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-52 flex-col items-center justify-center text-center">
                      <Activity className="size-10 text-muted-foreground/40" />

                      <p className="mt-3 font-medium">
                        Belum ada pembacaan
                      </p>

                      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                        Data akan muncul setelah
                        backend menerima telemetri
                        dari perangkat.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Context */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    Konteks Perangkat
                  </CardTitle>

                  <CardDescription>
                    Informasi sumber telemetri
                    yang sedang dipantau.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">
                  {selectedDevice ? (
                    <>
                      <div className="rounded-xl border p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <RadioTower className="size-5" />
                          </div>

                          <div className="min-w-0">
                            <p className="font-semibold">
                              {selectedDevice.name ||
                                selectedDevice.device_code}
                            </p>

                            <p className="mt-1 truncate text-sm text-muted-foreground">
                              {
                                selectedDevice.device_code
                              }
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Lokasi
                          </p>

                          <p className="mt-1 font-medium">
                            {selectedDevice.location ||
                              "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground">
                            Status perangkat
                          </p>

                          <div className="mt-1">
                            <Badge variant="outline">
                              {selectedDevice.is_active
                                ? "Aktif"
                                : "Tidak Aktif"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : latestReading ? (
                    <div className="rounded-xl border p-4">
                      <p className="text-sm text-muted-foreground">
                        Pembacaan terakhir
                      </p>

                      <p className="mt-2 font-semibold">
                        {
                          latestReading.device_code
                        }
                      </p>

                      <div className="mt-3">
                        <SourceBadge
                          simulated={
                            latestReading.simulated
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-40 flex-col items-center justify-center text-center">
                      <RadioTower className="size-9 text-muted-foreground/40" />

                      <p className="mt-3 text-sm text-muted-foreground">
                        Pilih perangkat untuk
                        melihat detail.
                      </p>
                    </div>
                  )}

                  <div className="rounded-xl bg-muted/40 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Pembaruan Data
                    </p>

                    <p className="mt-2 text-sm leading-relaxed">
                      Dashboard meminta data terbaru
                      dari backend setiap 5 detik.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Trend */}
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>
                      Tren H₂S
                    </CardTitle>

                    <CardDescription className="mt-1">
                      Perubahan konsentrasi H₂S dari
                      pembacaan terbaru yang tersedia.
                    </CardDescription>
                  </div>

                  <Badge
                    variant="outline"
                    className="w-fit gap-1.5 rounded-full"
                  >
                    <Activity className="size-3.5" />

                    {readings.length} titik
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                {readingsQuery.isPending ? (
                  <Skeleton className="h-64 w-full" />
                ) : readingsQuery.isError ? (
                  <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                    Grafik tidak dapat dimuat.
                  </div>
                ) : (
                  <H2SHistoryChart
                    readings={readings}
                  />
                )}
              </CardContent>
            </Card>

            {/* History */}
            <Card>
              <CardHeader className="border-b">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="size-5 text-primary" />
                      Riwayat Pembacaan
                    </CardTitle>

                    <CardDescription className="mt-1">
                      Telemetri terbaru yang sudah
                      disimpan di backend.
                    </CardDescription>
                  </div>

                  <Badge
                    variant="outline"
                    className="w-fit rounded-full"
                  >
                    {readingsQuery.data?.count ??
                      0}{" "}
                    data
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {readingsQuery.isPending ? (
                  <div className="space-y-3 p-6">
                    {Array.from({
                      length: 6,
                    }).map((_, index) => (
                      <Skeleton
                        key={index}
                        className="h-12 w-full"
                      />
                    ))}
                  </div>
                ) : readingsQuery.isError ? (
                  <div className="py-12 text-center">
                    <TriangleAlert className="mx-auto size-8 text-destructive" />

                    <p className="mt-3 font-medium">
                      Riwayat tidak dapat dimuat
                    </p>

                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() =>
                        void readingsQuery.refetch()
                      }
                    >
                      <RefreshCw className="size-4" />
                      Coba Lagi
                    </Button>
                  </div>
                ) : readings.length === 0 ? (
                  <div className="py-14 text-center">
                    <Database className="mx-auto size-10 text-muted-foreground/40" />

                    <p className="mt-3 font-medium">
                      Belum ada riwayat
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                      Data sensor akan muncul
                      setelah telemetri diterima.
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
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-card shadow-sm">
                        <TableRow>
                          <TableHead>
                            Waktu
                          </TableHead>

                          <TableHead>
                            Perangkat
                          </TableHead>

                          <TableHead>
                            H₂S
                          </TableHead>

                          <TableHead>
                            Level
                          </TableHead>

                          <TableHead>
                            Status
                          </TableHead>

                          <TableHead>
                            Sumber
                          </TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {readings.map(
                          (reading) => (
                            <TableRow
                              key={
                                reading.id
                              }
                              className="transition-colors"
                            >
                              <TableCell className="whitespace-nowrap text-muted-foreground">
                                {formatDateTime(
                                  reading.received_at,
                                )}
                              </TableCell>

                              <TableCell className="font-medium">
                                {
                                  reading.device_code
                                }
                              </TableCell>

                              <TableCell className="numeric-data whitespace-nowrap font-semibold">
                                {formatNumber(
                                  reading.ppm,
                                  3,
                                )}{" "}
                                ppm
                              </TableCell>

                              <TableCell className="numeric-data">
                                {
                                  reading.level
                                }
                              </TableCell>

                              <TableCell>
                                <ReadingStatus
                                  status={
                                    reading.status
                                  }
                                />
                              </TableCell>

                              <TableCell>
                                <SourceBadge
                                  simulated={
                                    reading.simulated
                                  }
                                />
                              </TableCell>
                            </TableRow>
                          ),
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {readings.length > 0 ? (
                  <div className="flex items-center justify-between border-t bg-muted/20 px-5 py-3 text-xs text-muted-foreground">
                    <span>
                      Scroll untuk melihat data lainnya
                    </span>

                    <span>
                      Pembaruan otomatis 5 detik
                    </span>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageContainer>
  )
}