import {
  useMemo,
  useState,
} from "react"
import {
  useMutation,
  useQuery,
} from "@tanstack/react-query"
import {
  CalendarDays,
  Download,
  Filter,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  TriangleAlert,
} from "lucide-react"
import {
  toast,
} from "sonner"

import {
  exportARKLCSV,
  getResearchARKLResults,
  type ARKLCalculationType,
  type ARKLResearchParams,
} from "@/api/research"

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type SourceFilter =
  | "ALL"
  | "PHYSICAL"
  | "SIMULATED"

type FilterState = {
  workerCode: string
  calculationType:
    | "ALL"
    | ARKLCalculationType
  source: SourceFilter
  start: string
  end: string
}

const INITIAL_FILTERS:
  FilterState = {
    workerCode: "",
    calculationType: "ALL",
    source: "ALL",
    start: "",
    end: "",
  }

function formatNumber(
  value:
    | string
    | number
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
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(
          /\b\w/g,
          (character) =>
            character.toUpperCase(),
        )
  }
}

function formatCalculationType(
  value: string,
) {
  switch (value) {
    case "REALTIME":
      return "Realtime"

    case "HISTORICAL":
      return "Historis"

    default:
      return value
  }
}

function buildParams(
  filters: FilterState,
): ARKLResearchParams {
  const params:
    ARKLResearchParams = {}

  const workerCode =
    filters.workerCode.trim()

  if (workerCode) {
    params.worker_code =
      workerCode
  }

  if (
    filters.calculationType !==
    "ALL"
  ) {
    params.calculation_type =
      filters.calculationType
  }

  if (
    filters.source ===
    "PHYSICAL"
  ) {
    params.source_simulated =
      false
  }

  if (
    filters.source ===
    "SIMULATED"
  ) {
    params.source_simulated =
      true
  }

  if (filters.start) {
    params.start =
      new Date(
        `${filters.start}T00:00:00`,
      ).toISOString()
  }

  if (filters.end) {
    params.end =
      new Date(
        `${filters.end}T23:59:59`,
      ).toISOString()
  }

  return params
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({
        length: 6,
      }).map(
        (_, index) => (
          <Skeleton
            key={index}
            className="h-12 w-full"
          />
        ),
      )}
    </div>
  )
}

