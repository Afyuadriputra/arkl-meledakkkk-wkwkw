import {
  useState,
} from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import {
  Loader2,
  MapPin,
  Plus,
  RadioTower,
  RefreshCw,
  TriangleAlert,
} from "lucide-react"
import {
  useNavigate,
} from "react-router-dom"
import {
  toast,
} from "sonner"

import {
  createDevice,
  getDevices,
} from "@/api/monitoring"

import {
  PageContainer,
} from "@/components/layout/PageContainer"
import {
  PageHeader,
} from "@/components/layout/PageHeader"

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
      timeStyle: "short",
    },
  ).format(date)
}


function DevicesSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>

      <CardContent className="space-y-3">
        {Array.from({
          length: 6,
        }).map((_, index) => (
          <Skeleton
            key={index}
            className="h-12 w-full"
          />
        ))}
      </CardContent>
    </Card>
  )
}


interface CreateDeviceDialogProps {
  onCreated:
    (deviceId: number) => void
}


function CreateDeviceDialog({
  onCreated,
}: CreateDeviceDialogProps) {
  const queryClient =
    useQueryClient()

  const [
    open,
    setOpen,
  ] = useState(false)

  const [
    deviceCode,
    setDeviceCode,
  ] = useState("")

  const [
    name,
    setName,
  ] = useState("")

  const [
    location,
    setLocation,
  ] = useState("")


  const validDeviceCode =
    deviceCode.trim().length > 0


  const createMutation =
    useMutation({
      mutationFn: createDevice,

      onSuccess: async (device) => {
        await queryClient.invalidateQueries({
          queryKey: [
            "devices",
          ],
        })

        toast.success(
          "Perangkat berhasil ditambahkan.",
        )

        setOpen(false)
        setDeviceCode("")
        setName("")
        setLocation("")

        onCreated(device.id)
      },

      onError: () => {
        toast.error(
          "Perangkat belum berhasil ditambahkan.",
        )
      },
    })


  const canSubmit =
    validDeviceCode &&
    !createMutation.isPending


  function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    createMutation.mutate({
      device_code:
        deviceCode.trim(),

      name:
        name.trim(),

      location:
        location.trim(),

      is_active:
        true,
    })
  }


  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (
          createMutation.isPending
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
            className="gap-2"
          />
        }
      >
        <Plus className="size-4" />
        Tambah Perangkat
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Tambah Perangkat
          </DialogTitle>

          <DialogDescription>
            Daftarkan perangkat sensor H₂S
            yang akan digunakan pada sistem.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-5"
          onSubmit={handleSubmit}
        >
          <div className="space-y-2">
            <Label htmlFor="device-code">
              Kode Perangkat
            </Label>

            <Input
              id="device-code"
              value={deviceCode}
              onChange={(event) =>
                setDeviceCode(
                  event.target.value,
                )
              }
              placeholder="Contoh: H2S-001"
              autoComplete="off"
              disabled={
                createMutation.isPending
              }
            />

            <p className="text-xs text-muted-foreground">
              Kode digunakan sebagai identitas
              perangkat dan tidak dapat diubah
              setelah dibuat.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="device-name">
              Nama Perangkat
            </Label>

            <Input
              id="device-name"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value,
                )
              }
              placeholder="Contoh: Sensor Area Utara"
              autoComplete="off"
              disabled={
                createMutation.isPending
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="device-location">
              Lokasi
            </Label>

            <Input
              id="device-location"
              value={location}
              onChange={(event) =>
                setLocation(
                  event.target.value,
                )
              }
              placeholder="Contoh: Zona A TPA Muara Fajar"
              autoComplete="off"
              disabled={
                createMutation.isPending
              }
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={
                createMutation.isPending
              }
              onClick={() =>
                setOpen(false)
              }
            >
              Batal
            </Button>

            <Button
              type="submit"
              disabled={!canSubmit}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Tambah
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}


