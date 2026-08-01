import React from "react";
import { Flame, ShieldAlert, BarChart3, Info, Check, X } from "lucide-react";
import { HEAT_MAP_MODES, type HeatMapModeId, type HeatMapResult } from "./heatMapEngine";

interface HeatMapLegendProps {
  activeMode: HeatMapModeId;
  heatMapResult: HeatMapResult;
  onModeChange: (mode: HeatMapModeId) => void;
  onCloseOverlay?: () => void;
  compact?: boolean;
}

export const HeatMapLegend = React.memo(function HeatMapLegend({
  activeMode,
  heatMapResult,
  onModeChange,
  onCloseOverlay,
  compact = false,
}: HeatMapLegendProps) {
  const currentConfig = HEAT_MAP_MODES[activeMode];
  const { summaryStats } = heatMapResult;

  if (compact) {
    return (
      <div className="flex flex-col gap-2 p-3 rounded-2xl border border-white/[0.08] bg-void-950/80 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.04] pb-2">
          <div className="flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-coral animate-pulse" />
            <span className="text-xs font-bold font-display text-ink flex items-center gap-1">
              Heat Map: <span className="text-coral">{currentConfig.label}</span>
            </span>
          </div>
          {onCloseOverlay && (
            <button
              onClick={onCloseOverlay}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition cursor-pointer"
              title="Exit Heat Map Layer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Mode switcher pills */}
        <div className="flex items-center gap-1 bg-void-900/80 p-1 rounded-xl border border-white/[0.04]">
          {(Object.keys(HEAT_MAP_MODES) as HeatMapModeId[]).map((modeId) => {
            const modeConfig = HEAT_MAP_MODES[modeId];
            const isActive = activeMode === modeId;
            return (
              <button
                key={modeId}
                onClick={() => onModeChange(modeId)}
                className={`flex-1 px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition cursor-pointer flex items-center justify-center gap-1 ${
                  isActive
                    ? "bg-coral text-void-950 shadow-[0_2px_8px_rgba(255,107,82,0.3)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <span>{modeConfig.emoji}</span>
                <span className="hidden sm:inline">{modeConfig.label.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Color Scale Gradient Bar */}
        <div className="flex flex-col gap-1 pt-1">
          <div className="h-2 w-full rounded-full bg-gradient-to-r from-cyan via-mint via-amber to-coral border border-white/10" />
          <div className="flex justify-between text-[9px] font-mono text-slate-400">
            <span>Low (Cool)</span>
            <span>Moderate</span>
            <span>High</span>
            <span className="text-coral font-bold">Hotspot 🔥</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-5 rounded-2xl border border-white/[0.08] bg-void-950/60 backdrop-blur-xl">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-coral/10 border border-coral/30 text-coral">
            <Flame className="h-4.5 w-4.5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Active Heat Map Metric Mode
            </h4>
            <p className="text-sm font-bold font-display text-ink flex items-center gap-1.5">
              <span>{currentConfig.emoji}</span>
              <span>{currentConfig.label}</span>
            </p>
          </div>
        </div>

        {/* Mode selector tab group */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-void-900 border border-white/[0.06]">
          {(Object.keys(HEAT_MAP_MODES) as HeatMapModeId[]).map((modeId) => {
            const modeConfig = HEAT_MAP_MODES[modeId];
            const isActive = activeMode === modeId;
            return (
              <button
                key={modeId}
                onClick={() => onModeChange(modeId)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? "bg-coral text-void-950 shadow-[0_2px_10px_rgba(255,107,82,0.3)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <span>{modeConfig.emoji}</span>
                <span>{modeConfig.label}</span>
                {isActive && <Check className="h-3 w-3 stroke-[3]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode Metric Explanation */}
      <div className="p-3 rounded-xl border border-white/[0.04] bg-white/[0.01] flex items-start gap-2.5 text-xs text-slate-300 font-body">
        <Info className="h-4 w-4 text-cyan shrink-0 mt-0.5" />
        <span>{currentConfig.description}</span>
      </div>

      {/* Color Scale Bar */}
      <div className="flex flex-col gap-1.5 pt-1">
        <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
          <span>Heat Gradient Scale</span>
          <span>Unit: {currentConfig.unit}</span>
        </div>
        <div className="h-3 w-full rounded-full bg-gradient-to-r from-[#06b6d4] via-[#10b981] via-[#f59e0b] to-[#ef4444] shadow-inner border border-white/10" />
        <div className="grid grid-cols-4 text-center text-[10px] font-mono text-slate-400 pt-0.5">
          <div className="flex items-center gap-1 justify-start">
            <span className="h-2 w-2 rounded-full bg-[#06b6d4]" />
            <span>Low (0 - 25%)</span>
          </div>
          <div className="flex items-center gap-1 justify-center">
            <span className="h-2 w-2 rounded-full bg-[#10b981]" />
            <span>Moderate (26 - 50%)</span>
          </div>
          <div className="flex items-center gap-1 justify-center">
            <span className="h-2 w-2 rounded-full bg-[#f59e0b]" />
            <span>High (51 - 75%)</span>
          </div>
          <div className="flex items-center gap-1 justify-end font-bold text-coral">
            <span className="h-2 w-2 rounded-full bg-[#ef4444] animate-ping" />
            <span>Hotspot (&gt;75%)</span>
          </div>
        </div>
      </div>

      {/* Summary Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/[0.04]">
        <div className="p-3 rounded-xl border border-white/[0.04] bg-void-900/60 flex flex-col gap-1">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <ShieldAlert className="h-3 w-3 text-coral" />
            Highest Risk Hub
          </span>
          <span className="text-xs font-bold font-display text-ink truncate">
            {summaryStats.highestRiskNode ? summaryStats.highestRiskNode.label : "None"}
          </span>
          <span className="text-[10px] font-mono text-coral">
            {summaryStats.highestRiskNode ? `Score: ${summaryStats.highestRiskNode.score}/100` : "N/A"}
          </span>
        </div>

        <div className="p-3 rounded-xl border border-white/[0.04] bg-void-900/60 flex flex-col gap-1">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <BarChart3 className="h-3 w-3 text-amber" />
            Highest Complexity
          </span>
          <span className="text-xs font-bold font-display text-ink truncate">
            {summaryStats.highestComplexityNode ? summaryStats.highestComplexityNode.label : "None"}
          </span>
          <span className="text-[10px] font-mono text-amber">
            {summaryStats.highestComplexityNode ? `Score: ${summaryStats.highestComplexityNode.score} pts` : "N/A"}
          </span>
        </div>

        <div className="p-3 rounded-xl border border-white/[0.04] bg-void-900/60 flex flex-col gap-1">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Flame className="h-3 w-3 text-cyan" />
            Average Score
          </span>
          <span className="text-xs font-bold font-display text-ink">
            {summaryStats.averageScore} {currentConfig.unit}
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            Across {summaryStats.totalEvaluatedNodes} module nodes
          </span>
        </div>
      </div>
    </div>
  );
});
