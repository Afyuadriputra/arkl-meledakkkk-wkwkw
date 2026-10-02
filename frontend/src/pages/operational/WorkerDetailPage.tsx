import {
  useState,
} from "react"
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import {
  ArrowLeft,
  BellRing,
  Loader2,
  Pencil,
  RadioTower,
  RefreshCw,
  Save,
  Scale,
  TriangleAlert,
  UserRound,
} from "lucide-react"
import {
  useNavigate,
  useParams,
} from "react-router-dom"
import {
  toast,
} from "sonner"
import { ExposureReviewPanel } from "@/components/status/ExposureReviewPanel"
import { ReferenceMeasurementManager } from "@/components/status/ReferenceMeasurementManager"
import { IoTReadingAge } from "@/components/status/ReferenceARKLCard"

import {
  getExposureProfiles,
  getWorker,
  updateWorker,
} from "@/api/exposure"
import {
  getDevices,
} from "@/api/monitoring"
import {
  getARKLResults,
} from "@/api/arkl"
import {
  getAlerts,
} from "@/api/alerts"

import {
  PageContainer,
} from "@/components/layout/PageContainer"
import {
  PageHeader,
} from "@/components/layout/PageHeader"
import {
  RiskBadge,
} from "@/components/status/RiskBadge"
import {
  AlertLevelBadge,
} from "@/components/status/AlertLevelBadge"
import {
  AlertStatusBadge,
} from "@/components/status/AlertStatusBadge"

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Skeleton,
} from "@/components/ui/skeleton"


function formatNumber(
  value:
    | number
    | string
    | null
    | undefined,
  maximumFractionDigits = 2,
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
      timeStyle: "short",
    },
  ).format(date)
}


function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 w-full rounded-xl" />

      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
    </div>
  )
}


type Worker =
  Awaited<
    ReturnType<typeof getWorker>
  >


interface EditWorkerDialogProps {
  worker: Worker
}


function EditWorkerDialog({
  worker,
}: EditWorkerDialogProps) {
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
  worker.name ?? "",
)

const [
  age,
  setAge,
] = useState(
  worker.age == null
    ? ""
    : String(worker.age),
)

  const ageNumber =
    Number(age)

  const validName =
    name.trim().length > 0

  const validAge =
    Number.isInteger(ageNumber) &&
    ageNumber >= 1 &&
    ageNumber <= 120

const originalName =
  worker.name ?? ""

const originalAge =
  worker.age == null
    ? ""
    : String(worker.age)

