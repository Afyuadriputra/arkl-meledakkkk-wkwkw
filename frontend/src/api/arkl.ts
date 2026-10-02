import type {
  components,
} from "@/types/schema"

import {
  apiRequest,
} from "@/api/client"


export type ARKLResult =
  components["schemas"]["ARKLResult"]

export type RealtimeARKLRequest =
  components["schemas"]["RealtimeARKLRequest"]

export type RealtimeARKLResponse =
  components["schemas"]["RealtimeARKLResponse"]

export type HistoricalARKLRequest =
  components["schemas"]["HistoricalARKLRequest"]

export type PaginatedARKLResultList =
  components["schemas"]["PaginatedARKLResultList"]


export interface ARKLResultFilters {
  page?: number
  worker_code?: string
  calculation_type?:
    | "REALTIME"
    | "HISTORICAL"
    | "REFERENCE"
}


export async function calculateRealtimeARKL(
  payload: RealtimeARKLRequest,
): Promise<RealtimeARKLResponse> {
  return apiRequest<RealtimeARKLResponse>({
    method: "POST",
    url: "/arkl/realtime/",
    data: payload,
  })
}


export async function calculateHistoricalARKL(
  payload: HistoricalARKLRequest,
): Promise<ARKLResult> {
  return apiRequest<ARKLResult>({
    method: "POST",
    url: "/arkl/historical/",
    data: payload,
  })
}


export async function getARKLResults(
  filters: ARKLResultFilters = {},
): Promise<PaginatedARKLResultList> {
  return apiRequest<PaginatedARKLResultList>({
    method: "GET",
    url: "/arkl/results/",
    params: filters,
  })
}


export async function getLatestRealtimeARKL(
  workerCode?: string,
): Promise<ARKLResult | null> {
  const response =
    await getARKLResults({
      page: 1,
      calculation_type: "REALTIME",
      ...(workerCode
        ? {
            worker_code: workerCode,
          }
        : {}),
    })

  return response.results?.[0] ?? null
}


export async function getARKLResult(
  id: number,
): Promise<ARKLResult> {
  return apiRequest<ARKLResult>({
    method: "GET",
    url: `/arkl/results/${id}/`,
  })
}

export type ReferenceMeasurement = components["schemas"]["ReferenceMeasurement"]
export type ReferenceMeasurementPayload = Pick<ReferenceMeasurement, "concentration_ppm" | "measured_at" | "location" | "source"> & { workers?: number[]; notes?: string }

export async function getReferenceMeasurements(): Promise<ReferenceMeasurement[]> {
  const records: ReferenceMeasurement[] = []
  let page = 1
  while (true) {
    const response = await apiRequest<{ results: ReferenceMeasurement[]; next: string | null }>({ method: "GET", url: "/arkl/reference-measurements/", params: { page } })
    records.push(...response.results)
    if (!response.next) return records
    page += 1
  }
}

export async function createReferenceMeasurement(data: ReferenceMeasurementPayload): Promise<ReferenceMeasurement> {
  return apiRequest({ method: "POST", url: "/arkl/reference-measurements/", data })
}

export async function calculateReferenceARKL(data: { worker: number; measurement: number }): Promise<ARKLResult> {
  return apiRequest({ method: "POST", url: "/arkl/reference/", data })
}

export async function getLatestReferenceARKL(workerCode: string): Promise<ARKLResult | null> {
  const response = await getARKLResults({ worker_code: workerCode, calculation_type: "REFERENCE" })
  // Measurement chronology, not time of a later profile recalculation.
  return response.results[0] ?? null
}
