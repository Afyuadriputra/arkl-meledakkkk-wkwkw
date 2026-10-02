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
  CheckCircle2,
  Clock3,
  Info,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Save,
  Scale,
  ShieldCheck,
  TriangleAlert,
  Wind,
} from "lucide-react"
import {
  useNavigate,
} from "react-router-dom"
import {
  toast,
} from "sonner"

import {
  getMyExposure,
  createMyExposure,
  updateMyExposure,
} from "@/api/worker"
import { isApiError } from "@/api/client"
import { WorkerCalculationStatus } from "@/components/status/ARKLVerificationNotice"

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
  Input,
} from "@/components/ui/input"
import {
  Label,
} from "@/components/ui/label"
import {
  Skeleton,
} from "@/components/ui/skeleton"


type WorkerExposure =
  Awaited<
    ReturnType<
      typeof getMyExposure
    >
  >


interface WorkerExposureFormProps {
  exposure: WorkerExposure | null
}


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
      minimumFractionDigits: 0,
      maximumFractionDigits,
    },
  ).format(number)
}


function getCategoryLabel(
  category:
    | string
    | null
    | undefined,
) {
  switch (category) {
    case "CHILD_6_12":
      return "Anak 6–12 tahun"

    case "ADULT":
      return "Dewasa"

    default:
      return "Kategori metodologi"
  }
}


function ExposureSkeleton() {
  return (
    <div className="space-y-5 p-4 pb-8">
      <div className="space-y-3">
        <Skeleton className="h-11 w-28" />
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <Skeleton className="h-32 rounded-2xl" />

      <Skeleton className="h-[430px] rounded-2xl" />

      <Skeleton className="h-36 rounded-2xl" />
    </div>
  )
}


function ExposureField({
  id,
  label,
  value,
  onChange,
  unit,
  min,
  max,
  step,
  inputMode,
  disabled,
  helperText,
  error,
}: {
  id: string
  label: string
  value: string
  onChange: (
    value: string,
  ) => void
  unit: string
  min?: number
  max?: number
  step?: number
  inputMode:
    | "decimal"
    | "numeric"
  disabled: boolean
  helperText: string
  error?: string | null
}) {
  return (
    <div className="space-y-2">
      <Label
        htmlFor={id}
        className="text-sm font-medium"
      >
        {label}
      </Label>

      <div className="relative">
        <Input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          inputMode={
            inputMode
          }
          value={value}
          disabled={disabled}
          aria-invalid={
            Boolean(error)
          }
          aria-describedby={
            error
              ? `${id}-error`
              : `${id}-helper`
          }
          onChange={(
            event,
          ) =>
            onChange(
              event.target
                .value,
            )
          }
          className="
            min-h-12
            pr-16
            text-base
          "
        />

        <span
          className="
            pointer-events-none
            absolute
            inset-y-0
            right-3
            flex
            items-center
            text-sm
            font-medium
            text-muted-foreground
          "
        >
          {unit}
        </span>
      </div>

      {error ? (
        <p
          id={`${id}-error`}
          className="
            text-xs
            leading-relaxed
            text-destructive
          "
        >
          {error}
        </p>
      ) : (
        <p
          id={`${id}-helper`}
          className="
            text-xs
            leading-relaxed
            text-muted-foreground
          "
        >
          {helperText}
        </p>
      )}
    </div>
  )
}


