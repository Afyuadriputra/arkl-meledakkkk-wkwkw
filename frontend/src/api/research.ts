import type {
  components,
} from "@/types/schema";

import {
  apiRequest,
} from "@/api/client";


type H2SSummary =
  components["schemas"]["H2SSummary"];

type ARKLResearchResponse =
  components["schemas"]["ARKLResearchResponse"];

type RiskDistribution =
  components["schemas"]["RiskDistribution"];

type ExposureSummary =
  components["schemas"]["ExposureSummary"];

type AlertSummary =
  components["schemas"]["AlertSummary"];


/* =========================================================
 * FILTER TYPES
 * ======================================================= */

export interface ResearchDateParams {
  /**
   * ISO-8601 datetime.
   */
  start?: string;

  /**
   * ISO-8601 datetime.
   */
  end?: string;
}


export interface H2SResearchParams
  extends ResearchDateParams {
  device_code?: string;

  /**
   * undefined:
   * include simulated + physical
   *
   * true:
   * simulated only
   *
   * false:
   * physical only
   */
  source_simulated?: boolean;
}


export type H2STrendInterval =
  | "raw"
  | "hour"
  | "day";


export interface H2STrendParams
  extends H2SResearchParams {
  interval?: H2STrendInterval;
}


export type ARKLCalculationType =
  | "REALTIME"
  | "HISTORICAL";


export interface ARKLResearchParams
  extends ResearchDateParams {
  calculation_version?: string;

  worker_code?: string;

  calculation_type?: ARKLCalculationType;

  source_simulated?: boolean;
}


export interface RiskDistributionParams {
  calculation_version?: string;

  worker_code?: string;

  source_simulated?: boolean;
}


/* =========================================================
 * H2S SUMMARY
 * ======================================================= */

/**
 * GET /research/h2s-summary/
 */
export async function getH2SSummary(
  params: H2SResearchParams = {},
): Promise<H2SSummary> {
  return apiRequest<H2SSummary>({
    method: "GET",
    url: "/research/h2s-summary/",
    params,
  });
}


/* =========================================================
 * H2S TRENDS
 * ======================================================= */

/**
 * GET /research/h2s-trends/
 *
 * interval:
 * - raw
 * - hour
 * - day
 *
 * Backend default = day.
 */
export async function getH2STrends(
  params: H2STrendParams = {},
): Promise<TypedH2STrendResponse> {
  return apiRequest<
    TypedH2STrendResponse
  >({
    method: "GET",
    url: "/research/h2s-trends/",
    params,
  });
} 


/* =========================================================
 * ARKL RESEARCH RESULTS
 * ======================================================= */

/**
 * GET /research/arkl-results/
 *
 * Uses persisted ARKL results.
 * Does not recalculate risk.
 */
export async function getResearchARKLResults(
  params: ARKLResearchParams = {},
): Promise<ARKLResearchResponse> {
  return apiRequest<
    ARKLResearchResponse
  >({
    method: "GET",
    url: "/research/arkl-results/",
    params,
  });
}


/* =========================================================
 * RISK DISTRIBUTION
 * ======================================================= */

/**
 * GET /research/risk-distribution/
 */
export async function getRiskDistribution(
  params: RiskDistributionParams = {},
): Promise<RiskDistribution> {
  return apiRequest<RiskDistribution>({
    method: "GET",
    url: "/research/risk-distribution/",
    params,
  });
}


/* =========================================================
 * EXPOSURE SUMMARY
 * ======================================================= */

/**
 * GET /research/exposure-summary/
 */
export async function getExposureSummary():
Promise<ExposureSummary> {
  return apiRequest<ExposureSummary>({
    method: "GET",
    url: "/research/exposure-summary/",
  });
}


/* =========================================================
 * ALERT SUMMARY
 * ======================================================= */

/**
 * GET /research/alert-summary/
 */
export async function getAlertSummary():
Promise<AlertSummary> {
  return apiRequest<AlertSummary>({
    method: "GET",
    url: "/research/alert-summary/",
  });
}


/* =========================================================
 * CSV EXPORT
 * ======================================================= */

/**
 * GET /research/export/arkl.csv
 *
 * IMPORTANT:
 * - no trailing slash
 * - response is Blob, not JSON
 */
export async function exportARKLCSV(
  params: ARKLResearchParams = {},
): Promise<Blob> {
  const response =
    await apiRequest<
      Blob | string | ArrayBuffer
    >({
      method: "GET",
      url: "/research/export/arkl.csv",
      params,
      responseType: "blob",
    });

  if (response instanceof Blob) {
    return response;
  }

  return new Blob(
    [response],
    {
      type: "text/csv;charset=utf-8",
    },
  );
}

export interface H2SAggregatedTrendPoint {
  timestamp: string;
  average_ppm: number;
  minimum_ppm: number;
  maximum_ppm: number;
  sample_count: number;
}

export interface H2SRawTrendPoint {
  timestamp: string;
  ppm: number;
  device_code: string;
  simulated: boolean;
}

export type H2STrendPoint =
  | H2SAggregatedTrendPoint
  | H2SRawTrendPoint;

export interface H2SAggregatedTrendResponse {
  interval:
    | "hour"
    | "day";
  series:
    H2SAggregatedTrendPoint[];
}

export interface H2SRawTrendResponse {
  interval: "raw";
  series:
    H2SRawTrendPoint[];
}

export type TypedH2STrendResponse =
  | H2SAggregatedTrendResponse
  | H2SRawTrendResponse;