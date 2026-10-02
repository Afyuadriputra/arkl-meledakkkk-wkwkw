import {
  useMemo,
} from "react"
import {
  AlertTriangle,
  ChartNoAxesCombined,
  ShieldCheck,
} from "lucide-react"

import {
  getAlertSummary,
  getExposureSummary,
  getRiskDistribution,
} from "@/api/research"

import {
  Badge,
} from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"


type RiskDistribution =
  Awaited<
    ReturnType<
      typeof getRiskDistribution
    >
  >

type ExposureSummary =
  Awaited<
    ReturnType<
      typeof getExposureSummary
    >
  >

type AlertSummary =
  Awaited<
    ReturnType<
      typeof getAlertSummary
    >
  >


interface ResearchRiskSectionProps {
  risk:
    | RiskDistribution
    | undefined

  exposure:
    | ExposureSummary
    | undefined

  alerts:
    | AlertSummary
    | undefined
}


function formatNumber(
  value:
    | number
    | null
    | undefined,
  maximumFractionDigits = 2,
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "—"
  }

  return new Intl.NumberFormat(
    "id-ID",
    {
      maximumFractionDigits,
    },
  ).format(value)
}


function formatPercent(
  value:
    | number
    | null
    | undefined,
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return "—"
  }

  return `${formatNumber(
    value,
    1,
  )}%`
}


function formatInterpretation(
  value: string,
) {
  switch (value) {
    case "WITHIN_REFERENCE_LEVEL":
      return "Dalam Batas Referensi"

    case "ABOVE_REFERENCE_LEVEL":
      return "Di Atas Batas Referensi"

    default:
      return value
        .replaceAll(
          "_",
          " ",
        )
        .toLowerCase()
        .replace(
          /\b\w/g,
          (character) =>
            character.toUpperCase(),
        )
  }
}


function formatAlertValue(
  value: string,
) {
  switch (value) {
    case "NONE":
      return "Normal"

    case "LOW":
      return "Waspada"

    case "MEDIUM":
      return "Peringatan"

    case "HIGH":
      return "Bahaya"

    case "CRITICAL":
      return "Kritis"

    case "OPEN":
      return "Aktif"

    case "ACKNOWLEDGED":
      return "Ditindaklanjuti"

    case "RESOLVED":
      return "Selesai"

    default:
      return value
        .replaceAll(
          "_",
          " ",
        )
        .toLowerCase()
        .replace(
          /\b\w/g,
          (character) =>
            character.toUpperCase(),
        )
  }
}


