import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  BellRing,
  FilterX,
  History,
  RefreshCw,
  TriangleAlert,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

import {
  getAlerts,
  type AlertLevel,
  type AlertStatus,
} from "@/api/alerts"

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
  SeverityBadge,
} from "@/components/status/SeverityBadge"

import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert"
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
  Input,
} from "@/components/ui/input"
import {
  Label,
} from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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


type StatusFilter =
  | "ALL"
  | AlertStatus

type LevelFilter =
  | "ALL"
  | Exclude<
      AlertLevel,
      "NONE"
    >


function formatNumber(
  value:
    | string
    | number
    | null
    | undefined,
  maximumFractionDigits = 4,
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


function AlertsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>

      <CardContent className="space-y-3">
        {Array.from({
          length: 6,
        }).map(
          (
            _,
            index,
          ) => (
            <Skeleton
              key={index}
              className="h-14 w-full"
            />
          ),
        )}
      </CardContent>
    </Card>
  )
}


export function AlertsPage() {
  const navigate =
    useNavigate()


  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>(
      "ALL",
    )


  const [
    levelFilter,
    setLevelFilter,
  ] =
    useState<LevelFilter>(
      "ALL",
    )


  const [
    workerCode,
    setWorkerCode,
  ] =
    useState("")


  const [
    deviceCode,
    setDeviceCode,
  ] =
    useState("")


  const alertsQuery =
    useQuery({
      queryKey: [
        "alerts",
        "list",
        statusFilter,
        levelFilter,
        workerCode,
        deviceCode,
      ],

      queryFn: () =>
        getAlerts({
          page: 1,

          ...(statusFilter !==
          "ALL"
            ? {
                status:
                  statusFilter,
              }
            : {}),

          ...(levelFilter !==
          "ALL"
            ? {
                alert_level:
                  levelFilter,
              }
            : {}),

          ...(workerCode.trim()
            ? {
                worker_code:
                  workerCode.trim(),
              }
            : {}),

          ...(deviceCode.trim()
            ? {
                device_code:
                  deviceCode.trim(),
              }
            : {}),
        }),

      staleTime:
        10_000,
    })


  const alerts =
    alertsQuery.data
      ?.results ?? []


  const totalAlerts =
    alertsQuery.data
      ?.count ?? 0


  const hasCachedData =
    alertsQuery.data !==
    undefined


  const hasFilters =
    statusFilter !==
      "ALL" ||
    levelFilter !==
      "ALL" ||
    workerCode.trim() !==
      "" ||
    deviceCode.trim() !==
      ""


  function clearFilters() {
    setStatusFilter(
      "ALL",
    )

    setLevelFilter(
      "ALL",
    )

    setWorkerCode(
      "",
    )

    setDeviceCode(
      "",
    )
  }


  return (
    <PageContainer>
      <PageHeader
        title="Peringatan"
        description="Pantau peringatan risiko lingkungan H₂S, status penanganan aktif, dan riwayat peringatan yang telah diselesaikan."
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              void alertsQuery.refetch()
            }
            disabled={
              alertsQuery.isFetching
            }
          >
            <RefreshCw
              className={
                alertsQuery.isFetching
                  ? "size-4 animate-spin"
                  : "size-4"
              }
            />

            Perbarui
          </Button>
        }
      />


      <div className="mt-8 space-y-6">
        {alertsQuery.isError ? (
          <Alert
            variant={
              hasCachedData
                ? "default"
                : "destructive"
            }
          >
            <TriangleAlert className="size-4" />

            <AlertDescription>
              {hasCachedData
                ? (
                  "Pembaruan data gagal. "
                  + "Data terakhir yang berhasil dimuat tetap ditampilkan."
                )
                : (
                  "Data peringatan tidak dapat dimuat. "
                  + "Silakan coba kembali."
                )}
            </AlertDescription>
          </Alert>
        ) : null}


        {/* SUMMARY */}
        <Card>
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BellRing className="size-5" />
              </div>

              <div>
                <p className="text-sm text-muted-foreground">
                  Total Peringatan
                </p>

                <p className="numeric-data text-2xl font-bold">
                  {totalAlerts}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <History className="mt-0.5 size-4 shrink-0" />

              <p className="max-w-xl leading-relaxed">
                Daftar mencakup peringatan aktif
                dan riwayat yang telah
                diselesaikan. Peringatan lama yang
                ditutup otomatis saat eskalasi
                tetap dipertahankan untuk audit.
              </p>
            </div>
          </CardContent>
        </Card>


        {/* FILTER */}
        <Card>
          <CardHeader>
            <CardTitle>
              Filter Peringatan
            </CardTitle>

            <CardDescription>
              Batasi daftar berdasarkan status
              lifecycle, tingkat peringatan,
              pemulung, atau perangkat.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label>
                  Status
                </Label>

                <Select
                  value={
                    statusFilter
                  }
                  onValueChange={(
                    value,
                  ) =>
                    setStatusFilter(
                      (
                        value ??
                        "ALL"
                      ) as StatusFilter,
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="ALL">
                      Semua Status
                    </SelectItem>

                    <SelectItem value="OPEN">
                      Aktif — Belum Ditanggapi
                    </SelectItem>

                    <SelectItem value="ACKNOWLEDGED">
                      Aktif — Sudah Ditanggapi
                    </SelectItem>

                    <SelectItem value="RESOLVED">
                      Diselesaikan
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>


              <div className="space-y-2">
                <Label>
                  Tingkat
                </Label>

                <Select
                  value={
                    levelFilter
                  }
                  onValueChange={(
                    value,
                  ) =>
                    setLevelFilter(
                      (
                        value ??
                        "ALL"
                      ) as LevelFilter,
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="ALL">
                      Semua Tingkat
                    </SelectItem>

                    <SelectItem value="LOW">
                      Rendah
                    </SelectItem>

                    <SelectItem value="MEDIUM">
                      Sedang
                    </SelectItem>

                    <SelectItem value="HIGH">
                      Tinggi
                    </SelectItem>

                    <SelectItem value="CRITICAL">
                      Kritis
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>


              <div className="space-y-2">
                <Label htmlFor="worker-code">
                  Kode Pemulung
                </Label>

                <Input
                  id="worker-code"
                  value={
                    workerCode
                  }
                  placeholder="Contoh: WRK-001"
                  onChange={(
                    event,
                  ) =>
                    setWorkerCode(
                      event.target.value,
                    )
                  }
                />
              </div>


              <div className="space-y-2">
                <Label htmlFor="device-code">
                  Kode Perangkat
                </Label>

                <Input
                  id="device-code"
                  value={
                    deviceCode
                  }
                  placeholder="Contoh: H2S-001"
                  onChange={(
                    event,
                  ) =>
                    setDeviceCode(
                      event.target.value,
                    )
                  }
                />
              </div>
            </div>


            {hasFilters ? (
              <div className="mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={
                    clearFilters
                  }
                >
                  <FilterX className="size-4" />

                  Hapus Filter
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>


        {/* LIST */}
        {alertsQuery.isPending ? (
          <AlertsSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                Daftar Peringatan
              </CardTitle>

              <CardDescription>
                H₂S dan RQ pada tabel merupakan
                snapshot saat masing-masing
                peringatan dibuat, bukan nilai
                realtime saat ini.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {alerts.length ===
              0 ? (
                <div className="py-12 text-center">
                  <BellRing className="mx-auto size-10 text-muted-foreground/40" />

                  <p className="mt-4 font-medium">
                    Tidak ada peringatan
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Tidak ditemukan data yang
                    sesuai dengan filter saat ini.
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
                          H₂S Saat Peringatan
                        </TableHead>

                        <TableHead>
                          RQ
                        </TableHead>

                        <TableHead>
                          Severity
                        </TableHead>

                        <TableHead>
                          Level
                        </TableHead>

                        <TableHead>
                          Lifecycle
                        </TableHead>

                        <TableHead>
                          Dibuat
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {alerts.map(
                        (
                          alert,
                        ) => (
                          <TableRow
                            key={
                              alert.id
                            }
                            tabIndex={0}
                            className="cursor-pointer"
                            onClick={() =>
                              navigate(
                                `/app/alerts/${alert.id}`,
                              )
                            }
                            onKeyDown={(
                              event,
                            ) => {
                              if (
                                event.key ===
                                  "Enter" ||
                                event.key ===
                                  " "
                              ) {
                                event.preventDefault()

                                navigate(
                                  `/app/alerts/${alert.id}`,
                                )
                              }
                            }}
                          >
                            <TableCell className="font-medium">
                              {
                                alert.worker_code
                              }
                            </TableCell>

                            <TableCell>
                              {
                                alert.device_code
                              }
                            </TableCell>

                            <TableCell className="numeric-data whitespace-nowrap">
                              {formatNumber(
                                alert.concentration_ppm,
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
                              <SeverityBadge
                                severity={
                                  alert.environmental_severity
                                }
                              />
                            </TableCell>

                            <TableCell>
                              <AlertLevelBadge
                                level={
                                  alert.alert_level
                                }
                              />
                            </TableCell>

                            <TableCell>
                              <AlertStatusBadge
                                status={
                                  alert.status
                                }
                              />
                            </TableCell>

                            <TableCell className="whitespace-nowrap text-muted-foreground">
                              {formatDateTime(
                                alert.created_at,
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
        )}
      </div>
    </PageContainer>
  )
}