export function DevicesPage() {
  const navigate =
    useNavigate()

  const devicesQuery =
    useQuery({
      queryKey: [
        "devices",
        "list",
      ],
      queryFn: () =>
        getDevices({
          page: 1,
        }),
      staleTime:
        30_000,
    })


  const devices =
    devicesQuery.data?.results ??
    []

  const totalDevices =
    devicesQuery.data?.count ??
    0

  const activeDevices =
    devices.filter(
      (device) =>
        device.is_active,
    ).length

  const inactiveDevices =
    devices.filter(
      (device) =>
        !device.is_active,
    ).length


  return (
    <PageContainer>
      <PageHeader
        title="Perangkat"
        description="Kelola perangkat sensor H₂S yang digunakan untuk pemantauan lingkungan."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void devicesQuery.refetch()
              }
              disabled={
                devicesQuery.isFetching
              }
            >
              <RefreshCw
                className={
                  devicesQuery.isFetching
                    ? "size-4 animate-spin"
                    : "size-4"
                }
              />

              Perbarui
            </Button>

            <CreateDeviceDialog
              onCreated={(deviceId) =>
                navigate(
                  `/app/devices/${deviceId}`,
                )
              }
            />
          </div>
        }
      />

      <div className="mt-8 space-y-6">
        {devicesQuery.isError ? (
          <Alert variant="destructive">
            <TriangleAlert className="size-4" />

            <AlertDescription>
              Data perangkat tidak dapat
              dimuat. Silakan coba kembali.
            </AlertDescription>
          </Alert>
        ) : null}

        <section
          aria-label="Ringkasan perangkat"
          className="grid gap-4 sm:grid-cols-3"
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <RadioTower className="size-4" />
                Total Perangkat
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="numeric-data text-3xl font-bold tracking-tight">
                {totalDevices}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Aktif
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="numeric-data text-3xl font-bold tracking-tight text-status-normal">
                {activeDevices}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tidak Aktif
              </CardTitle>
            </CardHeader>

            <CardContent>
              <p className="numeric-data text-3xl font-bold tracking-tight text-muted-foreground">
                {inactiveDevices}
              </p>
            </CardContent>
          </Card>
        </section>

        {devicesQuery.isPending ? (
          <DevicesSkeleton />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                Daftar Perangkat
              </CardTitle>

              <CardDescription>
                Pilih perangkat untuk mengelola
                identitas, status, dan melihat
                telemetry.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {devices.length === 0 ? (
                <div className="py-12 text-center">
                  <RadioTower className="mx-auto size-10 text-muted-foreground/40" />

                  <p className="mt-4 font-medium">
                    Belum ada perangkat
                  </p>

                  <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                    Tambahkan perangkat sensor
                    pertama untuk mulai menerima
                    data monitoring H₂S.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          Perangkat
                        </TableHead>

                        <TableHead>
                          Lokasi
                        </TableHead>

                        <TableHead>
                          Status
                        </TableHead>

                        <TableHead>
                          Terakhir Diubah
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {devices.map(
                        (device) => (
                          <TableRow
                            key={device.id}
                            className="
                              cursor-pointer
                              transition-colors
                              hover:bg-muted/40
                            "
                            tabIndex={0}
                            onClick={() =>
                              navigate(
                                `/app/devices/${device.id}`,
                              )
                            }
                            onKeyDown={(event) => {
                              if (
                                event.key ===
                                  "Enter" ||
                                event.key ===
                                  " "
                              ) {
                                event.preventDefault()

                                navigate(
                                  `/app/devices/${device.id}`,
                                )
                              }
                            }}
                          >
                            <TableCell>
                              <div>
                                <p className="font-semibold">
                                  {device.name?.trim() ||
                                    "Perangkat tanpa nama"}
                                </p>

                                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                                  {device.device_code}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="size-4 shrink-0 text-muted-foreground" />

                                <span>
                                  {device.location?.trim() ||
                                    "Belum ditentukan"}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  device.is_active
                                    ? "rounded-full border-status-normal/20 bg-status-normal/10 text-status-normal"
                                    : "rounded-full text-muted-foreground"
                                }
                              >
                                {device.is_active
                                  ? "Aktif"
                                  : "Tidak Aktif"}
                              </Badge>
                            </TableCell>

                            <TableCell className="whitespace-nowrap text-muted-foreground">
                              {formatDateTime(
                                device.updated_at,
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