const hasChanges =
  name.trim() !==
    originalName.trim() ||
  age !== originalAge


  const mutation =
    useMutation({
      mutationFn: () =>
        updateWorker(
          worker.id,
          {
            name: name.trim(),
            age: ageNumber,
          },
        ),

      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: [
            "workers",
          ],
        })

        toast.success(
          "Profil pemulung diperbarui.",
        )

        setOpen(false)
      },

      onError: () => {
        toast.error(
          "Profil belum berhasil diperbarui.",
        )
      },
    })


  function handleSubmit(
    event:
      React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    if (
      !validName ||
      !validAge ||
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
      onOpenChange={setOpen}
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
        Edit Profil
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Edit Profil Pemulung
          </DialogTitle>

          <DialogDescription>
            Kode pemulung tidak dapat
            diubah dari halaman ini.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-5"
          onSubmit={handleSubmit}
        >
          <div className="space-y-2">
            <Label>
              Kode
            </Label>

            <Input
              value={worker.code}
              disabled
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-worker-name">
              Nama
            </Label>

            <Input
              id="edit-worker-name"
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
            <Label htmlFor="edit-worker-age">
              Usia
            </Label>

            <Input
              id="edit-worker-age"
              type="number"
              min={1}
              max={120}
              value={age}
              onChange={(event) =>
                setAge(
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
              !validName ||
              !validAge ||
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


interface MonitoringDeviceCardProps {
  worker: Worker
}


function MonitoringDeviceCard({
  worker,
}: MonitoringDeviceCardProps) {
  const queryClient =
    useQueryClient()

  const [
    selectedDevice,
    setSelectedDevice,
  ] = useState(
    worker.monitoring_device
      ? String(
          worker.monitoring_device,
        )
      : "none",
  )


  const devicesQuery =
    useQuery({
      queryKey: [
        "devices",
        "active-for-worker",
      ],
      queryFn: () =>
        getDevices({
          page: 1,
        }),
      staleTime: 30_000,
    })


  const activeDevices =
    (
      devicesQuery.data?.results ??
      []
    ).filter(
      (device) =>
        device.is_active,
    )


  const mutation =
    useMutation({
      mutationFn:
        (
          deviceId:
            number | null,
        ) =>
          updateWorker(
            worker.id,
            {
              monitoring_device:
                deviceId,
            },
          ),

      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: [
            "workers",
          ],
        })

        toast.success(
          "Perangkat monitoring diperbarui.",
        )
      },

      onError: () => {
        toast.error(
          "Perangkat monitoring belum berhasil diperbarui.",
        )
      },
    })


  const currentValue =
    worker.monitoring_device
      ? String(
          worker.monitoring_device,
        )
      : "none"

  const hasChanges =
    selectedDevice !==
    currentValue


  function saveDevice() {
    if (
      !hasChanges ||
      mutation.isPending
    ) {
      return
    }

    mutation.mutate(
      selectedDevice === "none"
        ? null
        : Number(
            selectedDevice,
          ),
    )
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RadioTower className="size-5" />
          Perangkat Monitoring
        </CardTitle>

        <CardDescription>
          Sensor H₂S yang digunakan
          untuk memantau lingkungan
          pemulung ini.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="rounded-xl border bg-muted/25 p-4">
          <p className="text-sm text-muted-foreground">
            Perangkat Saat Ini
          </p>

          {worker.monitoring_device ? (
            <div className="mt-2">
              <p className="font-semibold">
                {worker.monitoring_device_name?.trim() ||
                  worker.monitoring_device_code}
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                {worker.monitoring_device_location?.trim() ||
                  "Lokasi belum ditentukan"}
              </p>

              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {worker.monitoring_device_code}
              </p>
            </div>
          ) : (
            <p className="mt-2 font-medium text-muted-foreground">
              Belum ada perangkat yang
              ditetapkan.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>
            Pilih Perangkat
          </Label>

<Select
  value={selectedDevice}
  onValueChange={(value) => {
    setSelectedDevice(
      value ?? "none",
    )
  }}
  disabled={
    mutation.isPending ||
    devicesQuery.isPending
  }
>
  <SelectTrigger className="w-full">
    <SelectValue placeholder="Pilih perangkat" />
  </SelectTrigger>

  <SelectContent>
    <SelectItem value="none">
      Tidak ada perangkat
    </SelectItem>

    {activeDevices.map(
      (device) => (
        <SelectItem
          key={device.id}
          value={String(device.id)}
        >
          {device.name?.trim() ||
            device.device_code}
          {" — "}
          {device.location?.trim() ||
            device.device_code}
        </SelectItem>
      ),
    )}
  </SelectContent>
</Select>
        </div>

        <Button
          type="button"
          variant={
            hasChanges
              ? "default"
              : "outline"
          }
          disabled={
            !hasChanges ||
            mutation.isPending
          }
          onClick={saveDevice}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="size-4" />
              Simpan Perangkat
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}


export function WorkerDetailPage() {
  const navigate =
    useNavigate()

  const queryClient =
    useQueryClient()

  const { id } =
    useParams()

  const workerId =
    Number(id)

  const validWorkerId =
    Number.isInteger(
      workerId,
    ) &&
    workerId > 0


  const workerQuery =
    useQuery({
      queryKey: [
        "workers",
        "detail",
        workerId,
      ],
      queryFn: () =>
        getWorker(workerId),
      enabled:
        validWorkerId,
    })


  const worker =
    workerQuery.data ??
    null


  const exposureQuery =
    useQuery({
      queryKey: [
        "workers",
        "detail",
        workerId,
        "exposure",
      ],
      queryFn: () =>
        getExposureProfiles({
          page: 1,
        }),
      enabled:
        Boolean(worker),
    })


  const arklQuery =
    useQuery({
      queryKey: [
        "workers",
        "detail",
        worker?.code,
        "arkl",
      ],
      queryFn: () =>
        getARKLResults({
          page: 1,
          worker_code:
            worker!.code,
          calculation_type: "REALTIME",
        }),
      enabled:
        Boolean(
          worker?.code,
        ),
    })


  const alertsQuery =
    useQuery({
      queryKey: [
        "workers",
        "detail",
        worker?.code,
        "alerts",
      ],
      queryFn: () =>
        getAlerts({
          page: 1,
          worker_code:
            worker!.code,
        }),
      enabled:
        Boolean(
          worker?.code,
        ),
    })


  const statusMutation =
    useMutation({
      mutationFn:
        (
          isActive:
            boolean,
        ) =>
          updateWorker(
            workerId,
            {
              is_active:
                isActive,
            },
          ),

      onSuccess: async (
        updatedWorker,
      ) => {
        await queryClient.invalidateQueries({
          queryKey: [
            "workers",
          ],
        })

        toast.success(
          updatedWorker.is_active
            ? "Pemulung diaktifkan."
            : "Pemulung dinonaktifkan.",
        )
      },

      onError: () => {
        toast.error(
          "Status pemulung belum berhasil diperbarui.",
        )
      },
    })


  const exposure =
    exposureQuery.data?.results.find(
      (profile) =>
        profile.worker ===
        workerId,
    ) ?? null


  const latestARKL =
    arklQuery.data?.results?.[
      0
    ] ?? null

  const latestAlert =
    alertsQuery.data?.results?.[
      0
    ] ?? null


  function refetchAll() {
    void workerQuery.refetch()
    void exposureQuery.refetch()
    void arklQuery.refetch()
    void alertsQuery.refetch()
  }


  if (!validWorkerId) {
    return (
      <PageContainer>
        <Alert variant="destructive">
          <TriangleAlert className="size-4" />

          <AlertDescription>
            ID pemulung tidak valid.
          </AlertDescription>
        </Alert>

        <Button
          variant="outline"
          className="mt-4"
          onClick={() =>
            navigate(
              "/app/workers",
            )
          }
        >
          <ArrowLeft className="size-4" />
          Kembali
        </Button>
      </PageContainer>
    )
  }


  return (
    <PageContainer>
      <PageHeader
        title={
          worker?.name ||
          "Detail Pemulung"
        }
        description={
          worker
            ? `Kode ${worker.code}`
            : "Profil pemulung, monitoring, pajanan, ARKL, dan peringatan."
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() =>
                navigate(
                  "/app/workers",
                )
              }
            >
              <ArrowLeft className="size-4" />
              Kembali
            </Button>

            {worker ? (
              <EditWorkerDialog
                key={[
                  worker.id,
                  worker.name,
                  worker.age,
                ].join("-")}
                worker={worker}
              />
            ) : null}

            <Button
              variant="outline"
              onClick={refetchAll}
              disabled={
                workerQuery.isFetching ||
                exposureQuery.isFetching ||
                arklQuery.isFetching ||
                alertsQuery.isFetching
              }
            >
              <RefreshCw
                className={
                  workerQuery.isFetching ||
                  exposureQuery.isFetching ||
                  arklQuery.isFetching ||
                  alertsQuery.isFetching
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
        {workerQuery.isPending ? (
          <DetailSkeleton />
        ) : workerQuery.isError ? (
          <Alert variant="destructive">
            <TriangleAlert className="size-4" />

            <AlertDescription>
              Data pemulung tidak
              dapat dimuat.
            </AlertDescription>
          </Alert>
        ) : worker ? (
          <div className="space-y-6">
            <Card
              className={
                worker.is_active
                  ? "border-primary/15"
                  : "border-muted"
              }
            >
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>
                      Profil Pemulung
                    </CardTitle>

                    <CardDescription>
                      Identitas dan status
                      operasional pemulung.
                    </CardDescription>
                  </div>

                  <Badge
                    variant="outline"
                    className={
                      worker.is_active
                        ? "w-fit rounded-full border-status-normal/20 bg-status-normal/10 text-status-normal"
                        : "w-fit rounded-full text-muted-foreground"
                    }
                  >
                    {worker.is_active
                      ? "Aktif"
                      : "Tidak Aktif"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border bg-muted/25 p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <UserRound className="size-4" />
                      Nama
                    </div>

                    <p className="mt-3 font-semibold">
                      {worker.name?.trim() ||"Nama belum dilengkapi"}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-muted/25 p-4">
                    <p className="text-sm text-muted-foreground">
                      Kode
                    </p>

                    <p className="mt-3 font-mono font-semibold">
                      {worker.code}
                    </p>
                  </div>

                  <div className="rounded-xl border bg-muted/25 p-4">
                    <p className="text-sm text-muted-foreground">
                      Usia
                    </p>

                    <p className="numeric-data mt-3 font-semibold">
                      {worker.age != null ? `${worker.age} tahun` : "Belum dilengkapi"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 border-t pt-5">
                  <Button
                    type="button"
                    variant={
                      worker.is_active
                        ? "outline"
                        : "default"
                    }
                    disabled={
                      statusMutation.isPending
                    }
                    onClick={() =>
                      statusMutation.mutate(
                        !worker.is_active,
                      )
                    }
                  >
                    {statusMutation.isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : worker.is_active ? (
                      "Nonaktifkan Pemulung"
                    ) : (
                      "Aktifkan Pemulung"
                    )}
                  </Button>

                  <p className="mt-2 text-xs text-muted-foreground">
                    Data historis tetap tersimpan.
                    Pemulung tidak dihapus dari sistem.
                  </p>
                </div>
              </CardContent>
            </Card>

            <MonitoringDeviceCard
              key={[
                worker.id,
                worker.monitoring_device ??
                  "none",
              ].join("-")}
              worker={worker}
            />

            <div className="grid gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>
                    Data Pajanan
                  </CardTitle>

                  <CardDescription>
                    Parameter pajanan yang
                    digunakan dalam perhitungan
                    ARKL.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {exposureQuery.isPending ? (
                    <Skeleton className="h-40 w-full" />
                  ) : exposure ? (
                    <div className="space-y-4">
                      <ExposureReviewPanel key={`${exposure.id}-${exposure.updated_at}`}
                        exposure={exposure} onReviewed={() => { void exposureQuery.refetch() }} />
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Berat Badan
                          </p>

                          <p className="numeric-data mt-1 font-semibold">
                            {formatNumber(
                              exposure.body_weight,
                            )}{" "}
                            kg
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground">
                            Waktu Pajanan
                          </p>

                          <p className="numeric-data mt-1 font-semibold">
                            {formatNumber(
                              exposure.exposure_time,
                            )}{" "}
                            jam/hari
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground">
                            Frekuensi Pajanan
                          </p>

                          <p className="numeric-data mt-1 font-semibold">
                            {formatNumber(
                              exposure.exposure_frequency,
                            )}{" "}
                            hari/tahun
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground">
                            Durasi Pajanan
                          </p>

                          <p className="numeric-data mt-1 font-semibold">
                            {formatNumber(
                              exposure.exposure_duration,
                            )}{" "}
                            tahun
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-muted-foreground">
                            Laju Inhalasi
                          </p>

                          <p className="numeric-data mt-1 font-semibold">
                            {formatNumber(
                              exposure.inhalation_rate,
                              4,
                            )}{" "}
                            m³/jam
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() =>
                          navigate(
                            `/app/workers/${worker.id}/exposure`,
                          )
                        }
                      >
                        <Scale className="size-4" />
                        Kelola Pajanan
                      </Button>
                    </div>
                  ) : (
                    <div className="py-6">
                      <p className="text-sm text-muted-foreground">
                        Profil pajanan belum
                        tersedia.
                      </p>

                      <Button
                        className="mt-4"
                        onClick={() =>
                          navigate(
                            `/app/workers/${worker.id}/exposure`,
                          )
                        }
                      >
                        <Scale className="size-4" />
                        Isi Data Pajanan
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>
                    ARKL IoT — Pembacaan Terakhir
                  </CardTitle>

                  <CardDescription>
                    Karakterisasi risiko
                    lingkungan terbaru.
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {arklQuery.isPending ? (
                    <Skeleton className="h-40 w-full" />
                  ) : latestARKL ? (
                    <div className="space-y-4">
                      <IoTReadingAge receivedAt={latestARKL.reading_received_at} />
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Risk Quotient
                        </p>

                        <p className="numeric-data mt-1 text-3xl font-bold">
                          {formatNumber(
                            latestARKL.rq,
                            4,
                          )}
                        </p>
                      </div>

                      {latestARKL.interpretation ===
                      "WITHIN_REFERENCE_LEVEL" ? (
                        <RiskBadge interpretation="WITHIN_REFERENCE_LEVEL" />
                      ) : latestARKL.interpretation ===
                        "ABOVE_REFERENCE_LEVEL" ? (
                        <RiskBadge interpretation="ABOVE_REFERENCE_LEVEL" />
                      ) : (
                        <Badge variant="outline">
                          {
                            latestARKL.interpretation
                          }
                        </Badge>
                      )}

                      <p className="text-sm text-muted-foreground">
                        Dibuat{" "}
                        {formatDateTime(
                          latestARKL.created_at,
                        )}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Belum ada hasil ARKL.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <ReferenceMeasurementManager key={worker.id} workerId={worker.id} workerCode={worker.code} />

            <Card>
              <CardHeader>
                <CardTitle>
                  Peringatan Terkait
                </CardTitle>

                <CardDescription>
                  Peringatan terbaru yang
                  terkait dengan pemulung ini.
                </CardDescription>
              </CardHeader>

              <CardContent>
                {alertsQuery.isPending ? (
                  <Skeleton className="h-24 w-full" />
                ) : latestAlert ? (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <AlertLevelBadge
                          level={
                            latestAlert.alert_level
                          }
                        />

                        <AlertStatusBadge
                          status={
                            latestAlert.status
                          }
                        />
                      </div>

                      <p className="mt-3 text-sm text-muted-foreground">
                        Dibuat{" "}
                        {formatDateTime(
                          latestAlert.created_at,
                        )}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() =>
                        navigate(
                          `/app/alerts/${latestAlert.id}`,
                        )
                      }
                    >
                      <BellRing className="size-4" />
                      Lihat Peringatan
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Belum ada peringatan
                    terkait.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </PageContainer>
  )
}