export function ResearchARKLPage() {
  const [
    draftFilters,
    setDraftFilters,
  ] =
    useState<FilterState>(
      INITIAL_FILTERS,
    )

  const [
    appliedFilters,
    setAppliedFilters,
  ] =
    useState<FilterState>(
      INITIAL_FILTERS,
    )

  const params =
    useMemo(
      () =>
        buildParams(
          appliedFilters,
        ),
      [appliedFilters],
    )

  const resultsQuery =
    useQuery({
      queryKey: [
        "research",
        "arkl-results",
        params,
      ],
      queryFn: () =>
        getResearchARKLResults(
          params,
        ),
      staleTime: 60_000,
    })

  const exportMutation =
    useMutation({
      mutationFn: () =>
        exportARKLCSV(
          params,
        ),

      onSuccess: (
        blob,
      ) => {
        const url =
          URL.createObjectURL(
            blob,
          )

        const link =
          document.createElement(
            "a",
          )

        const timestamp =
          new Date()
            .toISOString()
            .slice(
              0,
              10,
            )

        link.href =
          url

        link.download =
          `arkl-research-${timestamp}.csv`

        document.body.appendChild(
          link,
        )

        link.click()

        link.remove()

        URL.revokeObjectURL(
          url,
        )

        toast.success(
          "Data ARKL berhasil diekspor.",
        )
      },

      onError: () => {
        toast.error(
          "Data belum berhasil diekspor.",
        )
      },
    })

const data =
  resultsQuery.data

const results =
  useMemo(
    () =>
      data?.results ?? [],
    [data?.results],
  )

  const aboveReferenceCount =
    useMemo(
      () =>
        results.filter(
          (item) =>
            item.interpretation ===
            "ABOVE_REFERENCE_LEVEL",
        ).length,
      [results],
    )

  const withinReferenceCount =
    useMemo(
      () =>
        results.filter(
          (item) =>
            item.interpretation ===
            "WITHIN_REFERENCE_LEVEL",
        ).length,
      [results],
    )

  const averageRQ =
    useMemo(() => {
      if (
        results.length === 0
      ) {
        return null
      }

      const values =
        results
          .map(
            (item) =>
              Number(
                item.rq,
              ),
          )
          .filter(
            Number.isFinite,
          )

      if (
        values.length === 0
      ) {
        return null
      }

      return (
        values.reduce(
          (
            total,
            value,
          ) =>
            total +
            value,
          0,
        ) /
        values.length
      )
    }, [results])

  const isFiltered =
    JSON.stringify(
      appliedFilters,
    ) !==
    JSON.stringify(
      INITIAL_FILTERS,
    )


const invalidDateRange =
  Boolean(
    draftFilters.start &&
      draftFilters.end &&
      draftFilters.start >
        draftFilters.end,
  )

function applyFilters() {
  if (invalidDateRange) {
    toast.error(
      "Tanggal awal tidak boleh melewati tanggal akhir.",
    )

    return
  }

  setAppliedFilters({
    ...draftFilters,
  })
}

  function resetFilters() {
    setDraftFilters({
      ...INITIAL_FILTERS,
    })

    setAppliedFilters({
      ...INITIAL_FILTERS,
    })
  }

return (
  <PageContainer>
    <PageHeader
      title="Data ARKL"
      description="Eksplorasi hasil karakterisasi risiko pajanan yang tersimpan untuk kebutuhan penelitian."
    />

    <div className="mt-6 space-y-5">
      {/* Filters */}
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
                Filter Data
              </CardTitle>

              <CardDescription className="mt-1">
                Persempit hasil berdasarkan
                Worker, periode, jenis
                perhitungan, atau sumber data.
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
              xl:grid-cols-5
            "
          >
            {/* Worker */}
            <div className="space-y-2">
              <Label htmlFor="research-worker">
                Kode Worker
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
                  id="research-worker"
                  value={draftFilters.workerCode}
                  placeholder="Contoh: WKR-001"
                  className="min-h-11 pl-9"
                  onChange={(event) =>
                    setDraftFilters(
                      (current) => ({
                        ...current,
                        workerCode:
                          event.target.value,
                      }),
                    )
                  }
                />
              </div>
            </div>

            {/* Calculation Type */}
            <div className="space-y-2">
              <Label htmlFor="research-calculation-type">
                Jenis Perhitungan
              </Label>

              <Select
                value={draftFilters.calculationType}
                onValueChange={(value) =>
                  setDraftFilters(
                    (current) => ({
                      ...current,
                      calculationType:
                        value as FilterState["calculationType"],
                    }),
                  )
                }
              >
                <SelectTrigger
                  id="research-calculation-type"
                  className="min-h-11 w-full"
                >
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="ALL">
                    Semua
                  </SelectItem>

                  <SelectItem value="REALTIME">
                    Realtime
                  </SelectItem>

                  <SelectItem value="HISTORICAL">
                    Historis
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Source */}
            <div className="space-y-2">
              <Label htmlFor="research-source">
                Sumber Data
              </Label>

              <Select
                value={draftFilters.source}
                onValueChange={(value) =>
                  setDraftFilters(
                    (current) => ({
                      ...current,
                      source:
                        value as SourceFilter,
                    }),
                  )
                }
              >
                <SelectTrigger
                  id="research-source"
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

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="research-start">
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
                  id="research-start"
                  type="date"
                  value={draftFilters.start}
                  className="min-h-11 pl-9"
                  aria-invalid={
                    invalidDateRange
                  }
                  onChange={(event) =>
                    setDraftFilters(
                      (current) => ({
                        ...current,
                        start:
                          event.target.value,
                      }),
                    )
                  }
                />
              </div>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label htmlFor="research-end">
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
                  id="research-end"
                  type="date"
                  value={draftFilters.end}
                  className="min-h-11 pl-9"
                  aria-invalid={
                    invalidDateRange
                  }
                  aria-describedby={
                    invalidDateRange
                      ? "research-date-error"
                      : undefined
                  }
                  onChange={(event) =>
                    setDraftFilters(
                      (current) => ({
                        ...current,
                        end:
                          event.target.value,
                      }),
                    )
                  }
                />
              </div>

              {invalidDateRange ? (
                <p
                  id="research-date-error"
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
                  Filter aktif
                </Badge>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Menampilkan seluruh hasil
                  penelitian.
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
                onClick={resetFilters}
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
                disabled={invalidDateRange}
                onClick={applyFilters}
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
        aria-label="Ringkasan hasil ARKL"
        className="
          grid
          gap-4
          sm:grid-cols-2
          xl:grid-cols-4
        "
      >
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">
              Total Hasil
            </p>

            <p className="mt-2 text-3xl font-bold tabular-nums">
              {data?.count ?? 0}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Hasil ARKL tersaring
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">
              Dalam Referensi
            </p>

            <p className="mt-2 text-3xl font-bold tabular-nums">
              {withinReferenceCount}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              RQ ≤ 1
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">
              Di Atas Referensi
            </p>

            <p className="mt-2 text-3xl font-bold tabular-nums">
              {aboveReferenceCount}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              RQ &gt; 1
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">
              Rata-rata RQ
            </p>

            <p className="mt-2 text-3xl font-bold tabular-nums">
              {formatNumber(
                averageRQ,
                3,
              )}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Berdasarkan hasil tampil
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Results */}
      <Card>
        <CardHeader>
          <div
            className="
              flex
              flex-col
              gap-4
              sm:flex-row
              sm:items-start
              sm:justify-between
            "
          >
            <div className="min-w-0">
              <CardTitle className="text-base">
                Hasil ARKL
              </CardTitle>

              <CardDescription className="mt-1">
                Data yang telah dihitung dan
                tersimpan oleh sistem.
              </CardDescription>
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
                className="min-h-10 gap-2"
                disabled={resultsQuery.isFetching}
                onClick={() =>
                  void resultsQuery.refetch()
                }
              >
                <RefreshCw
                  className={
                    resultsQuery.isFetching
                      ? `
                        size-4
                        animate-spin
                        motion-reduce:animate-none
                      `
                      : "size-4"
                  }
                  aria-hidden="true"
                />

                {resultsQuery.isFetching
                  ? "Memperbarui..."
                  : "Perbarui"}
              </Button>

              <Button
                type="button"
                className="min-h-10 gap-2"
                disabled={
                  exportMutation.isPending ||
                  resultsQuery.isPending ||
                  resultsQuery.isError ||
                  results.length === 0
                }
                onClick={() =>
                  exportMutation.mutate()
                }
              >
                {exportMutation.isPending ? (
                  <Loader2
                    className="
                      size-4
                      animate-spin
                      motion-reduce:animate-none
                    "
                    aria-hidden="true"
                  />
                ) : (
                  <Download
                    className="size-4"
                    aria-hidden="true"
                  />
                )}

                {exportMutation.isPending
                  ? "Mengekspor..."
                  : "Export CSV"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {resultsQuery.isError ? (
            <Alert variant="destructive">
              <TriangleAlert
                className="size-4"
                aria-hidden="true"
              />

              <AlertDescription>
                Data ARKL belum dapat
                dimuat. Silakan coba
                kembali.
              </AlertDescription>
            </Alert>
          ) : null}

          {resultsQuery.isPending ? (
            <TableSkeleton />
          ) : null}

          {!resultsQuery.isPending &&
          !resultsQuery.isError &&
          results.length === 0 ? (
            <div
              className="
                flex
                min-h-48
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
              <Search
                className="size-8 text-muted-foreground"
                aria-hidden="true"
              />

              <p className="mt-3 font-semibold">
                Data tidak ditemukan
              </p>

              <p
                className="
                  mt-1
                  max-w-sm
                  text-sm
                  leading-relaxed
                  text-muted-foreground
                "
              >
                Tidak ada hasil ARKL yang
                sesuai dengan filter saat
                ini.
              </p>

              {isFiltered ? (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 min-h-10 gap-2"
                  onClick={resetFilters}
                >
                  <RotateCcw
                    className="size-4"
                    aria-hidden="true"
                  />

                  Reset Filter
                </Button>
              ) : null}
            </div>
          ) : null}

          {!resultsQuery.isPending &&
          !resultsQuery.isError &&
          results.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      Worker
                    </TableHead>

                    <TableHead>
                      Waktu
                    </TableHead>

                    <TableHead>
                      Jenis
                    </TableHead>

                    <TableHead className="text-right">
                      H₂S
                    </TableHead>

                    <TableHead className="text-right">
                      Intake
                    </TableHead>

                    <TableHead className="text-right">
                      RQ
                    </TableHead>

                    <TableHead>
                      Interpretasi
                    </TableHead>

                    <TableHead>
                      Sumber
                    </TableHead>

                    <TableHead>
                      Versi
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {results.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.worker_code}
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDateTime(
                          item.created_at,
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge variant="outline">
                          {formatCalculationType(
                            item.calculation_type,
                          )}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        {formatNumber(
                          item.concentration_ppm,
                          3,
                        )}{" "}
                        ppm
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        {formatNumber(
                          item.intake,
                          6,
                        )}
                      </TableCell>

                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatNumber(
                          item.rq,
                          3,
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={
                            item.interpretation ===
                            "ABOVE_REFERENCE_LEVEL"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {formatInterpretation(
                            item.interpretation,
                          )}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        {item.source_simulated
                          ? "Simulasi"
                          : "Fisik"}
                      </TableCell>

                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {item.calculation_version}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}

          {data ? (
            <p
              className="
                mt-4
                text-xs
                leading-relaxed
                text-muted-foreground
              "
            >
              Perhitungan ARKL merupakan
              karakterisasi risiko pajanan
              lingkungan dan bukan diagnosis
              penyakit.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  </PageContainer>
)
}