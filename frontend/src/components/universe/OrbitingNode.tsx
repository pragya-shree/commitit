import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame } from "lucide-react";
import { cn } from "@/utils/cn";
import { transition as motionTransition } from "@/theme";
import { floating } from "@/animations";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { NodeLabel } from "./NodeLabel";
import type { NodeVisualState, RepositoryNodeData } from "./types";
import type { NodeHeatMapMetrics } from "./HeatMap/heatMapEngine";

interface OrbitingNodeProps {
  node: RepositoryNodeData;
  position: { x: number; y: number };
  state: NodeVisualState;
  selected?: boolean;
  heatMapMetrics?: NodeHeatMapMetrics | null;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onSelect?: () => void;
}

function floatSeedFromId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) % 997;
  }
  return hash / 997;
}

export const OrbitingNode = React.memo(function OrbitingNode({
  node,
  position,
  state,
  selected = false,
  heatMapMetrics = null,
  onHoverStart,
  onHoverEnd,
  onSelect,
}: OrbitingNodeProps) {
  const reduceMotion = usePrefersReducedMotion();
  const Icon = node.icon;
  const floatSeed = floatSeedFromId(node.id);

  const visualColor = (() => {
    if (state === "impact_selected") return "#3b82f6";
    if (state === "impact_direct") return "#ef4444";
    if (state === "impact_indirect") return "#f97316";
    if (heatMapMetrics) return heatMapMetrics.color;
    return node.color;
  })();

  const isHighlighted =
    state === "hovered" ||
    state === "related" ||
    state === "impact_selected" ||
    state === "impact_direct" ||
    state === "impact_indirect" ||
    heatMapMetrics !== null;

  const glowShadow = heatMapMetrics
    ? `0 0 ${16 + Math.round(heatMapMetrics.normalizedScore * 20)}px ${heatMapMetrics.color}aa`
    : `0 0 24px ${visualColor}80`;

  const nodeScale = heatMapMetrics ? heatMapMetrics.scale : 1.0;

  return (
    <div
      className="absolute left-1/2 top-1/2 z-10"
      style={{ transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))` }}
    >
      <motion.div
        className="flex flex-col items-center gap-2 relative"
        {...floating({ distance: 6, duration: 5 + floatSeed * 2, delay: floatSeed * 2, reduceMotion })}
      >
        <div className="relative">
          {/* Hardware-accelerated GPU opacity glow layer to avoid box-shadow repaints */}
          <div
            className="absolute inset-0 rounded-full transition-all duration-300 pointer-events-none"
            style={{
              opacity: isHighlighted ? (heatMapMetrics ? 0.9 : 1) : 0,
              boxShadow: glowShadow,
              transform: `scale(${nodeScale})`,
            }}
          />
          <motion.button
            type="button"
            onClick={onSelect}
            onHoverStart={onHoverStart}
            onHoverEnd={onHoverEnd}
            onFocus={onHoverStart}
            onBlur={onHoverEnd}
            whileHover={!reduceMotion ? { scale: 1.15 * nodeScale } : undefined}
            whileTap={!reduceMotion ? { scale: 0.95 } : undefined}
            transition={motionTransition.springSnappy}
            aria-label={`${node.label}${node.meta ? `, ${node.meta}` : ""}`}
            aria-pressed={selected}
            className={cn(
              "relative flex h-16 w-16 items-center justify-center rounded-full border backdrop-blur-md transition-all duration-300 cursor-pointer",
              state === "dimmed" ? "opacity-30 scale-95" : "opacity-100"
            )}
            style={{
              borderColor: `${visualColor}77`,
              backgroundColor: `${visualColor}24`,
              transform: `scale(${nodeScale})`,
            }}
          >
            <Icon className="h-6 w-6 transition-colors duration-300" style={{ color: visualColor }} aria-hidden="true" />
          </motion.button>

          {/* Heat Map Metric Hover Tooltip */}
          <AnimatePresence>
            {state === "hovered" && heatMapMetrics && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.95 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="absolute left-1/2 bottom-full mb-3 -translate-x-1/2 z-50 pointer-events-none w-56 p-3.5 rounded-2xl border border-white/15 bg-void-950/95 backdrop-blur-xl shadow-[0_16px_36px_rgba(0,0,0,0.85)] flex flex-col gap-2"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Flame className="h-3.5 w-3.5 shrink-0" style={{ color: heatMapMetrics.color }} />
                    <span className="font-bold font-display text-xs text-ink truncate">
                      {node.label}
                    </span>
                  </div>
                  <span
                    className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase shrink-0"
                    style={{
                      backgroundColor: `${heatMapMetrics.color}25`,
                      color: heatMapMetrics.color,
                      border: `1px solid ${heatMapMetrics.color}40`,
                    }}
                  >
                    {heatMapMetrics.criticality}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                  <div className="flex flex-col p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                    <span className="text-slate-400">Score</span>
                    <span className="font-bold text-ink text-xs" style={{ color: heatMapMetrics.color }}>
                      {heatMapMetrics.rawScore}
                    </span>
                  </div>
                  <div className="flex flex-col p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                    <span className="text-slate-400">Fan-In / Out</span>
                    <span className="font-bold text-slate-200">
                      {heatMapMetrics.fanIn} in / {heatMapMetrics.fanOut} out
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-white/[0.04] pt-1.5">
                  <span>Files: <strong className="text-slate-200">{heatMapMetrics.fileCount}</strong></span>
                  <span>Classes: <strong className="text-slate-200">{heatMapMetrics.classCount}</strong></span>
                  <span>Funcs: <strong className="text-slate-200">{heatMapMetrics.functionCount}</strong></span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <NodeLabel label={node.label} meta={node.meta} state={state} />
      </motion.div>
    </div>
  );
});
