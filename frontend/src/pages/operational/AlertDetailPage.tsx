import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import {
  ArrowLeft,
  CheckCircle2,
  History,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react"
import {
  useNavigate,
  useParams,
} from "react-router-dom"

import {
  acknowledgeAlert,
  getAlert,
  resolveAlert,
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
  RiskBadge,
} from "@/components/status/RiskBadge"

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


export function AlertDetailPage() {
  const navigate =
    useNavigate()

  const {
    id,
  } =
    useParams()

  const queryClient =
    useQueryClient()


  const alertId =
    Number(id)


  const validAlertId =
    Number.isInteger(
      alertId,
    ) &&
    alertId > 0


  const alertQuery =
    useQuery({
      queryKey: [
        "alerts",
        "detail",
        alertId,
      ],

      queryFn: () =>
        getAlert(
          alertId,
        ),

      enabled:
        validAlertId,
    })


  const invalidateAlertQueries =
    async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [
            "alerts",
            "detail",
            alertId,
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            "alerts",
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            "operational-dashboard",
            "active-alerts",
          ],
        }),

        queryClient.invalidateQueries({
          queryKey: [
            "worker",
            "alerts",
          ],
        }),
      ])
    }


  const acknowledgeMutation =
    useMutation({
      mutationFn: () =>
        acknowledgeAlert(
          alertId,
        ),

      onSuccess:
        invalidateAlertQueries,
    })


  const resolveMutation =
    useMutation({
      mutationFn: () =>
        resolveAlert(
          alertId,
        ),

      onSuccess:
        invalidateAlertQueries,
    })


  if (!validAlertId) {
    return (
      <PageContainer>
        <Alert variant="destructive">
          <TriangleAlert className="size-4" />

          <AlertDescription>
            ID peringatan tidak valid.
          </AlertDescription>
        </Alert>
      </PageContainer>
    )
  }


  const alert =
    alertQuery.data ??
    null


  const mutationError =
    acknowledgeMutation.error ??
    resolveMutation.error


  const mutationPending =
    acknowledgeMutation.isPending ||
    resolveMutation.isPending


  /*
   * A RESOLVED alert with resolved_at but no
   * resolved_by actor can represent an internal
   * system supersede during escalation.
   */
  const resolvedBySystem =
    alert?.status ===
      "RESOLVED" &&
    Boolean(
      alert.resolved_at,
    ) &&
    !alert.resolved_by_username


  return (
    <PageContainer>
      <PageHeader
        title="Detail Peringatan"
        description={
          alert
            ? (
              `Peringatan #${alert.id} · ${alert.worker_code}`
            )
            : (
              "Informasi peringatan dan status penanganan."
            )
        }
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                navigate(
                  "/app/alerts",
                )
              }
            >
              <ArrowLeft className="size-4" />

              Kembali
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                void alertQuery.refetch()
              }
              disabled={
                alertQuery.isFetching
              }
            >
              <RefreshCw
                className={
                  alertQuery.isFetching
                    ? "size-4 animate-spin"
                    : "size-4"
                }
              />

              Perbarui
            </Button>
          </div>
        }
      />


      <div className="mt-8 space-y-6">
        {alertQuery.isError ? (
          <Alert variant="destructive">
            <TriangleAlert className="size-4" />

            <AlertDescription>
              Data peringatan tidak dapat dimuat.
            </AlertDescription>
          </Alert>
        ) : null}


        {mutationError ? (
          <Alert variant="destructive">
            <TriangleAlert className="size-4" />

            <AlertDescription>
              {mutationError instanceof
              Error
                ? mutationError.message
                : (
                  "Status peringatan gagal diperbarui."
                )}
            </AlertDescription>
          </Alert>
        ) : null}


        {alertQuery.isPending ? (
          <div className="space-y-6">
            <Skeleton className="h-40 w-full rounded-xl" />

            <div className="grid gap-6 xl:grid-cols-2">
              <Skeleton className="h-72 rounded-xl" />
              <Skeleton className="h-72 rounded-xl" />
            </div>
          </div>
        ) : alert ? (
          <>
            {/* CURRENT LIFECYCLE STATUS */}
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>
                      Status Peringatan
                    </CardTitle>

                    <CardDescription className="mt-1">
                      Lifecycle penanganan dan
                      klasifikasi saat peringatan ini
                      dibuat.
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <SeverityBadge
                      severity={
                        alert.environmental_severity
                      }
                    />

                    <AlertLevelBadge
                      level={
                        alert.alert_level
                      }
                    />

                    <AlertStatusBadge
                      status={
                        alert.status
                      }
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                <Alert>
                  <History className="size-4" />

                  <AlertDescription>
                    Nilai H₂S, RQ, severity, dan
                    interpretasi di halaman ini
                    merupakan snapshot saat
                    peringatan dibuat. Data ini
                    bukan pembacaan lingkungan
                    realtime saat ini.
                  </AlertDescription>
                </Alert>


                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border bg-muted/25 p-4">
                    <p className="text-sm text-muted-foreground">
                      H₂S Saat Peringatan
                    </p>

                    <p className="numeric-data mt-2 text-2xl font-bold">
                      {formatNumber(
                        alert.concentration_ppm,
                        3,
                      )}{" "}
                      ppm
                    </p>
                  </div>


                  <div className="rounded-xl border bg-muted/25 p-4">
                    <p className="text-sm text-muted-foreground">
                      Risk Quotient
                    </p>

                    <p className="numeric-data mt-2 text-2xl font-bold">
                      {formatNumber(
                        alert.rq,
                        4,
                      )}
                    </p>
                  </div>


                  <div className="rounded-xl border bg-muted/25 p-4">
                    <p className="text-sm text-muted-foreground">
                      Pemulung
                    </p>

                    <p className="mt-2 font-semibold">
                      {
                        alert.worker_code
                      }
                    </p>
                  </div>


                  <div className="rounded-xl border bg-muted/25 p-4">
                    <p className="text-sm text-muted-foreground">
                      Perangkat
                    </p>

                    <p className="mt-2 font-semibold">
                      {
                        alert.device_code
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>


            <div className="grid gap-6 xl:grid-cols-2">
              {/* RISK SNAPSHOT */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    Karakterisasi Risiko Saat Peringatan
                  </CardTitle>

                  <CardDescription>
                    Snapshot hasil ARKL yang menjadi
                    salah satu input deterministic
                    Alert Engine.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Interpretasi ARKL
                    </p>

                    <div className="mt-2">
                      {alert.risk_interpretation ===
                      "WITHIN_REFERENCE_LEVEL" ? (
                        <RiskBadge
                          interpretation="WITHIN_REFERENCE_LEVEL"
                        />
                      ) : alert.risk_interpretation ===
                        "ABOVE_REFERENCE_LEVEL" ? (
                        <RiskBadge
                          interpretation="ABOVE_REFERENCE_LEVEL"
                        />
                      ) : (
                        <Badge variant="outline">
                          {
                            alert.risk_interpretation
                          }
                        </Badge>
                      )}
                    </div>
                  </div>


                  <div>
                    <p className="text-sm text-muted-foreground">
                      Status Risiko
                    </p>

                    <p className="mt-1 font-medium">
                      {
                        alert.risk_status
                      }
                    </p>
                  </div>


                  <div>
                    <p className="text-sm text-muted-foreground">
                      Status Lingkungan
                    </p>

                    <p className="mt-1 font-medium">
                      {
                        alert.environmental_status
                      }
                    </p>
                  </div>


                  <div>
                    <p className="text-sm text-muted-foreground">
                      Level Lingkungan
                    </p>

                    <p className="numeric-data mt-1 font-medium">
                      {
                        alert.environmental_level
                      }
                    </p>
                  </div>


                  <p className="border-t pt-4 text-xs leading-relaxed text-muted-foreground">
                    RQ merupakan karakterisasi risiko
                    pajanan lingkungan dan bukan
                    diagnosis atau probabilitas ISPA.
                  </p>
                </CardContent>
              </Card>


              {/* SYSTEM METADATA */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    Informasi Sistem
                  </CardTitle>

                  <CardDescription>
                    Referensi snapshot dan versi
                    engine yang menghasilkan
                    peringatan.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Reading ID
                    </p>

                    <p className="numeric-data mt-1 font-medium">
                      #
                      {
                        alert.reading_id
                      }
                    </p>
                  </div>


                  <div>
                    <p className="text-sm text-muted-foreground">
                      ARKL Result ID
                    </p>

                    <p className="numeric-data mt-1 font-medium">
                      #
                      {
                        alert.arkl_result_id
                      }
                    </p>
                  </div>


                  <div>
                    <p className="text-sm text-muted-foreground">
                      Versi Perhitungan
                    </p>

                    <p className="mt-1 font-medium">
                      {
                        alert.calculation_version
                      }
                    </p>
                  </div>


                  <div>
                    <p className="text-sm text-muted-foreground">
                      Versi Aturan Peringatan
                    </p>

                    <p className="mt-1 font-medium">
                      {
                        alert.alert_rule_version
                      }
                    </p>
                  </div>


                  <div>
                    <p className="text-sm text-muted-foreground">
                      Sumber
                    </p>

                    <div className="mt-1">
                      <Badge variant="outline">
                        {alert.source_simulated
                          ? "Simulasi"
                          : "Sensor fisik"}
                      </Badge>
                    </div>
                  </div>


                  <div>
                    <p className="text-sm text-muted-foreground">
                      Dibuat
                    </p>

                    <p className="mt-1 font-medium">
                      {formatDateTime(
                        alert.created_at,
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>


            {/* LIFECYCLE */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Penanganan Peringatan
                </CardTitle>

                <CardDescription>
                  Perubahan lifecycle dilakukan
                  melalui aturan backend yang
                  tervalidasi.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border p-4">
                    <p className="text-sm text-muted-foreground">
                      Ditanggapi
                    </p>

                    <p className="mt-2 font-medium">
                      {alert.acknowledged_at
                        ? formatDateTime(
                            alert.acknowledged_at,
                          )
                        : (
                          "Belum ditanggapi"
                        )}
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
                        : (
                          "Belum selesai"
                        )}
                    </p>

                    {alert.resolved_by_username ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        oleh{" "}
                        {
                          alert.resolved_by_username
                        }
                      </p>
                    ) : resolvedBySystem ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        oleh sistem
                      </p>
                    ) : null}
                  </div>
                </div>


                {resolvedBySystem ? (
                  <Alert>
                    <History className="size-4" />

                    <AlertDescription>
                      Peringatan ini ditutup otomatis
                      oleh sistem. Kondisi seperti ini
                      dapat terjadi ketika peringatan
                      yang lebih tinggi menggantikan
                      peringatan aktif sebelumnya.
                    </AlertDescription>
                  </Alert>
                ) : null}


                {alert.status !==
                "RESOLVED" ? (
                  <div className="flex flex-col gap-3 border-t pt-5 sm:flex-row">
                    {alert.status ===
                    "OPEN" ? (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={
                          mutationPending
                        }
                        onClick={() =>
                          acknowledgeMutation.mutate()
                        }
                      >
                        <ShieldCheck className="size-4" />

                        {acknowledgeMutation.isPending
                          ? "Memproses..."
                          : (
                            "Tandai Sudah Ditanggapi"
                          )}
                      </Button>
                    ) : null}


                    <Button
                      type="button"
                      disabled={
                        mutationPending
                      }
                      onClick={() =>
                        resolveMutation.mutate()
                      }
                    >
                      <CheckCircle2 className="size-4" />

                      {resolveMutation.isPending
                        ? "Menyelesaikan..."
                        : (
                          "Selesaikan Peringatan"
                        )}
                    </Button>
                  </div>
                ) : (
                  <Alert>
                    <CheckCircle2 className="size-4" />

                    <AlertDescription>
                      Peringatan ini sudah
                      diselesaikan dan tidak lagi
                      menjadi peringatan aktif.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </PageContainer>
  )
}