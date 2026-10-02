import {
  useState,
} from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import {
  Activity,
  ArrowLeft,
  Cpu,
  Gauge,
  Loader2,
  MapPin,
  Pencil,
  RadioTower,
  RefreshCw,
  Save,
  Timer,
  TriangleAlert,
} from "lucide-react"
import {
  useNavigate,
  useParams,
} from "react-router-dom"
import {
  toast,
} from "sonner"

import {
  getDevice,
  getLatestReading,
  getReadings,
  updateDevice,
} from "@/api/monitoring"

import {
  PageContainer,
} from "@/components/layout/PageContainer"
import {
  PageHeader,
} from "@/components/layout/PageHeader"

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Input,
} from "@/components/ui/input"
import {
  Label,
} from "@/components/ui/label"
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

  const numericValue =
    typeof value === "number"
      ? value
      : Number(value)

  if (!Number.isFinite(numericValue)) {
    return String(value)
  }

  return new Intl.NumberFormat(
    "id-ID",
    {
      maximumFractionDigits,
    },
  ).format(numericValue)
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

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      dateStyle: "medium",
      timeStyle: "medium",
    },
  ).format(date)
}


function formatUptime(
  uptimeMs: number | null | undefined,
) {
  if (
    uptimeMs === null ||
    uptimeMs === undefined
  ) {
    return "—"
  }

  const totalSeconds =
    Math.floor(
      uptimeMs / 1000,
    )

  const days =
    Math.floor(
      totalSeconds / 86_400,
    )

  const hours =
    Math.floor(
      (
        totalSeconds %
        86_400
      ) / 3_600,
    )

  const minutes =
    Math.floor(
      (
        totalSeconds %
        3_600
      ) / 60,
    )

  if (days > 0) {
    return `${days} hari ${hours} jam`
  }

  if (hours > 0) {
    return `${hours} jam ${minutes} menit`
  }

  return `${minutes} menit`
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
      {status ||
        "Tidak diketahui"}
    </Badge>
  )
}


function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 w-full rounded-xl" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({
          length: 4,
        }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-28 rounded-xl"
          />
        ))}
      </div>

      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  )
}


type Device =
  Awaited<
    ReturnType<
      typeof getDevice
    >
  >


interface EditDeviceDialogProps {
  device: Device
}


function EditDeviceDialog({
  device,
}: EditDeviceDialogProps) {
  const queryClient =
    useQueryClient()

  const [
    open,
    setOpen,
  ] = useState(false)

  const [
    name,
    setName,
  ] = useState(
    device.name ?? "",
  )

  const [
    location,
    setLocation,
  ] = useState(
    device.location ?? "",
  )


  const originalName =
    device.name ?? ""

  const originalLocation =
    device.location ?? ""

  const hasChanges =
    name.trim() !==
      originalName.trim() ||
    location.trim() !==
      originalLocation.trim()


  const mutation =
    useMutation({
      mutationFn: () =>
        updateDevice(
          device.id,
          {
            name:
              name.trim(),

            location:
              location.trim(),
          },
        ),

      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: [
            "devices",
          ],
        })

        toast.success(
          "Perangkat berhasil diperbarui.",
        )

        setOpen(false)
      },

      onError: () => {
        toast.error(
          "Perangkat belum berhasil diperbarui.",
        )
      },
    })


  function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (
      !hasChanges ||
      mutation.isPending
    ) {
      return
    }

    mutation.mutate()
  }


  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (
          mutation.isPending
        ) {
          return
        }

        setOpen(nextOpen)
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="outline"
          />
        }
      >
        <Pencil className="size-4" />
        Edit Perangkat
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Edit Perangkat
          </DialogTitle>

          <DialogDescription>
            Perbarui nama atau lokasi
            perangkat. Kode perangkat
            tidak dapat diubah.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-5"
          onSubmit={handleSubmit}
        >
          <div className="space-y-2">
            <Label>
              Kode Perangkat
            </Label>

            <Input
              value={
                device.device_code
              }
              disabled
            />

            <p className="text-xs text-muted-foreground">
              Kode merupakan identitas
              perangkat pada MQTT dan data
              historis.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-device-name">
              Nama Perangkat
            </Label>

            <Input
              id="edit-device-name"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value,
                )
              }
              disabled={
                mutation.isPending
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-device-location">
              Lokasi
            </Label>

            <Input
              id="edit-device-location"
              value={location}
              onChange={(event) =>
                setLocation(
                  event.target.value,
                )
              }
              disabled={
                mutation.isPending
              }
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={
              !hasChanges ||
              mutation.isPending
            }
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="size-4" />
                Simpan Perubahan
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}


