import type {
  components,
} from "@/types/schema"

import {
  apiRequest,
} from "@/api/client"


type Device =
  components["schemas"]["Device"]

type H2SReading =
  components["schemas"]["H2SReading"]

type PaginatedDeviceList =
  components["schemas"]["PaginatedDeviceList"]

type PaginatedH2SReadingList =
  components["schemas"]["PaginatedH2SReadingList"]


export interface DeviceListParams {
  page?: number
}


export interface ReadingListParams {
  page?: number
  device_code?: string
  status?: string
}


export interface LatestReadingParams {
  device_code?: string
  status?: string
}


export interface CreateDevicePayload {
  device_code: string
  name?: string
  location?: string
  is_active?: boolean
}


export interface UpdateDevicePayload {
  name?: string
  location?: string
  is_active?: boolean
}


export async function getDevices(
  params: DeviceListParams = {},
): Promise<PaginatedDeviceList> {
  return apiRequest<PaginatedDeviceList>({
    method: "GET",
    url: "/devices/",
    params,
  })
}


export async function getDevice(
  id: number,
): Promise<Device> {
  return apiRequest<Device>({
    method: "GET",
    url: `/devices/${id}/`,
  })
}


export async function createDevice(
  payload: CreateDevicePayload,
): Promise<Device> {
  return apiRequest<Device>({
    method: "POST",
    url: "/devices/",
    data: payload,
  })
}


export async function updateDevice(
  id: number,
  payload: UpdateDevicePayload,
): Promise<Device> {
  return apiRequest<Device>({
    method: "PATCH",
    url: `/devices/${id}/`,
    data: payload,
  })
}


export async function getReadings(
  params: ReadingListParams = {},
): Promise<PaginatedH2SReadingList> {
  return apiRequest<PaginatedH2SReadingList>({
    method: "GET",
    url: "/readings/",
    params,
  })
}


export async function getReading(
  id: number,
): Promise<H2SReading> {
  return apiRequest<H2SReading>({
    method: "GET",
    url: `/readings/${id}/`,
  })
}


export async function getLatestReading(
  params: LatestReadingParams = {},
): Promise<H2SReading> {
  return apiRequest<H2SReading>({
    method: "GET",
    url: "/readings/latest/",
    params,
  })
}