export function ResearchRiskSection({
  risk,
  exposure,
  alerts,
}: ResearchRiskSectionProps) {
  const withinReference =
    useMemo(
      () =>
        risk?.distribution.find(
          (item) =>
            item.interpretation ===
            "WITHIN_REFERENCE_LEVEL",
        ) ?? null,
      [risk],
    )


  const aboveReference =
    useMemo(
      () =>
        risk?.distribution.find(
          (item) =>
            item.interpretation ===
            "ABOVE_REFERENCE_LEVEL",
        ) ?? null,
      [risk],
    )


  const highestAlert =
    useMemo(() => {
      if (!alerts) {
        return null
      }

      const priority:
        Record<
          string,
          number
        > = {
          NONE: 0,
          LOW: 1,
          MEDIUM: 2,
          HIGH: 3,
          CRITICAL: 4,
        }

      return (
        alerts.by_level
          .filter(
            (item) =>
              item.count > 0,
          )
          .sort(
            (a, b) =>
              (priority[b.value] ??
                0) -
              (priority[a.value] ??
                0),
          )[0] ?? null
      )
    }, [alerts])


  return (
    <>
      {/* ARKL and Exposure */}
      <section
        className="
          grid
          gap-4
          xl:grid-cols-2
        "
      >
        {/* ARKL */}
        <Card>
          <CardHeader>
            <div
              className="
                flex
                items-start
                justify-between
                gap-4
              "
            >
              <div className="min-w-0">
                <CardTitle className="text-base">
                  Distribusi Hasil ARKL
                </CardTitle>

                <CardDescription className="mt-1">
                  Distribusi karakterisasi
                  risiko dari hasil ARKL
                  tersimpan.
                </CardDescription>
              </div>

              <ChartNoAxesCombined
                className="
                  size-5
                  shrink-0
                  text-muted-foreground
                "
                aria-hidden="true"
              />
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div
              className="
                grid
                grid-cols-1
                gap-3
                sm:grid-cols-2
              "
            >
              <div
                className="
                  rounded-xl
                  border
                  bg-muted/20
                  p-4
                "
              >
                <p className="text-xs text-muted-foreground">
                  Dalam Referensi
                </p>

                <div
                  className="
                    mt-2
                    flex
                    items-end
                    justify-between
                    gap-3
                  "
                >
                  <p
                    className="
                      text-2xl
                      font-bold
                      tabular-nums
                    "
                  >
                    {formatNumber(
                      withinReference?.count,
                      0,
                    )}
                  </p>

                  <Badge variant="secondary">
                    {formatPercent(
                      withinReference
                        ?.percentage,
                    )}
                  </Badge>
                </div>
              </div>


              <div
                className="
                  rounded-xl
                  border
                  border-destructive/30
                  bg-destructive/5
                  p-4
                "
              >
                <p className="text-xs text-muted-foreground">
                  Di Atas Referensi
                </p>

                <div
                  className="
                    mt-2
                    flex
                    items-end
                    justify-between
                    gap-3
                  "
                >
                  <p
                    className="
                      text-2xl
                      font-bold
                      tabular-nums
                    "
                  >
                    {formatNumber(
                      aboveReference?.count,
                      0,
                    )}
                  </p>

                  <Badge
                    variant={
                      (aboveReference
                        ?.count ??
                        0) > 0
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {formatPercent(
                      aboveReference
                        ?.percentage,
                    )}
                  </Badge>
                </div>
              </div>
            </div>


            {risk?.distribution.length ? (
              <div className="space-y-2">
                {risk.distribution.map(
                  (item) => (
                    <div
                      key={
                        item.interpretation
                      }
                      className="
                        flex
                        items-center
                        justify-between
                        gap-4
                        rounded-xl
                        border
                        bg-muted/20
                        px-4
                        py-3
                      "
                    >
                      <div className="min-w-0">
                        <p
                          className="
                            truncate
                            text-sm
                            font-medium
                          "
                        >
                          {formatInterpretation(
                            item.interpretation,
                          )}
                        </p>

                        <p
                          className="
                            mt-0.5
                            text-xs
                            text-muted-foreground
                          "
                        >
                          {formatPercent(
                            item.percentage,
                          )}{" "}
                          dari hasil
                        </p>
                      </div>

                      <Badge
                        variant="outline"
                        className="shrink-0"
                      >
                        {item.count}
                      </Badge>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <p
                className="
                  rounded-xl
                  border
                  border-dashed
                  p-4
                  text-sm
                  text-muted-foreground
                "
              >
                Belum ada hasil ARKL yang
                tersedia.
              </p>
            )}


            <p
              className="
                text-xs
                leading-relaxed
                text-muted-foreground
              "
            >
              ARKL digunakan untuk
              karakterisasi risiko pajanan
              lingkungan dan bukan diagnosis
              penyakit.
            </p>
          </CardContent>
        </Card>


        {/* Exposure */}
        <Card>
          <CardHeader>
            <div
              className="
                flex
                items-start
                justify-between
                gap-4
              "
            >
              <div className="min-w-0">
                <CardTitle className="text-base">
                  Ringkasan Pajanan
                </CardTitle>

                <CardDescription className="mt-1">
                  Rata-rata parameter pajanan
                  Worker yang memiliki profil
                  aktif.
                </CardDescription>
              </div>

              <ShieldCheck
                className="
                  size-5
                  shrink-0
                  text-muted-foreground
                "
                aria-hidden="true"
              />
            </div>
          </CardHeader>

          <CardContent>
            <div
              className="
                grid
                gap-3
                sm:grid-cols-2
              "
            >
              {[
                {
                  label:
                    "Berat Badan",
                  value:
                    formatNumber(
                      exposure
                        ?.average_body_weight,
                      2,
                    ),
                  unit:
                    "kg",
                },
                {
                  label:
                    "Waktu Pajanan",
                  value:
                    formatNumber(
                      exposure
                        ?.average_exposure_time,
                      2,
                    ),
                  unit:
                    "jam/hari",
                },
                {
                  label:
                    "Frekuensi Pajanan",
                  value:
                    formatNumber(
                      exposure
                        ?.average_exposure_frequency,
                      2,
                    ),
                  unit:
                    "hari/tahun",
                },
                {
                  label:
                    "Durasi Pajanan",
                  value:
                    formatNumber(
                      exposure
                        ?.average_exposure_duration,
                      2,
                    ),
                  unit:
                    "tahun",
                },
              ].map(
                (item) => (
                  <div
                    key={
                      item.label
                    }
                    className="
                      rounded-xl
                      border
                      bg-muted/20
                      p-4
                    "
                  >
                    <p className="text-xs text-muted-foreground">
                      {item.label}
                    </p>

                    <p
                      className="
                        mt-1
                        font-semibold
                        tabular-nums
                      "
                    >
                      {item.value}

                      <span
                        className="
                          ml-1
                          text-xs
                          font-normal
                          text-muted-foreground
                        "
                      >
                        {item.unit}
                      </span>
                    </p>
                  </div>
                ),
              )}


              <div
                className="
                  rounded-xl
                  border
                  bg-muted/20
                  p-4
                  sm:col-span-2
                "
              >
                <p className="text-xs text-muted-foreground">
                  Rata-rata Laju Inhalasi
                </p>

                <p
                  className="
                    mt-1
                    font-semibold
                    tabular-nums
                  "
                >
                  {formatNumber(
                    exposure
                      ?.average_inhalation_rate,
                    3,
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>


      {/* Alerts */}
      <section
        aria-labelledby="alert-summary-title"
      >
        <Card>
          <CardHeader>
            <div
              className="
                flex
                items-start
                justify-between
                gap-4
              "
            >
              <div className="min-w-0">
                <CardTitle
                  id="alert-summary-title"
                  className="text-base"
                >
                  Ringkasan Peringatan
                </CardTitle>

                <CardDescription className="mt-1">
                  Distribusi peringatan
                  berdasarkan level, status,
                  dan sumber data.
                </CardDescription>
              </div>

              <AlertTriangle
                className="
                  size-5
                  shrink-0
                  text-muted-foreground
                "
                aria-hidden="true"
              />
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <div
              className="
                grid
                gap-3
                sm:grid-cols-3
              "
            >
              {[
                {
                  label:
                    "Total",
                  value:
                    alerts?.total_count,
                },
                {
                  label:
                    "Simulasi",
                  value:
                    alerts?.simulated_count,
                },
                {
                  label:
                    "Fisik",
                  value:
                    alerts?.physical_count,
                },
              ].map(
                (item) => (
                  <div
                    key={
                      item.label
                    }
                    className="
                      rounded-xl
                      border
                      bg-muted/20
                      p-4
                    "
                  >
                    <p className="text-xs text-muted-foreground">
                      {item.label}
                    </p>

                    <p
                      className="
                        mt-1
                        text-xl
                        font-bold
                        tabular-nums
                      "
                    >
                      {formatNumber(
                        item.value,
                        0,
                      )}
                    </p>
                  </div>
                ),
              )}
            </div>


            {highestAlert ? (
              <div
                className="
                  flex
                  flex-col
                  gap-3
                  rounded-xl
                  border
                  p-4
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                "
              >
                <div>
                  <p className="text-xs text-muted-foreground">
                    Level tertinggi yang
                    tercatat
                  </p>

                  <p className="mt-1 font-semibold">
                    {formatAlertValue(
                      highestAlert.value,
                    )}
                  </p>
                </div>

                <Badge
                  variant={
                    highestAlert.value ===
                      "CRITICAL" ||
                    highestAlert.value ===
                      "HIGH"
                      ? "destructive"
                      : "outline"
                  }
                  className="w-fit shrink-0"
                >
                  {highestAlert.count}{" "}
                  kejadian
                </Badge>
              </div>
            ) : null}


            <div
              className="
                grid
                gap-5
                lg:grid-cols-2
              "
            >
              {/* Level */}
              <div>
                <p className="mb-2 text-sm font-semibold">
                  Berdasarkan Level
                </p>

                {alerts?.by_level.length ? (
                  <div className="space-y-2">
                    {alerts.by_level.map(
                      (item) => (
                        <div
                          key={
                            item.value
                          }
                          className="
                            flex
                            min-h-11
                            items-center
                            justify-between
                            gap-4
                            rounded-lg
                            border
                            bg-muted/20
                            px-3
                            py-2
                          "
                        >
                          <span className="text-sm">
                            {formatAlertValue(
                              item.value,
                            )}
                          </span>

                          <Badge variant="outline">
                            {item.count}
                          </Badge>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Belum ada data level
                    peringatan.
                  </p>
                )}
              </div>


              {/* Status */}
              <div>
                <p className="mb-2 text-sm font-semibold">
                  Berdasarkan Status
                </p>

                {alerts?.by_status.length ? (
                  <div className="space-y-2">
                    {alerts.by_status.map(
                      (item) => (
                        <div
                          key={
                            item.value
                          }
                          className="
                            flex
                            min-h-11
                            items-center
                            justify-between
                            gap-4
                            rounded-lg
                            border
                            bg-muted/20
                            px-3
                            py-2
                          "
                        >
                          <span className="text-sm">
                            {formatAlertValue(
                              item.value,
                            )}
                          </span>

                          <Badge variant="outline">
                            {item.count}
                          </Badge>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Belum ada data status
                    peringatan.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  )
}