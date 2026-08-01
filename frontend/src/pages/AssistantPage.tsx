import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Sparkles,
  Square,
  Bot,
  PanelLeft,
  PanelRight,
  FileCode,
  Code2,
  X,
} from "lucide-react";
import { aiApi, type ChatSession, type ChatMessage } from "@/services/api/aiApi";
import { AssistantSidebar } from "@/components/assistant/AssistantSidebar";
import { AssistantContextPanel } from "@/components/assistant/AssistantContextPanel";
import { ChatMessageList } from "@/components/assistant/ChatMessageList";
import type { ToolStep } from "@/components/assistant/ToolTimeline";

interface AssistantPageProps {
  repositoryId: string;
  initialSelectedFile?: string | null;
  initialSelectedSymbol?: string | null;
  onNavigateToUniverse?: () => void;
}

export const AssistantPage: React.FC<AssistantPageProps> = ({
  repositoryId,
  initialSelectedFile = null,
  initialSelectedSymbol = null,
  onNavigateToUniverse,
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);

  const [inputPrompt, setInputPrompt] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(initialSelectedFile);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(initialSelectedSymbol);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isContextPanelCollapsed, setIsContextPanelCollapsed] = useState(false);

  // Streaming State
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingToolSteps, setStreamingToolSteps] = useState<ToolStep[]>([]);
  const [thinkingThought, setThinkingThought] = useState<string | undefined>();

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load sessions list on mount or repository change
  useEffect(() => {
    if (!repositoryId) return;
    loadSessions();
  }, [repositoryId]);

  const loadSessions = async () => {
    try {
      const list = await aiApi.listSessions(repositoryId);
      setSessions(list);
      if (list.length > 0 && !activeSessionId) {
        selectSession(list[0].id);
      }
    } catch {
      // Ignore
    }
  };

  const selectSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    try {
      const details = await aiApi.getSession(sessionId);
      setCurrentSession(details);
    } catch {
      setCurrentSession(null);
    }
  };

  const handleCreateNewSession = async () => {
    try {
      const newSession = await aiApi.createSession({
        repository_id: repositoryId,
        title: "New Conversation",
      });
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setCurrentSession(newSession);
    } catch {
      // Ignore
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await aiApi.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        if (remaining.length > 0) {
          selectSession(remaining[0].id);
        } else {
          setActiveSessionId(null);
          setCurrentSession(null);
        }
      }
    } catch {
      // Ignore
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = (customPrompt || inputPrompt).trim();
    if (!promptToSend || isStreaming) return;

    let targetSessionId = activeSessionId;
    if (!targetSessionId) {
      try {
        const newSession = await aiApi.createSession({
          repository_id: repositoryId,
          title: promptToSend.length > 30 ? `${promptToSend.substring(0, 30)}...` : promptToSend,
        });
        setSessions((prev) => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        setCurrentSession(newSession);
        targetSessionId = newSession.id;
      } catch (err) {
        console.error("Session creation error:", err);
        targetSessionId = `temp-session-${Date.now()}`;
        setActiveSessionId(targetSessionId);
      }
    }

    // Optimistically push user message to UI
    const tempUserMsg: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      session_id: targetSessionId,
      role: "user",
      content: promptToSend,
      created_at: new Date().toISOString(),
    };

    setCurrentSession((prev) => {
      const baseSession: ChatSession = prev || {
        id: targetSessionId,
        user_id: "user",
        repository_id: repositoryId,
        title: promptToSend.length > 30 ? `${promptToSend.substring(0, 30)}...` : promptToSend,
        provider_name: "gemini",
        model_name: "gemini-1.5-flash",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        messages: [],
      };
      return {
        ...baseSession,
        title: baseSession.messages.length === 0 ? (promptToSend.length > 30 ? `${promptToSend.substring(0, 30)}...` : promptToSend) : baseSession.title,
        messages: [...baseSession.messages, tempUserMsg],
      };
    });

    setInputPrompt("");
    setIsStreaming(true);
    setStreamingContent("");
    setStreamingToolSteps([]);
    setThinkingThought(undefined);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await aiApi.streamChatTurn(
        targetSessionId,
        {
          question: promptToSend,
          selected_file: selectedFile || undefined,
          selected_symbol: selectedSymbol || undefined,
        },
        (event) => {
          switch (event.event_type) {
            case "think":
              if (event.data?.thought) {
                setThinkingThought(event.data.thought as string);
              }
              break;

            case "tool_call":
              setStreamingToolSteps((prev) => [
                ...prev,
                {
                  id: `tool-${Date.now()}-${prev.length}`,
                  name: (event.data?.tool_name as string) || "tool",
                  args: (event.data?.arguments as Record<string, unknown>) || {},
                  status: "running",
                },
              ]);
              break;

            case "tool_result":
              setStreamingToolSteps((prev) => {
                const toolName = event.data?.tool_name as string;
                return prev.map((step) => {
                  if (step.name === toolName && step.status === "running") {
                    return {
                      ...step,
                      status: (event.data?.status as "success" | "error") || "success",
                      execution_time_ms: (event.data?.execution_time_ms as number) || undefined,
                      summary: (event.data?.result as Record<string, unknown>)?.summary as string,
                    };
                  }
                  return step;
                });
              });
              break;

            case "token":
              if (event.data?.token) {
                setStreamingContent((prev) => prev + (event.data.token as string));
              }
              break;

            case "completed":
              setIsStreaming(false);
              selectSession(targetSessionId!);
              break;

            case "error":
              setIsStreaming(false);
              setStreamingContent((prev) => prev + `\n\n[Error: ${event.data?.error_message || "Turn failed"}]`);
              break;
          }
        },
        controller.signal
      );
    } catch (err: unknown) {
      if ((err as Error)?.name !== "AbortError") {
        setStreamingContent((prev) => prev + "\n\n[Connection interrupted.]");
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const messages = currentSession?.messages || [];

  return (
    <div className="flex h-[calc(100vh-5rem)] w-full overflow-hidden bg-void-950 font-sans text-slate-100">
      {/* 1. Left Sidebar - Conversation Management */}
      <AssistantSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={selectSession}
        onNewSession={handleCreateNewSession}
        onDeleteSession={handleDeleteSession}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* 2. Center Panel - Main Conversation Canvas */}
      <div className="flex flex-col flex-1 h-full min-w-0 bg-gradient-to-b from-void-900/40 to-void-950">
        {/* Workspace Top Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.08] bg-void-900/60 backdrop-blur-xl">
          <div className="flex items-center gap-3 overflow-hidden">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer md:hidden"
            >
              <PanelLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-coral" />
              <h2 className="font-bold text-sm text-slate-100 font-display truncate">
                {currentSession?.title || "New Conversation"}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToUniverse && (
              <button
                onClick={onNavigateToUniverse}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
              >
                <span>Universe Explorer</span>
              </button>
            )}

            <button
              onClick={() => setIsContextPanelCollapsed(!isContextPanelCollapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
              title="Toggle Context Inspector"
            >
              <PanelRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Conversation Stream Container */}
        <div className="flex-1 overflow-y-auto">
          <ChatMessageList
            messages={messages}
            isStreaming={isStreaming}
            streamingMessageContent={streamingContent}
            streamingToolSteps={streamingToolSteps}
            thinkingThought={thinkingThought}
            onSelectPrompt={(p) => handleSendMessage(p)}
            onSelectFollowup={(f) => handleSendMessage(f)}
            onSelectFile={(f) => setSelectedFile(f)}
            onSelectSymbol={(s) => setSelectedSymbol(s)}
            repositoryName={currentSession?.title}
          />
        </div>

        {/* Floating Input Controls */}
        <div className="p-4 border-t border-white/[0.08] bg-void-900/80 backdrop-blur-2xl">
          <div className="max-w-4xl mx-auto flex flex-col gap-2">
            {/* Active Scope Chip Bar */}
            {(selectedFile || selectedSymbol) && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-coral/10 border border-coral/30 text-xs font-mono text-slate-200">
                <span className="text-[10px] uppercase font-bold text-coral flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Scope Attached:
                </span>
                {selectedFile && (
                  <span className="flex items-center gap-1 bg-void-950/60 px-2 py-0.5 rounded text-cyan">
                    <FileCode className="w-3 h-3" /> {selectedFile}
                  </span>
                )}
                {selectedSymbol && (
                  <span className="flex items-center gap-1 bg-void-950/60 px-2 py-0.5 rounded text-violet-300">
                    <Code2 className="w-3 h-3" /> {selectedSymbol}
                  </span>
                )}
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setSelectedSymbol(null);
                  }}
                  className="ml-auto text-slate-400 hover:text-coral transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Prompt Input & Submit */}
            <div className="relative flex items-center bg-void-950/90 border border-white/[0.1] focus-within:border-coral/50 rounded-2xl p-2 shadow-2xl transition-all">
              <textarea
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask AI Assistant about architecture, blast radius, health, or hotspots (Enter to send)..."
                rows={1}
                className="flex-1 bg-transparent border-0 px-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none min-h-[38px] max-h-32"
              />

              <div className="flex items-center gap-2 pr-1">
                {isStreaming ? (
                  <button
                    onClick={handleStopStreaming}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-coral/20 hover:bg-coral/30 border border-coral/40 text-coral text-xs font-bold transition cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-coral" /> Stop
                  </button>
                ) : (
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!inputPrompt.trim()}
                    className={`p-2.5 rounded-xl transition duration-150 cursor-pointer ${
                      inputPrompt.trim()
                        ? "bg-gradient-to-r from-coral to-magenta text-void-950 shadow-[0_0_15px_rgba(255,107,82,0.3)] hover:scale-105"
                        : "bg-white/[0.04] text-slate-600 cursor-not-allowed"
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Right Panel - Live Repository Context Inspector */}
      <AssistantContextPanel
        repositoryId={repositoryId}
        selectedFile={selectedFile}
        selectedSymbol={selectedSymbol}
        onClearScope={() => {
          setSelectedFile(null);
          setSelectedSymbol(null);
        }}
        isCollapsed={isContextPanelCollapsed}
        onToggleCollapse={() => setIsContextPanelCollapsed(!isContextPanelCollapsed)}
      />
    </div>
  );
};
