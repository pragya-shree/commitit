import { API_BASE_URL, apiClient } from "./apiClient";

export interface ToolCallResponse {
  id: string;
  message_id: string;
  tool_name: string;
  arguments: Record<string, unknown>;
  result?: Record<string, unknown> | null;
  status: "success" | "error";
  error_message?: string | null;
  execution_time_ms?: number | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tokens_used?: number | null;
  message_metadata?: {
    referenced_files?: string[];
    referenced_symbols?: string[];
    suggested_followups?: string[];
    selected_file?: string;
    selected_symbol?: string;
  } | null;
  created_at: string;
  tool_calls?: ToolCallResponse[];
}

export interface ChatSession {
  id: string;
  user_id: string;
  repository_id: string;
  title: string;
  provider_name: string;
  model_name: string;
  session_metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

export type SSEEventType =
  | "think"
  | "tool_call"
  | "tool_result"
  | "token"
  | "references"
  | "suggested_followups"
  | "completed"
  | "error";

export interface SSEStreamEvent {
  event_type: SSEEventType;
  data: Record<string, unknown>;
}

export const aiApi = {
  /** Create a new chat session for a repository. */
  createSession: (payload: {
    repository_id: string;
    title?: string;
    provider_name?: string;
    model_name?: string;
  }): Promise<ChatSession> => {
    return apiClient.post<ChatSession>("/ai/sessions", payload);
  },

  /** List chat sessions for a repository. */
  listSessions: (repository_id: string): Promise<ChatSession[]> => {
    return apiClient.get<ChatSession[]>(`/ai/sessions?repository_id=${encodeURIComponent(repository_id)}`);
  },

  /** Get session details with full turn history. */
  getSession: (session_id: string): Promise<ChatSession> => {
    return apiClient.get<ChatSession>(`/ai/sessions/${encodeURIComponent(session_id)}`);
  },

  /** Delete a session and its history. */
  deleteSession: (session_id: string): Promise<{ success: boolean; deleted_session_id: string }> => {
    return apiClient.post<{ success: boolean; deleted_session_id: string }>(
      `/ai/sessions/${encodeURIComponent(session_id)}`,
      undefined
    ).catch(() => {
      // Fallback for REST DELETE
      return fetch(`${API_BASE_URL}/ai/sessions/${encodeURIComponent(session_id)}`, {
        method: "DELETE",
        credentials: "include",
      }).then((res) => res.json());
    });
  },

  /**
   * Stream a chat turn using EventSource / fetch readable stream for SSE events.
   */
  streamChatTurn: async (
    session_id: string,
    payload: { question: string; selected_file?: string; selected_symbol?: string },
    onEvent: (event: SSEStreamEvent) => void,
    signal?: AbortSignal
  ): Promise<void> => {
    const token = typeof window !== "undefined"
      ? localStorage.getItem("accessToken") || localStorage.getItem("auth_token") || localStorage.getItem("token")
      : null;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/ai/sessions/${encodeURIComponent(session_id)}/stream`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      credentials: "include",
      signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to stream conversation response (${response.status})`);
    }

    if (!response.body) {
      throw new Error("No response body available for streaming SSE");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() || "";

      for (const block of blocks) {
        if (!block.trim()) continue;

        let eventType: SSEEventType = "token";
        let eventData: Record<string, unknown> = {};

        const lines = block.split("\n");
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.substring(7).trim() as SSEEventType;
          } else if (line.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(line.substring(6));
              eventData = parsed.data ?? parsed;
            } catch {
              // Ignore non-json raw text
            }
          }
        }

        onEvent({ event_type: eventType, data: eventData });
      }
    }
  },
};
