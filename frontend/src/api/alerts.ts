import {
  apiRequest,
} from "@/api/client";

import type {
  components,
} from "@/types/schema";


type Alert =
  components["schemas"]["Alert"];

type AlertEvaluateRequest =
  components["schemas"]["AlertEvaluateRequest"];

type AlertEvaluationResponse =
  components["schemas"]["AlertEvaluationResponse"];

type PaginatedAlertList =
  components["schemas"]["PaginatedAlertList"];


export type AlertLevel =
  | "NONE"
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";


export type AlertStatus =
  | "OPEN"
  | "ACKNOWLEDGED"
  | "RESOLVED";


export interface AlertFilters {
  page?: number;
  worker_code?: string;
  device_code?: string;
  alert_level?: AlertLevel;
  status?: AlertStatus;
}


/**
 * Get paginated alerts.
 *
 * Intended for roles allowed to access
 * the generic alert collection.
 */
export async function getAlerts(
  filters: AlertFilters = {},
): Promise<PaginatedAlertList> {
  return apiRequest<PaginatedAlertList>({
    method: "GET",
    url: "/alerts/",
    params: filters,
  });
}


/**
 * Get one alert by ID.
 */
export async function getAlert(
  alertId: number,
): Promise<Alert> {
  return apiRequest<Alert>({
    method: "GET",
    url: `/alerts/${alertId}/`,
  });
}


/**
 * Evaluate an ARKL result using the
 * deterministic backend alert engine.
 */
export async function evaluateAlert(
  payload: AlertEvaluateRequest,
): Promise<AlertEvaluationResponse> {
  return apiRequest<AlertEvaluationResponse>({
    method: "POST",
    url: "/alerts/evaluate/",
    data: payload,
  });
}


/**
 * Acknowledge an OPEN alert.
 *
 * Backend is responsible for:
 * - lifecycle validation;
 * - acknowledged_at;
 * - acknowledged_by;
 * - audit trail.
 */
export async function acknowledgeAlert(
  alertId: number,
): Promise<Alert> {
  return apiRequest<Alert>({
    method: "PATCH",
    url: `/alerts/${alertId}/acknowledge/`,
  });
}


/**
 * Resolve an active alert.
 *
 * Valid backend transitions:
 * - OPEN -> RESOLVED
 * - ACKNOWLEDGED -> RESOLVED
 *
 * Backend is responsible for:
 * - lifecycle validation;
 * - resolved_at;
 * - resolved_by;
 * - audit trail.
 */
export async function resolveAlert(
  alertId: number,
): Promise<Alert> {
  return apiRequest<Alert>({
    method: "PATCH",
    url: `/alerts/${alertId}/resolve/`,
  });
}