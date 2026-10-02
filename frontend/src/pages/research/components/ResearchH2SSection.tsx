import type {
  Dispatch,
  SetStateAction,
} from "react"
import {
  Activity,
  CalendarDays,
  Database,
  Filter,
  Gauge,
  RadioTower,
  RefreshCw,
  RotateCcw,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react"

import {
  getH2SSummary,
  type H2STrendInterval,
  type H2STrendPoint,
} from "@/api/research"

import {
  H2STrendChart,
} from "@/components/research/H2STrendChart"

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Separator,
} from "@/components/ui/separator"
import {
  Skeleton,
} from "@/components/ui/skeleton"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"


type H2SSummary =
  Awaited<
    ReturnType<
      typeof getH2SSummary
    >
  >


export type H2SSourceFilter =
  | "ALL"
  | "PHYSICAL"
  | "SIMULATED"


export interface H2SFilterState {
  deviceCode: string
  source: H2SSourceFilter
  start: string
  end: string
}


interface MetricCardProps {
  label: string
  value: string
  description: string
  unit?: string
  icon: LucideIcon
}


interface ResearchH2SSectionProps {
  h2s:
    | H2SSummary
    | undefined

  exposureWorkerCount:
    | number
    | undefined

  trendData:
    H2STrendPoint[]

  trendInterval:
    H2STrendInterval

  draftFilters:
    H2SFilterState

  isFiltered: boolean
  invalidDateRange: boolean

  isTrendPending: boolean
  isTrendError: boolean
  isTrendFetching: boolean

  onFiltersChange:
    Dispatch<
      SetStateAction<
        H2SFilterState
      >
    >

  onApplyFilters: () => void
  onResetFilters: () => void

  onIntervalChange: (
    interval:
      H2STrendInterval,
  ) => void

