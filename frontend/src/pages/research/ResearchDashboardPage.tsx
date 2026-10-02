import {
  useMemo,
  useState,
} from "react"
import {
  useQuery,
} from "@tanstack/react-query"
import {
  RefreshCw,
  TriangleAlert,
} from "lucide-react"

import {
  getAlertSummary,
  getExposureSummary,
  getH2SSummary,
  getH2STrends,
  getRiskDistribution,
  type H2SResearchParams,
  type H2STrendInterval,
} from "@/api/research"

import {
  ResearchH2SSection,
  type H2SFilterState,
} from "@/pages/research/components/ResearchH2SSection"
import {
  ResearchRiskSection,
} from "@/pages/research/components/ResearchRiskSection"

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
  Button,
} from "@/components/ui/button"
import {
  Skeleton,
} from "@/components/ui/skeleton"


const QUERY_STALE_TIME =
  60_000


const INITIAL_H2S_FILTERS:
  H2SFilterState = {
    deviceCode: "",
    source: "ALL",
    start: "",
    end: "",
  }


function buildH2SParams(
  filters: H2SFilterState,
): H2SResearchParams {
  const params:
    H2SResearchParams = {}

  const deviceCode =
    filters.deviceCode.trim()

  if (deviceCode) {
    params.device_code =
      deviceCode
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


function DashboardSkeleton() {
  return (
    <div className="mt-6 space-y-5">
      <div
        className="
          grid
          gap-4
          sm:grid-cols-2
          xl:grid-cols-4
        "
      >
        {Array.from({
          length: 4,
        }).map(
          (_, index) => (
            <Skeleton
              key={index}
              className="h-32 rounded-2xl"
            />
          ),
        )}
      </div>

      <Skeleton
        className="
          h-[360px]
          rounded-2xl
        "
      />

      <div
        className="
          grid
          gap-4
          xl:grid-cols-2
        "
      >
        <Skeleton className="h-72 rounded-2xl" />

        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  )
}


export function ResearchDashboardPage() {
  const [
    trendInterval,
    setTrendInterval,
  ] =
    useState<H2STrendInterval>(
      "day",
    )

  const [
    draftH2SFilters,
    setDraftH2SFilters,
  ] =
    useState<H2SFilterState>(
      INITIAL_H2S_FILTERS,
    )

  const [
    appliedH2SFilters,
    setAppliedH2SFilters,
  ] =
    useState<H2SFilterState>(
      INITIAL_H2S_FILTERS,
    )


  const h2sParams =
    useMemo(
      () =>
        buildH2SParams(
          appliedH2SFilters,
        ),
      [appliedH2SFilters],
    )


  const h2sQuery =
    useQuery({
      queryKey: [
        "research",
        "h2s-summary",
        h2sParams,
      ],
      queryFn: () =>
        getH2SSummary(
          h2sParams,
        ),
      staleTime:
        QUERY_STALE_TIME,
      retry: 1,
    })


  const trendQuery =
    useQuery({
      queryKey: [
        "research",
        "h2s-trends",
        trendInterval,
        h2sParams,
      ],
      queryFn: () =>
        getH2STrends({
          ...h2sParams,
          interval:
            trendInterval,
        }),
      staleTime:
        QUERY_STALE_TIME,
      retry: 1,
    })


  const riskQuery =
    useQuery({
      queryKey: [
        "research",
        "risk-distribution",
      ],
      queryFn: () =>
        getRiskDistribution(),
      staleTime:
        QUERY_STALE_TIME,
      retry: 1,
    })


  const exposureQuery =
    useQuery({
      queryKey: [
        "research",
        "exposure-summary",
      ],
      queryFn:
        getExposureSummary,
      staleTime:
        QUERY_STALE_TIME,
      retry: 1,
    })


  const alertQuery =
    useQuery({
      queryKey: [
        "research",
        "alert-summary",
      ],
      queryFn:
        getAlertSummary,
      staleTime:
        QUERY_STALE_TIME,
      retry: 1,
    })


  const invalidDateRange =
    Boolean(
      draftH2SFilters.start &&
        draftH2SFilters.end &&
        draftH2SFilters.start >
          draftH2SFilters.end,
    )


  const isH2SFiltered =
    appliedH2SFilters.deviceCode !== "" ||
    appliedH2SFilters.source !== "ALL" ||
    appliedH2SFilters.start !== "" ||
    appliedH2SFilters.end !== ""


  const isInitialLoading =
    h2sQuery.isPending ||
    riskQuery.isPending ||
    exposureQuery.isPending ||
    alertQuery.isPending


  const hasPartialError =
    h2sQuery.isError ||
    trendQuery.isError ||
    riskQuery.isError ||
    exposureQuery.isError ||
    alertQuery.isError


  const isRefreshing =
    h2sQuery.isFetching ||
    trendQuery.isFetching ||
    riskQuery.isFetching ||
    exposureQuery.isFetching ||
    alertQuery.isFetching


  function applyH2SFilters() {
    if (invalidDateRange) {
      return
    }

    setAppliedH2SFilters({
      ...draftH2SFilters,
    })
  }


  function resetH2SFilters() {
    setDraftH2SFilters({
      ...INITIAL_H2S_FILTERS,
    })

    setAppliedH2SFilters({
      ...INITIAL_H2S_FILTERS,
    })
  }


  function refreshAll() {
    void Promise.all([
      h2sQuery.refetch(),
      trendQuery.refetch(),
      riskQuery.refetch(),
      exposureQuery.refetch(),
      alertQuery.refetch(),
    ])
  }


  return (
    <PageContainer>
      <div
        className="
          flex
          flex-col
          gap-4
          md:flex-row
          md:items-start
          md:justify-between
        "
      >
        <PageHeader
          title="Dasbor Penelitian"
          description="Ringkasan data H₂S, hasil ARKL, karakteristik pajanan, dan peringatan untuk kebutuhan analisis penelitian."
        />

        <Button
          type="button"
          variant="outline"
          className="
            min-h-11
            shrink-0
            gap-2
            self-start
          "
          disabled={
            isRefreshing
          }
          onClick={
            refreshAll
          }
        >
          <RefreshCw
            className={
              isRefreshing
                ? `
                  size-4
                  animate-spin
                  motion-reduce:animate-none
                `
                : "size-4"
            }
            aria-hidden="true"
          />

          {isRefreshing
            ? "Memperbarui..."
            : "Perbarui Data"}
        </Button>
      </div>


      {hasPartialError ? (
        <Alert
          variant="destructive"
          className="mt-5"
        >
          <TriangleAlert
            className="size-4"
            aria-hidden="true"
          />

          <AlertDescription>
            Sebagian data penelitian belum
            dapat dimuat. Informasi lain yang
            berhasil diterima tetap
            ditampilkan.
          </AlertDescription>
        </Alert>
      ) : null}


      {isInitialLoading ? (
        <DashboardSkeleton />
      ) : (
        <div className="mt-6 space-y-6">
          <ResearchH2SSection
            h2s={
              h2sQuery.data
            }
            exposureWorkerCount={
              exposureQuery.data
                ?.worker_count
            }
            trendData={
              trendQuery.data
                ?.series ?? []
            }
            trendInterval={
              trendQuery.data
                ?.interval ??
              trendInterval
            }
            draftFilters={
              draftH2SFilters
            }
            isFiltered={
              isH2SFiltered
            }
            invalidDateRange={
              invalidDateRange
            }
            isTrendPending={
              trendQuery.isPending
            }
            isTrendError={
              trendQuery.isError
            }
            isTrendFetching={
              trendQuery.isFetching
            }
            onFiltersChange={
              setDraftH2SFilters
            }
            onApplyFilters={
              applyH2SFilters
            }
            onResetFilters={
              resetH2SFilters
            }
            onIntervalChange={
              setTrendInterval
            }
            onRetryTrend={() =>
              void trendQuery
                .refetch()
            }
          />


          <ResearchRiskSection
            risk={
              riskQuery.data
            }
            exposure={
              exposureQuery.data
            }
            alerts={
              alertQuery.data
            }
          />
        </div>
      )}
    </PageContainer>
  )
}