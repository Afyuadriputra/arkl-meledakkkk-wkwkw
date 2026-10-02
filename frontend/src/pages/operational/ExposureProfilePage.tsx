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
  Info,
  Loader2,
  LockKeyhole,
  RefreshCw,
  Save,
  TriangleAlert,
  Wind,
} from "lucide-react"
import {
  useNavigate,
  useParams,
} from "react-router-dom"

import {
  createExposureProfile,
  getExposureProfiles,
  getWorker,
  updateExposureProfile,
} from "@/api/exposure"

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
  Input,
} from "@/components/ui/input"
import {
  Label,
} from "@/components/ui/label"
import {
  Skeleton,
} from "@/components/ui/skeleton"


type ExposureForm = {
  body_weight: string
  exposure_time: string
  exposure_frequency: string
  exposure_duration: string
}


type ExposureListResponse =
  Awaited<
    ReturnType<
      typeof getExposureProfiles
    >
  >


type ExistingExposure =
  ExposureListResponse["results"][number]


type WorkerResponse =
  Awaited<
    ReturnType<
      typeof getWorker
    >
  >


interface ExposureFormCardProps {
  worker: WorkerResponse

  existingExposure:
    | ExistingExposure
    | null

  onSaved: () => Promise<void>

  onCancel: () => void
}


const EMPTY_FORM: ExposureForm = {
  body_weight: "",
  exposure_time: "",
  exposure_frequency: "",
  exposure_duration: "",
}


function toNumber(
  value: string,
) {
  const parsed =
    Number(value)

  return Number.isFinite(
    parsed,
  )
    ? parsed
    : null
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
  ).format(numericValue)
}


function createInitialForm(
  exposure:
    | ExistingExposure
    | null,
): ExposureForm {
  if (!exposure) {
    return {
      ...EMPTY_FORM,
    }
  }

  return {
    body_weight:
      String(
        exposure.body_weight,
      ),

    exposure_time:
      String(
        exposure.exposure_time,
      ),

    exposure_frequency:
      String(
        exposure.exposure_frequency,
      ),

    exposure_duration:
      String(
        exposure.exposure_duration,
      ),
  }
}


function validateExposureForm(
  form: ExposureForm,
) {
  const bodyWeight =
    toNumber(
      form.body_weight,
    )

  const exposureTime =
    toNumber(
      form.exposure_time,
    )

  const exposureFrequency =
    toNumber(
      form.exposure_frequency,
    )

  const exposureDuration =
    toNumber(
      form.exposure_duration,
    )

  if (
    bodyWeight === null ||
    exposureTime === null ||
    exposureFrequency === null ||
    exposureDuration === null
  ) {
    throw new Error(
      "Semua parameter pajanan wajib diisi dengan angka yang valid.",
    )
  }

  if (bodyWeight <= 0) {
    throw new Error(
      "Berat badan harus lebih dari 0 kg.",
    )
  }

  if (
    exposureTime <= 0 ||
    exposureTime > 24
  ) {
    throw new Error(
      "Waktu pajanan harus lebih dari 0 dan maksimal 24 jam per hari.",
    )
  }

  if (
    exposureFrequency <= 0 ||
    exposureFrequency > 365
  ) {
    throw new Error(
      "Frekuensi pajanan harus lebih dari 0 dan maksimal 365 hari per tahun.",
    )
  }

  if (
    exposureDuration <= 0
  ) {
    throw new Error(
      "Durasi pajanan harus lebih dari 0 tahun.",
    )
  }

  return {
    bodyWeight,
    exposureTime,
    exposureFrequency,
    exposureDuration,
  }
}


function getMethodologyPreview(
  age:
    | number
    | null
    | undefined,
) {
  if (
    age === null ||
    age === undefined
  ) {
    return {
      categoryLabel:
        "Belum tersedia",

      rate:
        null,

      supported:
        false,
    }
  }

  if (
    age >= 6 &&
    age <= 12
  ) {
    return {
      categoryLabel:
        "Anak 6–12 tahun",

      rate:
        0.5,

      supported:
        true,
    }
  }

  if (
    age >= 18
  ) {
    return {
      categoryLabel:
        "Dewasa",

      rate:
        0.83,

      supported:
        true,
    }
  }

  return {
    categoryLabel:
      "Metodologi belum tersedia",

    rate:
      null,

    supported:
      false,
  }
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
      return null
  }
}


