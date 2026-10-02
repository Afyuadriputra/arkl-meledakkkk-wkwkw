import type {
  components,
} from "@/types/schema"

import {
  apiRequest,
  isApiError,
} from "@/api/client"


type MyWorkerProfile =
  components["schemas"]["MyWorkerProfile"]

type MyExposureProfile =
  components["schemas"]["MyExposureProfile"]

type MyMonitoring =
  components["schemas"]["MyMonitoring"]

type PatchedMyWorkerProfile =
  components["schemas"]["PatchedMyWorkerProfile"]

type PatchedMyExposureProfile =
  components["schemas"]["PatchedMyExposureProfile"]

type ARKLResult =
  components["schemas"]["ARKLResult"]

type Alert =
  components["schemas"]["Alert"]


export async function getMyProfile():
Promise<MyWorkerProfile> {
  return apiRequest<MyWorkerProfile>({
    method: "GET",
    url: "/me/profile/",
  })
}


export async function updateMyProfile(
  payload: PatchedMyWorkerProfile,
): Promise<MyWorkerProfile> {
  return apiRequest<MyWorkerProfile>({
    method: "PATCH",
    url: "/me/profile/",
    data: payload,
  })
}


export async function getMyExposure():
Promise<MyExposureProfile> {
  return apiRequest<MyExposureProfile>({
    method: "GET",
    url: "/me/exposure/",
  })
}


// Missing exposure is a successful setup state, not a failed/loading request.
// Cache null so later status checks keep the onboarding form mounted.
export async function getMyExposureForSetup(): Promise<MyExposureProfile | null> {
  try {
    return await getMyExposure()
  } catch (error) {
    if (isApiError(error) && error.status === 404) {
      return null
    }
    throw error
  }
}


export async function updateMyExposure(
  payload: PatchedMyExposureProfile,
): Promise<MyExposureProfile> {
  return apiRequest<MyExposureProfile>({
    method: "PATCH",
    url: "/me/exposure/",
    data: payload,
  })
}

export async function createMyExposure(
  payload: PatchedMyExposureProfile,
): Promise<MyExposureProfile> {
  return apiRequest<MyExposureProfile>({
    method: "POST", url: "/me/exposure/", data: payload,
  })
}


export async function getMyMonitoring():
Promise<MyMonitoring> {
  return apiRequest<MyMonitoring>({
    method: "GET",
    url: "/me/monitoring/",
  })
}


export async function getMyARKLResults():
Promise<ARKLResult[]> {
  return apiRequest<ARKLResult[]>({
    method: "GET",
    url: "/me/arkl-results/",
  })
}


export async function getMyAlerts():
Promise<Alert[]> {
  return apiRequest<Alert[]>({
    method: "GET",
    url: "/me/alerts/",
  })
}
