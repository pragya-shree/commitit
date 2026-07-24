import { apiClient } from "./apiClient";

export interface UserResponse {
  id: string;
  username: string;
  created_at: string;
}

export interface AuthStatusResponse {
  status: string;
  username?: string;
}

export function registerUser(username: string, password: string): Promise<UserResponse> {
  return apiClient.post<UserResponse>("/auth/register", { username, password });
}

export function loginUser(username: string, password: string): Promise<AuthStatusResponse> {
  return apiClient.post<AuthStatusResponse>("/auth/login", { username, password });
}

export function logoutUser(): Promise<{ status: string }> {
  return apiClient.post<{ status: string }>("/auth/logout");
}

export function refreshSession(): Promise<AuthStatusResponse> {
  return apiClient.post<AuthStatusResponse>("/auth/refresh");
}

export function fetchCurrentUser(): Promise<UserResponse> {
  return apiClient.get<UserResponse>("/auth/me");
}

export interface UserRepositoryItem {
  repository_id: string;
  name: string;
  github_url: string;
  github_owner: string;
  github_repo: string;
  default_branch: string;
  created_at: string;
  files: number;
  directories: number;
  size: string;
}

export function fetchUserRepositories(): Promise<UserRepositoryItem[]> {
  return apiClient.get<UserRepositoryItem[]>("/repositories");
}