export function WorkerExposureForm({
  exposure,
}: WorkerExposureFormProps) {
  const queryClient =
    useQueryClient()

  const [
    bodyWeight,
    setBodyWeight,
  ] =
    useState(
      () =>
        String(
          exposure?.body_weight ?? "",
        ),
    )

  const [
    exposureTime,
    setExposureTime,
  ] =
    useState(
      () =>
        String(
          exposure?.exposure_time ?? "",
        ),
    )

  const [
    exposureFrequency,
    setExposureFrequency,
  ] =
    useState(
      () =>
        String(
          exposure?.exposure_frequency ?? "",
        ),
    )

  const [
    exposureDuration,
    setExposureDuration,
  ] =
    useState(
      () =>
        String(
          exposure?.exposure_duration ?? "",
        ),
    )


  const updateMutation =
    useMutation({
      mutationFn:
        exposure ? updateMyExposure : createMyExposure,

      onSuccess:
        async (saved) => {
          queryClient.setQueryData(["worker", "exposure"], saved)
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: [
                "worker",
                "exposure",
              ],
            }),

            queryClient.invalidateQueries({
              queryKey: [
                "worker",
                "arkl-results",
              ],
            }),
          ])

          toast.success(
            saved.calculation_status === "CALCULATED"
              ? "Data tersimpan. ARKL sudah dihitung dari IoT terakhir."
              : "Data tersimpan. Periksa status perangkat dan kalkulasi di halaman Data Pajanan.",
          )
        },

      onError: (error) => {
        toast.error(
          isApiError(error) ? error.message : "Data pajanan belum berhasil disimpan.",
        )
      },
    })


  const bodyWeightNumber =
    Number(
      bodyWeight,
    )

  const exposureTimeNumber =
    Number(
      exposureTime,
    )

  const exposureFrequencyNumber =
    Number(
      exposureFrequency,
    )

  const exposureDurationNumber =
    Number(
      exposureDuration,
    )


  const validBodyWeight =
    Number.isFinite(
      bodyWeightNumber,
    ) &&
    bodyWeightNumber > 0


  const validExposureTime =
    Number.isFinite(
      exposureTimeNumber,
    ) &&
    exposureTimeNumber > 0 &&
    exposureTimeNumber <= 24


  const validExposureFrequency =
    Number.isFinite(
      exposureFrequencyNumber,
    ) &&
    exposureFrequencyNumber > 0 &&
    exposureFrequencyNumber <= 365


  const validExposureDuration =
    Number.isFinite(
      exposureDurationNumber,
    ) &&
    exposureDurationNumber > 0


  const bodyWeightError =
    bodyWeight.length > 0 &&
    !validBodyWeight
      ? "Berat badan harus lebih dari 0 kg."
      : null


  const exposureTimeError =
    exposureTime.length > 0 &&
    !validExposureTime
      ? (
          "Waktu pajanan harus lebih dari 0 " +
          "dan maksimal 24 jam per hari."
        )
      : null


  const exposureFrequencyError =
    exposureFrequency.length > 0 &&
    !validExposureFrequency
      ? (
          "Frekuensi pajanan harus antara " +
          "1 sampai 365 hari per tahun."
        )
      : null


  const exposureDurationError =
    exposureDuration.length > 0 &&
    !validExposureDuration
      ? "Durasi pajanan harus lebih dari 0 tahun."
      : null


  const hasChanges =
    !exposure ||
    bodyWeight !==
      String(
        exposure?.body_weight ?? "",
      ) ||
    exposureTime !==
      String(
        exposure?.exposure_time ?? "",
      ) ||
    exposureFrequency !==
      String(
        exposure?.exposure_frequency ?? "",
      ) ||
    exposureDuration !==
      String(
        exposure?.exposure_duration ?? "",
      )


  const canSave =
    validBodyWeight &&
    validExposureTime &&
    validExposureFrequency &&
    validExposureDuration &&
    hasChanges &&
    !updateMutation.isPending


  function handleSubmit(
    event:
      React.FormEvent<
        HTMLFormElement
      >,
  ) {
    event.preventDefault()

    if (!canSave) {
      return
    }

    updateMutation.mutate({
      body_weight:
        bodyWeightNumber,

      exposure_time:
        exposureTimeNumber,

      exposure_frequency:
        exposureFrequencyNumber,

      exposure_duration:
        exposureDurationNumber,
    })
  }


  return (
    <Card>
      <CardHeader className="space-y-2">
        <div
          className="
            flex
            items-start
            justify-between
            gap-3
          "
        >
          <div>
            <CardTitle className="text-base">
              Data Pajanan
            </CardTitle>

            <CardDescription className="mt-1">
              Isi sesuai kondisi kerja Anda. Data baru atau perubahan
              akan dihitung otomatis menggunakan data IoT yang terhubung.
              Sebelum ACC, hasil diberi label belum diverifikasi petugas.
            </CardDescription>
          </div>

          {hasChanges ? (
            <Badge
              variant="outline"
              className="
                shrink-0
                border-primary/20
                bg-primary/5
                text-primary
              "
            >
              Belum disimpan
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="
                shrink-0
                gap-1
              "
            >
              <CheckCircle2
                className="size-3"
                aria-hidden={true}
              />

              Tersimpan
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-6"
        >
          <ExposureField
            id="body-weight"
            label="Berat Badan"
            value={
              bodyWeight
            }
            onChange={
              setBodyWeight
            }
            unit="kg"
            min={0.1}
            step={0.1}
            inputMode="decimal"
            disabled={
              updateMutation
                .isPending
            }
            helperText={
              "Gunakan berat badan aktual Anda."
            }
            error={
              bodyWeightError
            }
          />


          <ExposureField
            id="exposure-time"
            label="Waktu Pajanan per Hari"
            value={
              exposureTime
            }
            onChange={
              setExposureTime
            }
            unit="jam"
            min={0.1}
            max={24}
            step={0.1}
            inputMode="decimal"
            disabled={
              updateMutation
                .isPending
            }
            helperText={
              "Total waktu berada di area pajanan dalam satu hari."
            }
            error={
              exposureTimeError
            }
          />


          <ExposureField
            id="exposure-frequency"
            label="Frekuensi Pajanan per Tahun"
            value={
              exposureFrequency
            }
            onChange={
              setExposureFrequency
            }
            unit="hari"
            min={1}
            max={365}
            step={1}
            inputMode="numeric"
            disabled={
              updateMutation
                .isPending
            }
            helperText={
              "Perkiraan jumlah hari terpajan dalam satu tahun."
            }
            error={
              exposureFrequencyError
            }
          />


          <ExposureField
            id="exposure-duration"
            label="Durasi Pajanan"
            value={
              exposureDuration
            }
            onChange={
              setExposureDuration
            }
            unit="tahun"
            min={0.1}
            step={0.1}
            inputMode="decimal"
            disabled={
              updateMutation
                .isPending
            }
            helperText={
              "Lama Anda telah mengalami pola pajanan tersebut."
            }
            error={
              exposureDurationError
            }
          />


          <div
            className="
              sticky
              bottom-3
              z-10
              -mx-1
              rounded-2xl
              border
              bg-background/95
              p-3
              shadow-sm
              backdrop-blur
            "
          >
            <Button
              type="submit"
              className="
                min-h-12
                w-full
                gap-2
              "
              disabled={
                !canSave
              }
            >
              {updateMutation
                .isPending ? (
                <>
                  <Loader2
                    className="size-4 animate-spin motion-reduce:animate-none"
                    aria-hidden={true}
                  />

                  Menyimpan...
                </>
              ) : (
                <>
                  <Save
                    className="size-4"
                    aria-hidden={true}
                  />

              {hasChanges
                    ? "Simpan dan Ajukan ACC"
                    : "Data Sudah Tersimpan"}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}


function SystemParameterCard({
  exposure,
}: {
  exposure: WorkerExposure
}) {
  const categoryLabel =
    getCategoryLabel(
      exposure.inhalation_category,
    )

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div
          className="
            flex
            items-center
            gap-2
          "
        >
          <CardTitle className="text-base">
            Parameter Metodologis
          </CardTitle>

          <Badge
            variant="outline"
            className="
              gap-1
              text-xs
            "
          >
            <LockKeyhole
              className="size-3"
              aria-hidden={true}
            />

            Sistem
          </Badge>
        </div>

        <CardDescription>
          Nilai berikut ditentukan
          otomatis oleh sistem dan
          tidak dapat diubah dari
          halaman ini.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div
          className="
            rounded-2xl
            border
            bg-muted/20
            p-4
          "
        >
          <div
            className="
              flex
              items-start
              justify-between
              gap-4
            "
          >
            <div
              className="
                flex
                min-w-0
                items-start
                gap-3
              "
            >
              <div
                className="
                  flex
                  size-11
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  bg-primary/10
                  text-primary
                "
              >
                <Wind
                  className="size-5"
                  aria-hidden={true}
                />
              </div>

              <div className="min-w-0">
                <p className="font-semibold">
                  Laju Inhalasi (R)
                </p>

                <p
                  className="
                    mt-1
                    text-sm
                    text-muted-foreground
                  "
                >
                  {categoryLabel}
                </p>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <p
                className="
                  numeric-data
                  text-xl
                  font-bold
                  tracking-tight
                "
              >
                {formatNumber(
                  exposure
                    .inhalation_rate,
                  2,
                )}
              </p>

              <p
                className="
                  mt-0.5
                  text-xs
                  font-medium
                  text-muted-foreground
                "
              >
                m³/jam
              </p>
            </div>
          </div>


          <div
            className="
              mt-4
              flex
              gap-2
              border-t
              pt-3
            "
          >
            <Info
              className="
                mt-0.5
                size-4
                shrink-0
                text-muted-foreground
              "
              aria-hidden={true}
            />

            <p
              className="
                text-xs
                leading-relaxed
                text-muted-foreground
              "
            >
              Laju inhalasi digunakan
              sebagai parameter dalam
              perhitungan ARKL. Nilainya
              mengikuti kategori usia
              dan metodologi yang
              diterapkan oleh sistem.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


export function WorkerExposurePage() {
  const navigate =
    useNavigate()


  const exposureQuery =
    useQuery({
      queryKey: [
        "worker",
        "exposure",
      ],

      queryFn:
        getMyExposure,

      retry: false,

      staleTime:
        60_000,
    })


  if (
    exposureQuery.isPending &&
    !exposureQuery.data
  ) {
    return (
      <ExposureSkeleton />
    )
  }


  const exposure =
    exposureQuery.data ??
    null


  return (
    <div
      className="
        mx-auto
        w-full
        max-w-xl
        space-y-5
        p-4
        pb-10
      "
    >
      {/* Navigation */}
      <div
        className="
          flex
          items-center
          justify-between
          gap-3
        "
      >
        <Button
          type="button"
          variant="ghost"
          className="
            min-h-11
            gap-2
            px-2
          "
          onClick={() =>
            navigate(
              "/worker/profile",
            )
          }
        >
          <ArrowLeft
            className="size-4"
            aria-hidden={true}
          />

          Kembali
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11"
          disabled={
            exposureQuery
              .isFetching
          }
          aria-label="Perbarui data pajanan"
          onClick={() =>
            void exposureQuery
              .refetch()
          }
        >
          <RefreshCw
            className={
              exposureQuery
                .isFetching
                ? "size-4 animate-spin motion-reduce:animate-none"
                : "size-4"
            }
            aria-hidden={true}
          />
        </Button>
      </div>


      {/* Page intro */}
      <section
        className="
          space-y-2
          px-1
        "
      >
        <div
          className="
            flex
            items-center
            gap-2
          "
        >
          <p
            className="
              text-sm
              font-medium
              text-primary
            "
          >
            Profil
          </p>

          <span
            className="
              size-1
              rounded-full
              bg-border
            "
          />

          <p
            className="
              text-xs
              text-muted-foreground
            "
          >
            Parameter ARKL
          </p>
        </div>

        <h1
          className="
            text-2xl
            font-bold
            tracking-tight
          "
        >
          Data Pajanan
        </h1>

        <p
          className="
            max-w-md
            text-sm
            leading-relaxed
            text-muted-foreground
          "
        >
          Pastikan informasi pajanan
          sesuai kondisi Anda karena
          data ini digunakan pada
          karakterisasi risiko
          berikutnya.
        </p>
      </section>


      {/* Error */}
      {exposureQuery.isError ? (
        <Alert variant="destructive">
          <TriangleAlert
            className="size-4"
            aria-hidden={true}
          />

          <AlertDescription>
            Data pajanan belum tersedia
            atau tidak dapat dimuat.
            Silakan coba perbarui
            halaman.
          </AlertDescription>
        </Alert>
      ) : null}


      {/* Summary */}
      {exposure ? (
        <Card
          className="
            overflow-hidden
            border-primary/15
            shadow-sm
          "
        >
          <CardContent className="p-5">
            <div
              className="
                flex
                items-start
                gap-4
              "
            >
              <div
                className="
                  flex
                  size-12
                  shrink-0
                  items-center
                  justify-center
                  rounded-2xl
                  bg-primary/10
                  text-primary
                "
              >
                <Scale
                  className="size-6"
                  aria-hidden={true}
                />
              </div>

              <div className="min-w-0">
                <div
                  className="
                    flex
                    flex-wrap
                    items-center
                    gap-2
                  "
                >
                  <p className="font-semibold">
                  Profil Pajanan Tersimpan
                  </p>

                  <Badge
                    variant="outline"
                    className="
                      gap-1
                      text-xs
                    "
                  >
                    <ShieldCheck
                      className="size-3"
                      aria-hidden={true}
                    />

                    {exposure.approval_status === "APPROVED" ? "Disetujui" :
                      exposure.approval_status === "REJECTED" ? "Perlu perbaikan" : "Menunggu ACC"}
                  </Badge>
                </div>

                <p
                  className="
                    mt-1
                    text-sm
                    leading-relaxed
                    text-muted-foreground
                  "
                >
                  {exposure.approval_status === "APPROVED"
                    ? "Profil disetujui untuk perhitungan ARKL berikutnya."
                    : exposure.approval_status === "REJECTED"
                      ? "Perbaiki data sesuai catatan petugas untuk melanjutkan kalkulasi."
                      : "ARKL dapat dihitung otomatis sebelum ACC, dengan label hasil sementara."}
                  {exposure.review_note ? ` Catatan petugas: ${exposure.review_note}` : ""}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}


      {/* Editable form */}
      {exposure ? <WorkerCalculationStatus status={exposure.calculation_status} /> : null}
      {exposure ? (
        <WorkerExposureForm
          key={[
            exposure.id,
            exposure.body_weight,
            exposure.exposure_time,
            exposure.exposure_frequency,
            exposure.exposure_duration,
          ].join("-")}
          exposure={
            exposure
          }
        />
      ) : null}


      {/* System parameter */}
      {exposure ? (
        <SystemParameterCard
          exposure={
            exposure
          }
        />
      ) : null}


      {/* Context */}
      {exposure ? (
        <Card className="bg-muted/20">
          <CardContent className="p-5">
            <div className="flex gap-3">
              <Clock3
                className="
                  mt-0.5
                  size-5
                  shrink-0
                  text-muted-foreground
                "
                aria-hidden={true}
              />

              <div>
                <p className="text-sm font-medium">
                  Berlaku untuk perhitungan berikutnya
                </p>

                <p
                  className="
                    mt-1
                    text-sm
                    leading-relaxed
                    text-muted-foreground
                  "
                >
                  Menyimpan perubahan
                  tidak menghitung ulang
                  hasil ARKL yang sudah
                  tercatat sebelumnya.
                  Hasil lama tetap
                  dipertahankan sebagai
                  riwayat.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
