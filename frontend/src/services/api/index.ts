/**
 * API barrel export.
 *
 * `import { cloneRepository, getKnowledge, ApiError } from
 * "@/services/api"` — the typed backend client. See apiClient.ts for the
 * fetch wrapper and error handling, repositoryApi.ts for the typed
 * per-endpoint functions, and types.ts for the response/request shapes.
 */

export * from "./apiClient";
export * from "./repositoryApi";
export * from "./authApi";
export * from "./types";