function ExposureFormCard({
  worker,
  existingExposure,
  onSaved,
  onCancel,
}: ExposureFormCardProps) {
  const [
    form,
    setForm,
  ] =
    useState<ExposureForm>(
      () =>
        createInitialForm(
          existingExposure,
        ),
    )

  const [
    formError,
    setFormError,
  ] =
    useState<
      string | null
    >(null)


  const methodologyPreview =
    getMethodologyPreview(
      worker.age,
    )


  const backendCategory =
    existingExposure
      ? getCategoryLabel(
          existingExposure
            .inhalation_category,
        )
      : null


  const displayedCategory =
    backendCategory ??
    methodologyPreview.categoryLabel


  const displayedRate =
    existingExposure
      ?.inhalation_rate ??
    methodologyPreview.rate


  const methodologySupported =
    existingExposure
      ? Boolean(
          existingExposure
            .inhalation_category,
        )
      : methodologyPreview
          .supported


  const saveMutation =
    useMutation({
      mutationFn:
        async () => {
          const {
            bodyWeight,
            exposureTime,
            exposureFrequency,
            exposureDuration,
          } =
            validateExposureForm(
              form,
            )

          if (
            existingExposure
          ) {
            return updateExposureProfile(
              existingExposure.id,
              {
                body_weight:
                  bodyWeight,

                exposure_time:
                  exposureTime,

                exposure_frequency:
                  exposureFrequency,

                exposure_duration:
                  exposureDuration,
              },
            )
          }

          return createExposureProfile({
            worker:
              worker.id,

            body_weight:
              bodyWeight,

            exposure_time:
              exposureTime,

            exposure_frequency:
              exposureFrequency,

            exposure_duration:
              exposureDuration,
          })
        },

      onSuccess:
        async () => {
          setFormError(null)

          await onSaved()
        },

      onError:
        (error) => {
          setFormError(
            error instanceof
              Error
              ? error.message
              : "Data pajanan gagal disimpan.",
          )
        },
    })


  function updateField(
    field:
      keyof ExposureForm,
    value: string,
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]:
          value,
      }),
    )

    setFormError(null)
  }


  function handleSubmit(
    event:
      React.FormEvent<
        HTMLFormElement
      >,
  ) {
    event.preventDefault()

    if (
      saveMutation.isPending ||
      !methodologySupported
    ) {
      return
    }

    saveMutation.mutate()
  }


  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>
          {existingExposure
            ? "Perbarui Profil Pajanan"
            : "Isi Profil Pajanan"}
        </CardTitle>

        <CardDescription>
          Data berikut digunakan
          oleh sistem dalam
          perhitungan ARKL.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form
          className="space-y-6"
          onSubmit={
            handleSubmit
          }
        >
          {formError ? (
            <Alert variant="destructive">
              <TriangleAlert
                className="size-4"
                aria-hidden={true}
              />

              <AlertDescription>
                {formError}
              </AlertDescription>
            </Alert>
          ) : null}


          {!methodologySupported ? (
            <Alert variant="destructive">
              <TriangleAlert
                className="size-4"
                aria-hidden={true}
              />

              <AlertDescription>
                Belum tersedia
                metodologi laju
                inhalasi yang
                disetujui untuk usia{" "}
                {worker.age} tahun.
                Profil pajanan belum
                dapat disimpan.
              </AlertDescription>
            </Alert>
          ) : null}


          <div
            className="
              grid
              gap-5
              sm:grid-cols-2
            "
          >
            {/* Berat badan */}
            <div className="space-y-2">
              <Label htmlFor="body-weight">
                Berat Badan (kg)
              </Label>

              <Input
                id="body-weight"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={
                  form.body_weight
                }
                disabled={
                  saveMutation
                    .isPending
                }
                onChange={(
                  event,
                ) =>
                  updateField(
                    "body_weight",
                    event.target
                      .value,
                  )
                }
              />

              <p className="text-xs text-muted-foreground">
                Berat badan
                subjek pajanan.
              </p>
            </div>


            {/* Waktu pajanan */}
            <div className="space-y-2">
              <Label htmlFor="exposure-time">
                Waktu Pajanan
                (jam/hari)
              </Label>

              <Input
                id="exposure-time"
                type="number"
                min="0.01"
                max="24"
                step="0.01"
                inputMode="decimal"
                value={
                  form.exposure_time
                }
                disabled={
                  saveMutation
                    .isPending
                }
                onChange={(
                  event,
                ) =>
                  updateField(
                    "exposure_time",
                    event.target
                      .value,
                  )
                }
              />

              <p className="text-xs text-muted-foreground">
                Maksimal 24 jam
                per hari.
              </p>
            </div>


            {/* Frekuensi */}
            <div className="space-y-2">
              <Label htmlFor="exposure-frequency">
                Frekuensi Pajanan
                (hari/tahun)
              </Label>

              <Input
                id="exposure-frequency"
                type="number"
                min="0.01"
                max="365"
                step="0.01"
                inputMode="decimal"
                value={
                  form.exposure_frequency
                }
                disabled={
                  saveMutation
                    .isPending
                }
                onChange={(
                  event,
                ) =>
                  updateField(
                    "exposure_frequency",
                    event.target
                      .value,
                  )
                }
              />

              <p className="text-xs text-muted-foreground">
                Maksimal 365 hari
                per tahun.
              </p>
            </div>


            {/* Durasi */}
            <div className="space-y-2">
              <Label htmlFor="exposure-duration">
                Durasi Pajanan
                (tahun)
              </Label>

              <Input
                id="exposure-duration"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={
                  form.exposure_duration
                }
                disabled={
                  saveMutation
                    .isPending
                }
                onChange={(
                  event,
                ) =>
                  updateField(
                    "exposure_duration",
                    event.target
                      .value,
                  )
                }
              />

              <p className="text-xs text-muted-foreground">
                Lama pajanan
                dalam tahun.
              </p>
            </div>
          </div>


          {/* Parameter metodologis */}
          <div
            className="
              rounded-xl
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
                    size-10
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
                  <div
                    className="
                      flex
                      flex-wrap
                      items-center
                      gap-2
                    "
                  >
                    <p className="font-medium">
                      Laju Inhalasi (R)
                    </p>

                    <Badge
                      variant="outline"
                      className="gap-1"
                    >
                      <LockKeyhole
                        className="size-3"
                        aria-hidden={true}
                      />

                      Sistem
                    </Badge>
                  </div>

                  <p
                    className="
                      mt-1
                      text-sm
                      text-muted-foreground
                    "
                  >
                    {displayedCategory}
                  </p>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <p
                  className="
                    numeric-data
                    text-lg
                    font-semibold
                  "
                >
                  {displayedRate ===
                  null
                    ? "—"
                    : formatNumber(
                        displayedRate,
                        2,
                      )}
                </p>

                <p className="text-xs text-muted-foreground">
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
                text-xs
                leading-relaxed
                text-muted-foreground
              "
            >
              <Info
                className="
                  mt-0.5
                  size-4
                  shrink-0
                "
                aria-hidden={true}
              />

              <p>
                Nilai ini ditentukan
                otomatis oleh backend
                berdasarkan usia dan
                metodologi ARKL yang
                disetujui. Operator
                tidak dapat mengubah
                nilai ini secara
                manual.
              </p>
            </div>
          </div>


          <div
            className="
              flex
              flex-col-reverse
              gap-2
              border-t
              pt-6
              sm:flex-row
              sm:justify-end
            "
          >
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={
                saveMutation
                  .isPending
              }
              onClick={
                onCancel
              }
            >
              Batal
            </Button>

            <Button
              type="submit"
              className="min-h-11 gap-2"
              disabled={
                saveMutation
                  .isPending ||
                !methodologySupported
              }
            >
              {saveMutation
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

                  {existingExposure
                    ? "Simpan Perubahan"
                    : "Simpan Data Pajanan"}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}


