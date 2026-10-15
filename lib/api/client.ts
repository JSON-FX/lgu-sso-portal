/**
 * API Client
 *
 * Base HTTP client for making API requests to the LGU-SSO backend.
 */

import { ErrorResponse } from "@/types";

const API_BASE_URL = "/api/sso-backend";

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  retryAfter?: number;

  constructor(message: string, status: number, errors?: Record<string, string[]>, retryAfter?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.retryAfter = retryAfter;
  }
}

// This API sends delta-seconds, not HTTP dates. Bound unexpected values to one hour.
export function parseRetryAfter(header: string | null, body?: unknown): number | undefined {
  for (const value of [header, body]) {
    if (typeof value !== "number" && typeof value !== "string") continue;
    if (!/^\d+$/.test(String(value).trim())) continue;
    const seconds = Number(value);
    if (Number.isSafeInteger(seconds) && seconds >= 0) return Math.min(seconds, 3600);
  }
  return undefined;
}

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, ...fetchOptions } = options;

  // Build URL with query params
  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // Build headers
  const headers: HeadersInit = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    Accept: "application/json",
    ...options.headers,
  };

  const response = await fetch(url, {
    ...fetchOptions,
    credentials: "same-origin",
    headers,
  });

  // Handle no content responses
  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json();

  if (!response.ok) {
    const errorData = data as ErrorResponse;
    throw new ApiError(
      errorData.message || "An error occurred",
      response.status,
      errorData.errors,
      response.status === 429 ? parseRetryAfter(response.headers.get("Retry-After"), (data as { retry_after?: unknown }).retry_after) : undefined
    );
  }

  return data as T;
}

export const apiClient = {
  upload: <T>(endpoint: string, body: FormData) => fetchApi<T>(endpoint, { method: "POST", body }),
  get: <T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) =>
    fetchApi<T>(endpoint, { method: "GET", params }),

  post: <T>(endpoint: string, body?: unknown) =>
    fetchApi<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown) =>
    fetchApi<T>(endpoint, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string) => fetchApi<T>(endpoint, { method: "DELETE" }),
};