  onRetryTrend: () => void
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


function MetricCard({
  label,
  value,
  description,
  unit,
  icon: Icon,
}: MetricCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div
          className="
            flex
            items-start
            justify-between
            gap-4
          "
        >
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">
              {label}
            </p>

            <div
              className="
                mt-2
                flex
                min-w-0
                items-end
                gap-1.5
              "
            >
              <p
                className="
                  truncate
                  text-3xl
                  font-bold
                  tracking-tight
                  tabular-nums
                "
              >
                {value}
              </p>

              {unit ? (
                <span
                  className="
                    mb-1
                    shrink-0
                    text-sm
                    text-muted-foreground
                  "
                >
                  {unit}
                </span>
              ) : null}
            </div>

            <p
              className="
                mt-1
                text-xs
                leading-relaxed
                text-muted-foreground
              "
            >
              {description}
            </p>
          </div>

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
            <Icon
              className="size-5"
              aria-hidden="true"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


export function ResearchH2SSection({
  h2s,
  exposureWorkerCount,
  trendData,
  trendInterval,
  draftFilters,
  isFiltered,
  invalidDateRange,
  isTrendPending,
  isTrendError,
  isTrendFetching,
  onFiltersChange,
  onApplyFilters,
  onResetFilters,
  onIntervalChange,
  onRetryTrend,
}: ResearchH2SSectionProps) {
  return (
    <>
      {/* Filter H2S */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
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
              <Filter
                className="size-5"
                aria-hidden="true"
              />
            </div>

            <div className="min-w-0">
              <CardTitle className="text-base">
                Filter Data H₂S
              </CardTitle>

              <CardDescription className="mt-1">
                Filter berlaku pada ringkasan,
                karakteristik, dan tren H₂S.
                Data ARKL, pajanan, dan
                peringatan tetap menampilkan
                keseluruhan data.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div
            className="
              grid
              gap-4
              md:grid-cols-2
              xl:grid-cols-4
            "
          >
            {/* Device */}
            <div className="space-y-2">
              <Label htmlFor="research-h2s-device">
                Kode Perangkat
              </Label>

              <div className="relative">
                <Search
                  className="
                    pointer-events-none
                    absolute
                    left-3
                    top-1/2
                    size-4
                    -translate-y-1/2
                    text-muted-foreground
                  "
                  aria-hidden="true"
                />

                <Input
                  id="research-h2s-device"
                  value={
                    draftFilters
                      .deviceCode
                  }
                  placeholder="Contoh: ESP32-H2S-01"
                  className="min-h-11 pl-9"
                  onChange={(event) =>
                    onFiltersChange(
                      (current) => ({
                        ...current,
                        deviceCode:
                          event.target
                            .value,
                      }),
                    )
                  }
                />
              </div>
            </div>


            {/* Source */}
            <div className="space-y-2">
              <Label htmlFor="research-h2s-source">
                Sumber Data
              </Label>

              <Select
                value={
                  draftFilters.source
                }
                onValueChange={(value) =>
                  onFiltersChange(
                    (current) => ({
                      ...current,
                      source:
                        value as
                          H2SSourceFilter,
                    }),
                  )
                }
              >
                <SelectTrigger
                  id="research-h2s-source"
                  className="min-h-11 w-full"
                >
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="ALL">
                    Semua
                  </SelectItem>

                  <SelectItem value="PHYSICAL">
                    Fisik
                  </SelectItem>

                  <SelectItem value="SIMULATED">
                    Simulasi
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>


            {/* Start */}
            <div className="space-y-2">
              <Label htmlFor="research-h2s-start">
                Dari Tanggal
              </Label>

              <div className="relative">
                <CalendarDays
                  className="
                    pointer-events-none
                    absolute
                    left-3
                    top-1/2
                    size-4
                    -translate-y-1/2
                    text-muted-foreground
                  "
                  aria-hidden="true"
                />

                <Input
                  id="research-h2s-start"
                  type="date"
                  value={
                    draftFilters.start
                  }
                  className="min-h-11 pl-9"
                  aria-invalid={
                    invalidDateRange
                  }
                  onChange={(event) =>
                    onFiltersChange(
                      (current) => ({
                        ...current,
                        start:
                          event.target
                            .value,
                      }),
                    )
                  }
                />
              </div>
            </div>


            {/* End */}
            <div className="space-y-2">
              <Label htmlFor="research-h2s-end">
                Sampai Tanggal
              </Label>

              <div className="relative">
                <CalendarDays
                  className="
                    pointer-events-none
                    absolute
                    left-3
                    top-1/2
                    size-4
                    -translate-y-1/2
                    text-muted-foreground
                  "
                  aria-hidden="true"
                />

                <Input
                  id="research-h2s-end"
                  type="date"
                  value={
                    draftFilters.end
                  }
                  className="min-h-11 pl-9"
                  aria-invalid={
                    invalidDateRange
                  }
                  aria-describedby={
                    invalidDateRange
                      ? "research-h2s-date-error"
                      : undefined
                  }
                  onChange={(event) =>
                    onFiltersChange(
                      (current) => ({
                        ...current,
                        end:
                          event.target
                            .value,
                      }),
                    )
                  }
                />
              </div>

              {invalidDateRange ? (
                <p
                  id="research-h2s-date-error"
                  className="text-xs text-destructive"
                >
                  Tanggal akhir harus sama
                  atau setelah tanggal awal.
                </p>
              ) : null}
            </div>
          </div>


          <Separator className="my-5" />


          <div
            className="
              flex
              flex-col
              gap-3
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <div className="min-h-6">
              {isFiltered ? (
                <Badge variant="secondary">
                  Filter H₂S aktif
                </Badge>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Menampilkan seluruh data H₂S.
                </p>
              )}
            </div>

            <div
              className="
                flex
                flex-col
                gap-2
                sm:flex-row
              "
            >
              <Button
                type="button"
                variant="outline"
                className="min-h-11 gap-2"
                onClick={
                  onResetFilters
                }
              >
                <RotateCcw
                  className="size-4"
                  aria-hidden="true"
                />

                Reset
              </Button>

              <Button
                type="button"
                className="min-h-11 gap-2"
                disabled={
                  invalidDateRange
                }
                onClick={
                  onApplyFilters
                }
              >
                <Filter
                  className="size-4"
                  aria-hidden="true"
                />

                Terapkan Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Summary */}
      <section
        aria-labelledby="research-summary-title"
      >
        <h2
          id="research-summary-title"
          className="sr-only"
        >
          Ringkasan penelitian
        </h2>

        <div
          className="
            grid
            gap-4
            sm:grid-cols-2
            xl:grid-cols-4
          "
        >
          <MetricCard
            label="Pembacaan H₂S"
            value={formatNumber(
              h2s?.sample_count,
              0,
            )}
            description="Total sampel sesuai filter"
            icon={Database}
          />

          <MetricCard
            label="Rata-rata H₂S"
            value={formatNumber(
              h2s?.average_ppm,
              3,
            )}
            unit="ppm"
            description="Rata-rata pembacaan sesuai filter"
            icon={Activity}
          />

          <MetricCard
            label="Maksimum H₂S"
            value={formatNumber(
              h2s?.maximum_ppm,
              3,
            )}
            unit="ppm"
            description="Nilai tertinggi sesuai filter"
            icon={Gauge}
          />

          <MetricCard
            label="Profil Pajanan"
            value={formatNumber(
              exposureWorkerCount,
              0,
            )}
            description="Worker dengan profil pajanan"
            icon={Users}
          />
        </div>
      </section>


      {/* Trend */}
      <section
        aria-labelledby="h2s-trend-title"
      >
        <Card>
          <CardHeader>
            <div
              className="
                flex
                flex-col
                gap-4
                lg:flex-row
                lg:items-start
                lg:justify-between
              "
            >
              <div className="min-w-0">
                <CardTitle
                  id="h2s-trend-title"
                  className="text-base"
                >
                  Tren Konsentrasi H₂S
                </CardTitle>

                <CardDescription className="mt-1">
                  Perubahan konsentrasi
                  rata-rata H₂S berdasarkan
                  interval waktu.
                </CardDescription>
              </div>

              <Tabs
                value={
                  trendInterval
                }
                onValueChange={(value) =>
                  onIntervalChange(
                    value as
                      H2STrendInterval,
                  )
                }
              >
                <TabsList
                  className="
                    grid
                    w-full
                    grid-cols-3
                    lg:w-auto
                  "
                >
                  <TabsTrigger
                    value="day"
                    className="min-h-10"
                  >
                    Harian
                  </TabsTrigger>

                  <TabsTrigger
                    value="hour"
                    className="min-h-10"
                  >
                    Per Jam
                  </TabsTrigger>

                  <TabsTrigger
                    value="raw"
                    className="min-h-10"
                  >
                    Mentah
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>

          <CardContent>
            {isTrendPending ? (
              <Skeleton
                className="
                  h-[300px]
                  w-full
                  rounded-xl
                "
              />
            ) : null}

            {!isTrendPending &&
            isTrendError ? (
              <div
                className="
                  flex
                  min-h-64
                  flex-col
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-dashed
                  p-6
                  text-center
                "
              >
                <RefreshCw
                  className="
                    size-8
                    text-muted-foreground
                  "
                  aria-hidden="true"
                />

                <p
                  className="
                    mt-3
                    text-sm
                    font-semibold
                  "
                >
                  Tren belum dapat dimuat
                </p>

                <p
                  className="
                    mt-1
                    max-w-sm
                    text-xs
                    leading-relaxed
                    text-muted-foreground
                  "
                >
                  Coba perbarui data atau
                  pilih interval lain.
                </p>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4 min-h-10 gap-2"
                  disabled={
                    isTrendFetching
                  }
                  onClick={
                    onRetryTrend
                  }
                >
                  <RefreshCw
                    className={
                      isTrendFetching
                        ? `
                          size-4
                          animate-spin
                          motion-reduce:animate-none
                        `
                        : "size-4"
                    }
                    aria-hidden="true"
                  />

                  Coba Lagi
                </Button>
              </div>
            ) : null}

            {!isTrendPending &&
            !isTrendError ? (
              <H2STrendChart
                data={
                  trendData
                }
                interval={
                  trendInterval
                }
              />
            ) : null}
          </CardContent>
        </Card>
      </section>


      {/* Characteristics */}
      <section
        aria-labelledby="h2s-characteristics-title"
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
                  id="h2s-characteristics-title"
                  className="text-base"
                >
                  Karakteristik Data H₂S
                </CardTitle>

                <CardDescription className="mt-1">
                  Ringkasan rentang konsentrasi
                  dan sumber pembacaan sesuai
                  filter.
                </CardDescription>
              </div>

              <RadioTower
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
                lg:grid-cols-5
              "
            >
              {[
                {
                  label: "Minimum",
                  value:
                    `${formatNumber(
                      h2s?.minimum_ppm,
                      3,
                    )} ppm`,
                },
                {
                  label: "Rata-rata",
                  value:
                    `${formatNumber(
                      h2s?.average_ppm,
                      3,
                    )} ppm`,
                },
                {
                  label: "Maksimum",
                  value:
                    `${formatNumber(
                      h2s?.maximum_ppm,
                      3,
                    )} ppm`,
                },
                {
                  label: "Simulasi",
                  value:
                    formatNumber(
                      h2s?.simulated_count,
                      0,
                    ),
                },
                {
                  label: "Fisik",
                  value:
                    formatNumber(
                      h2s?.physical_count,
                      0,
                    ),
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
                    </p>
                  </div>
                ),
              )}
            </div>

            <div
              className="
                mt-4
                flex
                flex-wrap
                gap-2
              "
            >
              <Badge variant="outline">
                {formatNumber(
                  h2s?.device_count,
                  0,
                )}{" "}
                perangkat
              </Badge>

              <Badge variant="outline">
                {formatNumber(
                  h2s?.sample_count,
                  0,
                )}{" "}
                sampel
              </Badge>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  )
}