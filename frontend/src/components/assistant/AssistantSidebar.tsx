import React, { useState } from "react";
import {
  Plus,
  MessageSquare,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Bot,
  Search,
} from "lucide-react";
import type { ChatSession } from "@/services/api/aiApi";

interface AssistantSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const AssistantSidebar: React.FC<AssistantSidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSessions = sessions.filter((s) =>
    (s.title || "New Conversation").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center py-4 px-2 bg-void-950/80 border-r border-white/[0.08] backdrop-blur-xl w-14 transition-all duration-300">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white transition duration-150 cursor-pointer mb-4"
          title="Expand Sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={onNewSession}
          className="p-2.5 rounded-xl bg-gradient-to-br from-coral to-magenta text-void-950 shadow-[0_0_15px_rgba(255,107,82,0.3)] hover:scale-105 transition duration-150 cursor-pointer mb-4"
          title="New Conversation"
        >
          <Plus className="w-4 h-4" />
        </button>

        <div className="flex-1 w-full space-y-2 overflow-y-auto">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`w-full p-2.5 rounded-xl flex items-center justify-center transition-all ${
                activeSessionId === session.id
                  ? "bg-coral/20 border border-coral/40 text-coral shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
              }`}
              title={session.title || "Conversation"}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-void-950/80 border-r border-white/[0.08] backdrop-blur-xl w-64 lg:w-72 transition-all duration-300">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-coral/10 border border-coral/30 text-coral">
            <Bot className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-slate-100 font-display">
            Conversations
          </span>
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition duration-150 cursor-pointer"
          title="Collapse Sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* New Conversation Button */}
      <div className="p-3">
        <button
          onClick={onNewSession}
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-coral to-magenta text-void-950 font-bold text-xs shadow-[0_0_20px_rgba(255,107,82,0.25)] hover:scale-[1.02] active:scale-98 transition duration-150 cursor-pointer font-display"
        >
          <Plus className="w-4 h-4" />
          <span>New Conversation</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-coral/50 transition duration-150"
          />
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1 py-1">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500 font-mono">
            {searchQuery ? "No matching conversations" : "No active sessions"}
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isActive = activeSessionId === session.id;
            return (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`group flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all duration-150 cursor-pointer ${
                  isActive
                    ? "bg-coral/10 border-coral/40 text-slate-100 shadow-[0_0_15px_rgba(255,107,82,0.1)]"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-coral" : "text-slate-500"}`} />
                  <span className="truncate font-medium">{session.title || "Untitled Chat"}</span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-coral transition duration-150 cursor-pointer"
                  title="Delete Conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
