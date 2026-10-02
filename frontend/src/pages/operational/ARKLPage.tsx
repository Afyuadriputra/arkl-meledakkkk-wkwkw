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
  RefreshCw,
  TriangleAlert,
} from "lucide-react"

import {
  getLatestRealtimeARKL,
} from "@/api/arkl"
import { ReferenceMeasurementManager } from "@/components/status/ReferenceMeasurementManager"
import { IoTReadingAge } from "@/components/status/ReferenceARKLCard"

import {
  getDevices,
} from "@/api/monitoring"

import {
  getAllWorkers,
} from "@/api/exposure"

import {
  PageContainer,
} from "@/components/layout/PageContainer"

import {
  PageHeader,
} from "@/components/layout/PageHeader"

import {
  ARKLCalculationDetails,
} from "@/components/data-display/ARKLCalculationDetails"

import {
  RiskBadge,
  type RiskInterpretation,
} from "@/components/status/RiskBadge"

import {
  RiskExplanation,
} from "@/components/status/RiskExplanation"

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


const RISK_INTERPRETATIONS:
  RiskInterpretation[] = [
    "WITHIN_REFERENCE_LEVEL",
    "ABOVE_REFERENCE_LEVEL",
  ]


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
      timeStyle: "medium",
    },
  ).format(date)
}


