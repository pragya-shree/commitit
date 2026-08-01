/**
 * API client methods and TypeScript types for Phase 14 Repository Dashboard APIs.
 */

import { apiClient } from "./apiClient";

export interface DashboardRepoItem {
  repository_id: string;
  name: string;
  github_url: string;
  github_owner: string;
  github_repo: string;
  default_branch: string;
  created_at: string;
  last_opened_at?: string | null;
  is_favorite: boolean;
  primary_language: string;
  files: number;
  directories: number;
  size: string;
  has_knowledge_graph: boolean;
  last_analyzed_at?: string | null;
}

export interface DashboardConversationItem {
  id: string;
  repository_id: string;
  repository_name?: string;
  title: string;
  provider_name: string;
  model_name: string;
  is_pinned: boolean;
  last_message_preview?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContinueWorkingTarget {
  last_repository?: DashboardRepoItem | null;
  last_conversation?: DashboardConversationItem | null;
  last_analysis_at?: string | null;
}

export interface DashboardOverviewResponse {
  greeting: string;
  user: {
    id: string;
    email: string;
    username: string;
    display_name: string;
    avatar_url?: string | null;
    provider: string;
    is_verified: boolean;
    created_at: string;
    last_login_at?: string | null;
  };
  continue_working: ContinueWorkingTarget;
  stats: {
    repositories_imported: number;
    repositories_analyzed: number;
    knowledge_models: number;
    files_indexed: number;
    symbols_parsed: number;
    dependencies_count: number;
    ai_questions_asked: number;
  };
  recent_repositories: DashboardRepoItem[];
  recent_conversations: DashboardConversationItem[];
  activity_timeline: {
    id: string;
    action: string;
    description: string;
    timestamp: string;
  }[];
}

export async function fetchDashboardOverview(): Promise<DashboardOverviewResponse> {
  return apiClient.get<DashboardOverviewResponse>("/dashboard/overview");
}

export async function toggleFavoriteRepository(repositoryId: string): Promise<{ repository_id: string; is_favorite: boolean }> {
  return apiClient.post<{ repository_id: string; is_favorite: boolean }>(`/repositories/${repositoryId}/favorite`);
}

export async function recordRepositoryOpened(repositoryId: string): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>(`/repositories/${repositoryId}/opened`);
}

export async function deleteUserRepository(repositoryId: string): Promise<{ detail: string }> {
  return apiClient.delete<{ detail: string }>(`/repositories/${repositoryId}`);
}

export async function togglePinConversation(sessionId: string): Promise<{ session_id: string; is_pinned: boolean }> {
  return apiClient.post<{ session_id: string; is_pinned: boolean }>(`/ai/chat/sessions/${sessionId}/pin`);
}

export async function renameConversation(sessionId: string, title: string): Promise<{ session_id: string; title: string }> {
  return apiClient.patch<{ session_id: string; title: string }>(`/ai/chat/sessions/${sessionId}`, { title });
}

export async function deleteConversation(sessionId: string): Promise<{ detail: string }> {
  return apiClient.delete<{ detail: string }>(`/ai/chat/sessions/${sessionId}`);
}
