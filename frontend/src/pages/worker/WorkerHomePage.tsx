import {
  useMemo,
} from "react"
import {
  useQuery,
} from "@tanstack/react-query"
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock3,
  RadioTower,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  WifiOff,
} from "lucide-react"
import {
  useNavigate,
  useOutletContext,
} from "react-router-dom"
import type { WorkerSetupContext } from "@/app/guards/WorkerSetupGuard"
import { ARKLVerificationNotice, WorkerCalculationStatus } from "@/components/status/ARKLVerificationNotice"
import { ReferenceARKLCard, IoTReadingAge } from "@/components/status/ReferenceARKLCard"
import { latestARKLByType } from "@/lib/arklResults"

import {
  isApiError,
} from "@/api/client"
import {
  getMyAlerts,
  getMyARKLResults,
  getMyMonitoring,
  getMyProfile,
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
      timeStyle: "short",
    },
  ).format(date)
}


function getAlertGuidance(
  level: AlertLevel,
) {
  switch (level) {
    case "LOW":
      return {
        title: "Waspada",
        action:
          "Batasi waktu berada di area ini.",
        message:
          "Kadar H₂S mulai meningkat. Batasi waktu berada di area ini.",
      }

    case "MEDIUM":
      return {
        title: "Peringatan",
        action:
          "Menjauh dari area ini.",
        message:
          "Kadar H₂S tinggi. Sebaiknya menjauh dari area ini dan gunakan perlindungan yang dianjurkan.",
      }

    case "HIGH":
      return {
        title: "Bahaya",
        action:
          "Segera menuju tempat aman.",
        message:
          "Kondisi berbahaya. Segera tinggalkan area dan menuju tempat yang lebih aman.",
      }

    case "CRITICAL":
      return {
        title: "Bahaya Serius",
        action:
          "Segera keluar dari area.",
        message:
          "BAHAYA SERIUS. Segera keluar dari area dan ikuti arahan petugas keselamatan.",
      }

    case "NONE":
    default:
      return {
        title: "Kondisi Terkendali",
        action:
          "Tetap ikuti prosedur keselamatan.",
        message:
          "Kondisi terkendali. Tetap bekerja sesuai prosedur keselamatan.",
      }
  }
}


function WorkerHomeSkeleton() {
  return (
    <div className="space-y-5 p-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-56" />
      </div>

      <Skeleton className="h-44 rounded-2xl" />
      <Skeleton className="h-44 rounded-2xl" />
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-20 rounded-2xl" />
    </div>
  )
}


