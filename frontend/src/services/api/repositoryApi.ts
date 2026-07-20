import { apiClient } from "./apiClient";
import type {
  AIExplainRequestBody,
  AIExplainResponse,
  CloneResponse,
  ConversationResponse,
  DependencyGraphResponse,
  ExplanationResponse,
  KnowledgeResponse,
  ParseResponse,
  ProvidersStatusResponse,
  ScanResponse,
} from "./types";

/**
 * Typed functions for every backend endpoint the frontend currently
 * uses, one per route. Every function accepts an optional
 * `AbortSignal` as its last parameter, threaded straight through to
 * `fetch` — callers create their own `AbortController` and pass
 * `controller.signal`, so an in-flight request can be cancelled (e.g. a
 * component unmounting, or a newer request superseding an older one).
 *
 * This file intentionally has one function per *endpoint that exists*,
 * not one per *frontend feature* — mapping a raw response into a
 * feature's UI shape (e.g. building a RepositoryUniverseData from a
 * KnowledgeModel) belongs in the page/component that needs it, not
 * here. Keeping this file a thin, honest mirror of the backend's actual
 * routes makes it obvious at a glance what the backend can and can't do.
 */

export function cloneRepository(githubUrl: string, signal?: AbortSignal): Promise<CloneResponse> {
  return apiClient.post<CloneResponse>("/repository/clone", { github_url: githubUrl }, signal);
}

export function getScan(repositoryId: string, signal?: AbortSignal): Promise<ScanResponse> {
  return apiClient.get<ScanResponse>(`/repository/${repositoryId}/scan`, signal);
}

export function getParse(repositoryId: string, signal?: AbortSignal): Promise<ParseResponse> {
  return apiClient.get<ParseResponse>(`/repository/${repositoryId}/parse`, signal);
}

export function getDependencies(repositoryId: string, signal?: AbortSignal): Promise<DependencyGraphResponse> {
  return apiClient.get<DependencyGraphResponse>(`/repository/${repositoryId}/dependencies`, signal);
}

export function getKnowledge(repositoryId: string, signal?: AbortSignal): Promise<KnowledgeResponse> {
  return apiClient.get<KnowledgeResponse>(`/repository/${repositoryId}/knowledge`, signal);
}

export function getExplanation(repositoryId: string, question: string, signal?: AbortSignal): Promise<ExplanationResponse> {
  return apiClient.post<ExplanationResponse>(`/repository/${repositoryId}/explanation`, { question }, signal);
}

export function getAIExplain(
  repositoryId: string,
  body: AIExplainRequestBody,
  signal?: AbortSignal,
): Promise<AIExplainResponse> {
  return apiClient.post<AIExplainResponse>(`/repository/${repositoryId}/ai/explain`, body, signal);
}

export function getProvidersStatus(signal?: AbortSignal): Promise<ProvidersStatusResponse> {
  return apiClient.get<ProvidersStatusResponse>("/providers/status", signal);
}

export function getConversation(
  repositoryId: string,
  conversationId: string,
  signal?: AbortSignal,
): Promise<ConversationResponse> {
  return apiClient.get<ConversationResponse>(`/repository/${repositoryId}/conversations/${conversationId}`, signal);
}

/**
 * Endpoints that exist on the backend but aren't wired into the
 * frontend yet: GET /repository/{id}/query/* (symbols, classes,
 * functions, imports, files, relationships) and GET
 * /repository/{id}/search. Nothing in the current UI needs a raw
 * symbol-level query yet — RepositoryUniverse works from the Knowledge
 * Model's tree/graph_summary directly. Add typed functions here first if
 * a future feature needs them.
 */