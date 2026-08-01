import React, { useState, useMemo, useCallback } from "react";
import { Flame, ArrowRight, Activity } from "lucide-react";
import type { KnowledgeModel } from "@/services/api";
import type { RepositoryUniverseData } from "../types";
import { computeHeatMapData, HEAT_MAP_MODES, type HeatMapModeId } from "./heatMapEngine";
import { HeatMapLegend } from "./HeatMapLegend";

interface HeatMapProps {
  knowledge: KnowledgeModel | null;
  universeData: RepositoryUniverseData | null;
  activeMode?: HeatMapModeId;
  onSelectMode?: (mode: HeatMapModeId) => void;
  onSelectNode?: (nodeId: string, label: string) => void;
  onApplyHeatMapToGraph?: (mode: HeatMapModeId) => void;
}

export const HeatMap = React.memo(function HeatMap({
  knowledge,
  universeData,
  activeMode: initialMode = "risk",
  onSelectMode,
  onSelectNode,
  onApplyHeatMapToGraph,
}: HeatMapProps) {
  const [selectedMode, setSelectedMode] = useState<HeatMapModeId>(initialMode);

  const handleModeChange = useCallback(
    (mode: HeatMapModeId) => {
      setSelectedMode(mode);
      onSelectMode?.(mode);
    },
    [onSelectMode]
  );

  const heatMapResult = useMemo(
    () => computeHeatMapData(knowledge, universeData, selectedMode),
    [knowledge, universeData, selectedMode]
  );

  // Ranked nodes list (excluding root)
  const rankedNodes = useMemo(() => {
    if (!universeData) return [];
    return universeData.nodes
      .map((node) => ({
        node,
        metrics: heatMapResult.nodeMetrics[node.id],
      }))
      .filter((item) => Boolean(item.metrics))
      .sort((a, b) => b.metrics.rawScore - a.metrics.rawScore);
  }, [universeData, heatMapResult]);

  const currentConfig = HEAT_MAP_MODES[selectedMode];

  return (
    <div className="flex flex-col gap-6 py-1">
      {/* Interactive Legend & Mode Selector */}
      <HeatMapLegend
        activeMode={selectedMode}
        heatMapResult={heatMapResult}
        onModeChange={handleModeChange}
      />

      {/* Ranked Hotspot List */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-coral" />
            Ranked Module Hotspots ({selectedMode.replace("_", " ")})
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            Click node to jump to overview
          </span>
        </div>

        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
          {rankedNodes.map(({ node, metrics }, idx) => (
            <div
              key={node.id}
              onClick={() => onSelectNode?.(node.id, node.label)}
              className="group p-3.5 rounded-2xl border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.04] hover:border-white/10 transition-all duration-200 flex items-center justify-between text-xs cursor-pointer relative overflow-hidden"
            >
              {/* Background gradient hint */}
              <div
                className="absolute inset-y-0 left-0 w-1 transition-all duration-300"
                style={{ backgroundColor: metrics.color }}
              />

              <div className="flex items-center gap-3 min-w-0 pl-1">
                <span className="font-mono text-[10px] font-bold text-slate-500 w-4">
                  #{idx + 1}
                </span>
                <div
                  className="p-2 rounded-xl border shrink-0"
                  style={{
                    borderColor: `${metrics.color}30`,
                    backgroundColor: `${metrics.color}15`,
                    color: metrics.color,
                  }}
                >
                  <Flame className="h-4 w-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-bold font-display text-ink group-hover:text-coral transition-colors truncate">
                    {node.label}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {node.meta || "Module folder"} · Fan-in: {metrics.fanIn} · Fan-out: {metrics.fanOut}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="flex flex-col items-end">
                  <span className="font-mono font-bold text-ink text-sm">
                    {metrics.rawScore} <span className="text-[10px] text-slate-500 font-normal">{currentConfig.unit}</span>
                  </span>
                  <span
                    className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase"
                    style={{
                      backgroundColor: `${metrics.color}20`,
                      color: metrics.color,
                    }}
                  >
                    {metrics.criticality}
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-coral group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action CTA Button */}
      {onApplyHeatMapToGraph && (
        <button
          onClick={() => onApplyHeatMapToGraph(selectedMode)}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-coral via-magenta to-amber hover:opacity-95 text-void-950 font-bold text-xs font-display transition duration-200 flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(255,107,82,0.3)] cursor-pointer"
        >
          <Flame className="h-4 w-4" />
          <span>Apply Heat Map Visualization Layer to Universe Graph</span>
        </button>
      )}
    </div>
  );
});