function ExposurePageSkeleton() {
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <Skeleton className="h-5 w-40" />

        <Skeleton className="h-4 w-72 max-w-full" />
      </CardHeader>

      <CardContent className="space-y-4">
        {Array.from({
          length: 5,
        }).map(
          (_, index) => (
            <Skeleton
              key={index}
              className="h-16 w-full"
            />
          ),
        )}
      </CardContent>
    </Card>
  )
}


export function ExposureProfilePage() {
  const navigate =
    useNavigate()

  const {
    id,
  } =
    useParams()

  const queryClient =
    useQueryClient()


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
        getWorker(
          workerId,
        ),

      enabled:
        validWorkerId,

      retry: 1,
    })


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
        validWorkerId,

      retry: 1,
    })


  const existingExposure =
    exposureQuery.data
      ?.results
      .find(
        (profile) =>
          profile.worker ===
          workerId,
      ) ??
    null


  async function handleSaved() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: [
          "workers",
          "detail",
          workerId,
          "exposure",
        ],
      }),

      queryClient.invalidateQueries({
        queryKey: [
          "workers",
          "detail",
          workerId,
        ],
      }),

      queryClient.invalidateQueries({
        queryKey: [
          "arkl",
          "results",
        ],
      }),
    ])

    navigate(
      `/app/workers/${workerId}`,
      {
        replace: true,
      },
    )
  }


  function handleBack() {
    navigate(
      `/app/workers/${workerId}`,
    )
  }


  if (
    !validWorkerId
  ) {
    return (
      <PageContainer>
        <Alert variant="destructive">
          <TriangleAlert
            className="size-4"
            aria-hidden={true}
          />

          <AlertDescription>
            ID pemulung tidak
            valid.
          </AlertDescription>
        </Alert>
      </PageContainer>
    )
  }


  const isLoading =
    workerQuery.isPending ||
    exposureQuery.isPending

  const hasLoadError =
    workerQuery.isError ||
    exposureQuery.isError


  return (
    <PageContainer>
      <PageHeader
        title="Data Pajanan"
        description={
          workerQuery.data
            ? (
                `Kelola parameter pajanan untuk ` +
                `${workerQuery.data.name} ` +
                `(${workerQuery.data.code}).`
              )
            : (
                "Kelola parameter pajanan pemulung."
              )
        }
        action={
          <div
            className="
              flex
              flex-wrap
              gap-2
            "
          >
            <Button
              type="button"
              variant="outline"
              className="min-h-11 gap-2"
              onClick={
                handleBack
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
              variant="outline"
              className="min-h-11 gap-2"
              disabled={
                exposureQuery
                  .isFetching ||
                workerQuery
                  .isFetching
              }
              onClick={() => {
                void Promise.all([
                  workerQuery.refetch(),
                  exposureQuery.refetch(),
                ])
              }}
            >
              <RefreshCw
                className={
                  exposureQuery
                    .isFetching ||
                  workerQuery
                    .isFetching
                    ? "size-4 animate-spin motion-reduce:animate-none"
                    : "size-4"
                }
                aria-hidden={true}
              />

              {exposureQuery
                .isFetching ||
              workerQuery
                .isFetching
                ? "Memperbarui..."
                : "Perbarui"}
            </Button>
          </div>
        }
      />


      <div className="mt-8">
        {isLoading ? (
          <ExposurePageSkeleton />
        ) : hasLoadError ? (
          <Alert variant="destructive">
            <TriangleAlert
              className="size-4"
              aria-hidden={true}
            />

            <AlertDescription>
              Data pemulung atau
              profil pajanan tidak
              dapat dimuat.
            </AlertDescription>
          </Alert>
        ) : workerQuery.data ? (
          <ExposureFormCard
            key={
              existingExposure
                ? (
                    `exposure-` +
                    `${existingExposure.id}-` +
                    `${workerQuery.data.age}`
                  )
                : (
                    `new-${workerId}-` +
                    `${workerQuery.data.age}`
                  )
            }
            worker={
              workerQuery.data
            }
            existingExposure={
              existingExposure
            }
            onSaved={
              handleSaved
            }
            onCancel={
              handleBack
            }
          />
        ) : null}
      </div>
    </PageContainer>
  )
}