export function WorkerHomePage() {
  const { exposure } = useOutletContext<WorkerSetupContext>()
  const navigate =
    useNavigate()


  const profileQuery =
    useQuery({
      queryKey: [
        "worker",
        "profile",
      ],

      queryFn:
        getMyProfile,

      staleTime:
        60_000,
    })


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


  const arklQuery =
    useQuery({
      queryKey: [
        "worker",
        "arkl-results",
      ],

      queryFn:
        getMyARKLResults,

      refetchInterval:
        15_000,
    })


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


  const profile =
    profileQuery.data ??
    null

  const monitoring =
    monitoringQuery.data ??
    null

  const currentDevice =
    monitoring?.device ??
    null

  const currentReading =
    monitoring?.reading ??
    null


  const monitoringNotAssigned =
    monitoringQuery.isError &&
    isApiError(
      monitoringQuery.error,
    ) &&
    monitoringQuery.error.status ===
      404


  const monitoringRealError =
    monitoringQuery.isError &&
    !monitoringNotAssigned


  const latestARKL =
    useMemo(() => {
      if (
        !arklQuery.data?.length
      ) {
        return null
      }

      return latestARKLByType(arklQuery.data, "REALTIME")
    }, [
      arklQuery.data,
    ])


  const activeAlerts =
    useMemo(
      () =>
        (
          alertsQuery.data ??
          []
        ).filter(
          (alert) =>
            alert.status !==
            "RESOLVED",
        ),
      [
        alertsQuery.data,
      ],
    )


  const highestActiveAlert =
    useMemo(() => {
      const priority = {
        NONE: 0,
        LOW: 1,
        MEDIUM: 2,
        HIGH: 3,
        CRITICAL: 4,
      } as const

      return [
        ...activeAlerts,
      ].sort(
        (a, b) =>
          priority[
            b.alert_level
          ] -
          priority[
            a.alert_level
          ],
      )[0] ?? null
    }, [
      activeAlerts,
    ])


  const monitoringSeverity =
    asSeverity(
      currentReading?.status,
    )


  const isAboveReference =
    latestARKL
      ?.interpretation ===
    "ABOVE_REFERENCE_LEVEL"


  const hasAnyError =
    profileQuery.isError ||
    monitoringRealError ||
    arklQuery.isError ||
    alertsQuery.isError


  const isInitialLoading =
    profileQuery.isPending &&
    monitoringQuery.isPending &&
    arklQuery.isPending &&
    alertsQuery.isPending


  const isRefreshing =
    profileQuery.isFetching ||
    monitoringQuery.isFetching ||
    arklQuery.isFetching ||
    alertsQuery.isFetching


  function refreshAll() {
    void profileQuery.refetch()
    void monitoringQuery.refetch()
    void arklQuery.refetch()
    void alertsQuery.refetch()
  }


  if (isInitialLoading) {
    return (
      <WorkerHomeSkeleton />
    )
  }


  return (
    <div className="space-y-5 p-4 pb-6">
      {/* HEADER */}
      <section className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            Selamat datang
          </p>

          <h1 className="mt-0.5 truncate text-2xl font-bold tracking-tight">
            {profile?.name
              ? `Halo, ${profile.name}`
              : "Halo"}
          </h1>

          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Pantau kondisi lingkungan,
            risiko pajanan, dan peringatan
            Anda.
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 shrink-0"
          disabled={
            isRefreshing
          }
          onClick={
            refreshAll
          }
          aria-label="Perbarui informasi"
          title="Perbarui"
        >
          <RefreshCw
            className={
              isRefreshing
                ? "size-5 animate-spin"
                : "size-5"
            }
          />
        </Button>
      </section>


      {/* PARTIAL ERROR */}
      {hasAnyError ? (
        <Alert variant="destructive">
          <TriangleAlert className="size-4" />

          <AlertDescription>
            Sebagian informasi belum dapat
            dimuat. Data lain yang tersedia
            tetap ditampilkan.
          </AlertDescription>
        </Alert>
      ) : null}


      {/* ACTIVE ALERT — HIGHEST PRIORITY */}
      {highestActiveAlert ? (
        <Card className="overflow-hidden border-status-warning/30 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-status-warning/10 text-status-warning">
                <ShieldAlert className="size-6" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-status-warning">
                  Peringatan Aktif
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  {
                    getAlertGuidance(
                      highestActiveAlert
                        .alert_level,
                    ).title
                  }
                </h2>

                <p className="mt-1 text-sm font-medium">
                  {
                    getAlertGuidance(
                      highestActiveAlert
                        .alert_level,
                    ).action
                  }
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {
                getAlertGuidance(
                  highestActiveAlert
                    .alert_level,
                ).message
              }
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
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
            </div>

            <Button
              type="button"
              className="mt-4 min-h-11 w-full justify-between"
              onClick={() =>
                navigate(
                  "/worker/alerts",
                )
              }
            >
              Lihat Peringatan

              <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>
      ) : null}


      {/* MONITORING */}
      <Card className="overflow-hidden border-primary/15 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardDescription>
                Kondisi Lingkungan Sekarang
              </CardDescription>

              <CardTitle className="mt-1 text-lg">
                Monitoring H₂S
              </CardTitle>
            </div>

            {monitoringSeverity ? (
              <SeverityBadge
                severity={
                  monitoringSeverity
                }
              />
            ) : null}
          </div>
        </CardHeader>

        <CardContent>
          {currentDevice &&
          currentReading ? (
            <div className="space-y-4">
              {!currentDevice.is_active ? (
                <Alert>
                  <WifiOff className="size-4" />

                  <AlertDescription>
                    Perangkat monitoring sedang
                    tidak aktif. Nilai berikut
                    adalah data terakhir yang
                    tersedia dan bukan kondisi
                    realtime.
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className="flex items-end gap-2">
                <span className="numeric-data text-5xl font-black tracking-tight">
                  {formatNumber(
                    currentReading.ppm,
                    3,
                  )}
                </span>

                <span className="mb-1 text-base font-medium text-muted-foreground">
                  ppm
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="rounded-full"
                >
                  {currentReading.simulated
                    ? "Simulasi"
                    : "Sensor fisik"}
                </Badge>

                <Badge
                  variant="outline"
                  className="rounded-full"
                >
                  <Clock3 className="mr-1 size-3.5" />

                  {formatDateTime(
                    currentReading
                      .received_at,
                  )}
                </Badge>
              </div>

              <div className="rounded-xl border bg-muted/20 p-3">
                <div className="flex items-start gap-3">
                  <RadioTower className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {currentDevice.name?.trim() ||
                        currentDevice.device_code}
                    </p>

                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {currentDevice.location?.trim() ||
                        "Lokasi belum ditentukan"}
                    </p>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full justify-between"
                onClick={() =>
                  navigate(
                    "/worker/monitoring",
                  )
                }
              >
                Buka Monitoring

                <ArrowRight className="size-4" />
              </Button>
            </div>
          ) : monitoringNotAssigned ? (
            <div className="py-4 text-center">
              <RadioTower className="mx-auto size-9 text-muted-foreground/40" />

              <p className="mt-3 font-semibold">
                Perangkat Belum Ditetapkan
              </p>

              <p className="mx-auto mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Petugas belum menetapkan
                perangkat monitoring H₂S untuk
                area Anda.
              </p>
            </div>
          ) : currentDevice &&
            !currentReading ? (
            <div className="py-4 text-center">
              <Clock3 className="mx-auto size-9 text-muted-foreground/40" />

              <p className="mt-3 font-semibold">
                Menunggu Pembacaan
              </p>

              <p className="mx-auto mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Perangkat sudah ditetapkan,
                tetapi belum ada data H₂S yang
                diterima.
              </p>

              <Button
                type="button"
                variant="outline"
                className="mt-4 min-h-11"
                onClick={() =>
                  navigate(
                    "/worker/monitoring",
                  )
                }
              >
                Lihat Monitoring
              </Button>
            </div>
          ) : monitoringRealError ? (
            <div className="py-4 text-center">
              <TriangleAlert className="mx-auto size-9 text-destructive/70" />

              <p className="mt-3 font-semibold">
                Monitoring Tidak Tersedia
              </p>

              <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                Data monitoring belum dapat
                dimuat saat ini.
              </p>
            </div>
          ) : (
            <div className="py-4 text-center">
              <Clock3 className="mx-auto size-9 text-muted-foreground/40" />

              <p className="mt-3 text-sm text-muted-foreground">
                Memuat kondisi lingkungan.
              </p>
            </div>
          )}
        </CardContent>
      </Card>


      {/* PERSONAL ARKL */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardDescription>
                Risiko Saya
              </CardDescription>

              <CardTitle className="mt-1 text-lg">
                ARKL IoT — Pembacaan Terakhir
              </CardTitle>
            </div>

            {latestARKL
              ?.interpretation ===
            "WITHIN_REFERENCE_LEVEL" ? (
              <RiskBadge interpretation="WITHIN_REFERENCE_LEVEL" />
            ) : latestARKL
                ?.interpretation ===
              "ABOVE_REFERENCE_LEVEL" ? (
              <RiskBadge interpretation="ABOVE_REFERENCE_LEVEL" />
            ) : null}
          </div>
        </CardHeader>

        <CardContent>
          <WorkerCalculationStatus status={exposure?.calculation_status} />
          {latestARKL ? (
            <div className="space-y-4">
              <ARKLVerificationNotice verified={latestARKL.exposure_profile_verified} />
              <p className="text-xs text-muted-foreground">
                Data IoT diterima · {formatDateTime(latestARKL.reading_received_at)}
                {latestARKL.source_simulated ? " · Simulasi" : ""}
              </p>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Risk Quotient
                  </p>

                  <p className="numeric-data mt-1 text-3xl font-black tracking-tight">
                    {formatNumber(
                      latestARKL.rq,
                      3,
                    )}
                  </p>
                </div>

                <div
                  className={
                    isAboveReference
                      ? "flex size-11 items-center justify-center rounded-xl bg-status-warning/10 text-status-warning"
                      : "flex size-11 items-center justify-center rounded-xl bg-status-normal/10 text-status-normal"
                  }
                >
                  {isAboveReference ? (
                    <TriangleAlert className="size-5" />
                  ) : (
                    <ShieldCheck className="size-5" />
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-muted/30 p-3">
                <p className="text-sm font-semibold">
                  {isAboveReference
                    ? "Di Atas Nilai Acuan"
                    : "Dalam Nilai Acuan"}
                </p>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Hasil ini merupakan
                  karakterisasi risiko pajanan,
                  bukan diagnosis penyakit.
                </p>
              </div>

              <p className="text-xs text-muted-foreground">
                Analisis terakhir ·{" "}
                {formatDateTime(
                  latestARKL
                    .created_at,
                )}
              </p>

              <Button
                type="button"
                variant="outline"
                className="min-h-11 w-full justify-between"
                onClick={() =>
                  navigate(
                    "/worker/risk",
                  )
                }
              >
                Lihat Risiko Saya

                <ArrowRight className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="py-4 text-center">
              <ShieldCheck className="mx-auto size-9 text-muted-foreground/40" />

              <p className="mt-3 font-semibold">
                Belum Ada Hasil ARKL
              </p>

              <p className="mx-auto mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">
                Hasil dihitung otomatis setelah data pajanan lengkap dan perangkat IoT
                terhubung serta memiliki pembacaan. Tidak perlu menghitung rumus secara manual.
              </p>
            </div>
          )}
        </CardContent>
      </Card>


      {latestARKL ? <IoTReadingAge receivedAt={latestARKL.reading_received_at} /> : null}
      <ReferenceARKLCard result={latestARKLByType(arklQuery.data ?? [], "REFERENCE")} />

      {/* ALERT STATUS */}
      {!highestActiveAlert ? (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">
                  Status Peringatan
                </CardTitle>

                <CardDescription className="mt-1">
                  Peringatan aktif yang tercatat
                  untuk Anda.
                </CardDescription>
              </div>

              {activeAlerts.length > 0 ? (
                <Badge className="rounded-full">
                  {activeAlerts.length}
                </Badge>
              ) : null}
            </div>
          </CardHeader>

          <CardContent>
            {isAboveReference ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-xl border border-status-warning/20 bg-status-warning/5 p-4">
                  <BellRing className="mt-0.5 size-5 shrink-0 text-status-warning" />

                  <div>
                    <p className="font-semibold">
                      Belum ada peringatan aktif
                    </p>

                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Sistem belum mencatat
                      peringatan aktif untuk
                      kondisi ini. Hasil ARKL
                      tetap perlu diperhatikan.
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-11 w-full justify-between"
                  onClick={() =>
                    navigate(
                      "/worker/alerts",
                    )
                  }
                >
                  Lihat Peringatan

                  <ArrowRight className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-xl bg-muted/30 p-4">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

                  <div>
                    <p className="font-semibold">
                      Tidak ada peringatan aktif
                    </p>

                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Sistem tidak mencatat
                      peringatan aktif untuk Anda
                      saat ini.
                    </p>
                  </div>
                </div>

                {(alertsQuery.data?.length ??
                  0) > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11 w-full justify-between"
                    onClick={() =>
                      navigate(
                        "/worker/alerts",
                      )
                    }
                  >
                    Lihat Riwayat

                    <ArrowRight className="size-4" />
                  </Button>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}


      {/* PROFILE SHORTCUT */}
      <Card>
        <CardContent className="p-3">
          <Button
            type="button"
            variant="ghost"
            className="min-h-12 w-full justify-between px-2 hover:bg-transparent"
            onClick={() =>
              navigate(
                "/worker/profile",
              )
            }
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                <UserRound className="size-5" />
              </span>

              <span className="min-w-0 text-left">
                <span className="block font-semibold">
                  Data Saya
                </span>

                <span className="block truncate text-xs font-normal text-muted-foreground">
                  Profil dan data pajanan
                </span>
              </span>
            </span>

            <ArrowRight className="size-4 shrink-0" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