export function ARKLPage() {
  const [
    selectedWorkerId,
    setSelectedWorkerId,
  ] =
    useState<string>("")


  const workersQuery =
    useQuery({
      queryKey: [
        "arkl",
        "workers",
      ],

      queryFn: getAllWorkers,

      staleTime:
        30_000,

      refetchInterval:
        30_000,
    })


  const devicesQuery =
    useQuery({
      queryKey: [
        "arkl",
        "devices",
      ],

      queryFn: () =>
        getDevices({
          page: 1,
        }),

      staleTime:
        30_000,

      refetchInterval:
        30_000,
    })


  const workers =
    useMemo(() => workersQuery.data ?? [], [workersQuery.data])


  const devices =
    useMemo(() => devicesQuery.data?.results ?? [], [devicesQuery.data])


  const selectedWorker =
    useMemo(
      () =>
        workers.find(
          (worker) =>
            String(
              worker.id,
            ) ===
            selectedWorkerId,
        ) ?? null,
      [
        selectedWorkerId,
        workers,
      ],
    )


  const assignedDeviceId =
    selectedWorker
      ?.monitoring_device ??
    null


  const assignedDevice =
    useMemo(
      () => {
        if (
          assignedDeviceId === null ||
          assignedDeviceId === undefined
        ) {
          return null
        }

        return (
          devices.find(
            (device) =>
              device.id ===
              assignedDeviceId,
          ) ?? null
        )
      },
      [
        assignedDeviceId,
        devices,
      ],
    )


  const latestARKLQuery =
    useQuery({
      queryKey: [
        "arkl",
        "latest-realtime",
        selectedWorker?.code,
      ],

      queryFn: () =>
        getLatestRealtimeARKL(
          selectedWorker?.code,
        ),

      enabled:
        Boolean(
          selectedWorker?.code,
        ),

      /*
       * Backend snapshots realtime ARKL at
       * most every ~60 seconds while the
       * environmental status remains stable.
       *
       * 10-second polling keeps the UI
       * responsive without polling every
       * MQTT packet.
       */
      refetchInterval:
        10_000,

      staleTime:
        5_000,
    })


  const result =
    latestARKLQuery.data ??
    null


  const riskInterpretation =
    asRiskInterpretation(
      result?.interpretation,
    )


  const sourcesLoading =
    workersQuery.isPending ||
    devicesQuery.isPending


  const sourcesFetching =
    workersQuery.isFetching ||
    devicesQuery.isFetching ||
    latestARKLQuery.isFetching


  function handleRefresh() {
    void Promise.all([
      workersQuery.refetch(),
      devicesQuery.refetch(),
      latestARKLQuery.refetch(),
    ])
  }


  return (
    <PageContainer>
      <PageHeader
        title="Pemantauan ARKL"
        description="Pantau hasil karakterisasi risiko pajanan H₂S yang dihitung otomatis oleh sistem dari perangkat monitoring pemulung."
        action={
          <Button
            type="button"
            variant="outline"
            onClick={
              handleRefresh
            }
            disabled={
              sourcesFetching
            }
          >
            <RefreshCw
              className={
                sourcesFetching
                  ? "size-4 animate-spin"
                  : "size-4"
              }
            />

            Perbarui
          </Button>
        }
      />


      <div className="mt-8 space-y-6">
        {workersQuery.isError ||
        devicesQuery.isError ? (
          <Alert variant="destructive">
            <TriangleAlert className="size-4" />

            <AlertDescription>
              Data pemulung atau perangkat
              monitoring tidak dapat dimuat.
            </AlertDescription>
          </Alert>
        ) : null}


        <Alert>
          <Activity className="size-4" />

          <AlertDescription>
            ARKL realtime dihitung otomatis
            oleh backend ketika data H₂S dari
            perangkat IoT diterima. Operator
            tidak perlu menjalankan perhitungan
            secara manual.
          </AlertDescription>
        </Alert>


        <Card>
          <CardHeader>
            <CardTitle>
              Pemulung yang Dipantau
            </CardTitle>

            <CardDescription>
              Pilih pemulung untuk melihat
              hasil ARKL realtime terbaru dan
              perangkat monitoring yang
              ditetapkan.
            </CardDescription>
          </CardHeader>


          <CardContent>
            {sourcesLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full max-w-xl" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="max-w-xl space-y-2">
                  <Label>
                    Pemulung
                  </Label>

                  <Select
                    value={
                      selectedWorkerId
                    }
                    onValueChange={(
                      value,
                    ) => {
                      setSelectedWorkerId(
                        value ?? "",
                      )
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih pemulung" />
                    </SelectTrigger>

                    <SelectContent>
                      {workers.map(
                        (
                          worker,
                        ) => (
                          <SelectItem
                            key={
                              worker.id
                            }
                            value={String(
                              worker.id,
                            )}
                          >
                            {worker.name
                              ?.trim() ||
                              "Nama belum dilengkapi"}{" "}
                            — {worker.code}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>


                {selectedWorker ? (
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Activity className="size-5" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-medium">
                          Perangkat Monitoring
                        </p>

                        {assignedDevice ? (
                          <div className="mt-2 space-y-2">
                            <p className="font-semibold">
                              {assignedDevice.name
                                ?.trim() ||
                                assignedDevice
                                  .device_code}
                            </p>

                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline">
                                {
                                  assignedDevice
                                    .device_code
                                }
                              </Badge>

                              <Badge variant="outline">
                                {assignedDevice
                                  .is_active
                                  ? "Aktif"
                                  : "Tidak aktif"}
                              </Badge>

                              {assignedDevice
                                .location ? (
                                <Badge variant="outline">
                                  {
                                    assignedDevice
                                      .location
                                  }
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        ) : assignedDeviceId ? (
                          <p className="mt-2 text-sm text-muted-foreground">
                            Perangkat #{assignedDeviceId}
                          </p>
                        ) : (
                          <p className="mt-2 text-sm font-medium text-destructive">
                            Belum ada perangkat
                            monitoring yang ditetapkan.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>


        {selectedWorker ? <ReferenceMeasurementManager key={selectedWorker.id} workerId={selectedWorker.id} workerCode={selectedWorker.code} /> : null}
        {result ? <IoTReadingAge receivedAt={result.reading_received_at} /> : null}

        {selectedWorker &&
        latestARKLQuery.isPending ? (
          <Card>
            <CardContent className="space-y-4 py-6">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-28 w-full" />
            </CardContent>
          </Card>
        ) : null}


        {selectedWorker &&
        latestARKLQuery.isError ? (
          <Alert variant="destructive">
            <TriangleAlert className="size-4" />

            <AlertDescription>
              Hasil ARKL terbaru untuk pemulung
              ini tidak dapat dimuat.
            </AlertDescription>
          </Alert>
        ) : null}


        {selectedWorker &&
        !latestARKLQuery.isPending &&
        !latestARKLQuery.isError &&
        !result ? (
          <Card>
            <CardContent className="py-10 text-center">
              <Activity className="mx-auto size-9 text-muted-foreground/50" />

              <p className="mt-3 font-medium">
                Belum ada hasil ARKL realtime
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                Hasil akan tersedia otomatis
                setelah sistem menerima data
                sensor dan menjalankan ARKL.
              </p>
            </CardContent>
          </Card>
        ) : null}


        {result ? (
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>
                    ARKL IoT — Pembacaan Terakhir
                  </CardTitle>

                  <CardDescription className="mt-1">
                    Snapshot karakterisasi risiko
                    terbaru yang dihasilkan backend.
                  </CardDescription>
                </div>

                {riskInterpretation ? (
                  <RiskBadge
                    interpretation={
                      riskInterpretation
                    }
                  />
                ) : (
                  <Badge variant="outline">
                    {result.interpretation}
                  </Badge>
                )}
              </div>
            </CardHeader>


            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border bg-muted/25 p-4">
                  <p className="text-sm text-muted-foreground">
                    Risk Quotient
                  </p>

                  <p className="numeric-data mt-2 text-3xl font-bold">
                    {formatNumber(
                      result.rq,
                      4,
                    )}
                  </p>
                </div>


                <div className="rounded-xl border bg-muted/25 p-4">
                  <p className="text-sm text-muted-foreground">
                    Konsentrasi H₂S
                  </p>

                  <p className="numeric-data mt-2 text-xl font-semibold">
                    {formatNumber(
                      result.concentration_ppm,
                      3,
                    )}{" "}
                    ppm
                  </p>
                </div>


                <div className="rounded-xl border bg-muted/25 p-4">
                  <p className="text-sm text-muted-foreground">
                    Intake
                  </p>

                  <p className="numeric-data mt-2 text-xl font-semibold">
                    {formatNumber(
                      result.intake,
                      8,
                    )}
                  </p>
                </div>


                <div className="rounded-xl border bg-muted/25 p-4">
                  <p className="text-sm text-muted-foreground">
                    RfC
                  </p>

                  <p className="numeric-data mt-2 text-xl font-semibold">
                    {formatNumber(
                      result.rfc,
                      6,
                    )}
                  </p>
                </div>
              </div>


              {riskInterpretation ? (
                <RiskExplanation
                  interpretation={
                    riskInterpretation
                  }
                />
              ) : null}


              <ARKLCalculationDetails
                result={result}
                formatNumber={formatNumber}
              />


              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Pemulung
                  </p>

                  <p className="mt-1 font-medium">
                    {result.worker_code}
                  </p>
                </div>


                <div>
                  <p className="text-sm text-muted-foreground">
                    Perangkat
                  </p>

                  <p className="mt-1 font-medium">
                    {result.device_code ?? "—"}
                  </p>
                </div>


                <div>
                  <p className="text-sm text-muted-foreground">
                    Sumber
                  </p>

                  <div className="mt-1">
                    <Badge variant="outline">
                      {result.source_simulated
                        ? "Simulasi"
                        : "Sensor fisik"}
                    </Badge>
                  </div>
                </div>


                <div>
                  <p className="text-sm text-muted-foreground">
                    Versi Perhitungan
                  </p>

                  <p className="mt-1 font-medium">
                    {
                      result.calculation_version
                    }
                  </p>
                </div>


                <div>
                  <p className="text-sm text-muted-foreground">
                    Waktu Perhitungan
                  </p>

                  <div className="mt-1 flex items-center gap-2 text-sm font-medium">
                    <Clock3 className="size-4 text-muted-foreground" />

                    {formatDateTime(
                      result.created_at,
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PageContainer>
  )
}
