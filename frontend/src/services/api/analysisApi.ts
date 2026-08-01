/**
 * API client functions and TypeScript types for Phase 15 Repository Import & Analysis Progress.
 */

import { apiClient } from "./apiClient";

export interface AnalysisLogMessage {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
}

export interface AnalysisStatusResponse {
  task_id: string;
  user_id: string;
  repository_id?: string | null;
  github_url: string;
  status: string;
  current_stage: string;
  progress_percent: number;
  logs: AnalysisLogMessage[];
  metadata?: {
    owner: string;
    name: string;
    branch?: string | null;
    files: number;
    directories: number;
    size: string;
  } | null;
  error_message?: string | null;
  started_at: string;
  completed_at?: string | null;
  cancel_requested: boolean;
}

export async function startRepositoryImport(github_url: string): Promise<AnalysisStatusResponse> {
  return apiClient.post<AnalysisStatusResponse>("/analysis/import", { github_url });
}

export async function fetchAnalysisStatus(taskId: string): Promise<AnalysisStatusResponse> {
  return apiClient.get<AnalysisStatusResponse>(`/analysis/${taskId}/status`);
}

export async function cancelAnalysisTask(taskId: string): Promise<{ task_id: string; status: string; detail: string }> {
  return apiClient.post<{ task_id: string; status: string; detail: string }>(`/analysis/${taskId}/cancel`);
}

export async function retryAnalysisTask(taskId: string): Promise<AnalysisStatusResponse> {
  return apiClient.post<AnalysisStatusResponse>(`/analysis/${taskId}/retry`);
}

export async function fetchActiveAnalyses(): Promise<AnalysisStatusResponse[]> {
  return apiClient.get<AnalysisStatusResponse[]>("/analysis/active");
}
