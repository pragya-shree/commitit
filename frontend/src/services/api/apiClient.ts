import type { ApiErrorBody } from "./types";

/**
 * Low-level HTTP client for the CommitIt backend. Every typed function in
 * repositoryApi.ts goes through `request()` here — it's the only place
 * that knows about the base URL, JSON parsing, and how the backend
 * shapes its errors.
 *
 * Base URL comes from `VITE_API_URL` (see `.env.example`), falling back
 * to `http://localhost:8000/api/v1` for local development against the
 * backend's default port. Vite only exposes env vars prefixed `VITE_` to
 * client code — see https://vite.dev/guide/env-and-mode.
 */

const DEFAULT_BASE_URL = "http://localhost:8000/api/v1";

export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? DEFAULT_BASE_URL;

/**
 * Thrown for any non-2xx response or network failure. `status` is 0 for
 * network-level failures (backend unreachable, CORS, DNS, offline) where
 * there's no real HTTP status to report. `isAbort` distinguishes a
 * deliberate cancellation (component unmounted, request superseded) from
 * a genuine failure — callers should usually treat an aborted request as
 * "no-op", not an error to show the user.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly isAbort: boolean;

  constructor(message: string, status: number, isAbort = false) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.isAbort = isAbort;
  }
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal;
}

/**
 * Extracts a human-readable message from the backend's `{"detail": "..."}`
 * error shape, falling back to a generic message per status code when the
 * body isn't JSON or doesn't have `detail` (e.g. a raw 502 from something
 * in front of the backend).
 */
function messageForStatus(status: number, detail?: string): string {
  if (detail) return detail;
  switch (status) {
    case 400:
      return "The request was invalid.";
    case 404:
      return "Repository not found. It may need to be re-analyzed.";
    case 410:
      return "This repository is no longer available on the server.";
    case 422:
      return "The request was rejected as invalid.";
    case 502:
      return "The backend couldn't complete the request.";
    default:
      return "Something went wrong talking to the backend.";
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, signal } = options;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
      credentials: "include",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("Request cancelled.", 0, true);
    }
    throw new ApiError("Couldn't reach the backend. Check your connection and that the API is running.", 0);
  }

  if (!response.ok) {
    let detail: string | undefined;
    try {
      const errorBody = (await response.json()) as ApiErrorBody;
      detail = errorBody.detail;
    } catch {
      // Response wasn't JSON — fall back to the generic per-status message.
    }
    throw new ApiError(messageForStatus(response.status, detail), response.status);
  }

  // No content responses (unlikely here, but defensive) shouldn't be parsed as JSON.
  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const apiClient = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: "GET", signal }),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) => request<T>(path, { method: "POST", body, signal }),
};