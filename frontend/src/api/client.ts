import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
} from "axios"

import {
  clearStoredToken,
  getStoredToken,
} from "@/api/tokenStorage"

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ??
  "http://127.0.0.1:8000/api/v1"

export interface ApiError {
  status: number | null
  message: string
  fieldErrors?: Record<
    string,
    string[]
  >
  raw?: unknown
}

export function isApiError(
  error: unknown,
): error is ApiError {
  if (
    typeof error !== "object" ||
    error === null
  ) {
    return false
  }

  const candidate =
    error as Partial<ApiError>

  return (
    (
      typeof candidate.status ===
        "number" ||
      candidate.status === null
    ) &&
    typeof candidate.message ===
      "string"
  )
}



function extractErrorMessage(
  data: unknown,
): string {
  if (
    typeof data === "object" &&
    data !== null
  ) {
    const payload =
      data as Record<string, unknown>;

    if (
      typeof payload.detail ===
      "string"
    ) {
      return payload.detail;
    }

    const nonFieldErrors =
      payload.non_field_errors;

    if (
      Array.isArray(nonFieldErrors) &&
      typeof nonFieldErrors[0] ===
        "string"
    ) {
      return nonFieldErrors[0];
    }

    for (
      const value of Object.values(
        payload,
      )
    ) {
      if (
        Array.isArray(value) &&
        typeof value[0] ===
          "string"
      ) {
        return value[0];
      }

      if (
        typeof value === "string"
      ) {
        return value;
      }
    }
  }

  return (
    "Terjadi kesalahan saat " +
    "berkomunikasi dengan server."
  );
}

function extractFieldErrors(
  data: unknown,
):
  | Record<string, string[]>
  | undefined {
  if (
    typeof data !== "object" ||
    data === null
  ) {
    return undefined;
  }

  const payload =
    data as Record<string, unknown>;

  const result: Record<
    string,
    string[]
  > = {};

  for (
    const [key, value] of
    Object.entries(payload)
  ) {
    if (
      Array.isArray(value) &&
      value.every(
        (item) =>
          typeof item === "string",
      )
    ) {
      result[key] =
        value as string[];
    }
  }

  return Object.keys(result).length > 0
    ? result
    : undefined;
}

export function normalizeApiError(
  error: unknown,
): ApiError {
  if (axios.isAxiosError(error)) {
    const axiosError =
      error as AxiosError;

    return {
      status:
        axiosError.response?.status ??
        null,
      message:
        extractErrorMessage(
          axiosError.response?.data,
        ),
      fieldErrors:
        extractFieldErrors(
          axiosError.response?.data,
        ),
      raw:
        axiosError.response?.data,
    };
  }

  if (error instanceof Error) {
    return {
      status: null,
      message: error.message,
      raw: error,
    };
  }

  return {
    status: null,
    message:
      "Terjadi kesalahan yang tidak diketahui.",
    raw: error,
  };
}

const apiClient: AxiosInstance =
  axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type":
        "application/json",
      Accept: "application/json",
    },
  });

apiClient.interceptors.request.use(
  (config) => {
    const token =
      getStoredToken();

    if (token) {
      config.headers.Authorization =
        `Token ${token}`;
    }

    return config;
  },
);

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (
      error.response?.status ===
      401
    ) {
      clearStoredToken();
    }

    return Promise.reject(error);
  },
);

export async function apiRequest<T>(
  config: AxiosRequestConfig,
): Promise<T> {
  try {
    const response =
      await apiClient.request<T>(
        config,
      )

    return response.data
  } catch (error) {
    throw normalizeApiError(
      error,
    )
  }
}

export {
  API_BASE_URL,
};

export default apiClient;