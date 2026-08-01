import React, { useEffect, useState } from "react";
import {
  Activity,
  Code2,
  FileCode,
  Layers,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  GitBranch,
} from "lucide-react";
import { getKnowledge, type KnowledgeModel } from "@/services/api";

interface AssistantContextPanelProps {
  repositoryId: string;
  selectedFile?: string | null;
  selectedSymbol?: string | null;
  onClearScope?: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const AssistantContextPanel: React.FC<AssistantContextPanelProps> = ({
  repositoryId,
  selectedFile,
  selectedSymbol,
  onClearScope,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [knowledge, setKnowledge] = useState<KnowledgeModel | null>(null);

  useEffect(() => {
    if (!repositoryId) return;
    getKnowledge(repositoryId)
      .then((res) => setKnowledge(res.knowledge))
      .catch(() => setKnowledge(null));
  }, [repositoryId]);

  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center py-4 px-2 bg-void-950/80 border-l border-white/[0.08] backdrop-blur-xl w-14 transition-all duration-300">
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white transition duration-150 cursor-pointer"
          title="Expand Repository Context Panel"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="mt-4 p-2 rounded-xl bg-cyan-500/10 text-cyan border border-cyan/20">
          <Layers className="w-4 h-4" />
        </div>
      </div>
    );
  }

  const languages = knowledge?.languages ? Object.keys(knowledge.languages) : [];
  const technologies = knowledge?.technologies || [];
  const healthIndicators = knowledge?.health_indicators || [];
  const scores = healthIndicators.map((h) => h.score).filter((s): s is number => s !== undefined);
  const healthScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 85;
  const moduleList = knowledge?.modules || [];

  return (
    <div className="flex flex-col h-full bg-void-950/80 border-l border-white/[0.08] backdrop-blur-xl w-72 lg:w-80 transition-all duration-300 overflow-y-auto">
      {/* Panel Header */}
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-cyan-500/10 border border-cyan/30 text-cyan">
            <Layers className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-slate-100 font-display">
            Repository Context
          </span>
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition duration-150 cursor-pointer"
          title="Collapse Panel"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Active Focused Scope Card */}
        {(selectedFile || selectedSymbol) && (
          <div className="p-3.5 rounded-2xl bg-coral/10 border border-coral/30 text-slate-200 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-coral font-mono flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Focused Scope
              </span>
              {onClearScope && (
                <button
                  onClick={onClearScope}
                  className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Clear Scope
                </button>
              )}
            </div>

            {selectedFile && (
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-200 truncate">
                <FileCode className="w-3.5 h-3.5 text-cyan shrink-0" />
                <span className="truncate" title={selectedFile}>{selectedFile}</span>
              </div>
            )}

            {selectedSymbol && (
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-200 truncate mt-1">
                <Code2 className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                <span className="truncate" title={selectedSymbol}>{selectedSymbol}</span>
              </div>
            )}
          </div>
        )}

        {/* Repository Identity Card */}
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-2 mb-2">
            <GitBranch className="w-4 h-4 text-coral" />
            <span className="font-bold text-xs text-white font-display truncate">
              {knowledge?.repository.name || repositoryId}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 mt-2 pt-2 border-t border-white/[0.04]">
            <div>
              <span className="text-slate-500 block text-[10px]">Files</span>
              <span className="font-semibold text-slate-200">{knowledge?.scan_summary.total_files || "N/A"}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Modules</span>
              <span className="font-semibold text-slate-200">{moduleList.length}</span>
            </div>
          </div>
        </div>

        {/* Codebase Health Score Gauge */}
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-200 font-display flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-mint" /> Repository Health
            </span>
            <span className="text-xs font-bold font-mono text-mint">{healthScore}/100</span>
          </div>

          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-coral via-amber-400 to-mint h-full transition-all duration-500"
              style={{ width: `${healthScore}%` }}
            />
          </div>
        </div>

        {/* Detected Tech Stack */}
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <span className="text-xs font-bold text-slate-200 font-display block mb-2">
            Technology Stack
          </span>

          <div className="flex flex-wrap gap-1.5">
            {languages.map((lang) => (
              <span
                key={lang}
                className="px-2 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono text-cyan"
              >
                {lang}
              </span>
            ))}

            {technologies.map((t) => (
              <span
                key={t.name}
                className="px-2 py-0.5 rounded-lg bg-violet-500/10 border border-violet-500/30 text-[10px] font-mono text-violet-300"
              >
                {t.name}
              </span>
            ))}
          </div>
        </div>

        {/* Start Here Key Entry Points */}
        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
          <span className="text-xs font-bold text-slate-200 font-display block mb-2">
            Key Architectural Entry Points
          </span>

          <div className="space-y-1.5">
            {moduleList.slice(0, 4).map((m) => (
              <div
                key={m.path}
                className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 truncate"
              >
                <FileCode className="w-3 h-3 text-slate-500 shrink-0" />
                <span className="truncate">{m.path}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
