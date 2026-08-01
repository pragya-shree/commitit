import type { ApiErrorBody } from "./types";

const DEFAULT_BASE_URL = "http://localhost:8000/api/v1";

export const API_BASE_URL: string = import.meta.env.VITE_API_URL ?? DEFAULT_BASE_URL;

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
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

function messageForStatus(status: number, detail?: string): string {
  if (detail) return detail;
  switch (status) {
    case 400:
      return "The request was invalid.";
    case 401:
      return "Authentication required. Please log in.";
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

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("accessToken") || localStorage.getItem("auth_token") || localStorage.getItem("token")
      : null;

  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${path}`;
  console.log(`[API Request] ${method} ${url}`, { body });

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
      credentials: "include",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      console.warn(`[API Aborted] ${method} ${url}`);
      throw new ApiError("Request cancelled.", 0, true);
    }
    const errMessage = error instanceof Error ? error.message : String(error);
    console.error(`[API Network Error] ${method} ${url}`, error);
    throw new ApiError(`Network error connecting to backend (${errMessage}). Ensure backend API is running at ${API_BASE_URL}`, 0);
  }

  if (!response.ok) {
    let detail: string | undefined;
    try {
      const errorBody = (await response.json()) as ApiErrorBody;
      detail = errorBody.detail;
    } catch {
      // Response was not JSON
    }
    const finalMessage = messageForStatus(response.status, detail);
    console.error(`[API Error Response] ${method} ${url} status=${response.status}`, { detail, finalMessage });
    throw new ApiError(finalMessage, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data = (await response.json()) as T;
  console.log(`[API Response Success] ${method} ${url} status=${response.status}`);
  return data;
}

export const apiClient = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: "GET", signal }),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) => request<T>(path, { method: "POST", body, signal }),
  patch: <T>(path: string, body?: unknown, signal?: AbortSignal) => request<T>(path, { method: "PATCH", body, signal }),
  delete: <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: "DELETE", signal }),
};