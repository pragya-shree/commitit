import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  User,
  Bot,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { ChatMessage } from "@/services/api/aiApi";
import { EvidenceCard } from "./EvidenceCard";
import { ToolTimeline, type ToolStep } from "./ToolTimeline";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface ChatMessageItemProps {
  message: ChatMessage;
  isStreaming?: boolean;
  toolSteps?: ToolStep[];
  thinkingThought?: string;
  onSelectFollowup?: (followup: string) => void;
  onSelectFile?: (filePath: string) => void;
  onSelectSymbol?: (symbolName: string) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = React.memo(({
  message,
  isStreaming = false,
  toolSteps = [],
  thinkingThought,
  onSelectFollowup,
  onSelectFile,
  onSelectSymbol,
}) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showToolsDetail, setShowToolsDetail] = useState(false);

  const isUser = message.role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const referencedFiles = message.message_metadata?.referenced_files || [];
  const referencedSymbols = message.message_metadata?.referenced_symbols || [];
  const followups = message.message_metadata?.suggested_followups || [];

  // Parse tool calls attached to message
  const pastToolSteps: ToolStep[] = (message.tool_calls || []).map((tc) => ({
    id: tc.id,
    name: tc.tool_name,
    status: tc.status as "running" | "success" | "error",
    summary: tc.error_message || (tc.result ? (tc.result.summary as string) : undefined),
    execution_time_ms: tc.execution_time_ms || undefined,
  }));

  const activeSteps = isStreaming ? toolSteps : pastToolSteps;

  return (
    <div
      className={`group relative mb-6 flex flex-col ${
        isUser ? "items-end" : "items-start"
      } w-full`}
    >
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          {isUser ? (
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-coral to-magenta p-0.5 flex items-center justify-center text-void-950 shadow-sm overflow-hidden shrink-0">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="You" className="h-full w-full rounded-full object-cover" />
                ) : (
                  <User className="w-3.5 h-3.5 text-void-950" />
                )}
              </div>
              <span className="text-xs font-bold text-slate-200 font-display">{user?.display_name || "You"}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-coral via-magenta to-cyan flex items-center justify-center text-void-950 shadow-sm">
                <Bot className="w-3.5 h-3.5 text-void-950" />
              </div>
              <span className="text-xs font-bold bg-gradient-to-r from-coral to-magenta bg-clip-text text-transparent font-display">
                AI Assistant
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-slate-400">
                Senior Reasoning Engine
              </span>
            </div>
          )}
        </div>

        {!isUser && message.content && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] transition duration-150 cursor-pointer"
            title="Copy message content"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-mint" /> <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" /> <span>Copy</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Tool Timeline execution block */}
      {!isUser && (isStreaming || activeSteps.length > 0) && (
        <div>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowToolsDetail(!showToolsDetail)}
              className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-slate-400 hover:text-slate-200 transition-colors py-1"
            >
              <span>{activeSteps.length} Backend Tool Step(s)</span>
              {showToolsDetail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {(isStreaming || showToolsDetail) && (
            <ToolTimeline
              thinkingThought={thinkingThought}
              steps={activeSteps}
              isStreaming={isStreaming}
            />
          )}
        </div>
      )}

      {/* Message Body with Rich Markdown & Code Block Rendering */}
      <div className="py-1">
        {message.content ? (
          <MarkdownRenderer
            content={message.content}
            isStreaming={isStreaming}
            onSelectFile={onSelectFile}
            onSelectSymbol={onSelectSymbol}
          />
        ) : isStreaming ? (
          <span className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 animate-pulse py-1">
            <Sparkles className="w-3.5 h-3.5 text-coral animate-spin" /> Analyzing AST, call chains & synthesizing grounded facts...
          </span>
        ) : null}
      </div>

      {/* Interactive Evidence Cards */}
      {!isUser && (referencedFiles.length > 0 || referencedSymbols.length > 0) && (
        <div className="mt-3 pt-3 border-t border-white/[0.04]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block mb-2">
            Referenced Evidence & Scope
          </span>

          <div className="flex flex-wrap gap-2">
            {referencedFiles.map((filePath, idx) => (
              <EvidenceCard
                key={`file-${idx}`}
                type="file"
                title={filePath.split("/").pop() || filePath}
                subtitle={filePath}
                onClick={() => onSelectFile?.(filePath)}
              />
            ))}

            {referencedSymbols.map((sym, idx) => (
              <EvidenceCard
                key={`sym-${idx}`}
                type="symbol"
                title={sym}
                onClick={() => onSelectSymbol?.(sym)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Suggested Follow-up Chips */}
      {!isUser && followups.length > 0 && !isStreaming && (
        <div className="mt-3 pt-3 border-t border-white/[0.04]">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono block mb-2">
            Suggested Follow-ups
          </span>

          <div className="flex flex-wrap gap-2">
            {followups.map((chipText, idx) => (
              <button
                key={idx}
                onClick={() => onSelectFollowup?.(chipText)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-coral/10 border border-white/[0.08] hover:border-coral/40 text-xs font-medium text-slate-300 hover:text-coral transition-all duration-150 cursor-pointer group"
              >
                <span>{chipText}</span>
                <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-coral group-hover:translate-x-0.5 transition-all" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