export function DeviceDetailPage() {
  const navigate =
    useNavigate()

  const queryClient =
    useQueryClient()

  const { id } =
    useParams()

  const deviceId =
    Number(id)

  const validDeviceId =
    Number.isInteger(
      deviceId,
    ) &&
    deviceId > 0


  const deviceQuery =
    useQuery({
      queryKey: [
        "devices",
        "detail",
        deviceId,
      ],
      queryFn: () =>
        getDevice(deviceId),
      enabled:
        validDeviceId,
    })


  const device =
    deviceQuery.data ??
    null

  const deviceCode =
    device?.device_code


  const latestReadingQuery =
    useQuery({
      queryKey: [
        "devices",
        "detail",
        deviceId,
        "latest-reading",
      ],

      queryFn: () =>
        getLatestReading({
          device_code:
            deviceCode,
        }),

      enabled:
        Boolean(
          deviceCode,
        ),

      refetchInterval:
        5_000,
    })


  const readingsQuery =
    useQuery({
      queryKey: [
        "devices",
        "detail",
        deviceId,
        "readings",
      ],

      queryFn: () =>
        getReadings({
          page: 1,
          device_code:
            deviceCode,
        }),

      enabled:
        Boolean(
          deviceCode,
        ),

      refetchInterval:
        5_000,
    })


  const statusMutation =
    useMutation({
      mutationFn:
        (
          isActive:
            boolean,
        ) =>
          updateDevice(
            deviceId,
            {
              is_active:
                isActive,
            },
          ),

      onSuccess: async (
        updatedDevice,
      ) => {
        await queryClient.invalidateQueries({
          queryKey: [
            "devices",
          ],
        })

        toast.success(
          updatedDevice.is_active
            ? "Perangkat diaktifkan."
            : "Perangkat dinonaktifkan.",
        )
      },

      onError: () => {
        toast.error(
          "Status perangkat belum berhasil diperbarui.",
        )
      },
    })


  const latestReading =
    latestReadingQuery.data ??
    null

  const readings =
    readingsQuery.data?.results ??
    []

  const hasAnyTelemetryError =
    latestReadingQuery.isError ||
    readingsQuery.isError


  function refetchAll() {
    void deviceQuery.refetch()

    if (deviceCode) {
      void latestReadingQuery.refetch()
      void readingsQuery.refetch()
    }
  }


  if (!validDeviceId) {
    return (
      <PageContainer>
        <Alert variant="destructive">
          <TriangleAlert className="size-4" />

          <AlertDescription>
            ID perangkat tidak valid.
          </AlertDescription>
        </Alert>

        <Button
          variant="outline"
          className="mt-4"
          onClick={() =>
            navigate(
              "/app/devices",
            )
          }
        >
          <ArrowLeft className="size-4" />
          Kembali ke Perangkat
        </Button>
      </PageContainer>
    )
  }


  return (
    <PageContainer>
      <PageHeader
        title={
          device?.name?.trim() ||
          device?.device_code ||
          "Detail Perangkat"
        }
        description={
          device
            ? `Perangkat ${device.device_code}`
            : "Informasi perangkat dan telemetry sensor."
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                navigate(
                  "/app/devices",
                )
              }
            >
              <ArrowLeft className="size-4" />
              Kembali
            </Button>

            {device ? (
              <EditDeviceDialog
                key={[
                  device.id,
                  device.name ??
                    "",
                  device.location ??
                    "",
                ].join("-")}
                device={device}
              />
            ) : null}

            <Button
              type="button"
              variant="outline"
              onClick={refetchAll}
              disabled={
                deviceQuery.isFetching ||
                latestReadingQuery.isFetching ||
                readingsQuery.isFetching
              }
            >
              <RefreshCw
                className={
                  deviceQuery.isFetching ||
                  latestReadingQuery.isFetching ||
                  readingsQuery.isFetching
                    ? "size-4 animate-spin"
                    : "size-4"
                }
              />

              Perbarui
            </Button>
          </div>
        }
      />

      <div className="mt-8">
        {deviceQuery.isPending ? (
          <DetailSkeleton />
        ) : deviceQuery.isError ? (
          <Card>
            <CardContent className="py-12 text-center">
              <TriangleAlert className="mx-auto size-10 text-destructive" />

              <p className="mt-4 font-medium">
                Perangkat tidak dapat dimuat
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Periksa kembali perangkat
                atau coba muat ulang data.
              </p>

              <Button
                variant="outline"
                className="mt-5"
                onClick={() =>
                  void deviceQuery.refetch()
                }
              >
                <RefreshCw className="size-4" />
                Coba Lagi
              </Button>
            </CardContent>
          </Card>
        ) : device ? (
          <div className="space-y-6">
            {hasAnyTelemetryError ? (
              <Alert variant="destructive">
                <TriangleAlert className="size-4" />

                <AlertDescription>
                  Sebagian data telemetry tidak
                  dapat dimuat. Informasi
                  perangkat tetap tersedia.
                </AlertDescription>
              </Alert>
            ) : null}

            {/* DEVICE INFORMATION */}
            <Card
              className={
                device.is_active
                  ? "border-primary/15"
                  : "border-muted"
              }
            >
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>
                      Informasi Perangkat
                    </CardTitle>

                    <CardDescription>
                      Identitas dan status
                      operasional sensor.
                    </CardDescription>
                  </div>

                  <Badge
                    variant="outline"
                    className={
                      device.is_active
                        ? "w-fit rounded-full border-status-normal/20 bg-status-normal/10 text-status-normal"
                        : "w-fit rounded-full text-muted-foreground"
                    }
                  >
                    {device.is_active
                      ? "Aktif"
                      : "Tidak Aktif"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border bg-muted/25 p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <RadioTower className="size-4" />
                      Kode Perangkat
                    </div>

                    <p className="mt-3 break-words font-mono font-semibold">
                      {device.device_code}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-muted/25 p-4">
                    <p className="text-sm text-muted-foreground">
                      Nama
                    </p>

                    <p className="mt-3 font-semibold">
                      {device.name?.trim() ||
                        "Belum diberi nama"}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-muted/25 p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="size-4" />
                      Lokasi
                    </div>

                    <p className="mt-3 font-semibold">
                      {device.location?.trim() ||
                        "Belum ditentukan"}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-muted/25 p-4">
                    <p className="text-sm text-muted-foreground">
                      Terakhir Diubah
                    </p>

                    <p className="mt-3 text-sm font-medium">
                      {formatDateTime(
                        device.updated_at,
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-5 border-t pt-5">
                  <Button
                    type="button"
                    variant={
                      device.is_active
                        ? "outline"
                        : "default"
                    }
                    disabled={
                      statusMutation.isPending
                    }
                    onClick={() =>
                      statusMutation.mutate(
                        !device.is_active,
                      )
                    }
                  >
                    {statusMutation.isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : device.is_active ? (
                      "Nonaktifkan Perangkat"
                    ) : (
                      "Aktifkan Perangkat"
                    )}
                  </Button>

                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Menonaktifkan perangkat tidak
                    menghapus telemetry atau data
                    historis yang sudah tersimpan.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* LATEST TELEMETRY */}
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>
                      Telemetry Terbaru
                    </CardTitle>

                    <CardDescription className="mt-1">
                      Data teknis terakhir yang
                      diterima dari perangkat.
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

              <CardContent>
                {latestReadingQuery.isPending ? (
                  <Skeleton className="h-40 w-full" />
                ) : latestReadingQuery.isError ? (
                  <div className="py-10 text-center">
                    <p className="text-sm font-medium">
                      Telemetry terbaru tidak
                      dapat dimuat.
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
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-end gap-2">
                        <span className="numeric-data text-4xl font-bold tracking-tight sm:text-5xl">
                          {formatNumber(
                            latestReading.ppm,
                            3,
                          )}
                        </span>

                        <span className="mb-1 text-base text-muted-foreground">
                          ppm
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-muted-foreground">
                        Diterima{" "}
                        {formatDateTime(
                          latestReading.received_at,
                        )}
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border bg-muted/25 p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Cpu className="size-4" />
                          ADC
                        </div>

                        <p className="numeric-data mt-3 text-xl font-semibold">
                          {latestReading.adc}
                        </p>
                      </div>

                      <div className="rounded-xl border bg-muted/25 p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Gauge className="size-4" />
                          Filtered ADC
                        </div>

                        <p className="numeric-data mt-3 text-xl font-semibold">
                          {formatNumber(
                            latestReading.filtered_adc,
                            2,
                          )}
                        </p>
                      </div>

                      <div className="rounded-xl border bg-muted/25 p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Activity className="size-4" />
                          Level
                        </div>

                        <p className="numeric-data mt-3 text-xl font-semibold">
                          {latestReading.level}
                        </p>
                      </div>

                      <div className="rounded-xl border bg-muted/25 p-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Timer className="size-4" />
                          Uptime
                        </div>

                        <p className="mt-3 font-semibold">
                          {formatUptime(
                            latestReading.uptime_ms,
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <ReadingStatus
                        status={
                          latestReading.status
                        }
                      />

                      <Badge
                        variant="outline"
                        className="rounded-full"
                      >
                        {latestReading.simulated
                          ? "Simulasi"
                          : "Sensor fisik"}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    Belum ada telemetry untuk
                    perangkat ini.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* READING HISTORY */}
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>
                      Riwayat Pembacaan
                    </CardTitle>

                    <CardDescription className="mt-1">
                      Pembacaan terbaru dari
                      perangkat{" "}
                      {device.device_code}.
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

              <CardContent>
                {readingsQuery.isPending ? (
                  <div className="space-y-3">
                    {Array.from({
                      length: 5,
                    }).map((_, index) => (
                      <Skeleton
                        key={index}
                        className="h-11 w-full"
                      />
                    ))}
                  </div>
                ) : readingsQuery.isError ? (
                  <div className="py-10 text-center">
                    <p className="text-sm font-medium">
                      Riwayat pembacaan tidak
                      dapat dimuat.
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
                  <div className="py-10 text-center">
                    <Activity className="mx-auto size-9 text-muted-foreground/40" />

                    <p className="mt-3 font-medium">
                      Belum ada pembacaan
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            Waktu
                          </TableHead>

                          <TableHead>
                            H₂S
                          </TableHead>

                          <TableHead>
                            ADC
                          </TableHead>

                          <TableHead>
                            Filtered ADC
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
                            >
                              <TableCell className="whitespace-nowrap text-muted-foreground">
                                {formatDateTime(
                                  reading.received_at,
                                )}
                              </TableCell>

                              <TableCell className="numeric-data whitespace-nowrap font-medium">
                                {formatNumber(
                                  reading.ppm,
                                  3,
                                )}{" "}
                                ppm
                              </TableCell>

                              <TableCell className="numeric-data">
                                {reading.adc}
                              </TableCell>

                              <TableCell className="numeric-data">
                                {formatNumber(
                                  reading.filtered_adc,
                                  2,
                                )}
                              </TableCell>

                              <TableCell className="numeric-data">
                                {reading.level}
                              </TableCell>

                              <TableCell>
                                <ReadingStatus
                                  status={
                                    reading.status
                                  }
                                />
                              </TableCell>

                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="rounded-full"
                                >
                                  {reading.simulated
                                    ? "Simulasi"
                                    : "Sensor fisik"}
                                </Badge>
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
        ) : null}
      </div>
    </PageContainer>
  )
}