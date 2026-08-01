import React from "react";
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Wrench,
  Brain,
} from "lucide-react";

export interface ToolStep {
  id: string;
  name: string;
  args?: Record<string, unknown>;
  status: "running" | "success" | "error";
  summary?: string;
  execution_time_ms?: number;
}

interface ToolTimelineProps {
  thinkingThought?: string;
  steps: ToolStep[];
  isStreaming: boolean;
}

export const ToolTimeline: React.FC<ToolTimelineProps> = ({
  thinkingThought,
  steps,
  isStreaming,
}) => {
  if (!isStreaming && steps.length === 0 && !thinkingThought) {
    return null;
  }

  return (
    <div className="my-3 px-4 py-3 rounded-2xl bg-void-900/70 border border-white/[0.08] backdrop-blur-xl shadow-inner text-xs font-sans">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-coral/10 text-coral border border-coral/20">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
          </div>
          <span className="font-bold text-slate-200 font-display">
            Backend Orchestrator Activity
          </span>
        </div>
        {isStreaming && (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-mono text-cyan-400">
            <Loader2 className="w-2.5 h-2.5 animate-spin" /> Live Stream
          </span>
        )}
      </div>

      {thinkingThought && (
        <div className="flex items-start gap-2.5 py-1.5 text-slate-300">
          <Brain className="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0" />
          <span className="italic text-slate-300/90 leading-snug">{thinkingThought}</span>
        </div>
      )}

      {steps.map((step) => {
        return (
          <div
            key={step.id}
            className="flex items-center justify-between py-1.5 border-t border-white/[0.04] first:border-t-0"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              {step.status === "running" && (
                <Loader2 className="w-3.5 h-3.5 text-cyan animate-spin shrink-0" />
              )}
              {step.status === "success" && (
                <CheckCircle2 className="w-3.5 h-3.5 text-mint shrink-0" />
              )}
              {step.status === "error" && (
                <AlertCircle className="w-3.5 h-3.5 text-coral shrink-0" />
              )}

              <Wrench className="w-3 h-3 text-slate-400 shrink-0" />

              <span className="font-mono font-semibold text-slate-200 truncate">
                {step.name}
              </span>

              {step.summary && (
                <span className="text-[11px] text-slate-400 truncate hidden sm:inline">
                  — {step.summary}
                </span>
              )}
            </div>

            {step.execution_time_ms !== undefined && (
              <span className="font-mono text-[10px] text-slate-400 shrink-0 ml-2">
                {step.execution_time_ms}ms
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
