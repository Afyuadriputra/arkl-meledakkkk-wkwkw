import type {
  components,
} from "@/types/schema"

import {
  apiRequest,
} from "@/api/client"


export type Worker =
  components["schemas"]["Worker"]

export type ExposureProfile =
  components["schemas"]["ExposureProfile"]

export type PatchedExposureProfile =
  components["schemas"]["PatchedExposureProfile"]

type PaginatedWorkerList =
  components["schemas"]["PaginatedWorkerList"]

type PaginatedExposureProfileList =
  components["schemas"]["PaginatedExposureProfileList"]


export interface CreateWorkerPayload {
  code: string
  name: string
  age: number
  is_active?: boolean
  monitoring_device?: number | null
}


export interface UpdateWorkerPayload {
  name?: string
  age?: number
  is_active?: boolean
  monitoring_device?: number | null
}


export interface CreateExposureProfilePayload {
  worker: number
  body_weight: number
  exposure_time: number
  exposure_frequency: number
  exposure_duration: number
}


export interface UpdateExposureProfilePayload {
  approval_status?: "PENDING" | "APPROVED" | "REJECTED"
  review_note?: string
  body_weight?: number
  exposure_time?: number
  exposure_frequency?: number
  exposure_duration?: number
}


export interface WorkerListParams {
  page?: number
}


export interface ExposureProfileListParams {
  page?: number
}


export async function getWorkers(
  params: WorkerListParams = {},
): Promise<PaginatedWorkerList> {
  return apiRequest<PaginatedWorkerList>({
    method: "GET",
    url: "/workers/",
    params,
  })
}


// Keep fetching through the API's pagination so the scrollable list is complete.
export async function getAllWorkers(): Promise<Worker[]> {
  const workers: Worker[] = []
  let page = 1

  while (true) {
    const response = await getWorkers({ page })
    workers.push(...response.results)

    if (!response.next) {
      return workers
    }

    page += 1
  }
}


export async function getWorker(
  id: number,
): Promise<Worker> {
  return apiRequest<Worker>({
    method: "GET",
    url: `/workers/${id}/`,
  })
}


export async function createWorker(
  payload: CreateWorkerPayload,
): Promise<Worker> {
  return apiRequest<Worker>({
    method: "POST",
    url: "/workers/",
    data: payload,
  })
}


export async function updateWorker(
  id: number,
  payload: UpdateWorkerPayload,
): Promise<Worker> {
  return apiRequest<Worker>({
    method: "PATCH",
    url: `/workers/${id}/`,
    data: payload,
  })
}


export async function getExposureProfiles(
  params: ExposureProfileListParams = {},
): Promise<PaginatedExposureProfileList> {
  return apiRequest<PaginatedExposureProfileList>({
    method: "GET",
    url: "/exposure-profiles/",
    params,
  })
}


export async function getExposureProfile(
  id: number,
): Promise<ExposureProfile> {
  return apiRequest<ExposureProfile>({
    method: "GET",
    url: `/exposure-profiles/${id}/`,
  })
}


export async function createExposureProfile(
  payload: CreateExposureProfilePayload,
): Promise<ExposureProfile> {
  return apiRequest<ExposureProfile>({
    method: "POST",
    url: "/exposure-profiles/",
    data: payload,
  })
}


export async function updateExposureProfile(
  id: number,
  payload: UpdateExposureProfilePayload,
): Promise<ExposureProfile> {
  return apiRequest<ExposureProfile>({
    method: "PATCH",
    url: `/exposure-profiles/${id}/`,
    data: payload,
  })
}
