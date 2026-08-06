import { apiClient, API_BASE_URL } from "./apiClient";

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  display_name: string;
  provider: string;
  google_id?: string | null;
  avatar_url?: string | null;
  password_hash?: string | null;
  email_verified: boolean;
  connected_providers?: string[];
  created_at?: string | null;
  last_login_at?: string | null;
}

export interface UserPreferences {
  theme: string;
  accent_color: string;
  reduced_motion: boolean;
  compact_mode: boolean;
  default_dashboard_view: string;
  default_repository_view: string;
  ai_response_length: string;
  notify_security_alerts: boolean;
  notify_product_updates: boolean;
  notify_repo_analysis: boolean;
  notify_weekly_summary: boolean;
  notify_ai_tips: boolean;
}

export interface UserSession {
  id: string;
  browser: string;
  os: string;
  device: string;
  ip_address?: string | null;
  is_current: boolean;
  created_at: string;
  last_active_at: string;
}

export interface UserActivity {
  id: string;
  action: string;
  description: string;
  created_at: string;
}

export interface UserStats {
  repos_imported: number;
  repos_analyzed: number;
  knowledge_models: number;
  files_indexed: number;
  symbols_parsed: number;
  ai_conversations: number;
  last_analysis?: string | null;
}

export interface CheckAvailabilityResponse {
  available: boolean;
  message: string;
}

export function registerUser(
  email: string,
  username: string,
  password: string,
  display_name?: string
): Promise<UserResponse> {
  return apiClient.post<UserResponse>("/auth/register", {
    email,
    username,
    password,
    display_name,
  });
}

export function loginUser(
  email_or_username: string,
  password: string,
  remember_me: boolean = false
): Promise<UserResponse> {
  return apiClient.post<UserResponse>("/auth/login", {
    email_or_username,
    password,
    remember_me,
  });
}

export function loginWithGoogle(credential: string): Promise<UserResponse> {
  return apiClient.post<UserResponse>("/auth/google", { credential });
}

export function redirectToGoogleLogin(state?: string): void {
  const targetUrl = `${API_BASE_URL}/auth/google/login${state ? `?state=${encodeURIComponent(state)}` : ""}`;
  window.location.href = targetUrl;
}

export function linkProvider(provider: string, credential: string): Promise<UserResponse> {
  return apiClient.post<UserResponse>("/auth/link-provider", { provider, credential });
}

export function unlinkProvider(provider: string): Promise<UserResponse> {
  return apiClient.post<UserResponse>("/users/unlink-provider", { provider });
}

export function logoutUser(): Promise<{ detail: string }> {
  return apiClient.post<{ detail: string }>("/auth/logout");
}

export function refreshSession(): Promise<{ detail: string }> {
  return apiClient.post<{ detail: string }>("/auth/refresh");
}

export function fetchCurrentUser(): Promise<UserResponse> {
  return apiClient.get<UserResponse>("/auth/me");
}

export function forgotPassword(email: string): Promise<{ detail: string }> {
  return apiClient.post<{ detail: string }>("/auth/forgot-password", { email });
}

export function resetPassword(token: string, new_password: string): Promise<{ detail: string }> {
  return apiClient.post<{ detail: string }>("/auth/reset-password", { token, new_password });
}

export function changePassword(current_password: string, new_password: string): Promise<{ detail: string }> {
  return apiClient.post<{ detail: string }>("/users/change-password", { current_password, new_password });
}

export function verifyEmailToken(token: string): Promise<{ detail: string }> {
  return apiClient.post<{ detail: string }>("/auth/verify-email", { token });
}

export function resendEmailVerification(): Promise<{ detail: string }> {
  return apiClient.post<{ detail: string }>("/auth/resend-verification");
}

export function updateProfile(data: {
  display_name?: string;
  username?: string;
  email?: string;
  avatar_url?: string;
}): Promise<UserResponse> {
  return apiClient.patch<UserResponse>("/users/profile", data);
}

export function checkUsername(username: string): Promise<CheckAvailabilityResponse> {
  return apiClient.get<CheckAvailabilityResponse>(`/users/check-username?username=${encodeURIComponent(username)}`);
}

export function checkEmail(email: string): Promise<CheckAvailabilityResponse> {
  return apiClient.get<CheckAvailabilityResponse>(`/users/check-email?email=${encodeURIComponent(email)}`);
}

export function uploadAvatar(avatar_url: string): Promise<UserResponse> {
  return apiClient.post<UserResponse>("/users/avatar", { avatar_url });
}

export function removeAvatar(): Promise<UserResponse> {
  return apiClient.delete<UserResponse>("/users/avatar");
}

export function fetchUserSessions(): Promise<UserSession[]> {
  return apiClient.get<UserSession[]>("/users/sessions");
}

export function terminateSession(sessionId: string): Promise<{ detail: string }> {
  return apiClient.delete<{ detail: string }>(`/users/sessions/${sessionId}`);
}

export function terminateAllOtherSessions(): Promise<{ detail: string }> {
  return apiClient.delete<{ detail: string }>("/users/sessions");
}

export function fetchPreferences(): Promise<UserPreferences> {
  return apiClient.get<UserPreferences>("/users/preferences");
}

export function updatePreferences(data: Partial<UserPreferences>): Promise<UserPreferences> {
  return apiClient.patch<UserPreferences>("/users/preferences", data);
}

export function fetchActivity(limit: number = 20): Promise<UserActivity[]> {
  return apiClient.get<UserActivity[]>(`/users/activity?limit=${limit}`);
}

export function fetchUserStats(): Promise<UserStats> {
  return apiClient.get<UserStats>("/users/stats");
}

export async function downloadAccountExport(): Promise<void> {
  const data = await apiClient.get<any>("/users/export");
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `commitit-account-export-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function clearUserHistory(type: "chat" | "repository" | "disconnect_repos"): Promise<{ detail: string }> {
  return apiClient.delete<{ detail: string }>(`/users/history?type=${type}`);
}

export function deleteAccount(confirm_username?: string, password?: string): Promise<{ detail: string }> {
  return apiClient.delete<{ detail: string }>("/users/account", {
    data: { confirm_username, password },
  } as any);
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

